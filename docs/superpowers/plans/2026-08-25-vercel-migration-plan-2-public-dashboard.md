# Plan 2 — Public Dashboard (Next.js, Direction A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public, read-only PepRoulette dashboard as a Next.js App Router app in `web/`, styled in the approved "Neon Arena" (Direction A) visual system, reading the static `dashboard.json` Plan 1 publishes to Vercel Blob — deployed to Vercel so it never sleeps.

**Architecture:** A statically-rendered Next.js app (ISR revalidation) fetches one JSON artifact and renders three tabs (Standard / Special / Detailed) mirroring the current Streamlit app's information architecture. No database, no auth, no live data in this plan — pure static read. The app lives in `web/`; the Python pipeline stays at the repo root (monorepo; Vercel Root Directory = `web/`).

**Tech Stack:** Next.js (App Router) + TypeScript, Tailwind CSS, Recharts (bar + line charts), Vitest + React Testing Library (unit/component), Playwright (smoke). No shadcn/ui — components are hand-rolled Tailwind to match the mock exactly and minimize setup.

**Spec:** `docs/superpowers/specs/2026-08-25-vercel-migration-design.md` (§6 Frontend, §3.2 read path)

## Global Constraints

- **App location:** everything in this plan lives under `web/`. Never create a `package.json`, `node_modules`, or Next.js file at the repo root — the root `package.json` belongs to the pipeline's Blob-publish step (Plan 1) and must stay untouched.
- **Node 20**, Next.js App Router (not Pages Router), TypeScript strict mode.
- **Data source:** the app reads `dashboard.json` shaped as `{ "sheets": { <sheetName>: Array<Record<string, string | number | null>> }, "generated_from_metadata": { "last_finished_gw": number, "last_updated_utc": string, ...} }`. The Blob URL comes from env `NEXT_PUBLIC_DASHBOARD_URL`. For local dev/tests, fall back to a committed fixture at `web/fixtures/dashboard.sample.json`.
- **Read-only:** no writes, no auth, no Supabase, no live FPL calls in this plan. (Admin = Plan 3, live scores = Plan 4.)
- **Direction A design tokens (authoritative — the mock is git-ignored, so these ARE the source of truth):**
  - Colors: `--bg:#0b0f14`, `--panel:#151b23`, `--panel2:#1b222c`, `--line:#232c38`, `--ink:#e8eef5`, `--muted:#8a97a8`, `--accent:#2bfca4`, `--accent-dim:#1c6f52`, `--gold:#ffd24a`, `--live:#ff4d6d`.
  - Background: `radial-gradient(1200px 600px at 50% -200px,#132018 0%,#0b0f14 60%)`.
  - Fonts: display `'Archivo Black'` (headings, wordmark), body `'Inter'` — both via Google Fonts. Fallbacks: `sans-serif`.
  - Accent usage: neon green for the highlighted manager's row/series, award scores, active tab; charts use `linear-gradient(90deg,var(--accent-dim),var(--accent))` fills.
  - Cards: `bg-[--panel] border border-[--line] rounded-2xl`. Award cards use `linear-gradient(180deg,var(--panel),var(--panel2))`.
- **Charts:** Recharts. Bar races are horizontal, top 10, current-selection highlighted. Detailed tab shows cumulative GW line charts.
- **Testing:** logic/transform functions are TDD (Vitest). Components get at least one render/behavior test (React Testing Library). One Playwright smoke test asserts the page renders the three tabs from the fixture. Target 80%+ on `lib/` logic.
- **Commit messages:** conventional commits.
- **Sheet contract (columns, from the current `app.py`):**
  - `classic_league_standings`: rows with `Manager` (str) and `Total` (points, numeric-as-string). Already in sheet order.
  - `h2h_league_standings`: `Manager`, `Total H2H Point`.
  - Special-award sheets (`golden_boot`, `playmaker`, `golden_glove`, `best_gk`, `best_def`, `best_mid`, `best_fwd`, `best_vc`, `transfer_king`, `bench_king`, `dream_team`, `shooting_stars`, `defensive_king`, `penalty_king`, `highest_gw_score`, `freehit_king`, `benchboost_king`, `triplecaptain_king`, `expects_king`, `hardworking_af`, `half_season_first`, `half_season_second`, `bad_luck_h2h`, `reversed_motw`): columns `Standings`, `Team`, `Manager`, then a score column at **index 3**, then optional `GW1`, `GW2`, … columns.
  - `cup_winner`: `Winner`. `weekly_manager_log` / `fpl_challenge_weekly_log`: `Gameweek` + columns. `classic_monthly_<month>` / `h2h_monthly_<month>`: `Standings` + columns.
  - `metadata` sheet is surfaced via `generated_from_metadata` (don't read the `metadata` sheet array directly).

- **Special award display config (title + score suffix), authoritative copy from the current app:**
  ```
  golden_boot:"🥇 Golden Boot"/"Goals"; playmaker:"🅰️ Playmaker"/"Assists";
  golden_glove:"🧤 Golden Glove"/"Clean Sheets"; best_gk:"👑 Best Goalkeeper"/"Pts";
  best_def:"🛡️ Best Defenders"/"Pts"; best_mid:"🎩 Best Midfielders"/"Pts";
  best_fwd:"💥 Best Forwards"/"Pts"; best_vc:"🥈 Best Vice-Captain"/"Pts";
  transfer_king:"🔀 Transfer King"/"Pts"; bench_king:"🪑 Bench King"/"Pts";
  dream_team:"🌟 Dream Team King"/"DT Score"; shooting_stars:"🌠 Shooting Stars"/"Rank Rise";
  defensive_king:"🧱 Defensive King"/"Contribution"; penalty_king:"🎯 Penalty King"/"Pts";
  highest_gw_score:"🚀 Highest GW Score"/"Pts"; freehit_king:"🃏 Free Hit King"/"Pts";
  benchboost_king:"📈 Bench Boost King"/"Pts"; triplecaptain_king:"©️³ Triple Captain King"/"Pts";
  expects_king:"🔮 Expects King"/"xGI"; hardworking_af:"💪 Hardworking AF"/"Mins";
  half_season_first:"🌗 Half Season Wonders (H1)"/"Pts"; half_season_second:"🌓 Half Season Wonders (H2)"/"Pts";
  bad_luck_h2h:"😢 Bad Luck H2H"/"GW Streak"; reversed_motw:"🔻 Reversed MotW"/"Times Lowest"
  ```

---

### Task 1: Scaffold the Next.js app in `web/` + Vercel monorepo config

**Files:**
- Create: `web/package.json`, `web/tsconfig.json`, `web/next.config.mjs`, `web/postcss.config.mjs`, `web/tailwind.config.ts`, `web/app/layout.tsx`, `web/app/page.tsx`, `web/app/globals.css`, `web/.gitignore`, `web/vercel.json`, `web/.env.example`
- Modify: none at repo root

**Interfaces:**
- Consumes: nothing.
- Produces: a buildable Next.js app in `web/`. `web/app/page.tsx` renders a placeholder that later tasks replace.

- [ ] **Step 1: Scaffold**

From `web/`'s parent, create the app non-interactively:

```bash
cd web-parent-is-repo-root  # you are at the repo root
npx create-next-app@latest web --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm --yes
```

If `create-next-app` prompts despite `--yes`, accept: App Router yes, `src/` no, import alias `@/*`.

- [ ] **Step 2: Add project dependencies**

```bash
cd web
npm install recharts
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @playwright/test
```

- [ ] **Step 3: Configure Vitest**

Create `web/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});
```

Create `web/vitest.setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
```

Add scripts to `web/package.json` `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"e2e": "playwright test"
```

- [ ] **Step 4: Vercel monorepo config + env example**

Create `web/vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "npm install"
}
```

Create `web/.env.example`:

```
# Public URL of the dashboard.json published by the pipeline to Vercel Blob.
# Leave unset locally to use web/fixtures/dashboard.sample.json.
NEXT_PUBLIC_DASHBOARD_URL=
```

Ensure `web/.gitignore` (from create-next-app) ignores `.next/`, `node_modules/`, `.env*.local`, `.vercel`.

- [ ] **Step 5: Verify it builds**

Run:

```bash
cd web && npm run build
```

Expected: build succeeds (the default create-next-app page).

- [ ] **Step 6: Commit**

```bash
git add web
git commit -m "chore: scaffold Next.js public dashboard app in web/"
```

> Deploy note (for the human, not a code step): in the Vercel project, set **Root Directory = `web/`** and add env var `NEXT_PUBLIC_DASHBOARD_URL` (the Blob URL from Plan 1's `docs/INFRA.md`). Reconnect the Git integration after this lands.

---

### Task 2: Direction A theme tokens, fonts, and app shell

**Files:**
- Modify: `web/app/globals.css`, `web/app/layout.tsx`
- Create: `web/app/components/Header.tsx`
- Test: `web/app/components/Header.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `<Header gameweek={number} lastUpdated={string} />` renders the sticky brand bar with "🏆 PepRoulette™", the gameweek, and a formatted last-updated time.

- [ ] **Step 1: Write globals.css tokens**

Replace `web/app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #0b0f14;
  --panel: #151b23;
  --panel2: #1b222c;
  --line: #232c38;
  --ink: #e8eef5;
  --muted: #8a97a8;
  --accent: #2bfca4;
  --accent-dim: #1c6f52;
  --gold: #ffd24a;
  --live: #ff4d6d;
}

body {
  background: radial-gradient(1200px 600px at 50% -200px, #132018 0%, var(--bg) 60%);
  color: var(--ink);
  min-height: 100vh;
  font-family: var(--font-inter), Inter, system-ui, sans-serif;
}

.font-display {
  font-family: var(--font-archivo), "Archivo Black", sans-serif;
  letter-spacing: -0.01em;
}
```

- [ ] **Step 2: Load fonts + metadata in layout**

Replace `web/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter, Archivo_Black } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const archivo = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--font-archivo" });

export const metadata: Metadata = {
  title: "PepRoulette™ FPL Dashboard",
  description: "Fantasy Premier League mini-league analytics and awards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${archivo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Write the failing Header test**

Create `web/app/components/Header.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { Header } from "./Header";

test("renders brand, gameweek and formatted last-updated", () => {
  render(<Header gameweek={3} lastUpdated="2026-08-25T10:30:00+00:00" />);
  expect(screen.getByText(/PepRoulette/)).toBeInTheDocument();
  expect(screen.getByText(/Gameweek 3/)).toBeInTheDocument();
  expect(screen.getByText(/2026/)).toBeInTheDocument();
});
```

- [ ] **Step 4: Run it — expect FAIL** (`Cannot find module './Header'`).

Run: `cd web && npx vitest run app/components/Header.test.tsx`

- [ ] **Step 5: Implement Header**

Create `web/app/components/Header.tsx`:

```tsx
function formatUpdated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function Header({ gameweek, lastUpdated }: { gameweek: number; lastUpdated: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[--line] bg-[rgba(11,15,20,0.72)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-5">
        <div className="flex items-center gap-2.5 font-display text-lg">
          <span
            className="h-7 w-7 rounded-lg"
            style={{ background: "conic-gradient(from 210deg,var(--accent),#39a0ff,var(--accent))" }}
            aria-hidden
          />
          PepRoulette™
        </div>
        <div className="flex-1" />
        <div className="text-xs text-[--muted]">
          <b className="text-[--ink]">Gameweek {gameweek}</b> · updated {formatUpdated(lastUpdated)} (UTC)
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Run it — expect PASS.** Run: `cd web && npx vitest run app/components/Header.test.tsx`

- [ ] **Step 7: Commit**

```bash
git add web/app/globals.css web/app/layout.tsx web/app/components/Header.tsx web/app/components/Header.test.tsx
git commit -m "feat: Direction A theme tokens, fonts, and header shell"
```

---

### Task 3: Types + data-loading layer (TDD)

**Files:**
- Create: `web/lib/types.ts`, `web/lib/data.ts`, `web/fixtures/dashboard.sample.json`
- Test: `web/lib/data.test.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_DASHBOARD_URL` env; the fixture.
- Produces:
  - `type SheetRow = Record<string, string | number | null>`
  - `type DashboardData = { sheets: Record<string, SheetRow[]>; meta: { lastFinishedGw: number; lastUpdatedUtc: string } }`
  - `getSheet(data: DashboardData, name: string): SheetRow[]` — returns the sheet array or `[]`.
  - `normalizeDashboard(raw: unknown): DashboardData` — validates and maps `generated_from_metadata.last_finished_gw`/`last_updated_utc` into `meta`.
  - `loadDashboard(): Promise<DashboardData>` — fetches `NEXT_PUBLIC_DASHBOARD_URL` (Next `fetch` with `{ next: { revalidate: 300 } }`) or reads the fixture when the env is unset; returns `normalizeDashboard(...)`.

- [ ] **Step 1: Create a small fixture**

Create `web/fixtures/dashboard.sample.json` (enough to render every tab):

```json
{
  "sheets": {
    "classic_league_standings": [
      {"Manager": "Danish Aziz", "Total": 212},
      {"Manager": "Faiz Rahman", "Total": 199},
      {"Manager": "Wei Jie", "Total": 191}
    ],
    "h2h_league_standings": [
      {"Manager": "Iqbal Hakim", "Total H2H Point": 15},
      {"Manager": "Wei Jie", "Total H2H Point": 13}
    ],
    "golden_boot": [
      {"Standings": 1, "Team": "A", "Manager": "Faiz Rahman", "Goals": 7, "GW1": 3, "GW2": 4},
      {"Standings": 2, "Team": "B", "Manager": "Wei Jie", "Goals": 5, "GW1": 2, "GW2": 3}
    ]
  },
  "generated_from_metadata": { "last_finished_gw": 3, "last_updated_utc": "2026-08-25T10:30:00+00:00" }
}
```

- [ ] **Step 2: Write the failing test**

Create `web/lib/data.test.ts`:

```typescript
import { normalizeDashboard, getSheet } from "./types";

test("normalizeDashboard maps metadata and preserves sheets", () => {
  const raw = {
    sheets: { classic_league_standings: [{ Manager: "A", Total: 100 }] },
    generated_from_metadata: { last_finished_gw: 3, last_updated_utc: "2026-08-25T10:30:00+00:00" },
  };
  const data = normalizeDashboard(raw);
  expect(data.meta.lastFinishedGw).toBe(3);
  expect(data.meta.lastUpdatedUtc).toBe("2026-08-25T10:30:00+00:00");
  expect(getSheet(data, "classic_league_standings")[0].Manager).toBe("A");
});

test("getSheet returns empty array for missing sheet", () => {
  const data = normalizeDashboard({ sheets: {}, generated_from_metadata: {} });
  expect(getSheet(data, "nope")).toEqual([]);
  expect(data.meta.lastFinishedGw).toBe(0);
});
```

- [ ] **Step 3: Run it — expect FAIL** (`Cannot find module './types'`).

Run: `cd web && npx vitest run lib/data.test.ts`

- [ ] **Step 4: Implement types.ts**

Create `web/lib/types.ts`:

```typescript
export type SheetRow = Record<string, string | number | null>;

export type DashboardData = {
  sheets: Record<string, SheetRow[]>;
  meta: { lastFinishedGw: number; lastUpdatedUtc: string };
};

export function normalizeDashboard(raw: unknown): DashboardData {
  const obj = (raw ?? {}) as {
    sheets?: Record<string, SheetRow[]>;
    generated_from_metadata?: Record<string, unknown>;
  };
  const meta = obj.generated_from_metadata ?? {};
  return {
    sheets: obj.sheets ?? {},
    meta: {
      lastFinishedGw: Number(meta.last_finished_gw ?? 0) || 0,
      lastUpdatedUtc: String(meta.last_updated_utc ?? ""),
    },
  };
}

export function getSheet(data: DashboardData, name: string): SheetRow[] {
  return data.sheets[name] ?? [];
}
```

- [ ] **Step 5: Implement data.ts (loader)**

Create `web/lib/data.ts`:

```typescript
import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalizeDashboard, type DashboardData } from "./types";

export async function loadDashboard(): Promise<DashboardData> {
  const url = process.env.NEXT_PUBLIC_DASHBOARD_URL;
  if (url) {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`Failed to load dashboard.json: ${res.status}`);
    return normalizeDashboard(await res.json());
  }
  const file = path.join(process.cwd(), "fixtures", "dashboard.sample.json");
  return normalizeDashboard(JSON.parse(await readFile(file, "utf-8")));
}
```

- [ ] **Step 6: Run it — expect PASS.** Run: `cd web && npx vitest run lib/data.test.ts`

- [ ] **Step 7: Commit**

```bash
git add web/lib/types.ts web/lib/data.ts web/lib/data.test.ts web/fixtures/dashboard.sample.json
git commit -m "feat: dashboard data types, normalizer, and loader"
```

---

### Task 4: Chart-data transforms (TDD, pure)

**Files:**
- Create: `web/lib/transforms.ts`
- Test: `web/lib/transforms.test.ts`

**Interfaces:**
- Consumes: `SheetRow` (Task 3).
- Produces:
  - `toNum(v: string | number | null | undefined): number` — coerces to number, `0` on non-numeric/null.
  - `topStandings(rows: SheetRow[], valueKey: string, n = 10): { manager: string; value: number }[]` — maps `Manager`/`valueKey`, coerces the value, keeps sheet order, takes first `n`.
  - `gwColumns(row: SheetRow): string[]` — sorted `GW\d+` keys present, ascending by number.
  - `cumulativeSeries(rows: SheetRow[]): { gameweek: number; [manager: string]: number }[]` — per-GW cumulative totals across managers for the line chart (x = gameweek, one numeric field per manager).
  - `awardLeader(rows: SheetRow[]): { manager: string; score: number; gap: number } | null` — first row's `Manager` + the score column (index 3 by key order), and the gap to the second row; `null` if empty.

- [ ] **Step 1: Write the failing test**

Create `web/lib/transforms.test.ts`:

```typescript
import { toNum, topStandings, gwColumns, cumulativeSeries, awardLeader } from "./transforms";

test("toNum coerces strings and null", () => {
  expect(toNum("7")).toBe(7);
  expect(toNum(7)).toBe(7);
  expect(toNum(null)).toBe(0);
  expect(toNum("x")).toBe(0);
});

test("topStandings maps and truncates preserving order", () => {
  const rows = [
    { Manager: "A", Total: "212" },
    { Manager: "B", Total: 199 },
    { Manager: "C", Total: 191 },
  ];
  expect(topStandings(rows, "Total", 2)).toEqual([
    { manager: "A", value: 212 },
    { manager: "B", value: 199 },
  ]);
});

test("gwColumns returns sorted GW keys", () => {
  expect(gwColumns({ Manager: "A", GW2: 1, GW10: 2, GW1: 0 })).toEqual(["GW1", "GW2", "GW10"]);
});

test("cumulativeSeries accumulates per manager by gameweek", () => {
  const rows = [
    { Manager: "A", GW1: 2, GW2: 3 },
    { Manager: "B", GW1: 1, GW2: 1 },
  ];
  expect(cumulativeSeries(rows)).toEqual([
    { gameweek: 1, A: 2, B: 1 },
    { gameweek: 2, A: 5, B: 2 },
  ]);
});

test("awardLeader returns leader and gap to second", () => {
  const rows = [
    { Standings: 1, Team: "T", Manager: "A", Goals: 7 },
    { Standings: 2, Team: "U", Manager: "B", Goals: 5 },
  ];
  expect(awardLeader(rows)).toEqual({ manager: "A", score: 7, gap: 2 });
  expect(awardLeader([])).toBeNull();
});
```

- [ ] **Step 2: Run it — expect FAIL.** Run: `cd web && npx vitest run lib/transforms.test.ts`

- [ ] **Step 3: Implement transforms.ts**

Create `web/lib/transforms.ts`:

```typescript
import type { SheetRow } from "./types";

export function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function topStandings(rows: SheetRow[], valueKey: string, n = 10) {
  return rows.slice(0, n).map((r) => ({
    manager: String(r.Manager ?? ""),
    value: toNum(r[valueKey]),
  }));
}

export function gwColumns(row: SheetRow): string[] {
  return Object.keys(row)
    .filter((k) => /^GW\d+$/.test(k))
    .sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));
}

export function cumulativeSeries(rows: SheetRow[]): Array<Record<string, number>> {
  if (rows.length === 0) return [];
  const cols = gwColumns(rows[0]);
  const running: Record<string, number> = {};
  return cols.map((col) => {
    const point: Record<string, number> = { gameweek: Number(col.slice(2)) };
    for (const r of rows) {
      const m = String(r.Manager ?? "");
      running[m] = (running[m] ?? 0) + toNum(r[col]);
      point[m] = running[m];
    }
    return point;
  });
}

export function awardLeader(rows: SheetRow[]) {
  if (rows.length === 0) return null;
  const keys = Object.keys(rows[0]);
  const scoreKey = keys[3]; // Standings, Team, Manager, <score>
  const score = toNum(rows[0][scoreKey]);
  const second = rows.length > 1 ? toNum(rows[1][scoreKey]) : score;
  return { manager: String(rows[0].Manager ?? ""), score, gap: Math.round((score - second) * 10) / 10 };
}
```

- [ ] **Step 4: Run it — expect PASS.** Run: `cd web && npx vitest run lib/transforms.test.ts`

- [ ] **Step 5: Commit**

```bash
git add web/lib/transforms.ts web/lib/transforms.test.ts
git commit -m "feat: pure chart-data transforms for standings, awards, and progression"
```

---

### Task 5: Tab shell + page composition

**Files:**
- Create: `web/app/components/Tabs.tsx`, `web/app/components/DashboardShell.tsx`
- Modify: `web/app/page.tsx`
- Test: `web/app/components/Tabs.test.tsx`

**Interfaces:**
- Consumes: `loadDashboard` (Task 3), `Header` (Task 2).
- Produces:
  - `<Tabs tabs={{key,label}[]} />` — a client component with pill styling; the active tab uses the accent; renders the active panel via a render-prop or children keyed by tab. Signature: `<Tabs items={{ key: string; label: string; content: React.ReactNode }[]} />`.
  - `<DashboardShell data={DashboardData} />` — client component composing Header + hero + Tabs with the three panels (panels are placeholders here, filled by Tasks 6–8).
  - `page.tsx` is an async server component: `const data = await loadDashboard(); return <DashboardShell data={data} />` with `export const revalidate = 300`.

- [ ] **Step 1: Write the failing Tabs test**

Create `web/app/components/Tabs.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs } from "./Tabs";

test("shows first tab by default and switches on click", () => {
  render(
    <Tabs
      items={[
        { key: "a", label: "Alpha", content: <div>ALPHA BODY</div> },
        { key: "b", label: "Beta", content: <div>BETA BODY</div> },
      ]}
    />
  );
  expect(screen.getByText("ALPHA BODY")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Beta" }));
  expect(screen.getByText("BETA BODY")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it — expect FAIL.** Run: `cd web && npx vitest run app/components/Tabs.test.tsx`

- [ ] **Step 3: Implement Tabs**

Create `web/app/components/Tabs.tsx`:

```tsx
"use client";
import { useState } from "react";

export type TabItem = { key: string; label: string; content: React.ReactNode };

export function Tabs({ items }: { items: TabItem[] }) {
  const [active, setActive] = useState(items[0]?.key);
  const current = items.find((t) => t.key === active) ?? items[0];
  return (
    <div>
      <div className="my-4 flex flex-wrap gap-2">
        {items.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={
                "rounded-full border px-4 py-2 text-sm font-semibold transition " +
                (on
                  ? "border-[--accent] bg-[--accent] text-[#06231a]"
                  : "border-[--line] bg-[--panel] text-[--muted]")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run it — expect PASS.** Run: `cd web && npx vitest run app/components/Tabs.test.tsx`

- [ ] **Step 5: Implement DashboardShell + page**

Create `web/app/components/DashboardShell.tsx`:

```tsx
"use client";
import type { DashboardData } from "@/lib/types";
import { Header } from "./Header";
import { Tabs } from "./Tabs";

export function DashboardShell({ data }: { data: DashboardData }) {
  return (
    <>
      <Header gameweek={data.meta.lastFinishedGw} lastUpdated={data.meta.lastUpdatedUtc} />
      <main className="mx-auto max-w-5xl px-5 pb-16">
        <section className="pb-2 pt-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[--accent]">
            Mini-League · Pep&apos;s Roulette
          </p>
          <h1 className="font-display mt-2 text-3xl">The race, in full.</h1>
          <p className="mt-1 text-xs text-[--muted]">
            Awards final to Gameweek {data.meta.lastFinishedGw}
          </p>
        </section>
        <Tabs
          items={[
            { key: "standard", label: "🏆 Standard Awards", content: <div /> },
            { key: "special", label: "🏅 Special Awards", content: <div /> },
            { key: "detailed", label: "📊 Detailed Standings", content: <div /> },
          ]}
        />
      </main>
    </>
  );
}
```

Replace `web/app/page.tsx` with:

```tsx
import { loadDashboard } from "@/lib/data";
import { DashboardShell } from "./components/DashboardShell";

export const revalidate = 300;

export default async function Page() {
  const data = await loadDashboard();
  return <DashboardShell data={data} />;
}
```

- [ ] **Step 6: Verify build + dev render**

Run: `cd web && npm run build` (expect success). Optionally `npm run dev` and confirm the header, hero, and three pill tabs render from the fixture.

- [ ] **Step 7: Commit**

```bash
git add web/app/components/Tabs.tsx web/app/components/Tabs.test.tsx web/app/components/DashboardShell.tsx web/app/page.tsx
git commit -m "feat: tab shell and dashboard page composition"
```

---

### Task 6: Standard tab — league race bar charts

**Files:**
- Create: `web/app/components/RaceChart.tsx`, `web/app/components/StandardTab.tsx`
- Modify: `web/app/components/DashboardShell.tsx` (wire the Standard panel + pass a selected manager)
- Test: `web/app/components/RaceChart.test.tsx`

**Interfaces:**
- Consumes: `topStandings`, `toNum` (Task 4), `getSheet` (Task 3).
- Produces:
  - `<RaceChart title, caption, rows: {manager,value}[], highlight?: string />` — a horizontal Recharts bar chart, neon fill, highlighted manager's bar brighter.
  - `<StandardTab data, highlight />` — two `RaceChart`s (Classic `Total`, H2H `Total H2H Point`) side by side, plus the cup champion banner when present.

- [ ] **Step 1: Write the failing RaceChart test**

Create `web/app/components/RaceChart.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { RaceChart } from "./RaceChart";

test("renders title and manager labels", () => {
  render(
    <RaceChart
      title="Classic League"
      caption="Total points"
      rows={[{ manager: "A", value: 212 }, { manager: "B", value: 199 }]}
    />
  );
  expect(screen.getByText("Classic League")).toBeInTheDocument();
  expect(screen.getByText("A")).toBeInTheDocument();
});
```

> Note: Recharts needs a sized container in jsdom. Use a fixed-width wrapper in the component (below) so labels render without a ResizeObserver.

- [ ] **Step 2: Run it — expect FAIL.** Run: `cd web && npx vitest run app/components/RaceChart.test.tsx`

- [ ] **Step 3: Implement RaceChart**

Create `web/app/components/RaceChart.tsx`:

```tsx
"use client";
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";

type Row = { manager: string; value: number };

export function RaceChart({
  title, caption, rows, highlight,
}: { title: string; caption: string; rows: Row[]; highlight?: string }) {
  return (
    <div className="rounded-2xl border border-[--line] bg-[--panel] p-4">
      <h3 className="font-display text-[15px]">{title}</h3>
      <p className="mb-4 text-xs text-[--muted]">{caption}</p>
      <BarChart width={460} height={Math.max(120, rows.length * 34)} data={rows} layout="vertical"
                margin={{ left: 8, right: 36, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="manager" width={110} tick={{ fill: "#8a97a8", fontSize: 12 }}
               axisLine={false} tickLine={false} />
        <Bar dataKey="value" radius={[6, 6, 6, 6]} isAnimationActive={false}>
          {rows.map((r) => (
            <Cell key={r.manager} fill={r.manager === highlight ? "#7bffcf" : "#2bfca4"} />
          ))}
          <LabelList dataKey="value" position="right" fill="#e8eef5" fontSize={12} />
        </Bar>
      </BarChart>
    </div>
  );
}
```

- [ ] **Step 4: Run it — expect PASS.** Run: `cd web && npx vitest run app/components/RaceChart.test.tsx`

- [ ] **Step 5: Implement StandardTab + wire it**

Create `web/app/components/StandardTab.tsx`:

```tsx
"use client";
import type { DashboardData } from "@/lib/types";
import { getSheet } from "@/lib/types";
import { topStandings, toNum } from "@/lib/transforms";
import { RaceChart } from "./RaceChart";

export function StandardTab({ data, highlight }: { data: DashboardData; highlight?: string }) {
  const classic = topStandings(getSheet(data, "classic_league_standings"), "Total");
  const h2h = topStandings(getSheet(data, "h2h_league_standings"), "Total H2H Point");
  const cup = getSheet(data, "cup_winner");
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <RaceChart title="Classic League" caption="Total points" rows={classic} highlight={highlight} />
        <RaceChart title="Head-to-Head" caption="Total H2H points" rows={h2h} highlight={highlight} />
      </div>
      {data.meta.lastFinishedGw >= 34 && cup.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[--line] bg-[--panel] p-4">
          <p className="text-xs text-[--muted]">League Cup Champion</p>
          <p className="font-display text-xl text-[--accent]">{String(cup[0].Winner ?? "")}</p>
        </div>
      )}
    </div>
  );
}
```

In `DashboardShell.tsx`, import `StandardTab` and replace the Standard panel `content: <div />` with `content: <StandardTab data={data} highlight={highlight} />`. Add a `highlight` prop to `DashboardShell` (default `undefined`) — the selector wiring lands in Task 9; for now thread the prop through.

- [ ] **Step 6: Verify build.** Run: `cd web && npm run build`

- [ ] **Step 7: Commit**

```bash
git add web/app/components/RaceChart.tsx web/app/components/RaceChart.test.tsx web/app/components/StandardTab.tsx web/app/components/DashboardShell.tsx
git commit -m "feat: standard tab with classic and H2H race charts"
```

---

### Task 6b: Monthly & Weekly winners section (full Streamlit parity)

**Files:**
- Create: `web/lib/monthly.ts`, `web/app/components/MonthlyWeekly.tsx`
- Modify: `web/app/components/StandardTab.tsx` (append the section), `web/fixtures/dashboard.sample.json` (add sample monthly/weekly data)
- Test: `web/lib/monthly.test.ts`

**Interfaces:**
- Consumes: `getSheet` (Task 3), `Tabs` (Task 5), `StandingsTable` (Task 8 — if executing in order, Task 8 lands after this; see note below).
- Produces:
  - `MONTH_ORDER: string[]` (August→May) and `monthlySheets(data: DashboardData, prefix: string): { label: string; rows: SheetRow[] }[]` — finds sheets whose name starts with `prefix`, sorts latest-month-first by `MONTH_ORDER`, and title-cases the month label.
  - `<MonthlyWeekly data />` — a bordered card with an inner `Tabs`: Classic Monthly, H2H Monthly, Manager of the Week (`weekly_manager_log`), FPL Challenge (`fpl_challenge_weekly_log`).

> **Ordering note:** this task uses `StandingsTable` from Task 8. If executing strictly in number order, either (a) do Task 8 before this one, or (b) create a minimal local table here and swap to `StandingsTable` when Task 8 lands. Recommended: reorder so Task 8 runs before Task 6b (they're independent otherwise).

- [ ] **Step 1: Write the failing monthly test**

Create `web/lib/monthly.test.ts`:

```typescript
import { monthlySheets } from "./monthly";
import type { DashboardData } from "./types";

const data: DashboardData = {
  sheets: {
    classic_monthly_august: [{ Standings: 1, Aug: 10 }],
    classic_monthly_september: [{ Standings: 1, Sep: 12 }],
  },
  meta: { lastFinishedGw: 3, lastUpdatedUtc: "" },
};

test("monthlySheets returns latest month first with title-cased labels", () => {
  const out = monthlySheets(data, "classic_monthly_");
  expect(out.map((m) => m.label)).toEqual(["September", "August"]);
  expect(out[0].rows[0].Sep).toBe(12);
});

test("monthlySheets returns empty when no matching sheets", () => {
  expect(monthlySheets(data, "h2h_monthly_")).toEqual([]);
});
```

- [ ] **Step 2: Run it — expect FAIL.** Run: `cd web && npx vitest run lib/monthly.test.ts`

- [ ] **Step 3: Implement monthly.ts**

Create `web/lib/monthly.ts`:

```typescript
import type { DashboardData, SheetRow } from "./types";

export const MONTH_ORDER = [
  "August", "September", "October", "November", "December",
  "January", "February", "March", "April", "May",
];

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function monthlySheets(data: DashboardData, prefix: string): { label: string; rows: SheetRow[] }[] {
  return Object.keys(data.sheets)
    .filter((n) => n.startsWith(prefix))
    .map((n) => ({ n, month: n.slice(prefix.length) }))
    .sort((a, b) => MONTH_ORDER.indexOf(b.month) - MONTH_ORDER.indexOf(a.month))
    .map(({ n, month }) => ({ label: titleCase(month), rows: data.sheets[n] }));
}
```

- [ ] **Step 4: Run it — expect PASS.** Run: `cd web && npx vitest run lib/monthly.test.ts`

- [ ] **Step 5: Implement MonthlyWeekly + wire into StandardTab**

Create `web/app/components/MonthlyWeekly.tsx`:

```tsx
"use client";
import type { DashboardData } from "@/lib/types";
import { getSheet } from "@/lib/types";
import { monthlySheets } from "@/lib/monthly";
import { Tabs } from "./Tabs";
import { StandingsTable } from "./StandingsTable";

function Empty() {
  return <p className="text-sm text-[--muted]">No data yet.</p>;
}

function MonthlyList({ data, prefix }: { data: DashboardData; prefix: string }) {
  const months = monthlySheets(data, prefix);
  if (months.length === 0) return <Empty />;
  return (
    <div className="space-y-4">
      {months.map((m) => (
        <div key={m.label}>
          <h5 className="font-display mb-2 text-sm">{m.label}</h5>
          <StandingsTable rows={m.rows} />
        </div>
      ))}
    </div>
  );
}

export function MonthlyWeekly({ data }: { data: DashboardData }) {
  const weekly = getSheet(data, "weekly_manager_log");
  const challenge = getSheet(data, "fpl_challenge_weekly_log");
  return (
    <div className="mt-4 rounded-2xl border border-[--line] bg-[--panel] p-4">
      <h4 className="font-display mb-3 text-sm">Monthly &amp; Weekly Winners</h4>
      <Tabs
        items={[
          { key: "cm", label: "Classic Monthly", content: <MonthlyList data={data} prefix="classic_monthly_" /> },
          { key: "hm", label: "H2H Monthly", content: <MonthlyList data={data} prefix="h2h_monthly_" /> },
          { key: "motw", label: "Manager of the Week", content: weekly.length ? <StandingsTable rows={weekly} /> : <Empty /> },
          { key: "chal", label: "FPL Challenge", content: challenge.length ? <StandingsTable rows={challenge} /> : <Empty /> },
        ]}
      />
    </div>
  );
}
```

In `StandardTab.tsx`, import `MonthlyWeekly` and render `<MonthlyWeekly data={data} />` after the cup banner (still inside the outer `<div>`).

- [ ] **Step 6: Extend the fixture**

Add to `web/fixtures/dashboard.sample.json` `"sheets"` (so the section renders in dev/e2e):

```json
"classic_monthly_august": [{"Standings": 1, "Manager": "Danish Aziz", "Points": 250}],
"weekly_manager_log": [{"Gameweek": 1, "Winner": "Wei Jie", "Score": 89}],
"fpl_challenge_weekly_log": [{"Gameweek": 1, "Winner": "Faiz Rahman", "Score": 42}]
```

- [ ] **Step 7: Verify build.** Run: `cd web && npm run build`

- [ ] **Step 8: Commit**

```bash
git add web/lib/monthly.ts web/lib/monthly.test.ts web/app/components/MonthlyWeekly.tsx web/app/components/StandardTab.tsx web/fixtures/dashboard.sample.json
git commit -m "feat: monthly and weekly winners section for full Streamlit parity"
```

---

### Task 7: Special tab — award leader cards

**Files:**
- Create: `web/lib/awards.ts`, `web/app/components/AwardCard.tsx`, `web/app/components/SpecialTab.tsx`
- Modify: `web/app/components/DashboardShell.tsx` (wire the Special panel)
- Test: `web/app/components/SpecialTab.test.tsx`

**Interfaces:**
- Consumes: `awardLeader`, `toNum` (Task 4), `getSheet` (Task 3).
- Produces:
  - `web/lib/awards.ts` exporting `SPECIAL_AWARDS: { key: string; title: string; suffix: string }[]` — the exact list from Global Constraints (order preserved).
  - `<AwardCard title, suffix, leader: {manager,score,gap} | null />` — a gradient card showing the title, winner, and `score suffix (gap ahead)`; "N/A" when no positive leader.
  - `<SpecialTab data />` — grid of `AwardCard`s for every award with data.

- [ ] **Step 1: Write the failing test**

Create `web/app/components/SpecialTab.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { SpecialTab } from "./SpecialTab";
import type { DashboardData } from "@/lib/types";

const data: DashboardData = {
  sheets: {
    golden_boot: [
      { Standings: 1, Team: "A", Manager: "Faiz", Goals: 7 },
      { Standings: 2, Team: "B", Manager: "Wei", Goals: 5 },
    ],
  },
  meta: { lastFinishedGw: 3, lastUpdatedUtc: "" },
};

test("renders an award card with leader and gap", () => {
  render(<SpecialTab data={data} />);
  expect(screen.getByText("🥇 Golden Boot")).toBeInTheDocument();
  expect(screen.getByText("Faiz")).toBeInTheDocument();
  expect(screen.getByText(/7 Goals/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it — expect FAIL.** Run: `cd web && npx vitest run app/components/SpecialTab.test.tsx`

- [ ] **Step 3: Implement awards.ts, AwardCard, SpecialTab**

Create `web/lib/awards.ts` with the full `SPECIAL_AWARDS` array (all 24 entries from the Global Constraints display-config block, in that order), e.g.:

```typescript
export const SPECIAL_AWARDS: { key: string; title: string; suffix: string }[] = [
  { key: "golden_boot", title: "🥇 Golden Boot", suffix: "Goals" },
  { key: "playmaker", title: "🅰️ Playmaker", suffix: "Assists" },
  { key: "golden_glove", title: "🧤 Golden Glove", suffix: "Clean Sheets" },
  { key: "best_gk", title: "👑 Best Goalkeeper", suffix: "Pts" },
  { key: "best_def", title: "🛡️ Best Defenders", suffix: "Pts" },
  { key: "best_mid", title: "🎩 Best Midfielders", suffix: "Pts" },
  { key: "best_fwd", title: "💥 Best Forwards", suffix: "Pts" },
  { key: "best_vc", title: "🥈 Best Vice-Captain", suffix: "Pts" },
  { key: "transfer_king", title: "🔀 Transfer King", suffix: "Pts" },
  { key: "bench_king", title: "🪑 Bench King", suffix: "Pts" },
  { key: "dream_team", title: "🌟 Dream Team King", suffix: "DT Score" },
  { key: "shooting_stars", title: "🌠 Shooting Stars", suffix: "Rank Rise" },
  { key: "defensive_king", title: "🧱 Defensive King", suffix: "Contribution" },
  { key: "penalty_king", title: "🎯 Penalty King", suffix: "Pts" },
  { key: "highest_gw_score", title: "🚀 Highest GW Score", suffix: "Pts" },
  { key: "freehit_king", title: "🃏 Free Hit King", suffix: "Pts" },
  { key: "benchboost_king", title: "📈 Bench Boost King", suffix: "Pts" },
  { key: "triplecaptain_king", title: "©️³ Triple Captain King", suffix: "Pts" },
  { key: "expects_king", title: "🔮 Expects King", suffix: "xGI" },
  { key: "hardworking_af", title: "💪 Hardworking AF", suffix: "Mins" },
  { key: "half_season_first", title: "🌗 Half Season Wonders (H1)", suffix: "Pts" },
  { key: "half_season_second", title: "🌓 Half Season Wonders (H2)", suffix: "Pts" },
  { key: "bad_luck_h2h", title: "😢 Bad Luck H2H", suffix: "GW Streak" },
  { key: "reversed_motw", title: "🔻 Reversed MotW", suffix: "Times Lowest" },
];
```

Create `web/app/components/AwardCard.tsx`:

```tsx
export function AwardCard({
  title, suffix, leader,
}: { title: string; suffix: string; leader: { manager: string; score: number; gap: number } | null }) {
  const has = leader && leader.score > 0;
  return (
    <div className="rounded-2xl border border-[--line] p-4"
         style={{ background: "linear-gradient(180deg,var(--panel),var(--panel2))" }}>
      <p className="text-xs font-semibold text-[--muted]">{title}</p>
      <p className="font-display my-2 text-base">{has ? leader!.manager : "N/A"}</p>
      <p className="text-xs font-bold text-[--accent]">
        {has ? `${leader!.score} ${suffix}` : `0 ${suffix}`}
      </p>
      {has && leader!.gap > 0 && <p className="text-[11px] text-[--muted]">{leader!.gap} ahead</p>}
    </div>
  );
}
```

Create `web/app/components/SpecialTab.tsx`:

```tsx
"use client";
import type { DashboardData } from "@/lib/types";
import { getSheet } from "@/lib/types";
import { awardLeader } from "@/lib/transforms";
import { SPECIAL_AWARDS } from "@/lib/awards";
import { AwardCard } from "./AwardCard";

export function SpecialTab({ data }: { data: DashboardData }) {
  const cards = SPECIAL_AWARDS.map((a) => ({ ...a, leader: awardLeader(getSheet(data, a.key)) }))
    .filter((a) => a.leader !== null);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((a) => (
        <AwardCard key={a.key} title={a.title} suffix={a.suffix} leader={a.leader} />
      ))}
    </div>
  );
}
```

Wire `SpecialTab` into `DashboardShell`'s Special panel.

- [ ] **Step 4: Run it — expect PASS.** Run: `cd web && npx vitest run app/components/SpecialTab.test.tsx`

- [ ] **Step 5: Verify build.** Run: `cd web && npm run build`

- [ ] **Step 6: Commit**

```bash
git add web/lib/awards.ts web/app/components/AwardCard.tsx web/app/components/SpecialTab.tsx web/app/components/SpecialTab.test.tsx web/app/components/DashboardShell.tsx
git commit -m "feat: special awards tab with leader cards"
```

---

### Task 8: Detailed tab — cumulative progression + standings tables

**Files:**
- Create: `web/app/components/ProgressionChart.tsx`, `web/app/components/DetailedTab.tsx`, `web/app/components/StandingsTable.tsx`
- Modify: `web/app/components/DashboardShell.tsx` (wire the Detailed panel + pass highlight)
- Test: `web/app/components/DetailedTab.test.tsx`

**Interfaces:**
- Consumes: `cumulativeSeries`, `gwColumns` (Task 4), `getSheet` (Task 3), `SPECIAL_AWARDS` (Task 7).
- Produces:
  - `<ProgressionChart rows, highlight? />` — a Recharts line chart of cumulative scores per manager across gameweeks; highlighted manager gets a thicker neon line.
  - `<StandingsTable rows, highlight? />` — a table of the award sheet with the highlighted manager's row tinted.
  - `<DetailedTab data, highlight />` — for each award with data, a collapsible `<details>` showing the progression chart (if GW columns exist) and the standings table.

- [ ] **Step 1: Write the failing test**

Create `web/app/components/DetailedTab.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { DetailedTab } from "./DetailedTab";
import type { DashboardData } from "@/lib/types";

const data: DashboardData = {
  sheets: {
    golden_boot: [
      { Standings: 1, Team: "A", Manager: "Faiz", Goals: 7, GW1: 3, GW2: 4 },
      { Standings: 2, Team: "B", Manager: "Wei", Goals: 5, GW1: 2, GW2: 3 },
    ],
  },
  meta: { lastFinishedGw: 2, lastUpdatedUtc: "" },
};

test("renders a collapsible award section with the award title", () => {
  render(<DetailedTab data={data} />);
  expect(screen.getByText(/Golden Boot/)).toBeInTheDocument();
  expect(screen.getByText("Faiz")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it — expect FAIL.** Run: `cd web && npx vitest run app/components/DetailedTab.test.tsx`

- [ ] **Step 3: Implement the three components**

Create `web/app/components/ProgressionChart.tsx`:

```tsx
"use client";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { cumulativeSeries } from "@/lib/transforms";
import type { SheetRow } from "@/lib/types";

export function ProgressionChart({ rows, highlight }: { rows: SheetRow[]; highlight?: string }) {
  const series = cumulativeSeries(rows);
  if (series.length === 0) return null;
  const managers = Object.keys(series[0]).filter((k) => k !== "gameweek");
  return (
    <LineChart width={620} height={300} data={series} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
      <CartesianGrid stroke="#232c38" />
      <XAxis dataKey="gameweek" tick={{ fill: "#8a97a8", fontSize: 11 }} />
      <YAxis tick={{ fill: "#8a97a8", fontSize: 11 }} />
      {managers.map((m) => (
        <Line key={m} type="monotone" dataKey={m} dot={false} isAnimationActive={false}
              stroke={m === highlight ? "#2bfca4" : "#41506a"}
              strokeWidth={m === highlight ? 4 : 1.5} />
      ))}
    </LineChart>
  );
}
```

Create `web/app/components/StandingsTable.tsx`:

```tsx
import type { SheetRow } from "@/lib/types";

export function StandingsTable({ rows, highlight }: { rows: SheetRow[]; highlight?: string }) {
  if (rows.length === 0) return null;
  const cols = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>{cols.map((c) => <th key={c} className="border-b border-[--line] px-2 py-1.5 text-left text-[--muted]">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const on = String(r.Manager ?? "") === highlight;
            return (
              <tr key={i} className={on ? "bg-[--accent] text-[#06231a]" : ""}>
                {cols.map((c) => <td key={c} className="border-b border-[--line] px-2 py-1.5">{String(r[c] ?? "")}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

Create `web/app/components/DetailedTab.tsx`:

```tsx
"use client";
import type { DashboardData } from "@/lib/types";
import { getSheet } from "@/lib/types";
import { gwColumns } from "@/lib/transforms";
import { SPECIAL_AWARDS } from "@/lib/awards";
import { ProgressionChart } from "./ProgressionChart";
import { StandingsTable } from "./StandingsTable";

export function DetailedTab({ data, highlight }: { data: DashboardData; highlight?: string }) {
  return (
    <div className="space-y-3">
      {SPECIAL_AWARDS.map((a) => {
        const rows = getSheet(data, a.key);
        if (rows.length === 0) return null;
        const hasGw = gwColumns(rows[0]).length > 0;
        return (
          <details key={a.key} className="rounded-2xl border border-[--line] bg-[--panel] p-4">
            <summary className="cursor-pointer font-display text-sm">{a.title}</summary>
            <div className="mt-3 space-y-3">
              {hasGw && (
                <div className="overflow-x-auto">
                  <ProgressionChart rows={rows} highlight={highlight} />
                </div>
              )}
              <StandingsTable rows={rows} highlight={highlight} />
            </div>
          </details>
        );
      })}
    </div>
  );
}
```

Wire `DetailedTab` into `DashboardShell`'s Detailed panel, passing `highlight`.

- [ ] **Step 4: Run it — expect PASS.** Run: `cd web && npx vitest run app/components/DetailedTab.test.tsx`

- [ ] **Step 5: Verify build.** Run: `cd web && npm run build`

- [ ] **Step 6: Commit**

```bash
git add web/app/components/ProgressionChart.tsx web/app/components/StandingsTable.tsx web/app/components/DetailedTab.tsx web/app/components/DetailedTab.test.tsx web/app/components/DashboardShell.tsx
git commit -m "feat: detailed tab with progression charts and standings tables"
```

---

### Task 9: Manager highlight selector + graceful empty/error states

**Files:**
- Modify: `web/app/components/DashboardShell.tsx`, `web/app/page.tsx`
- Create: `web/app/components/ManagerSelect.tsx`, `web/app/error.tsx`
- Test: `web/app/components/ManagerSelect.test.tsx`

**Interfaces:**
- Consumes: `getSheet` (Task 3), the three tab components (Tasks 6–8).
- Produces:
  - `<ManagerSelect managers: string[], value, onChange />` — a styled `<select>` ("Highlight a manager" + "None").
  - `DashboardShell` holds `highlight` state (default none), renders `ManagerSelect` above the tabs, and threads `highlight` into all three tabs.
  - `web/app/error.tsx` — a route error boundary showing a friendly "couldn't load the dashboard" message.

- [ ] **Step 1: Write the failing ManagerSelect test**

Create `web/app/components/ManagerSelect.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { ManagerSelect } from "./ManagerSelect";

test("lists managers and reports selection", () => {
  const onChange = vi.fn();
  render(<ManagerSelect managers={["A", "B"]} value="" onChange={onChange} />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "B" } });
  expect(onChange).toHaveBeenCalledWith("B");
});
```

- [ ] **Step 2: Run it — expect FAIL.** Run: `cd web && npx vitest run app/components/ManagerSelect.test.tsx`

- [ ] **Step 3: Implement ManagerSelect**

Create `web/app/components/ManagerSelect.tsx`:

```tsx
"use client";
export function ManagerSelect({
  managers, value, onChange,
}: { managers: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <select
      aria-label="Highlight a manager"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[--line] bg-[--panel] px-3 py-2 text-sm text-[--ink]"
    >
      <option value="">Highlight a manager…</option>
      {managers.map((m) => (
        <option key={m} value={m}>{m}</option>
      ))}
    </select>
  );
}
```

- [ ] **Step 4: Run it — expect PASS.** Run: `cd web && npx vitest run app/components/ManagerSelect.test.tsx`

- [ ] **Step 5: Wire highlight state + error boundary**

In `DashboardShell.tsx`: convert to hold `const [highlight, setHighlight] = useState("")`; derive `managers` from `topStandings(getSheet(data,"classic_league_standings"),"Total", 999).map(r=>r.manager)` (or read `Manager` column directly); render `<ManagerSelect managers={managers} value={highlight} onChange={setHighlight} />` just above `<Tabs>`; pass `highlight={highlight || undefined}` into StandardTab, SpecialTab is unaffected, DetailedTab.

Create `web/app/error.tsx`:

```tsx
"use client";
export default function Error() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-24 text-center">
      <h1 className="font-display text-2xl">Couldn&apos;t load the dashboard</h1>
      <p className="mt-2 text-[--muted]">The data feed is temporarily unavailable. Please refresh in a minute.</p>
    </main>
  );
}
```

- [ ] **Step 6: Verify build + full test suite**

Run: `cd web && npm run build && npm run test`
Expected: build succeeds; all Vitest tests pass.

- [ ] **Step 7: Commit**

```bash
git add web/app/components/ManagerSelect.tsx web/app/components/ManagerSelect.test.tsx web/app/components/DashboardShell.tsx web/app/error.tsx
git commit -m "feat: manager highlight selector and error boundary"
```

---

### Task 10: Playwright smoke test, README, and deploy notes

**Files:**
- Create: `web/playwright.config.ts`, `web/e2e/smoke.spec.ts`, `web/README.md`
- Modify: none

**Interfaces:**
- Consumes: the running dev server + the fixture.
- Produces: a smoke test asserting the three tabs render, and docs for local dev + Vercel deploy.

- [ ] **Step 1: Playwright config**

Create `web/playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: { baseURL: "http://localhost:3000" },
});
```

- [ ] **Step 2: Smoke test**

Create `web/e2e/smoke.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test("dashboard renders the three tabs and switches", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("PepRoulette™")).toBeVisible();
  await expect(page.getByRole("button", { name: /Standard Awards/ })).toBeVisible();
  await page.getByRole("button", { name: /Special Awards/ }).click();
  await expect(page.getByText(/Golden Boot/)).toBeVisible();
});
```

- [ ] **Step 3: Install browsers + run it**

Run:

```bash
cd web && npx playwright install chromium && npm run e2e
```

Expected: 1 passed. (Uses the fixture since `NEXT_PUBLIC_DASHBOARD_URL` is unset locally.)

- [ ] **Step 4: README + deploy notes**

Create `web/README.md` documenting: `npm install`, `npm run dev` (uses the fixture), `npm run test`, `npm run e2e`, and the Vercel setup — **Root Directory = `web/`**, env `NEXT_PUBLIC_DASHBOARD_URL` = the Blob URL from `docs/INFRA.md`, framework auto-detected as Next.js. Note that ISR revalidates every 300s and the data is published by the Python pipeline (Plan 1).

- [ ] **Step 5: Commit**

```bash
git add web/playwright.config.ts web/e2e/smoke.spec.ts web/README.md
git commit -m "test: playwright smoke test and web README/deploy notes"
```

---

## Self-Review

**Spec coverage (spec §6, §3.2):**
- Next.js App Router + Tailwind in `web/` (§6.1) → Task 1. ✓
- Direction A visual system: tokens, fonts, header, pill tabs (§6.2) → Tasks 2, 5. ✓
- Reads `dashboard.json` from Blob via env, ISR (§6.4, §3.2) → Tasks 3, 5 (`revalidate`). ✓
- Three tabs mirroring current IA: Standard (races + cup), Special (award cards), Detailed (progression + tables) (§6.3) → Tasks 6, 7, 8. ✓
- Manager highlight (parity with current Streamlit sidebar) → Task 9. ✓
- Recharts for bar + line charts (§6.1) → Tasks 6, 8. ✓
- Deployed to Vercel, Root Directory `web/` (§12 repo layout) → Tasks 1, 10 deploy notes. ✓
- Testing: logic TDD + component tests + Playwright smoke (§7 scope for this plane) → Tasks 3, 4, 6–10. ✓
- Monthly & Weekly winners section (`classic_monthly_*`, `h2h_monthly_*`, `weekly_manager_log`, `fpl_challenge_weekly_log`) for full Streamlit parity → Task 6b. ✓
- Out of scope (later plans): live overlay (§7 → Plan 4), admin/auth/Publish (§6.3 admin, §9 → Plan 3).

**Execution ordering:** run Task 8 before Task 6b (Task 6b reuses `StandingsTable` from Task 8; they are otherwise independent).

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N" — every code step has real code. `SPECIAL_AWARDS` is written out in full in Task 7.

**Type consistency:** `DashboardData`/`SheetRow`/`getSheet`/`normalizeDashboard` (Task 3) are used consistently in Tasks 5–9; `topStandings`/`awardLeader`/`cumulativeSeries`/`gwColumns`/`toNum` (Task 4) signatures match their call sites; `TabItem`/`Tabs` (Task 5) match `DashboardShell` usage; `SPECIAL_AWARDS` (Task 7) reused in Task 8. ✓
