# PepRoulette Dashboard (web)

Next.js App Router dashboard for the Pep's Roulette mini-league. This is the
public read-only dashboard described in Plan 2 of the Streamlit → Vercel
migration; the data itself is published by the Python pipeline in Plan 1.

## Local development

```bash
npm install
npm run dev
```

Opens on `http://localhost:3000`. With `NEXT_PUBLIC_DASHBOARD_URL` unset,
the app reads `fixtures/dashboard.sample.json` instead of fetching from
Blob storage, so local dev works without any live data feed.

## Tests

Unit / component tests (Vitest + Testing Library):

```bash
npm run test
```

End-to-end smoke test (Playwright, against the fixture data):

```bash
npx playwright install chromium   # first run only
npm run e2e
```

The Playwright config (`playwright.config.ts`) boots `npm run dev` itself
and reuses an already-running dev server if one is up.

## Production build

```bash
npm run build
```

## Deploying to Vercel

- **Root Directory**: `web/` (this project lives in a subdirectory of the
  monorepo; set this in the Vercel project settings).
- **Framework Preset**: Next.js (auto-detected).
- **Environment variables (Config type)**:
  - `NEXT_PUBLIC_DASHBOARD_URL` — set this to the Blob URL for `dashboard.json` documented in `docs/INFRA.md`. Without it, the deployed app falls back to the bundled fixture.
  - `NEXT_PUBLIC_SUPABASE_URL` — Project URL from Supabase (Plan 3).
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key from Supabase (Plan 3).
- **Environment secrets (Secret type)**:
  - `GH_DISPATCH_TOKEN` — GitHub PAT for the admin Publish button (server-only; never `NEXT_PUBLIC`).
- **Revalidation**: the dashboard page sets `export const revalidate = 300`,
  so Vercel's ISR re-fetches `dashboard.json` from Blob storage at most
  every 300 seconds. The underlying data is produced and published by the
  Python pipeline (Plan 1); this app never writes data, only reads it.

## Admin panel (Plan 3)

The admin panel enables the Pep's Roulette admins to log in, view league standings
(read-only copy of the dashboard), enter manual penalties, and trigger immediate
pipeline reruns.

### Routes
- `/admin/login` — email + password login (Supabase Auth). Only the single
  admin user can log in.
- `/admin/penalties` — add new manual penalty events (e.g., "Penalty Scored",
  "Penalty Missed") and optionally trigger a pipeline rerun ("Publish now").

### Setup
Set up Supabase authentication (create the admin user in Supabase) and the
GitHub PAT (for "Publish now") as documented in `docs/INFRA.md` (Plan 3 section).
