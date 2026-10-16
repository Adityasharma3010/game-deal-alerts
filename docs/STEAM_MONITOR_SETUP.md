# GamePulse Steam monitor setup

This implementation stores the selected Steam package ID, collects INR price snapshots, evaluates enabled Steam alert rules, and records alert activity without generating a duplicate event on every scheduled run.

## 1. Apply the database migration

Open the Supabase project dashboard → SQL Editor, then run the complete file:

`supabase/migrations/20261016090000_steam_package_monitoring.sql`

The migration:

- adds `steam_package_id` to `tracked_games` and `store_products`;
- replaces `track_steam_game` with a package-aware signature;
- creates `alert_events` and internal `alert_rule_product_state` tables;
- enables RLS and limits event reads to the signed-in owner;
- grants the price-processing RPC only to `service_role`.

Do not disable RLS. The migration does not expose the service-role key to the browser.

**Existing tracked games:** rows created before package IDs were saved will have `steam_package_id = NULL`. Do not guess their package IDs. Remove and re-add those game editions through Add Game so Steam can return the actual purchase option ID.

## 2. Configure Vercel server-side environment variables

Add these in Vercel → Project → Settings → Environment Variables for the deployment environments that should run monitoring:

- `SUPABASE_URL` — your Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — the Supabase service-role/secret key. This is server-only; never prefix it with `VITE_` and never put it in client code.
- `GAMEPULSE_CRON_SECRET` — a long random secret used to protect `/api/monitor-steam`.

Generate a secret locally in PowerShell (do not paste the generated value into chat):

```powershell
$secret = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$secret
```

Save that same value in Vercel as `GAMEPULSE_CRON_SECRET` and in the GitHub repository as a secret named `GAMEPULSE_CRON_SECRET`. Redeploy after setting Vercel variables.

`VITE_SUPABASE_URL` can be used as a URL fallback by the API, but the explicit server-side `SUPABASE_URL` is recommended.

## 3. Configure GitHub Actions

In GitHub → repository → Settings → Secrets and variables → Actions → New repository secret, add:

- `GAMEPULSE_MONITOR_URL` — the deployed site's origin only, e.g. `https://your-project.vercel.app` (no `/api/monitor-steam` suffix).
- `GAMEPULSE_CRON_SECRET` — the exact same secret configured in Vercel.

The workflow `.github/workflows/steam-monitor.yml` runs every six hours and can also be started from Actions → GamePulse Steam Price Monitor → Run workflow.

GitHub Actions cron uses UTC and can start a little later than the scheduled minute.

## 4. Verify it

1. Re-add one game edition so it has a real Steam package ID.
2. Confirm its row in `public.tracked_games` has a non-null `steam_package_id`.
3. Trigger the GitHub workflow manually.
4. Check the workflow response/log for `packagesChecked`, `packagesFailed`, and `alertEventsCreated`.
5. Check `price_history` for snapshots and `alert_events` for newly triggered rules.

The endpoint accepts POST only and requires `Authorization: Bearer <GAMEPULSE_CRON_SECRET>`. It should return 401 without the secret.

## Current scope / limitations

- This version checks Steam package prices in INR. Packages whose Steam response has no price or a different currency are skipped and reported as failures rather than silently converting currencies.
- Price snapshots and alert activity are persisted. Email delivery is **not** implemented by this change; it remains a separate step.
- Green Man Gaming matching and monitoring are **not** implemented by this change. The monitor only processes rules for `steam` or `both`, and currently only records Steam products.
- `first_listing` means the first successful verified observation of a package by this monitor. It does not mean a game has newly launched on Steam.
