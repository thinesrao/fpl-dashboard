# PepRoulette FPL Dashboard — Vercel Migration & Redesign

**Date:** 2026-08-25
**Status:** Design — awaiting approval before implementation planning
**Author:** thinesrao (with Claude)

---

## 1. Problem & Goals

The dashboard currently runs on **Streamlit Community Cloud**, which sleeps after
inactivity — the app is cold and slow for the first visitor after idle periods.
With a growing audience this is the primary pain point.

### Goals
- **Reliability:** the public dashboard is always warm, fast, and never sleeps.
- **Consolidation:** manage the one piece of manual data (penalty events) from
  inside the app instead of opening Google Sheets separately.
- **Freshness:** the dashboard reflects a finalized gameweek within ~1 hour
  instead of up to 6, and manual updates publish on demand.
- **Live experience:** show live points while matches are being played.
- **Preserve the backend:** the award-scoring math (`award_calculators.py`,
  `data_pipeline.py`) stays in Python, unchanged in logic.
- **Stay on the free tier** across all services.

### Non-Goals (this phase)
- Rewriting the award calculations or changing any scoring rule.
- User accounts for league members (only a single admin login exists).
- Retiring Google Sheets as a backup (it stays as a passive safety net).
- Multi-league / multi-tenant support.

---

## 2. Current System (baseline)

- **Pipeline** (`data_pipeline.py` + `award_calculators.py`): runs on GitHub
  Actions cron **every 6 hours**. Fetches the FPL API + FPL Challenge API, reads
  one **manual** worksheet (`manual_penalty_data`: `Gameweek`, `Player_Name`,
  `Event_Type`), computes ~25 awards, and writes ~30 worksheets back to a Google
  Sheet (`FPL-Data-Pep-2026-27`).
- **Frontend** (`app.py`, Streamlit): reads every worksheet via `gspread` on page
  load (cached 10 min), renders Plotly bar/line charts and tables across 3 tabs
  (Standard / Special / Detailed). Fully **read-only** — no auth, no writes.

The only human input in the entire system is the `manual_penalty_data` sheet
(penalty scored/won player names, which the FPL API does not expose).

---

## 3. Target Architecture

Three planes plus a live overlay. The **public dashboard depends on nothing but a
static JSON file** — it cannot sleep, rate-limit, or break when Supabase or
Sheets is down. Only the authenticated admin ever touches the database.

```
                         FPL API + FPL Challenge API
                                    │
   Supabase (penalty events) ───────┤
                                    ▼
                    ┌──────────────────────────────┐
                    │  PYTHON PIPELINE (unchanged    │
                    │  award logic) — GitHub Actions │
                    │  worker, triggered on demand   │
                    └───────────────┬────────────────┘
              writes static JSON    │    mirrors backup
                  ┌─────────────────┴──────────────────┐
                  ▼                                     ▼
            Vercel Blob                          Google Sheet
          (dashboard.json)                     (passive backup)
                  │
   reads static  │
                  ▼
   ┌──────────────────────────┐        ┌──────────────────────────────┐
   │ PUBLIC DASHBOARD          │        │ ADMIN (authenticated)         │
   │ Next.js on Vercel         │        │ Next.js /admin                │
   │ static awards + live      │        │ Supabase Auth login           │
   │ overlay (cached route)    │        │ penalty form + "Publish now"  │
   └──────────────────────────┘        └───────────────┬───────────────┘
                                          writes penalty rows → Supabase
                                          Publish → GitHub workflow_dispatch
```

### 3.1 Planes
1. **Pipeline (worker):** Python, GitHub Actions, unchanged award logic.
2. **Public read plane:** static `dashboard.json` on Vercel Blob → Next.js
   (ISR/edge-cached). Bulletproof static.
3. **Admin write plane:** `/admin` routes, Supabase Auth + Supabase Postgres.
4. **Live overlay:** a cached Vercel serverless route that computes live
   standings during match windows (see §7).

---

## 4. Scheduling — watch-and-gate (replaces blind 6h cron)

The FPL `bootstrap-static` endpoint exposes each gameweek's `finished` and
`data_checked` flags. `data_checked: true` is exactly the "final at ~9am UK the
day after the last match" moment. We react to that flag instead of polling blind.

- **Watcher — Vercel Cron (hourly):** hits a tiny serverless route that fetches
  only `bootstrap-static` and asks: *has the latest finalized gameweek advanced
  beyond what is currently published (compared against the published
  `metadata`), OR is a manual Publish pending?* If neither → exit in ~200ms. If
  either → trigger the pipeline via GitHub `workflow_dispatch`.
- **Worker — GitHub Actions:** runs the full Python pipeline only when
  dispatched (by the watcher or the admin Publish button). No time-based cron
  that runs the heavy job.
- **On-demand — Publish button:** admin enters penalties → clicks Publish → same
  `workflow_dispatch` → dashboard live in ~2 minutes.

**Rationale:** the frequent check is nearly free on Vercel and never pays a
GitHub runner startup + `pip install`; the heavy pipeline runs ~once per
gameweek at finalization (plus on demand). Staleness drops from ≤6h to ≤1h.
GitHub/Vercel cron are both static-schedule, so poll-and-gate is the correct
pattern (no dynamic-cron gymnastics). Player price timing (1–3am UK) is ignored:
no award depends on price.

---

## 5. Data Model (Supabase)

**Table `manual_penalty_events`**

| column      | type        | notes                                             |
|-------------|-------------|---------------------------------------------------|
| `id`        | uuid pk     | default `gen_random_uuid()`                       |
| `gameweek`  | int         | 1–38                                              |
| `player_name` | text      | must match FPL naming; UI offers a lookup (§6.3)  |
| `event_type`| text enum   | `Penalty Scored` \| `Penalty Won` \| `Penalty Missed` \| `Penalty Saved` — must match the strings `award_calculators.calculate_penalty_score` counts (`"Penalty Scored"`/`"Penalty Won"`); the admin form (§6.3) submits these exact values |
| `created_at`| timestamptz | default `now()`                                   |
| `created_by`| uuid        | references `auth.users` (the admin)               |

- **RLS:** only authenticated admin(s) can `select/insert/update/delete`.
- **Pipeline access:** the Python worker reads this table via the Supabase
  **service-role key** (server-side, bypasses RLS) — replacing the
  `manual_penalty_data` Sheets read.
- **Auth:** Supabase Auth, a single admin account (email+password or magic link).
  No custom credential handling.

**One-off migration:** a script copies existing `manual_penalty_data` rows from
the Google Sheet into `manual_penalty_events` before cutover.

---

## 6. Frontend (Next.js App Router)

### 6.1 Stack
- **Next.js (App Router) + TypeScript**, deployed on Vercel.
- **Tailwind CSS + shadcn/ui** for the shell (tabs, cards, dialogs, forms).
- **Recharts** for the horizontal-bar races and cumulative line charts
  (replacing Plotly).
- **Supabase JS client** for admin auth + writes.
- **Zod** for form validation.

### 6.2 Visual system — Direction A ("Neon Arena") — locked
- Background `#0b0f14` charcoal with a subtle top green glow; panels `#151b23`;
  hairlines `#232c38`.
- Accent (electric green) `#2bfca4`; live/alert `#ff4d6d`; gold `#ffd24a`.
- Display font **Archivo Black** (headings/wordmark); body **Inter**.
- Sticky header with brand + pulsing `LIVE` pill + gameweek/last-updated.
- Pill-style tabs: **Standard / Special / Detailed** (mirrors current IA).
- League **race** charts with the current user's row highlighted in neon;
  **Special Award** cards showing leader + score + gap; Detailed tab keeps the
  cumulative-progression line charts and full standings tables.
- Reference mockup: `.superpowers/brainstorm/.../dashboard-redesign.html`.

### 6.3 Routes
- `/` — public dashboard (3 tabs), reads `dashboard.json`; **static/ISR**.
- Live overlay component on `/` (see §7).
- `/admin` — Supabase Auth login.
- `/admin/penalties` — form to add/edit penalty events for a gameweek, plus a
  **Publish now** button. The form offers a **player-name lookup** sourced from
  the pipeline's `_player_names` data so entries always match FPL naming and the
  Penalty King award resolves correctly.

### 6.4 Read path
The pipeline emits a single `dashboard.json` shaped as `{ sheetName: records[] }`
(mirroring today's `all_data` dict) plus `metadata`. The frontend fetches it at
build / on revalidate; the public page carries no Supabase or Sheets dependency.

---

## 7. Live Scores Overlay

Shown while matches in the current gameweek are in play; otherwise the UI shows
finalized data only.

- **Picks cached once:** after the gameweek deadline, fetch all managers'
  `entry/{id}/event/{gw}/picks/` once and cache (they are locked for the GW).
- **One upstream call per poll:** `event/{gw}/live/` returns live stats for all
  players in a single request; live manager totals are computed locally from the
  cached picks.
- **Server-side caching decouples users from FPL:** a Vercel serverless route
  fetches `event/{gw}/live` at most once per ~60s and caches the computed
  standings. N users → still ~1 FPL call/minute. The client polls **our** route,
  never FPL.
- **Active only during match windows:** kickoff times come from the API; outside
  the window the route serves the last finalized snapshot and the client stops
  polling.

Rate limits are therefore a non-issue. The overlay never touches the
award-finalization logic; it is purely additive.

---

## 8. Pipeline Changes (minimal, logic untouched)

1. **Read swap:** replace the `manual_penalty_data` Google Sheets read
   (`data_pipeline.py` ~L191–201) with a Supabase query into
   `manual_penalty_events`. `calculate_penalty_score` and all award math are
   unchanged — the existing pytest suite continues to guard them.
2. **Write add:** after building `worksheets_to_write`, serialize the dict to
   `dashboard.json` and upload to Vercel Blob. **Keep** the existing Google
   Sheets write loop as backup.
3. **Watcher gate:** a small `should_run` check (usable by the Vercel watcher or
   as a pipeline pre-step) comparing `bootstrap-static` finalized-GW state to the
   published `metadata`.
4. **New secrets:** Supabase URL + service-role key, Vercel Blob RW token, and
   (for Publish) a GitHub PAT with `workflow_dispatch` scope.

---

## 9. Auth & Security
- Supabase Auth session checked in Next.js middleware for all `/admin/*` routes.
- RLS on `manual_penalty_events`; service-role key used **only** server-side in
  the pipeline, never shipped to the browser.
- GitHub PAT and Blob token are server-only (serverless route env, and GitHub
  Actions secrets). Never exposed to the client bundle.
- Zod validation on the penalty form; `event_type` constrained to the enum.
- Public dashboard exposes only already-public league data.

---

## 10. Testing
- **Pipeline (unchanged math):** existing pytest award-calculator tests stay
  green. Add a unit test for the Supabase penalty read (mocked client) proving it
  produces the same `manual_events` shape the old Sheets read did.
- **Watcher gate:** unit test the `should_run` decision across states
  (no change / GW finalized / publish pending).
- **Frontend:** unit tests for chart data transforms and penalty-form validation;
  integration test for `dashboard.json` fetch → render; Playwright e2e for
  `login → add penalty → Publish`.
- **Live overlay:** unit test the picks×live-stats computation with a fixture;
  verify the route caches (single upstream fetch across concurrent requests).
- Coverage target 80%+ per project standards.

---

## 11. Rollout (parallel, low-risk)
0. **Provision:** Supabase project + `manual_penalty_events` schema + RLS + admin
   user; Vercel project + Blob store; migrate existing penalty rows from Sheet.
1. **Pipeline:** add Supabase read + Blob write (Sheets backup stays). Verify the
   emitted `dashboard.json` matches current sheet data byte-for-byte where
   applicable.
2. **Public dashboard:** build the Direction-A Next.js app reading `dashboard.json`;
   deploy to Vercel and run **alongside** the live Streamlit app.
3. **Admin panel:** Supabase Auth login + penalty form (with player-name lookup).
4. **Publish button + Vercel Cron watcher:** wire `workflow_dispatch`; retire the
   blind 6h cron.
5. **Live overlay:** add the cached live route + UI, active during match windows.
6. **Cutover:** point the public link at Vercel; retire the Streamlit app. Keep
   Google Sheets as backup.

---

## 12. Free-tier Notes / Risks
- **Vercel Blob:** payload is small (hundreds of KB) — comfortably free.
- **Supabase free tier** pauses after ~7 days idle; the hourly watcher and
  pipeline keep it warm, and the *public static site is unaffected* if it sleeps
  (only admin login would need a wake).
- **GitHub Actions:** minutes/month usage is negligible.
- **Vercel Hobby:** fine for a personal/non-commercial project; needs Pro only if
  it becomes commercial.
- **FPL player-name matching** for penalties remains the main data-quality risk;
  mitigated by the `_player_names` lookup in the admin form.
- **Repo layout:** the Next.js app lives in a `web/` subfolder; the Python
  pipeline stays at the repo root. Vercel project root = `web/`.

---

## 13. Open Questions (non-blocking)
- Admin login method: email+password vs. magic link (default: magic link).
- Poll interval for the live overlay: 60s vs 90s (default: 60s).
- Whether to also snapshot each gameweek's results into a Supabase history table
  for future analytics (default: defer; Sheet remains the record).
