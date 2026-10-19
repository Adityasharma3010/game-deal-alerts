# GamePulse

GamePulse is a React + Vite game wishlist and price-alert dashboard. The app uses Supabase Auth and database tables, Tailwind CSS v4, and GSAP for its landing-page and dashboard animations.

## Local development

1. Install Node.js and npm.
2. Install dependencies with `npm ci`.
3. Create `.env.local` with the client-side Supabase values:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
   ```

4. Start the app with `npm run dev` or use `vercel dev` when testing `/api/*` endpoints locally.
5. Run `npm run lint` and `npm run build` before deploying.

Never put a Supabase service-role key in a `VITE_` variable or client-side code.

## Steam monitor setup

Read [`docs/PRICE_MONITOR_SETUP.md`](docs/PRICE_MONITOR_SETUP.md) before enabling monitoring. It covers the email-delivery migration, Resend and Vercel configuration, GitHub Actions secrets, explicit Green Man Gaming product mapping, and verification steps.

The scheduled workflow checks Steam and explicitly mapped Green Man Gaming listings every six hours. Triggered alert events are emailed through Resend to the email address on the user’s Supabase Auth account. GMG monitoring requires a verified product URL mapping and public INR price metadata; it does not guess product matches or prices.


### Store selection and regional GMG tracking

When adding a game, choose Steam only, GMG only, or Both. GMG requires the exact official product URL and a two-letter region code. Apply `supabase/migrations/20261019133000_per_game_store_selection_and_gmg_regions.sql` after the email/GMG migration. See `docs/PRICE_MONITOR_SETUP.md` for the complete setup and regional validation limits.
