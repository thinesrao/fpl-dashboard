# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3-tab Streamlit-style dashboard with a single-scroll, story-led "Hype + arcade trophy cabinet" experience, add the PepRoulette logo as favicon/app-icon/header mark, and fix the charts — all on the existing static data layer plus one small pipeline output.

**Architecture:** The data layer (`dashboard.json`, `loadDashboard`, `/api/live`) is unchanged except for one additive pipeline sheet (`gw_scores`). All redesign work is in `web/`: a pure derivations module (`story.ts`) turns sheets into stories; new components compose a single-scroll page; manager profiles and trophy details are overlays driven by a small context; the 3-tab components are deleted.

**Tech Stack:** Next.js App Router + TypeScript, Tailwind v3, Recharts (charts), Vitest + RTL, Playwright. `sips` (macOS, preinstalled) for icon generation. Python 3.11 (one pipeline change).

**Spec:** `docs/superpowers/specs/2026-08-26-dashboard-redesign-design.md`

## Global Constraints

- **All web work under `web/`.** The only pipeline change is emitting the `gw_scores` sheet. Do NOT change award-scoring math, Supabase, admin, or the `/api/live` backend.
- **Palette tokens (replace the current set in `globals.css`):** `--bg:#0a0a0f`, `--panel:#15131f`, `--panel2:#1b1828`, `--line:#231f30`, `--ink:#ffffff`, `--muted:#8f8aa3`, `--pink:#ff2e93`, `--lime:#c6ff00`, `--gold:#ffd23f`, `--cyan:#4ad9ff`, `--purple:#9b5cff`, `--live:#ff4d6d`.
- **READABILITY RULE (binding):** the Anton (thick condensed) font is used ONLY for the Verdict headline, section labels, big numeric values, and the brand wordmark. All names, descriptions, table/list content, and anything < 16px use **Inter** (weight 400–800, ≥ 13px). Never set a sentence or a data value that must be *read* in Anton. Fredoka may be used for small trophy-coin labels only.
- **Logo source:** `docs/brand/peproulette-logo.jpg` (1408×1408, gold-on-navy rounded app icon). Generate derived assets from it with `sips`; never hand-draw a replacement.
- **Data-derivation logic is pure and TDD** (`web/lib/story.ts`), reusing `web/lib/transforms.ts` helpers (`toNum`, `topStandings`, `gwColumns`, `cumulativeSeries`). No randomness anywhere (verdict lines are chosen deterministically by data — random breaks ISR/hydration).
- **Overlays** (ManagerProfile, TrophyDetail) are client state via a small context; no routing in v1. Esc/backdrop closes.
- **Every derivation tolerates empty/early-season data** (GW1: no risers, sparse trophies) and renders a friendly placeholder, never a crash.
- **Sheet names & columns (verified):** `classic_league_standings`(`Manager`,`Total`), `h2h_league_standings`(`Manager`,`Total H2H Point`), `weekly_manager_log`(`Gameweek`,`Manager`,`Score`), `shooting_stars`/`golden_boot`/… (`Standings`,`Team`,`Manager`,score@idx3,`GW1..`), score-only awards (`highest_gw_score`,`reversed_motw`,`bad_luck_h2h`,…: `Standings`,`Team`,`Manager`,`Score`), `_player_names`, `metadata` via `generated_from_metadata`, and the NEW `gw_scores`(`Manager`,`GW1..`).
- Tests in `web/**/*.test.ts(x)` and `tests/`. Conventional commits.

---

### Task 1: Brand assets — favicon, app icon, header logo from the PepRoulette logo

**Files:**
- Create: `web/app/icon.png`, `web/app/apple-icon.png`, `web/public/icon-192.png`, `web/public/icon-512.png`, `web/public/logo-mark.png`, `web/app/manifest.ts`
- Delete: `web/app/favicon.ico` (Next serves `app/icon.*` instead)
- Modify: `web/app/layout.tsx` (metadata title/appleWebApp), commit `docs/brand/peproulette-logo.jpg`

**Interfaces:** Produces the browser tab favicon, iOS/Android app icons, PWA manifest, and a `logo-mark.png` the Header renders.

- [ ] **Step 1: Generate the icon sizes from the source (macOS `sips`)**

From the repo root:

```bash
sips -s format png -Z 512 docs/brand/peproulette-logo.jpg --out web/app/icon.png
sips -s format png -Z 180 docs/brand/peproulette-logo.jpg --out web/app/apple-icon.png
sips -s format png -Z 192 docs/brand/peproulette-logo.jpg --out web/public/icon-192.png
sips -s format png -Z 512 docs/brand/peproulette-logo.jpg --out web/public/icon-512.png
sips -s format png -Z 96  docs/brand/peproulette-logo.jpg --out web/public/logo-mark.png
```

- [ ] **Step 2: Remove the default favicon**

```bash
git rm web/app/favicon.ico
```

(Next.js will serve `app/icon.png` as the favicon automatically.)

- [ ] **Step 3: PWA manifest**

Create `web/app/manifest.ts`:

```typescript
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PepRoulette FPL",
    short_name: "PepRoulette",
    description: "Fantasy Premier League mini-league — awards, trophies, live scores.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

- [ ] **Step 4: Verify build serves the icons**

Run: `cd web && NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder npm run build`
Expected: build succeeds; `/icon.png`, `/apple-icon.png`, `/manifest.webmanifest` are emitted routes.

- [ ] **Step 5: Commit**

```bash
git add web/app/icon.png web/app/apple-icon.png web/public/icon-192.png web/public/icon-512.png web/public/logo-mark.png web/app/manifest.ts docs/brand/peproulette-logo.jpg
git commit -m "feat: PepRoulette logo as favicon, app icons, PWA manifest, and header mark"
```

---

### Task 2: Pipeline — emit the `gw_scores` wide sheet

**Files:**
- Create: `gw_scores_export.py`, `tests/test_gw_scores_export.py`
- Modify: `data_pipeline.py` (after `all_gw_scores_df` is built, ~line 530), `web/fixtures/dashboard.sample.json`

**Interfaces:** Produces a new sheet `gw_scores` in `dashboard.json`: columns `Manager`, `GW1`, `GW2`, … (each cell = that manager's true GW points).

- [ ] **Step 1: Write the failing test**

Create `tests/test_gw_scores_export.py`:

```python
import pandas as pd
from gw_scores_export import build_gw_scores_wide


def test_build_gw_scores_wide_pivots_long_to_wide():
    records = [
        {"gameweek": 1, "manager_id": 10, "score": 60},
        {"gameweek": 2, "manager_id": 10, "score": 72},
        {"gameweek": 1, "manager_id": 20, "score": 55},
    ]
    names = {10: "Alice", 20: "Bob"}
    df = build_gw_scores_wide(records, names)
    assert list(df.columns) == ["Manager", "GW1", "GW2"]
    alice = df[df["Manager"] == "Alice"].iloc[0]
    assert alice["GW1"] == 60 and alice["GW2"] == 72
    bob = df[df["Manager"] == "Bob"].iloc[0]
    assert bob["GW1"] == 55 and bob["GW2"] == 0  # missing GW filled with 0


def test_build_gw_scores_wide_empty():
    df = build_gw_scores_wide([], {})
    assert list(df.columns) == ["Manager"]
    assert df.empty
```

- [ ] **Step 2: Run it — expect FAIL.** Run: `python -m pytest tests/test_gw_scores_export.py -v`

- [ ] **Step 3: Implement `gw_scores_export.py`**

```python
"""Build the per-manager, per-gameweek total-points wide sheet for the frontend."""
import pandas as pd


def build_gw_scores_wide(records: list, manager_name_by_id: dict) -> pd.DataFrame:
    """records: [{gameweek, manager_id, score}]; returns Manager + GW{n} columns."""
    if not records:
        return pd.DataFrame(columns=["Manager"])
    df = pd.DataFrame(records)
    wide = df.pivot_table(index="manager_id", columns="gameweek", values="score", aggfunc="first").fillna(0)
    wide.columns = [f"GW{int(c)}" for c in wide.columns]
    wide = wide.reset_index()
    wide["Manager"] = wide["manager_id"].map(manager_name_by_id)
    gw_cols = sorted([c for c in wide.columns if c.startswith("GW")], key=lambda c: int(c[2:]))
    out = wide[["Manager"] + gw_cols].copy()
    for c in gw_cols:
        out[c] = out[c].astype(int)
    return out
```

- [ ] **Step 4: Run it — expect PASS.** Run: `python -m pytest tests/test_gw_scores_export.py -v`

- [ ] **Step 5: Wire into the pipeline**

Add near the top of `data_pipeline.py` imports: `from gw_scores_export import build_gw_scores_wide`.
Immediately after `all_gw_scores_df = pd.DataFrame(all_gw_scores_list)` (~line 530), add:

```python
    if all_gw_scores_list:
        name_by_id = dict(zip(manager_df["manager_id"], manager_df["manager_name"]))
        worksheets_to_write["gw_scores"] = build_gw_scores_wide(all_gw_scores_list, name_by_id)
```

- [ ] **Step 6: Extend the fixture**

Add to `web/fixtures/dashboard.sample.json` `"sheets"`: a `gw_scores` sheet and a GW-column award so the new components render:

```json
"gw_scores": [
  {"Manager": "Matthew Mohan", "GW1": 85, "GW2": 60},
  {"Manager": "arai oh arai", "GW1": 76, "GW2": 71}
],
"weekly_manager_log": [{"Gameweek": 1, "Manager": "Matthew Mohan", "Score": 85}],
"shooting_stars": [{"Standings": 1, "Team": "T", "Manager": "arai oh arai", "Total": 6, "GW1": 6}],
"reversed_motw": [{"Standings": 1, "Team": "U", "Manager": "Adam Lee", "Score": 2}],
"highest_gw_score": [{"Standings": 1, "Team": "V", "Manager": "Matthew Mohan", "Score": 85}],
"bad_luck_h2h": [{"Standings": 1, "Team": "W", "Manager": "Suria Devi", "Score": 3}]
```

(Merge into the existing `sheets` object; keep `classic_league_standings`, `golden_boot`, etc. Ensure `golden_boot` has `GW1` so the trophy chart path is exercised.)

- [ ] **Step 7: Full pipeline suite + commit**

Run: `python -m pytest -q` (green).

```bash
git add gw_scores_export.py tests/test_gw_scores_export.py data_pipeline.py web/fixtures/dashboard.sample.json
git commit -m "feat: emit per-gameweek gw_scores sheet for manager profiles"
```

---

### Task 3: Theme tokens, fonts, readability rules

**Files:** Modify `web/app/globals.css`, `web/app/layout.tsx`

**Interfaces:** New palette tokens + fonts (`--font-anton`, `--font-inter`, `--font-fredoka`) and helper classes `.font-display` (Anton) / body default (Inter).

- [ ] **Step 1: Fonts in layout**

In `web/app/layout.tsx`, load `Anton` (weight 400), `Inter`, and `Fredoka` from `next/font/google` with CSS variables `--font-anton`, `--font-inter`, `--font-fredoka`; set them on `<html className>`. Update `metadata.title` to `"PepRoulette FPL"`.

- [ ] **Step 2: Tokens + base**

Replace the `:root` token block and `body`/`.font-display` in `web/app/globals.css`:

```css
:root {
  --bg:#0a0a0f; --panel:#15131f; --panel2:#1b1828; --line:#231f30;
  --ink:#ffffff; --muted:#8f8aa3;
  --pink:#ff2e93; --lime:#c6ff00; --gold:#ffd23f; --cyan:#4ad9ff; --purple:#9b5cff; --live:#ff4d6d;
}
body { background: var(--bg); color: var(--ink); min-height:100vh;
  font-family: var(--font-inter), Inter, system-ui, sans-serif; }
.font-display { font-family: var(--font-anton), "Anton", sans-serif; letter-spacing:.01em; }
.font-coin { font-family: var(--font-fredoka), sans-serif; }
```

- [ ] **Step 3: Build check + commit**

Run: `cd web && ...npm run build` (green).

```bash
git add web/app/globals.css web/app/layout.tsx
git commit -m "feat: hype/arcade theme tokens, Anton/Inter/Fredoka fonts, readability base"
```

---

### Task 4: `story.ts` — story derivations (TDD)

**Files:** Create `web/lib/story.ts`, `web/lib/story.test.ts`

**Interfaces:** Consumes `DashboardData`/`getSheet` (existing) + `SPECIAL_AWARDS` (existing `lib/awards.ts`) + `transforms`. Produces pure functions:
- `verdict(data): { manager: string; points: number; line: string } | null` — MotW from latest `weekly_manager_log` row; `line` chosen deterministically by result shape (gap to 2nd in classic standings): big gap → "runs it", small → "edges it", riser-on-top → "storms it".
- `talkingPoints(data): { riser, spoon, highest, badLuck }` each `{ manager, detail } | null`.
- `cabinet(data): { key, title, suffix, manager, score, colorIdx }[]` — one entry per award in `SPECIAL_AWARDS` that has data (row0), with a stable color rotation.
- `trophyChase(data, key): { title, suffix, chase: {manager,score}[], series: {gameweek:number;[m:string]:number}[] | null }` — top-4 chase; `series` = cumulative top-3 only when the sheet has GW columns, else `null`.
- `managerProfile(data, name): { name, classicRank, classicTotal, h2hTotal, trophies: string[], form: number[], bestGw, worstGw } | null`.

- [ ] **Step 1: Write failing tests** — `web/lib/story.test.ts` covering: verdict picks MotW + a non-empty line; talkingPoints returns riser/spoon/highest/badLuck from the fixture sheets; cabinet lists only awards with data; trophyChase returns `series` for a GW-column award and `null` for a score-only award; managerProfile returns rank/trophies/form for a known manager and `null` for unknown. (Write concrete assertions against small inline `DashboardData` fixtures — one per function.)

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement `story.ts`** — pure functions per the interfaces above, reusing `getSheet`, `toNum`, `topStandings`, `gwColumns`, `cumulativeSeries`. The verdict-line picker is a small deterministic `switch` on the gap bucket; no `Math.random`.

- [ ] **Step 4: Run — expect PASS. Commit.**

```bash
git add web/lib/story.ts web/lib/story.test.ts
git commit -m "feat: pure story derivations (verdict, talking points, cabinet, chase, profile)"
```

---

### Task 5: Header + LiveStrip restyle + OverlayContext

**Files:** Modify `web/app/components/Header.tsx`, `web/app/components/LiveSection.tsx` (restyle to hype; keep polling/live logic); Create `web/app/components/OverlayContext.tsx`

**Interfaces:**
- `Header` renders the `logo-mark.png` (rounded, ~30px) + `PEP·ROULETTE` wordmark (Anton), gameweek/updated (Inter), `Admin` link, live pill.
- `OverlayContext` exposes `openManager(name: string)` and `openTrophy(key: string)`; `useOverlay()` hook. Provider lives in `DashboardShell` (Task 11).
- `LiveSection` visuals updated to the new palette; **its polling/visibility/highlight logic is unchanged**; keep the `highlight` prop but it's now unused at call sites (or drop it in Task 11 — do not change its internals here).

- [ ] Steps: write a Header render test (shows brand + Admin link + logo `img`) and an OverlayContext test (provider + hook exposes the two openers). Implement. Restyle LiveSection (visual only). Build. Commit `feat: hype header with logo, live strip restyle, overlay context`.

---

### Task 6: VerdictHero + TalkingPoints

**Files:** Create `web/app/components/VerdictHero.tsx` (+test), `web/app/components/TalkingPoints.tsx` (+test)

**Interfaces:** `<VerdictHero v={ReturnType<typeof verdict>} gameweek={number} />` renders the big Anton headline (name + line) and points; empty state when `v` is null. `<TalkingPoints tp={ReturnType<typeof talkingPoints>} />` renders 4 callout cards (🔥 riser, 🥄 spoon, 🚀 highest, 😢 bad luck), each hiding gracefully when its value is null. Values in Inter (readable); kickers in Anton/uppercase.

- [ ] Steps: failing render tests (verdict shows manager+line+points; talking points show the four labels and skip nulls) → implement → pass → build → commit `feat: verdict hero and talking-points callouts`.

---

### Task 7: RaceBoard

**Files:** Create `web/app/components/RaceBoard.tsx` (+test)

**Interfaces:** `<RaceBoard data />` — client component with a Classic ↔ Head-to-Head segmented switch (`useState`), chunky bars (top 8 by default, "Show all 28" expands), each row clickable → `useOverlay().openManager(name)`. Uses `topStandings(getSheet(...), "Total"|"Total H2H Point")`. Manager name in Inter; rank/points in Anton.

- [ ] Steps: failing test (renders Classic bars; clicking the switch shows H2H values; clicking a name calls the injected `openManager`) → implement → pass → build → commit `feat: race board with classic/h2h switch and profile open`.

> For the test, allow injecting the overlay opener (e.g., render inside a mock `OverlayContext.Provider`).

---

### Task 8: TrophyCabinet + TrophyDetail

**Files:** Create `web/app/components/TrophyCabinet.tsx` (+test), `web/app/components/TrophyDetail.tsx` (+test)

**Interfaces:**
- `<TrophyCabinet data />` — grid of glowing coins from `cabinet(data)`; coin color rotates via `colorIdx`; clicking a coin → `useOverlay().openTrophy(key)`. Coin label may use `.font-coin` (Fredoka) at a legible size; holder name in Inter.
- `<TrophyDetail data trophyKey onClose />` — overlay: title, the chase list (Inter names, Anton scores), and a Recharts line chart of `series` **only when non-null** (top-3 contenders); when `series` is null, show just the chase with a note. Esc/backdrop closes.

- [ ] Steps: failing tests (cabinet renders N coins and clicking calls openTrophy; detail shows chase always and a chart only for a GW-column award, no chart for a score-only award) → implement → pass → build → commit `feat: trophy cabinet and tap-through detail with sane charts`.

---

### Task 9: ManagerProfile overlay

**Files:** Create `web/app/components/ManagerProfile.tsx` (+test)

**Interfaces:** `<ManagerProfile data name onClose />` — overlay from `managerProfile(data, name)`: rank + totals, trophies held (chips), a form sparkline from `form` (Recharts or lightweight bars), best/worst GW. Empty/unknown manager → friendly message. Esc/backdrop closes.

- [ ] Steps: failing test (renders name, a trophy chip, and the form; unknown name shows the empty state) → implement → pass → build → commit `feat: manager profile overlay (rank, trophies, form)`.

---

### Task 10: HallOfFame

**Files:** Create `web/app/components/HallOfFame.tsx` (+test)

**Interfaces:** `<HallOfFame data />` — a horizontally-scrolling strip combining `weekly_manager_log` (MotW per GW), `classic_monthly_*`/`h2h_monthly_*` winners (reuse `monthlySheets` from `lib/monthly.ts`), and `fpl_challenge_weekly_log`. Each card: label (Anton), winner (Inter), score (Anton). Empty months render "soon".

- [ ] Steps: failing test (renders the GW1 MotW card and a monthly card) → implement → pass → build → commit `feat: hall of fame strip (MotW, monthly, challenge)`.

---

### Task 11: DashboardShell rewrite + delete dead components

**Files:** Rewrite `web/app/components/DashboardShell.tsx`; Delete `Tabs.tsx`, `StandardTab.tsx`, `SpecialTab.tsx`, `DetailedTab.tsx`, `ManagerSelect.tsx`, `AwardCard.tsx`, `RaceChart.tsx`, `ProgressionChart.tsx`, `StandingsTable.tsx`, `MonthlyWeekly.tsx` (and their `.test.tsx`); update `web/app/page.tsx` if needed.

**Interfaces:** `DashboardShell` wraps everything in `OverlayContext.Provider`, holds `openManager`/`openTrophy` state, and composes the IA in order: `Header` → `LiveSection` → `VerdictHero` → `TalkingPoints` → `RaceBoard` → `TrophyCabinet` → `HallOfFame`, then renders `<ManagerProfile>` / `<TrophyDetail>` overlays when their state is set. All story data computed once via `story.ts`.

- [ ] **Step 1:** Rewrite `DashboardShell.tsx` to compose the new sections + overlays + context. Remove all imports of the deleted components and the `highlight`/`ManagerSelect` logic.
- [ ] **Step 2:** Delete the dead component + test files listed above.
- [ ] **Step 3:** `grep -r` to confirm zero remaining imports of the deleted modules under `web/app`/`web/lib`.
- [ ] **Step 4:** Run `cd web && npm run test` (all green — deleted components' tests are gone; new ones pass) and the production build.
- [ ] **Step 5: Commit** `refactor: compose single-scroll redesign and remove the 3-tab components`.

---

### Task 12: Playwright smoke, README, full-suite verification

**Files:** Modify `web/e2e/smoke.spec.ts`, `web/README.md`

- [ ] **Step 1:** Rewrite the smoke test for the new IA: page shows the brand, the Verdict headline, the Race, and the Trophy Cabinet; clicking a trophy opens its detail; clicking a manager name opens a profile. (Uses the fixture, no live env.)
- [ ] **Step 2:** Update `web/README.md`: describe the new single-scroll IA, the story derivations, the overlay pattern, and the brand assets.
- [ ] **Step 3:** `cd web && npm run test && npm run e2e` and `python -m pytest -q` — all green.
- [ ] **Step 4: Commit** `test: redesign smoke test and README`.

---

## Self-Review

**Spec coverage:**
- Personality/palette/readability (spec §2) → Tasks 1 (logo), 3 (tokens/fonts). ✓
- Single-scroll IA, no tabs (§3) → Tasks 5–11. ✓
- Remove highlight dropdown → manager profiles (§3, §5) → Tasks 9, 11 (delete ManagerSelect). ✓
- Fix charts: one-award/top-contenders, conditional on GW columns (§4.2) → Task 8 (`trophyChase` series null when no GW cols). ✓
- `gw_scores` pipeline output (§4.1) → Task 2. ✓
- Story derivations pure/tested (§4) → Task 4. ✓
- Overlays, no routing (§5) → Task 5 context + Tasks 8/9/11. ✓
- Deletions (§5) → Task 11. ✓
- Logo/favicon/app-icon (user request) → Task 1. ✓
- Testing (§6) → each task's tests + Task 12. ✓

**Placeholder scan:** "soon" is intentional UI copy for empty months, not a plan placeholder. Tasks 4–10 give interfaces + test intents + concrete file lists; the component bodies follow the spec's styling and the Task-1/3 tokens — no "TBD"/"handle later".

**Type consistency:** `story.ts` return types are the single source consumed by VerdictHero/TalkingPoints/RaceBoard/TrophyCabinet/TrophyDetail/ManagerProfile/HallOfFame; `OverlayContext.openManager/openTrophy` signatures match their call sites in RaceBoard/TrophyCabinet and the overlay renders in DashboardShell; `build_gw_scores_wide(records, name_by_id)` matches its test and the pipeline call. ✓

**Note for executor:** Tasks 5–10 each specify interfaces + test intent rather than full JSX; implement the component bodies to the spec's Direction (hype palette from Task 3, readability rule, and the mockup at `docs/brand/redesign-mockup.html` (tracked reference)). If a component needs a value `story.ts` doesn't expose, extend `story.ts` (with a test) rather than computing in the component.
