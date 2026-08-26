# PepRoulette Dashboard Redesign — Design Spec

**Date:** 2026-08-26
**Status:** Design — awaiting approval before implementation planning
**Author:** thinesrao (with Claude)

---

## 1. Problem & Goals

The current dashboard still reads like the old Streamlit app: three tabs (Standard / Special / Detailed), a manager-highlight dropdown, and a "Detailed Standings" tab whose 28-line spaghetti charts are unreadable and unhelpful. It's a data dump, not an experience.

### Goals
- **Entertain first, inform through story.** Lead with the week's drama — who won, who's rising, who's bottom — not tables.
- **Kill the 3-tab structure.** One single-scroll page organized by story, not by data type.
- **Remove the manager-highlight dropdown.** Replace with tappable **manager profiles** (depth on demand).
- **Fix the charts.** Charts become contextual and meaningful (one award / one manager at a time, top contenders only) — never a 28-series tangle.
- **New personality + palette:** "Hype/Banter" energy (loud verdicts, callouts) with an **arcade collectible trophy cabinet**.
- **Readability is non-negotiable:** the thick condensed display font is display-only; all substantive text is clean and legible.

### Non-Goals
- No change to the pipeline's award-scoring math, Supabase, admin panel, or the live-scores backend (the `/api/live` route stays; only its presentation restyles).
- No new backend services. Redesign is almost entirely `web/` plus one small pipeline output (`gw_scores` sheet).
- Shareable per-manager URLs are out of v1 (profiles open as an overlay); can be added later.

---

## 2. Personality & Visual System

**Direction:** Hype/Banter energy + Arcade collectible trophy cabinet. Dark, loud, bold — a group chat turned pro — with glowing collectible trophies as the awards experience.

### Palette (tokens; replace the current "Neon Arena" set)
- `--bg:#0a0a0f`, `--panel:#15131f`, `--panel2:#1b1828`, `--line:#231f30`
- `--ink:#ffffff`, `--muted:#8f8aa3`
- `--pink:#ff2e93` (primary accent), `--lime:#c6ff00` (secondary accent)
- Trophy-coin colors: `--gold:#ffd23f`, `--cyan:#4ad9ff`, `--purple:#9b5cff` (+ pink/lime reused)
- `--live:#ff4d6d` (live pulse)

### Typography — the readability rule (binding)
- **Display font: Anton** (thick condensed) is used ONLY for: the Verdict headline, section labels, big numeric values (points/scores), and the brand wordmark. Never for sentences, descriptions, table cells, or anything below ~16px where it gets hard to read.
- **Body font: Inter** for everything else — labels, names, descriptions, table content, buttons. Weight 400–800, minimum body size 13px, and adequate contrast (body text ≥ `--muted` `#8f8aa3` on `--bg`; primary content in `--ink`).
- Every callout/label pairs a small Anton/Inter uppercase kicker with an Inter value line — the *value* (the actual name/number a user reads) is always Inter, legible.

### Motion
- Sparing: the LIVE pulse dot, subtle hover lift on trophies, bar fills animate in. No gratuitous animation.

---

## 3. Information Architecture (single scroll, no tabs)

Top to bottom:

1. **Header (sticky)** — brand `PEP·ROULETTE`, gameweek + last-updated, an `Admin` link, and a pulsing `LIVE` pill during match windows.
2. **Live strip (conditional)** — the existing `/api/live` leaderboard, restyled to the hype look; only rendered during matches (reuse the Plan-4 route + `isGameweekLive` gate).
3. **The Verdict (hero)** — the big auto-written headline of the week: Manager of the Week + their points, with a cheeky result-aware line.
4. **The Talking Points** — a row of 4 data-derived callouts: 🔥 Biggest Riser, 🥄 Spoon Watch, 🚀 Highest GW, 😢 Bad Luck.
5. **The Race** — standings as chunky bars with an inline **Classic ↔ Head-to-Head** segmented switch (not a tab). Shows top 8, "Show all 28" expands. Tapping a name opens that manager's profile.
6. **The Trophy Cabinet** — all 24 awards as glowing collectible coins in a grid. Tapping a coin opens **Trophy Detail**.
7. **Trophy Detail (overlay)** — the holder, the chase (top 3–4), and — only for awards that have per-GW columns — a clean progression chart of the top contenders.
8. **Manager Profile (overlay)** — replaces the highlight dropdown. Rank, trophies held, form sparkline (per-GW points), best/worst GW, H2H record.
9. **Hall of Fame** — Manager-of-the-Week log + monthly (Classic/H2H) + FPL Challenge winners, as a horizontally-scrolling strip.
10. **Footer** — last updated, minimal links.

**Removed:** `Tabs` on the home page, `StandardTab`/`SpecialTab`/`DetailedTab` structure, `ManagerSelect` + `highlight` threading, the DetailedTab progression spaghetti, `MonthlyWeekly` as a Standard-tab sub-panel (folded into Hall of Fame).

---

## 4. Data & Derivations

All derivations are computed **frontend-side** from the existing `dashboard.json` sheets, plus one new pipeline output. Derivation logic lives in a pure, unit-tested module (`web/lib/story.ts`).

### 4.1 New pipeline output — `gw_scores` sheet
The pipeline already builds `all_gw_scores_df` (`manager_id, gameweek, score` = each manager's total points per GW). Emit it as a wide sheet `gw_scores`: columns `Manager`, `GW1`, `GW2`, … (each cell = that manager's total points that gameweek). This is the only pipeline change; it unlocks the profile form sparkline and any rank/points-over-time.

### 4.2 Derivations (from existing sheets)
- **Verdict:** Manager of the Week = latest row of `weekly_manager_log` (`Manager`, `Score`). The cheeky line is chosen from a small set keyed by result shape (e.g., big gap to 2nd = "runs it"; tight = "edges it"; a riser topping = "storms it"). Templated in `story.ts`; deterministic (no randomness — pick by data so it's stable).
- **Biggest Riser:** `shooting_stars` top row (`Total` = rank rise). If all zero (GW1), hide the riser callout or show "—".
- **Spoon Watch:** `reversed_motw` top row (most times finishing bottom). Fallback: current last place in `classic_league_standings`.
- **Highest GW:** `highest_gw_score` top row (`Score`).
- **Bad Luck:** `bad_luck_h2h` top row (`Score` = longest winless streak).
- **The Race:** `classic_league_standings` (`Manager`,`Total`) and `h2h_league_standings` (`Manager`,`Total H2H Point`), already sorted.
- **Trophy Cabinet:** the 24 award sheets; each coin shows row0 `Manager` + the score column (index 3) + suffix from the existing `SPECIAL_AWARDS` config (reused).
- **Trophy Detail chase:** top 3–4 rows of the award sheet. **Chart:** only when the sheet has `GW\d+` columns → cumulative-by-GW for the top ~3 contenders (reuse `cumulativeSeries` / `gwColumns`, limited to top contenders — never all 28).
- **Manager Profile:** filter across sheets for one `Manager`: their classic/H2H rank + totals, which trophies they currently hold (award sheets where they are row0), form = their row in `gw_scores` (per-GW points sparkline), best/worst GW (max/min of that row), H2H total.

### 4.3 Player-name / manager-name identity
Manager names are the FPL `player_name` string, consistent across all sheets (verified) — safe to match by exact string for profiles and trophy holders.

---

## 5. Component Structure (`web/`)

New/changed components (each small, one responsibility):

- `web/lib/story.ts` (+ test) — pure derivations: `verdict()`, `talkingPoints()`, `cabinet()`, `trophyChase()`, `managerProfile()`, and the cheeky-line picker. No React, no fetch.
- `web/lib/theme` — update `globals.css` tokens + fonts (Anton + Inter + Fredoka for coin labels), and the readability rules.
- `web/app/components/Header.tsx` — restyle; keep the existing `Admin` link + live pill.
- `web/app/components/LiveStrip.tsx` — the existing `LiveSection` restyled to hype (or rename; keeps the polling/visibility logic and `/api/live`).
- `web/app/components/VerdictHero.tsx` (+ test)
- `web/app/components/TalkingPoints.tsx` (+ test)
- `web/app/components/RaceBoard.tsx` (+ test) — bars + Classic/H2H switch + expand + name→profile.
- `web/app/components/TrophyCabinet.tsx` (+ test) — coin grid; opens detail.
- `web/app/components/TrophyDetail.tsx` (+ test) — overlay; chase + conditional chart (Recharts).
- `web/app/components/ManagerProfile.tsx` (+ test) — overlay; opened via a shared context/state.
- `web/app/components/HallOfFame.tsx` (+ test) — MotW + monthly + challenge strip.
- `web/app/components/DashboardShell.tsx` — rewritten to compose the new single-scroll IA and hold the "open profile / open trophy" overlay state.
- **Deleted:** `Tabs.tsx`, `StandardTab.tsx`, `SpecialTab.tsx`, `DetailedTab.tsx`, `ManagerSelect.tsx`, `AwardCard.tsx`, `ProgressionChart.tsx` (superseded), `StandingsTable.tsx`, `RaceChart.tsx`, `MonthlyWeekly.tsx` — after confirming no remaining imports. (`lib/transforms.ts` helpers like `gwColumns`/`cumulativeSeries`/`toNum`/`topStandings` are reused by `story.ts`; keep them.)

### Overlay pattern
Manager Profile and Trophy Detail are overlays (a drawer/modal) driven by shared state in `DashboardShell` (e.g., `openManager` / `openTrophy`). No routing in v1. Escape/backdrop closes. Keeps the single-page feel and is simple to test.

---

## 6. Data flow, error handling, testing

- **Data flow:** `page.tsx` (server) `loadDashboard()` → `DashboardShell` (client) computes all story data via `story.ts` and renders the sections. Live strip polls `/api/live` independently (unchanged).
- **Empty/early-season states:** every derivation tolerates missing/zero data (GW1: no risers, sparse trophies). Sections render a friendly "—/soon" rather than breaking. `story.ts` returns nulls the components render as placeholders.
- **Error handling:** the page is static/ISR over `dashboard.json` (unchanged); the live overlay already fails closed. A missing sheet → that section shows its empty state, never a crash.
- **Testing:** `story.ts` derivations are TDD (pure, exhaustive on edge cases). Each component gets a render test with fixture data (verdict shows headline; talking points show the four callouts; race switch toggles Classic/H2H; trophy detail shows chart only when GW columns exist; profile opens/closes). Playwright smoke: page renders the verdict, race, and trophy cabinet, and opening a trophy shows its detail. Pipeline: a unit test that `gw_scores` is emitted with per-GW columns.
- **Fixture:** extend `web/fixtures/dashboard.sample.json` with a `gw_scores` sheet and a couple of GW-column award sheets so the new components render in dev/tests.

---

## 7. Decisions locked (from brainstorming)
- Personality: **Hype/Banter + arcade trophy cabinet.** ✓
- No tabs; single scroll. ✓
- Manager profiles **replace** the highlight dropdown; open as an **overlay** (not a route) in v1. ✓
- Verdict headline: **cheeky, result-aware lines** (deterministic by data), not a flat template. ✓
- Monthly + FPL Challenge: folded into the **Hall of Fame** strip. ✓
- Readability: **Anton display-only, Inter for all substantive text.** ✓

## 8. Rollout
1. Pipeline: emit the `gw_scores` sheet (small, tested) + extend the fixture.
2. `story.ts` derivations (TDD).
3. Theme tokens/fonts + Header/LiveStrip restyle.
4. The sections top-down: Verdict → Talking Points → Race → Trophy Cabinet + Detail → Manager Profile → Hall of Fame; rewire `DashboardShell`; delete the dead tab components.
5. Playwright smoke + full-suite green; deploy.

The public dashboard stays fully static/ISR; no new env vars or secrets. The redesign is shippable in one branch and is purely presentational except for the additive `gw_scores` sheet.
