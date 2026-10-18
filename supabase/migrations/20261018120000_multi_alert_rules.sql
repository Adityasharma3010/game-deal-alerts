-- GamePulse: allow multiple alert types per tracked Steam edition.
-- Apply this migration in Supabase SQL Editor before deploying the updated UI.

create or replace function public.track_steam_game_with_rules(
  p_steam_app_id bigint,
  p_title text,
  p_cover_image_url text,
  p_edition text,
  p_steam_package_id bigint,
  p_store text,
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
  v_count integer := 0;
begin
  if v_user_id is null then raise exception 'You must be signed in to track games.' using errcode = '28000'; end if;
  if p_steam_app_id is null or p_steam_app_id <= 0 then raise exception 'A valid Steam app ID is required.' using errcode = '22023'; end if;
  if nullif(trim(p_title), '') is null or nullif(trim(p_edition), '') is null then raise exception 'A game title and edition are required.' using errcode = '22023'; end if;
  if p_steam_package_id is null or p_steam_package_id <= 0 then raise exception 'A verified Steam package ID is required.' using errcode = '22023'; end if;
  if p_store is distinct from 'steam' then raise exception 'Only Steam tracking is currently available.' using errcode = '22023'; end if;
  if jsonb_typeof(p_alerts) is distinct from 'array' or jsonb_array_length(p_alerts) = 0 then raise exception 'Select at least one alert condition.' using errcode = '22023'; end if;

  insert into public.game_catalog (title, normalized_title, steam_app_id, cover_image_url)
  values (trim(p_title), lower(regexp_replace(trim(p_title), '\s+', ' ', 'g')), p_steam_app_id, p_cover_image_url)
  on conflict (steam_app_id) do update
    set title = excluded.title,
        cover_image_url = coalesce(excluded.cover_image_url, public.game_catalog.cover_image_url)
  returning id into v_game_id;

  insert into public.tracked_games (user_id, game_id, edition, steam_package_id)
  values (v_user_id, v_game_id, trim(p_edition), p_steam_package_id)
  on conflict (user_id, game_id, edition) do nothing
  returning id into v_tracked_game_id;
  if v_tracked_game_id is null then raise exception 'This game edition is already in your collection.' using errcode = '23505'; end if;

  for v_alert in select value from jsonb_array_elements(p_alerts) loop
    v_type := v_alert->>'type';
    v_target := nullif(v_alert->>'target_price', '')::numeric;
    v_discount := nullif(v_alert->>'minimum_discount', '')::integer;
    if v_type not in ('target_price', 'minimum_discount', 'first_listing') then raise exception 'Invalid alert type.' using errcode = '22023'; end if;
    if v_type = 'target_price' and (v_target is null or v_target <= 0) then raise exception 'Enter a target price greater than zero.' using errcode = '22023'; end if;
    if v_type = 'minimum_discount' and (v_discount is null or v_discount < 1 or v_discount > 100) then raise exception 'Discount must be between 1 and 100.' using errcode = '22023'; end if;
    if exists (select 1 from public.alert_rules where tracked_game_id = v_tracked_game_id and alert_type = v_type and store = p_store) then
      raise exception 'Each alert type can only be selected once per tracked edition.' using errcode = '22023';
    end if;
    insert into public.alert_rules (tracked_game_id, store, alert_type, target_price, minimum_discount, currency, is_enabled, notify_on_first_listing)
    values (v_tracked_game_id, p_store, v_type,
      case when v_type = 'target_price' then v_target else null end,
      case when v_type = 'minimum_discount' then v_discount else null end,
      'INR', true, v_type = 'first_listing');
    v_count := v_count + 1;
  end loop;
  return v_tracked_game_id;
end;
$$;

revoke all on function public.track_steam_game_with_rules(bigint, text, text, text, bigint, text, jsonb) from public, anon;
grant execute on function public.track_steam_game_with_rules(bigint, text, text, text, bigint, text, jsonb) to authenticated;
