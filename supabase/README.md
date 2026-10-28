# GamePulse — Supabase SQL map

This folder is the source of truth for the database SQL checked into this repository.

## Folder layout

- `migrations/` — ordered, incremental changes for an already initialized GamePulse database. Apply each migration once, in filename order, unless it is already recorded as applied in Supabase.
- `schema/initial_schema_reference.sql` — baseline schema/policies represented by the original project SQL. **Reference/bootstrap only**; it is not an incremental migration and must not be run over an existing database without reviewing it.
- `reference/diagnostics.sql` — safe read-only queries for checking tracked editions, alert rules, GMG mappings, latest prices, and email delivery.
- `reference/maintenance_and_test.sql` — commented examples for rule maintenance and a rollback-based test. Review IDs and current data before running any write operation.

## Current migration order

1. `20261016090000_steam_package_monitoring.sql` — Steam package IDs, product-state table, alert events, and Steam snapshot RPC.
2. `20261018120000_multi_alert_rules.sql` — multiple rules per edition.
3. `20261019120000_email_delivery_and_gmg_monitoring.sql` — email delivery columns and GMG snapshot RPC.
4. `20261019133000_per_game_store_selection_and_gmg_regions.sql` — store selection, GMG region mapping, and region/edition-scoped matching.

The original schema was created manually before the migrations were added to this repository. For a brand-new Supabase project, review `schema/initial_schema_reference.sql` first, create the baseline, then apply the migrations in order. For the existing project, do not replay the baseline.

## Important implementation notes

- Steam pricing is fetched by exact Steam package ID with `cc=in`; the monitor rejects non-INR results.
- GMG products are explicitly mapped by official product URL and region. The monitor only accepts INR metadata; it does not convert USD prices into INR.
- GMG mappings are not considered verified until a successful monitor run updates `is_verified`.
- Alert events are created only on a transition from not-triggered to triggered. A rule can trigger again after its condition becomes false and later true.
- `first_listing` means the monitor has verified a mapped listing for the first time; it does not mean a search engine happened to find a product.
- The region-aware GMG snapshot function in migration `20261019133000...` replaces the earlier version from `20261019120000...`. Keep that order.
- Do not paste historical ad-hoc SQL from chat into production blindly. The `reference/` scripts are labeled by purpose and include safer queries.

## Verify what has actually been applied

Supabase SQL Editor does not automatically guarantee that SQL pasted manually is represented in migration history. Before applying anything, inspect the live schema and compare it with these files. The repo alone cannot confirm which SQL was executed in your Supabase project.

## Required server environment variables

See the root README and `docs/PRICE_MONITOR_SETUP.md` if present. Never expose `SUPABASE_SERVICE_ROLE_KEY` in `VITE_` variables or browser code.
