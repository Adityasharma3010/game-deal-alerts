-- GamePulse: persist exact Steam purchase packages and record monitor events.
-- Run this migration in the Supabase SQL Editor before deploying the monitor.

alter table public.tracked_games
  add column if not exists steam_package_id bigint;

alter table public.store_products
  add column if not exists steam_package_id bigint;

create index if not exists tracked_games_steam_package_idx
  on public.tracked_games (steam_package_id)
  where steam_package_id is not null;

create unique index if not exists store_products_store_game_package_uidx
  on public.store_products (store, game_id, steam_package_id);

create table if not exists public.alert_rule_product_state (
  alert_rule_id uuid not null references public.alert_rules(id) on delete cascade,
  store_product_id uuid not null references public.store_products(id) on delete cascade,
  is_triggered boolean not null default false,
  last_price numeric(12, 2),
  last_discount_percent integer,
  last_checked_at timestamptz not null default now(),
  last_triggered_at timestamptz,
  primary key (alert_rule_id, store_product_id)
);

create table if not exists public.alert_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tracked_game_id uuid not null references public.tracked_games(id) on delete cascade,
  alert_rule_id uuid not null references public.alert_rules(id) on delete cascade,
  store_product_id uuid not null references public.store_products(id) on delete cascade,
  event_type text not null check (event_type in ('target_price', 'minimum_discount', 'first_listing')),
  price numeric(12, 2),
  original_price numeric(12, 2),
  discount_percent integer check (discount_percent is null or discount_percent between 0 and 100),
  currency text not null default 'INR',
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists alert_events_user_created_idx
  on public.alert_events (user_id, created_at desc);

alter table public.alert_rule_product_state enable row level security;
alter table public.alert_events enable row level security;

-- Users can only read their own activity. Writes are performed by the trusted monitor.
drop policy if exists "Users can read their own alert events" on public.alert_events;
create policy "Users can read their own alert events"
  on public.alert_events for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.alert_rule_product_state from public, anon, authenticated;
revoke insert, update, delete on public.alert_events from public, anon, authenticated;
grant select on public.alert_events to authenticated;
grant all on public.alert_rule_product_state to service_role;
grant all on public.alert_events to service_role;

-- Replace the old RPC signature so a selected package ID is saved atomically.
drop function if exists public.track_steam_game(bigint, text, text, text, text, text, numeric, integer);

create or replace function public.track_steam_game(
  p_steam_app_id bigint,
  p_title text,
  p_cover_image_url text,
  p_edition text,
  p_steam_package_id bigint,
  p_store text,
  p_alert_type text,
  p_target_price numeric default null,
  p_minimum_discount integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_game_id uuid;
  v_tracked_game_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to track a game.' using errcode = '28000';
  end if;

  if p_steam_app_id is null or p_steam_app_id <= 0 then
    raise exception 'A valid Steam app ID is required.' using errcode = '22023';
  end if;
  if nullif(trim(p_title), '') is null then
    raise exception 'A game title is required.' using errcode = '22023';
  end if;
  if nullif(trim(p_edition), '') is null then
    raise exception 'Choose a purchase option.' using errcode = '22023';
  end if;
  if p_steam_package_id is null or p_steam_package_id <= 0 then
    raise exception 'Steam did not provide a verifiable package ID for this purchase option. Choose another option.' using errcode = '22023';
  end if;
  if p_store is distinct from 'steam' then
    raise exception 'Only verified Steam tracking is currently available.' using errcode = '22023';
  end if;
  if p_alert_type is null or p_alert_type not in ('target_price', 'minimum_discount', 'first_listing') then
    raise exception 'Invalid alert type.' using errcode = '22023';
  end if;
  if p_alert_type = 'target_price' and (p_target_price is null or p_target_price < 0) then
    raise exception 'Enter a valid target price.' using errcode = '22023';
  end if;
  if p_alert_type = 'minimum_discount' and (p_minimum_discount is null or p_minimum_discount < 1 or p_minimum_discount > 100) then
    raise exception 'Discount must be between 1 and 100.' using errcode = '22023';
  end if;

  insert into public.game_catalog (title, normalized_title, steam_app_id, cover_image_url)
  values (
    trim(p_title),
    lower(regexp_replace(trim(p_title), '\s+', ' ', 'g')),
    p_steam_app_id,
    p_cover_image_url
  )
  on conflict (steam_app_id) do update
    set title = excluded.title,
        cover_image_url = coalesce(excluded.cover_image_url, public.game_catalog.cover_image_url)
  returning id into v_game_id;

  insert into public.tracked_games (user_id, game_id, edition, steam_package_id)
  values (v_user_id, v_game_id, trim(p_edition), p_steam_package_id)
  on conflict (user_id, game_id, edition) do nothing
  returning id into v_tracked_game_id;

  if v_tracked_game_id is null then
    raise exception 'This game edition is already in your collection.' using errcode = '23505';
  end if;

  insert into public.alert_rules (
    tracked_game_id, store, alert_type, target_price, minimum_discount, currency,
    is_enabled, notify_on_first_listing
  ) values (
    v_tracked_game_id,
    p_store,
    p_alert_type,
    case when p_alert_type = 'target_price' then p_target_price else null end,
    case when p_alert_type = 'minimum_discount' then p_minimum_discount else null end,
    'INR',
    true,
    p_alert_type = 'first_listing'
  );

  return v_tracked_game_id;
end;
$$;

revoke all on function public.track_steam_game(bigint, text, text, text, bigint, text, text, numeric, integer) from public, anon;
grant execute on function public.track_steam_game(bigint, text, text, text, bigint, text, text, numeric, integer) to authenticated;

-- Atomically store a price snapshot and create an event only when a rule changes
-- from not-triggered to triggered. Repeated six-hour checks do not duplicate events.
create or replace function public.process_steam_price_snapshot(
  p_store_product_id uuid,
  p_price numeric,
  p_original_price numeric,
  p_discount_percent integer,
  p_is_first_listing boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.store_products%rowtype;
  v_rule record;
  v_was_triggered boolean;
  v_now_triggered boolean;
  v_event_count integer := 0;
  v_message text;
begin
  select * into v_product
  from public.store_products
  where id = p_store_product_id
  for update;

  if not found then
    raise exception 'Store product not found.' using errcode = 'P0002';
  end if;

  insert into public.price_history (
    store_product_id, price, original_price, discount_percent, currency, recorded_at
  ) values (
    p_store_product_id, p_price, p_original_price, p_discount_percent, 'INR', now()
  );

  for v_rule in
    select ar.id as rule_id, ar.tracked_game_id, ar.alert_type, ar.target_price,
           ar.minimum_discount, ar.store, ar.is_enabled, tg.user_id, tg.edition,
           gc.title
    from public.tracked_games tg
    join public.game_catalog gc on gc.id = tg.game_id
    join public.alert_rules ar on ar.tracked_game_id = tg.id
    where tg.game_id = v_product.game_id
      and tg.steam_package_id = v_product.steam_package_id
      and ar.is_enabled = true
      and ar.store in ('steam', 'both')
  loop
    v_now_triggered := case v_rule.alert_type
      when 'target_price' then p_price <= v_rule.target_price
      when 'minimum_discount' then coalesce(p_discount_percent, 0) >= v_rule.minimum_discount
      when 'first_listing' then coalesce(p_is_first_listing, false)
      else false
    end;

    insert into public.alert_rule_product_state (
      alert_rule_id, store_product_id, is_triggered, last_price,
      last_discount_percent, last_checked_at
    ) values (
      v_rule.rule_id, p_store_product_id, false, p_price,
      p_discount_percent, now()
    ) on conflict (alert_rule_id, store_product_id) do nothing;

    select is_triggered into v_was_triggered
    from public.alert_rule_product_state
    where alert_rule_id = v_rule.rule_id
      and store_product_id = p_store_product_id
    for update;

    if v_now_triggered and not v_was_triggered then
      if v_rule.alert_type = 'target_price' then
        v_message := format('%s (%s) reached your target price of ₹%s. Current price: ₹%s.', v_rule.title, v_rule.edition, v_rule.target_price, p_price);
      elsif v_rule.alert_type = 'minimum_discount' then
        v_message := format('%s (%s) reached a %s%% discount. Your threshold is %s%%.', v_rule.title, v_rule.edition, coalesce(p_discount_percent, 0), v_rule.minimum_discount);
      else
        v_message := format('%s (%s) has a newly verified Steam listing.', v_rule.title, v_rule.edition);
      end if;

      insert into public.alert_events (
        user_id, tracked_game_id, alert_rule_id, store_product_id,
        event_type, price, original_price, discount_percent, currency, message
      ) values (
        v_rule.user_id, v_rule.tracked_game_id, v_rule.rule_id, p_store_product_id,
        v_rule.alert_type, p_price, p_original_price, p_discount_percent, 'INR', v_message
      );
      v_event_count := v_event_count + 1;
    end if;

    update public.alert_rule_product_state
    set is_triggered = v_now_triggered,
        last_price = p_price,
        last_discount_percent = p_discount_percent,
        last_checked_at = now(),
        last_triggered_at = case
          when v_now_triggered and not v_was_triggered then now()
          else last_triggered_at
        end
    where alert_rule_id = v_rule.rule_id
      and store_product_id = p_store_product_id;
  end loop;

  return jsonb_build_object('priceRecorded', true, 'eventsCreated', v_event_count);
end;
$$;

revoke all on function public.process_steam_price_snapshot(uuid, numeric, numeric, integer, boolean) from public, anon, authenticated;
grant execute on function public.process_steam_price_snapshot(uuid, numeric, numeric, integer, boolean) to service_role;
