# GamePulse price monitor setup

## 1. Apply the database migration

In Supabase Dashboard → SQL Editor, run:

`supabase/migrations/20261019120000_email_delivery_and_gmg_monitoring.sql`

This adds email delivery status fields to `alert_events` and creates the GMG snapshot processor. It does not delete or reset tracked games, alert rules, or price history.

## 2. Vercel environment variables

Keep these server-side variables configured for **Production** (and Preview if you test previews):

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key; never expose it with a `VITE_` prefix
- `GAMEPULSE_CRON_SECRET` — a long random secret shared with GitHub Actions
- `RESEND_API_KEY` — the Resend API key
- `RESEND_FROM_EMAIL` — optional; recommended value `GamePulse <alerts@send.adityasharma.site>` if that sender/domain is verified in Resend

After changing Vercel environment variables, redeploy the project for the new values to be available to functions.

## 3. Configure GitHub Actions

In GitHub repository Settings → Secrets and variables → Actions, create:

- `GAMEPULSE_MONITOR_URL` = the production origin, e.g. `https://your-project.vercel.app` (no `/api/...` suffix)
- `GAMEPULSE_CRON_SECRET` = exactly the same value as the Vercel variable

The existing workflow runs Steam and GMG checks every six hours and can also be started manually from Actions → GamePulse Price Monitor → Run workflow.


## 4. Per-game store choice and GMG regions

Apply `supabase/migrations/20261019133000_per_game_store_selection_and_gmg_regions.sql` after the email/GMG migration above. It adds a per-tracked-edition GMG region, region-scoped GMG product mappings, and the `track_game_with_store_rules` RPC used by the updated Add Game modal. It does not delete existing Steam rules or price history.

When adding a game, users can choose **Steam only**, **GMG only**, or **Both stores**. For GMG, they must provide the exact official product URL and a two-letter region code such as `IN`, `US`, or `GB`. Both creates separate alert rules for each selected store so a GMG failure cannot disable Steam. GMG-only does not require a Steam package ID, but the game is still discovered from Steam search in this version of the UI.

A GMG mapping is shared by catalog game, exact edition, and region. The monitor requires the public page to expose a structured INR price. A URL passing the domain check does not prove the key is redeemable in that region; users should verify the product page and redemption restrictions. Unsupported currencies, blocked pages, and missing prices fail closed rather than guessing.

## 5. Legacy/manual Green Man Gaming product mappings

GMG does not use Steam package IDs. The monitor only checks product pages that have been explicitly mapped to the correct catalog game. It reads the product page's structured JSON-LD metadata and requires a public INR price. If GMG changes the page structure, blocks automated requests, or only exposes a non-INR price, that product is reported as failed rather than guessing a price.

For each tracked game that should be monitored on GMG, first confirm the exact official GMG product URL and then insert/update one row in `store_products`. Example (replace the UUID and URL with real values from your database and the exact product page):

```sql
INSERT INTO public.store_products (
  game_id, store, product_url, product_title, edition, currency, is_verified
)
VALUES (
  'YOUR_GAME_CATALOG_UUID'::uuid,
  'gmg',
  'https://www.greenmangaming.com/games/your-exact-game-page/',
  'Exact GMG edition title',
  'Deluxe Edition',
  'INR',
  false
)
ON CONFLICT (store, product_url) DO UPDATE SET
  game_id = EXCLUDED.game_id,
  product_title = EXCLUDED.product_title,
  edition = EXCLUDED.edition,
  currency = 'INR',
  is_verified = false;
```

The `game_id` must be the same catalog game used by the user's tracked edition, and `edition` must exactly match `tracked_games.edition` (case-insensitive). Include `region_code` for the intended region. The mapping is shared by catalog game, edition, and region. GMG alert rules must have store `gmg` or `both`; Steam rules remain separate. Do not create a mapping from a search-result URL or a guessed URL.

## 6. Email delivery behavior

When a rule first transitions from not-triggered to triggered, Supabase records an `alert_events` row. The monitor then sends pending events to the email address on that user's Supabase Auth account using Resend. A successful send stamps `email_sent_at`; failures are logged in `email_error` and retried on a later monitor run.

Useful verification query:

```sql
SELECT id, user_id, event_type, message, created_at, email_sent_at, email_error
FROM public.alert_events
ORDER BY created_at DESC
LIMIT 30;
```

The email sender defaults to `alerts@send.adityasharma.site`. Set `RESEND_FROM_EMAIL` if your verified Resend sender address differs. The domain being verified does not by itself prove the chosen mailbox address is configured as the sender; use an address on the verified domain.
