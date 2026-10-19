# Per-game store selection implementation

## What changed

- Add Game lets the user choose Steam only, GMG only, or Both.
- GMG selection requires an official HTTPS Green Man Gaming product URL and a two-letter region code.
- The new `track_game_with_store_rules` Supabase RPC writes separate alert-rule rows for each selected store.
- GMG mappings are keyed by catalog game, exact edition, and region. The monitor only matches rules for the same edition and region.
- Missing regional mappings and pages without a structured INR price are reported as monitor failures rather than silently skipped or guessed.
- Editing alert thresholds preserves the store rule rows already configured for that tracked edition.

## Deploy order

1. Keep the existing migrations already applied.
2. In Supabase SQL Editor, run `20261019120000_email_delivery_and_gmg_monitoring.sql` if it has not already been applied.
3. Run `20261019133000_per_game_store_selection_and_gmg_regions.sql`.
4. Deploy the updated application and API functions to Vercel.
5. Run the GitHub Actions workflow manually once and inspect its logs.

## Important limitation

The app validates that a GMG URL is on the official domain, stores the region chosen by the user, matches the exact edition/region, and requires a structured INR price. The current price and alert-threshold model is INR-based, so pages exposing USD, GBP, EUR, or another currency fail validation; the monitor never converts or guesses prices. Supporting other currencies requires an end-to-end currency-aware change to Steam and GMG price fetching, alert thresholds, history, and UI formatting. The app also cannot independently guarantee that a GMG key is redeemable in that country. The user must verify the product page's regional restrictions; automated monitoring fails closed if the page does not expose a supported price.

The current Add Game flow still uses Steam search to discover the game/catalog entry. GMG-only tracking does not require a Steam package ID, but it does require the game to be discoverable through the current Steam search UI.
