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
- **Environment variable**: `NEXT_PUBLIC_DASHBOARD_URL` — set this to the
  Blob URL for `dashboard.json` documented in `docs/INFRA.md`. Without it,
  the deployed app falls back to the bundled fixture.
- **Revalidation**: the dashboard page sets `export const revalidate = 300`,
  so Vercel's ISR re-fetches `dashboard.json` from Blob storage at most
  every 300 seconds. The underlying data is produced and published by the
  Python pipeline (Plan 1); this app never writes data, only reads it.
