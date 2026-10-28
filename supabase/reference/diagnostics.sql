-- GamePulse read-only diagnostics
-- Run in Supabase SQL Editor. These queries do not modify data.

-- 1. Tracked editions and every alert rule.
SELECT
  gc.id AS game_catalog_id,
  gc.title AS game,
  tg.id AS tracked_game_id,
  tg.edition,
  tg.steam_package_id,
  tg.gmg_region_code,
  ar.id AS alert_rule_id,
  ar.store,
  ar.alert_type,
  ar.target_price,
  ar.minimum_discount,
  ar.is_enabled,
  ar.created_at,
  ar.last_triggered_at
FROM public.tracked_games tg
JOIN public.game_catalog gc ON gc.id = tg.game_id
LEFT JOIN public.alert_rules ar ON ar.tracked_game_id = tg.id
ORDER BY gc.title, tg.edition, ar.store, ar.alert_type;

-- 2. Store products, edition/region verification, and latest recorded snapshot.
SELECT
  gc.title AS game,
  sp.store,
  sp.product_title,
  sp.edition,
  sp.product_url,
  sp.region_code,
  sp.steam_package_id,
  sp.currency,
  sp.is_verified,
  sp.last_checked_at,
  latest.price AS latest_price,
  latest.original_price AS latest_original_price,
  latest.discount_percent AS latest_discount_percent,
  latest.currency AS history_currency,
  latest.recorded_at AS latest_price_recorded_at
FROM public.store_products sp
JOIN public.game_catalog gc ON gc.id = sp.game_id
LEFT JOIN LATERAL (
  SELECT ph.price, ph.original_price, ph.discount_percent, ph.currency, ph.recorded_at
  FROM public.price_history ph
  WHERE ph.store_product_id = sp.id
  ORDER BY ph.recorded_at DESC
  LIMIT 1
) latest ON true
ORDER BY gc.title, sp.store, sp.region_code, sp.edition;

-- 3. Focused view for the four target games.
SELECT
  gc.title AS game,
  tg.edition AS tracked_edition,
  tg.steam_package_id,
  tg.gmg_region_code,
  ar.store AS alert_store,
  ar.alert_type,
  ar.target_price,
  ar.minimum_discount,
  ar.is_enabled,
  sp.id AS store_product_id,
  sp.edition AS product_edition,
  sp.region_code AS product_region,
  sp.product_url,
  sp.is_verified,
  sp.last_checked_at
FROM public.game_catalog gc
JOIN public.tracked_games tg ON tg.game_id = gc.id
LEFT JOIN public.alert_rules ar ON ar.tracked_game_id = tg.id
LEFT JOIN public.store_products sp
  ON sp.game_id = gc.id
 AND (
      (sp.store = 'steam' AND sp.steam_package_id = tg.steam_package_id)
      OR
      (sp.store = 'gmg'
       AND upper(sp.region_code) = upper(tg.gmg_region_code)
       AND lower(trim(sp.edition)) = lower(trim(tg.edition)))
 )
WHERE gc.title ILIKE ANY (ARRAY[
  '%Galactic Racer%',
  '%Resident Evil Requiem%',
  '%Crimson Desert%',
  '%PRAGMATA%'
])
ORDER BY gc.title, tg.edition, ar.store, ar.alert_type;

-- 4. GMG mappings that have not been verified or have never been checked.
SELECT
  gc.title AS game,
  sp.edition,
  sp.region_code,
  sp.product_url,
  sp.currency,
  sp.is_verified,
  sp.last_checked_at
FROM public.store_products sp
JOIN public.game_catalog gc ON gc.id = sp.game_id
WHERE sp.store = 'gmg'
  AND (sp.is_verified = false OR sp.last_checked_at IS NULL)
ORDER BY gc.title, sp.region_code, sp.edition;

-- 5. Latest alert events and email delivery status.
SELECT
  ae.created_at,
  gc.title AS game,
  tg.edition,
  ar.store,
  ae.event_type,
  ae.price,
  ae.original_price,
  ae.discount_percent,
  ae.currency,
  ae.message,
  ae.email_sent_at,
  ae.email_error
FROM public.alert_events ae
JOIN public.tracked_games tg ON tg.id = ae.tracked_game_id
JOIN public.game_catalog gc ON gc.id = tg.game_id
JOIN public.alert_rules ar ON ar.id = ae.alert_rule_id
ORDER BY ae.created_at DESC
LIMIT 100;

-- 6. Counts useful after a monitor run.
SELECT 'tracked_games' AS item, count(*) AS total FROM public.tracked_games
UNION ALL SELECT 'alert_rules', count(*) FROM public.alert_rules
UNION ALL SELECT 'store_products', count(*) FROM public.store_products
UNION ALL SELECT 'price_history', count(*) FROM public.price_history
UNION ALL SELECT 'alert_events', count(*) FROM public.alert_events;
