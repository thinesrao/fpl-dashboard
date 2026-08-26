# PepRoulette Dashboard (web)

Next.js App Router dashboard for the Pep's Roulette mini-league. This is the
public read-only dashboard described in Plan 2 of the Streamlit → Vercel
migration; the data itself is published by the Python pipeline in Plan 1.

## Dashboard IA

The dashboard is a single, story-led scroll — no tabs. `DashboardShell`
(`app/components/DashboardShell.tsx`) composes it top to bottom:

1. **Header** — brand mark, current gameweek, last-updated time, live badge.
2. **Live section** — an in-progress-gameweek leaderboard overlay, shown only
   while a gameweek is live (polls `/api/live`).
3. **Verdict hero** — the headline call: this gameweek's Manager of the Week
   and how tight the title race is.
4. **Talking points** — four data-derived callouts (biggest riser, spoon
   watch, highest GW score, worst H2H luck).
5. **The race** — classic/H2H standings with a switcher; tap any manager's
   name to open their profile.
6. **Trophy cabinet** — one coin per special award that has data; tap a coin
   to open its detail (top chasers + a cumulative progression chart, when the
   award sheet carries per-GW columns).
7. **Hall of Fame** — a horizontally-scrolling strip of past weekly/monthly
   winners.

All of these are pure derivations from the fetched dashboard JSON, computed
in `lib/story.ts` (`verdict`, `talkingPoints`, `cabinet`, `trophyChase`,
`managerProfile`) and unit-tested there rather than in the components.

**Overlays, not routes.** Trophy detail and manager profile are modal
overlays, not separate pages — `OverlayContext` (`app/components/
OverlayContext.tsx`) exposes `openTrophy(key)` / `openManager(name)`, and
`DashboardShell` holds the open state and renders `TrophyDetail` /
`ManagerProfile` on top of the scroll when set. There's no dedicated
manager-highlight selector; picking a manager to look at is just tapping
their name in the race board.

### Brand assets

- `app/icon.png`, `app/apple-icon.png` — Next.js App Router icon convention
  (favicon / apple touch icon), served automatically.
- `public/logo-mark.png`, `public/icon-192.png`, `public/icon-512.png` — the
  header logo mark and PWA-style icon sizes.
- `docs/brand/peproulette-logo.jpg` and `docs/brand/redesign-mockup.html` —
  source brand assets and the reference mockup this IA was implemented from
  (tracked for reference, not built).

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
and reuses an already-running dev server if one is up. `e2e/smoke.spec.ts`
loads the dashboard against the committed fixture and walks the story IA end
to end: header brand, verdict headline, race board, trophy cabinet, then
taps a trophy coin to open its detail overlay and a manager's name to open
their profile overlay.

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

## Live scores (Plan 4)

Live-score leaderboard overlay showing gameweek standings updated in real-time
during match windows.

### How it works
- The `/api/live` route computes the current-gameweek live leaderboard and
  caches the result for 60 seconds.
- The `LiveSection` component polls the route every 60 seconds and only displays
  the overlay during active match windows (when `isGameweekLive` is true).
- The `NEXT_PUBLIC_CLASSIC_LEAGUE_ID` environment variable selects which league
  to display (optional; defaults to the PepRoulette Classic id if unset).

### Environment setup
- `NEXT_PUBLIC_CLASSIC_LEAGUE_ID` — Classic league ID (optional; defaults to
  218144). No deploy-time secret is required; this is a public identifier.
