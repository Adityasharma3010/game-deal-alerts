-- GamePulse: let each tracked edition choose Steam, GMG, or both.
-- GMG mappings are scoped to a two-letter region and are not trusted until checked.

alter table public.tracked_games
  add column if not exists gmg_region_code text not null default 'IN';

alter table public.store_products
  add column if not exists region_code text not null default 'IN';

update public.tracked_games
set gmg_region_code = upper(coalesce(nullif(trim(gmg_region_code), ''), 'IN'))
where gmg_region_code is distinct from upper(coalesce(nullif(trim(gmg_region_code), ''), 'IN'));

update public.store_products
set region_code = upper(coalesce(nullif(trim(region_code), ''), 'IN'))
where region_code is distinct from upper(coalesce(nullif(trim(region_code), ''), 'IN'));

create unique index if not exists store_products_gmg_game_region_edition_uidx
  on public.store_products (game_id, region_code, lower(edition))
  where store = 'gmg';

create or replace function public.track_game_with_store_rules(
  p_steam_app_id bigint,
  p_title text,
  p_cover_image_url text,
  p_edition text,
  p_steam_package_id bigint,
  p_store_selection text,
  p_gmg_product_url text,
  p_region_code text,
  p_alerts jsonb
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
  v_alert jsonb;
  v_type text;
  v_target numeric;
  v_discount integer;
  v_store text;
  v_region text := upper(coalesce(nullif(trim(p_region_code), ''), 'IN'));
  v_product_id uuid;
begin
  if v_user_id is null then raise exception 'You must be signed in to track games.' using errcode = '28000'; end if;
  if p_steam_app_id is null or p_steam_app_id <= 0 then raise exception 'A valid Steam app ID is required to identify the game.' using errcode = '22023'; end if;
  if nullif(trim(p_title), '') is null or nullif(trim(p_edition), '') is null then raise exception 'A game title and edition are required.' using errcode = '22023'; end if;
  if p_store_selection not in ('steam', 'gmg', 'both') then raise exception 'Choose Steam, GMG, or both stores.' using errcode = '22023'; end if;
  if p_store_selection in ('steam', 'both') and (p_steam_package_id is null or p_steam_package_id <= 0) then raise exception 'A verified Steam package is required for Steam tracking.' using errcode = '22023'; end if;
  if p_store_selection in ('gmg', 'both') then
    if nullif(trim(p_gmg_product_url), '') is null or p_gmg_product_url !~* '^https://([a-z0-9-]+\.)*greenmangaming\.com(/|$)' then
      raise exception 'GMG tracking requires an official HTTPS Green Man Gaming product URL.' using errcode = '22023';
    end if;
    if v_region !~ '^[A-Z]{2}$' then raise exception 'Region must be a two-letter country/region code.' using errcode = '22023'; end if;
  end if;
  if jsonb_typeof(p_alerts) is distinct from 'array' or jsonb_array_length(p_alerts) = 0 then raise exception 'Select at least one alert condition.' using errcode = '22023'; end if;

  insert into public.game_catalog (title, normalized_title, steam_app_id, cover_image_url)
  values (trim(p_title), lower(regexp_replace(trim(p_title), '\s+', ' ', 'g')), p_steam_app_id, p_cover_image_url)
  on conflict (steam_app_id) do update
    set title = excluded.title,
        cover_image_url = coalesce(excluded.cover_image_url, public.game_catalog.cover_image_url)
  returning id into v_game_id;

  insert into public.tracked_games (user_id, game_id, edition, steam_package_id, gmg_region_code)
  values (v_user_id, v_game_id, trim(p_edition), case when p_store_selection in ('steam', 'both') then p_steam_package_id else null end, v_region)
  on conflict (user_id, game_id, edition) do nothing
  returning id into v_tracked_game_id;
  if v_tracked_game_id is null then raise exception 'This game edition is already in your collection.' using errcode = '23505'; end if;

  if p_store_selection in ('gmg', 'both') then
    select id into v_product_id from public.store_products
    where store = 'gmg' and game_id = v_game_id and region_code = v_region and lower(edition) = lower(trim(p_edition))
    limit 1;
    if v_product_id is null then
      insert into public.store_products (game_id, store, product_url, product_title, edition, currency, is_verified, region_code, steam_package_id)
      values (v_game_id, 'gmg', trim(p_gmg_product_url), trim(p_title), trim(p_edition), 'INR', false, v_region, null)
      returning id into v_product_id;
    else
      update public.store_products
      set product_url = trim(p_gmg_product_url), product_title = trim(p_title), edition = trim(p_edition),
          currency = 'INR', is_verified = false, last_checked_at = null
      where id = v_product_id;
    end if;
  end if;

  foreach v_store in array (case
    when p_store_selection = 'steam' then array['steam']::text[]
    when p_store_selection = 'gmg' then array['gmg']::text[]
    else array['steam', 'gmg']::text[]
  end) loop
    for v_alert in select value from jsonb_array_elements(p_alerts) loop
      v_type := v_alert->>'type';
      v_target := nullif(v_alert->>'target_price', '')::numeric;
      v_discount := nullif(v_alert->>'minimum_discount', '')::integer;
      if v_type not in ('target_price', 'minimum_discount', 'first_listing') then raise exception 'Invalid alert type.' using errcode = '22023'; end if;
      if v_type = 'target_price' and (v_target is null or v_target <= 0) then raise exception 'Enter a target price greater than zero.' using errcode = '22023'; end if;
      if v_type = 'minimum_discount' and (v_discount is null or v_discount < 1 or v_discount > 100) then raise exception 'Discount must be between 1 and 100.' using errcode = '22023'; end if;
      insert into public.alert_rules (tracked_game_id, store, alert_type, target_price, minimum_discount, currency, is_enabled, notify_on_first_listing)
      values (v_tracked_game_id, v_store, v_type,
        case when v_type = 'target_price' then v_target else null end,
        case when v_type = 'minimum_discount' then v_discount else null end,
        'INR', true, v_type = 'first_listing');
    end loop;
  end loop;

  return v_tracked_game_id;
end;
$$;

revoke all on function public.track_game_with_store_rules(bigint, text, text, text, bigint, text, text, text, jsonb) from public, anon;
grant execute on function public.track_game_with_store_rules(bigint, text, text, text, bigint, text, text, text, jsonb) to authenticated;

-- Only rules for the same region should fire for a regional GMG product mapping.
create or replace function public.process_store_price_snapshot(
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
  select * into v_product from public.store_products where id = p_store_product_id and store = 'gmg' for update;
  if not found then raise exception 'Green Man Gaming store product not found.' using errcode = 'P0002'; end if;
  if p_price is null or p_price < 0 then raise exception 'Price must be a non-negative number.' using errcode = '22023'; end if;
  if p_discount_percent is not null and (p_discount_percent < 0 or p_discount_percent > 100) then raise exception 'Discount must be between 0 and 100.' using errcode = '22023'; end if;

  insert into public.price_history (store_product_id, price, original_price, discount_percent, currency, recorded_at)
  values (p_store_product_id, p_price, p_original_price, p_discount_percent, 'INR', now());

  for v_rule in
    select ar.id as rule_id, ar.tracked_game_id, ar.alert_type, ar.target_price, ar.minimum_discount,
           tg.user_id, tg.edition, gc.title
    from public.tracked_games tg
    join public.game_catalog gc on gc.id = tg.game_id
    join public.alert_rules ar on ar.tracked_game_id = tg.id
    where tg.game_id = v_product.game_id
      and upper(tg.gmg_region_code) = upper(v_product.region_code)
      and lower(tg.edition) = lower(v_product.edition)
      and ar.is_enabled = true and ar.store in ('gmg', 'both')
  loop
    v_now_triggered := case v_rule.alert_type
      when 'target_price' then p_price <= v_rule.target_price
      when 'minimum_discount' then coalesce(p_discount_percent, 0) >= v_rule.minimum_discount
      when 'first_listing' then coalesce(p_is_first_listing, false)
      else false end;

    insert into public.alert_rule_product_state (alert_rule_id, store_product_id, is_triggered, last_price, last_discount_percent, last_checked_at)
    values (v_rule.rule_id, p_store_product_id, false, p_price, p_discount_percent, now())
    on conflict (alert_rule_id, store_product_id) do nothing;

    select is_triggered into v_was_triggered from public.alert_rule_product_state
    where alert_rule_id = v_rule.rule_id and store_product_id = p_store_product_id for update;

    if v_now_triggered and not v_was_triggered then
      if v_rule.alert_type = 'target_price' then
        v_message := format('%s (%s) on Green Man Gaming reached your target price of ₹%s. Current price: ₹%s.', v_rule.title, v_rule.edition, v_rule.target_price, p_price);
      elsif v_rule.alert_type = 'minimum_discount' then
        v_message := format('%s (%s) on Green Man Gaming reached a %s%% discount. Your threshold is %s%%.', v_rule.title, v_rule.edition, coalesce(p_discount_percent, 0), v_rule.minimum_discount);
      else
        v_message := format('%s (%s) has a newly verified Green Man Gaming listing.', v_rule.title, v_rule.edition);
      end if;
      insert into public.alert_events (user_id, tracked_game_id, alert_rule_id, store_product_id, event_type, price, original_price, discount_percent, currency, message)
      values (v_rule.user_id, v_rule.tracked_game_id, v_rule.rule_id, p_store_product_id, v_rule.alert_type, p_price, p_original_price, p_discount_percent, 'INR', v_message);
      v_event_count := v_event_count + 1;
    end if;

    update public.alert_rule_product_state
    set is_triggered = v_now_triggered, last_price = p_price, last_discount_percent = p_discount_percent, last_checked_at = now(),
        last_triggered_at = case when v_now_triggered and not v_was_triggered then now() else last_triggered_at end
    where alert_rule_id = v_rule.rule_id and store_product_id = p_store_product_id;
  end loop;
  return jsonb_build_object('priceRecorded', true, 'eventsCreated', v_event_count);
end;
$$;

revoke all on function public.process_store_price_snapshot(uuid, numeric, numeric, integer, boolean) from public, anon, authenticated;
grant execute on function public.process_store_price_snapshot(uuid, numeric, numeric, integer, boolean) to service_role;
