-- GamePulse: track delivery state for alert emails and support GMG price snapshots.

alter table public.alert_events
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_error text;

create index if not exists alert_events_pending_email_idx
  on public.alert_events (created_at asc)
  where email_sent_at is null;

-- Green Man Gaming product URLs are mapped to a shared catalog game.
-- Unlike Steam, GMG has no Steam package ID, so match enabled rules by store.
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
  select * into v_product
  from public.store_products
  where id = p_store_product_id and store = 'gmg'
  for update;

  if not found then
    raise exception 'Green Man Gaming store product not found.' using errcode = 'P0002';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'Price must be a non-negative number.' using errcode = '22023';
  end if;
  if p_discount_percent is not null and (p_discount_percent < 0 or p_discount_percent > 100) then
    raise exception 'Discount must be between 0 and 100.' using errcode = '22023';
  end if;

  insert into public.price_history (
    store_product_id, price, original_price, discount_percent, currency, recorded_at
  ) values (
    p_store_product_id, p_price, p_original_price, p_discount_percent, 'INR', now()
  );

  for v_rule in
    select ar.id as rule_id, ar.tracked_game_id, ar.alert_type, ar.target_price,
           ar.minimum_discount, tg.user_id, tg.edition, gc.title
    from public.tracked_games tg
    join public.game_catalog gc on gc.id = tg.game_id
    join public.alert_rules ar on ar.tracked_game_id = tg.id
    where tg.game_id = v_product.game_id
      and ar.is_enabled = true
      and ar.store in ('gmg', 'both')
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
    where alert_rule_id = v_rule.rule_id and store_product_id = p_store_product_id
    for update;

    if v_now_triggered and not v_was_triggered then
      if v_rule.alert_type = 'target_price' then
        v_message := format('%s (%s) on Green Man Gaming reached your target price of ₹%s. Current price: ₹%s.', v_rule.title, v_rule.edition, v_rule.target_price, p_price);
      elsif v_rule.alert_type = 'minimum_discount' then
        v_message := format('%s (%s) on Green Man Gaming reached a %s%% discount. Your threshold is %s%%.', v_rule.title, v_rule.edition, coalesce(p_discount_percent, 0), v_rule.minimum_discount);
      else
        v_message := format('%s (%s) has a newly verified Green Man Gaming listing.', v_rule.title, v_rule.edition);
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
        last_triggered_at = case when v_now_triggered and not v_was_triggered then now() else last_triggered_at end
    where alert_rule_id = v_rule.rule_id and store_product_id = p_store_product_id;
  end loop;

  return jsonb_build_object('priceRecorded', true, 'eventsCreated', v_event_count);
end;
$$;

revoke all on function public.process_store_price_snapshot(uuid, numeric, numeric, integer, boolean) from public, anon, authenticated;
grant execute on function public.process_store_price_snapshot(uuid, numeric, numeric, integer, boolean) to service_role;
grant select, insert, update on public.alert_events to service_role;
