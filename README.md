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

Read [`docs/STEAM_MONITOR_SETUP.md`](docs/STEAM_MONITOR_SETUP.md) before enabling monitoring. It covers the required Supabase migration, server-side Vercel environment variables, GitHub Actions secrets, and verification steps.

The current monitor stores Steam INR price snapshots and triggered alert activity. Green Man Gaming matching and email delivery are not part of this implementation yet.
