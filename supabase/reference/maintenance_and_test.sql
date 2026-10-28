-- GamePulse maintenance and testing examples
-- READ BEFORE RUNNING. Write operations are commented out intentionally.

-- A. Set the STAR WARS: Galactic Racer Deluxe Steam target price.
-- Verify the row returned by the diagnostics query before updating.
-- UPDATE public.alert_rules ar
-- SET target_price = 1599.60, is_enabled = true, updated_at = now()
-- FROM public.tracked_games tg
-- JOIN public.game_catalog gc ON gc.id = tg.game_id
-- WHERE ar.tracked_game_id = tg.id
--   AND gc.title ILIKE '%Galactic Racer%'
--   AND tg.edition ILIKE '%Deluxe%'
--   AND ar.store = 'steam'
--   AND ar.alert_type = 'target_price'
-- RETURNING ar.id, tg.edition, ar.target_price, ar.is_enabled;

-- B. Add the STAR WARS ₹1,599.60 rule only if it does not already exist.
-- INSERT INTO public.alert_rules (
--   tracked_game_id, store, alert_type, target_price, minimum_discount,
--   currency, is_enabled, notify_on_first_listing
-- )
-- SELECT tg.id, 'steam', 'target_price', 1599.60, NULL, 'INR', true, false
-- FROM public.tracked_games tg
-- JOIN public.game_catalog gc ON gc.id = tg.game_id
-- WHERE gc.title ILIKE '%Galactic Racer%'
--   AND tg.edition ILIKE '%Deluxe%'
--   AND NOT EXISTS (
--     SELECT 1 FROM public.alert_rules existing
--     WHERE existing.tracked_game_id = tg.id
--       AND existing.store = 'steam'
--       AND existing.alert_type = 'target_price'
--       AND existing.target_price = 1599.60
--   )
-- RETURNING id, tracked_game_id, target_price;

-- C. Verify no duplicate GMG mappings by region + edition.
SELECT game_id, region_code, lower(trim(edition)) AS normalized_edition, count(*) AS rows
FROM public.store_products
WHERE store = 'gmg'
GROUP BY game_id, region_code, lower(trim(edition))
HAVING count(*) > 1;

-- D. Test the Steam snapshot RPC in a transaction and roll it back.
-- Use a real store_products.id and only run if the function signature exists.
-- The transaction rollback removes the test price history, state, and alert event.
--
-- BEGIN;
-- SELECT public.process_steam_price_snapshot(
--   'REPLACE-WITH-STEAM-STORE-PRODUCT-UUID'::uuid,
--   1500.00, 3750.00, 60, false
-- ) AS test_result;
-- SELECT event_type, price, discount_percent, message, created_at
-- FROM public.alert_events
-- WHERE store_product_id = 'REPLACE-WITH-STEAM-STORE-PRODUCT-UUID'::uuid
-- ORDER BY created_at DESC LIMIT 5;
-- ROLLBACK;

-- E. Test the GMG snapshot RPC in a transaction and roll it back.
-- Only use an explicitly mapped GMG product and a verified INR price.
--
-- BEGIN;
-- SELECT public.process_store_price_snapshot(
--   'REPLACE-WITH-GMG-STORE-PRODUCT-UUID'::uuid,
--   1500.00, 3750.00, 60, false
-- ) AS test_result;
-- SELECT event_type, price, discount_percent, message, created_at
-- FROM public.alert_events
-- WHERE store_product_id = 'REPLACE-WITH-GMG-STORE-PRODUCT-UUID'::uuid
-- ORDER BY created_at DESC LIMIT 5;
-- ROLLBACK;

-- F. Check function signatures deployed to the database.
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'track_steam_game',
    'track_steam_game_with_rules',
    'track_game_with_store_rules',
    'process_steam_price_snapshot',
    'process_store_price_snapshot'
  )
ORDER BY p.proname, arguments;
