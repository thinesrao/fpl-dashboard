# Plan 4 — Live In-Match Scores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a live current-gameweek leaderboard on the public dashboard while matches are being played — computed from each manager's locked picks × live player points — active only during match windows, with server-side caching so viewer traffic never scales FPL API calls.

**Architecture:** An additive plane on top of the static dashboard. A cached Vercel route (`/api/live`) determines whether the current gameweek has matches in progress; if so it fetches `event/{gw}/live` (one call, all players), combines it with each league manager's locked picks (cached for the gameweek), and returns a live leaderboard. A client `LiveSection` polls that route every 60s and renders a "LIVE" strip only when a gameweek is in progress. Next.js Data Cache makes N viewers cost ~1 upstream live call/minute. Nothing here touches the pipeline, the awards, or the static read path.

**Tech Stack:** Next.js App Router route handlers + TypeScript, Tailwind (Direction A), Vitest + React Testing Library. FPL public API. No new backend, no DB, no auth.

**Spec:** `docs/superpowers/specs/2026-08-25-vercel-migration-design.md` (§7 Live Scores Overlay)

## Global Constraints

- **All work under `web/`.** No pipeline/Python changes. Read-only feature (no writes, no Supabase, no auth).
- **FPL API base:** `https://fantasy.premierleague.com/api/`. Endpoints used: `bootstrap-static/` (events), `fixtures/?event={gw}`, `event/{gw}/live/`, `leagues-classic/{id}/standings/`, `entry/{id}/event/{gw}/picks/`.
- **Verified data shapes (build against these exactly):**
  - `event/{gw}/live/` → `{ elements: [{ id: number, stats: { total_points: number } }] }`.
  - `fixtures/?event={gw}` → `[{ event, started: boolean, finished: boolean, finished_provisional: boolean }]`.
  - `bootstrap-static/` → `{ events: [{ id, is_current: boolean, finished: boolean }] }`.
  - `leagues-classic/{id}/standings/` → `{ standings: { results: [{ entry: number, entry_name: string, player_name: string }] } }`.
  - `entry/{id}/event/{gw}/picks/` → `{ picks: [{ element: number, multiplier: number }] }` (multiplier: 0 bench, 1 starter, 2 captain, 3 triple-captain — so `multiplier × live_points` gives the correct provisional total automatically).
- **Live detection:** the "live gameweek" is the `is_current` bootstrap event; it is *live* when any fixture for it has `started === true` and NOT all fixtures are `finished_provisional === true`. Otherwise the section is hidden.
- **League id:** read `NEXT_PUBLIC_CLASSIC_LEAGUE_ID` (fallback `218144`, the PepRoulette Classic id).
- **Caching (critical — decouples viewers from FPL):** internal fetches use Next Data Cache — `bootstrap-static` and `fixtures` revalidate 60s; `event/{gw}/live` revalidate 60s; `leagues-classic/{id}/standings` revalidate 3600s; `entry/{id}/…/picks` revalidate 3600s (picks are locked for the gameweek). The `/api/live` route sets `export const revalidate = 60`. The client polls every 60s.
- **v1 scope:** live leaderboard (manager + live GW points, sorted desc) with a pulsing LIVE badge. NO rank ▲/▼ deltas (they need a pre-gameweek baseline snapshot — noted as a future enhancement).
- **Direction A tokens** (already in `globals.css`): `--live:#ff4d6d` for the LIVE badge/pulse, `--accent`, `--panel`, `--line`, `--muted`.
- **Tests** in `web/**/*.test.ts(x)` (Vitest). Conventional commits.

---

### Task 1: Pure live-computation logic (TDD)

**Files:**
- Create: `web/lib/live-compute.ts`
- Test: `web/lib/live-compute.test.ts`

**Interfaces:**
- Produces:
  - `type Fixture = { started: boolean; finished_provisional: boolean }`.
  - `isGameweekLive(fixtures: Fixture[]): boolean` — true when at least one fixture has `started` and not every fixture is `finished_provisional`. Empty array → false.
  - `type LeagueEntry = { entry: number; name: string }`.
  - `computeLiveStandings(entries: LeagueEntry[], picksByEntry: Record<number, {element:number;multiplier:number}[]>, livePointsById: Record<number, number>): { manager: string; entry: number; points: number }[]` — for each entry sums `multiplier × (livePointsById[element] ?? 0)` over its picks, returns sorted by points desc then manager asc.

- [ ] **Step 1: Write the failing test**

Create `web/lib/live-compute.test.ts`:

```typescript
import { isGameweekLive, computeLiveStandings } from "./live-compute";

test("isGameweekLive: true when a fixture started and not all finished", () => {
  expect(isGameweekLive([{ started: true, finished_provisional: false }])).toBe(true);
  expect(isGameweekLive([{ started: true, finished_provisional: true }])).toBe(false);
  expect(isGameweekLive([{ started: false, finished_provisional: false }])).toBe(false);
  expect(isGameweekLive([])).toBe(false);
});

test("computeLiveStandings sums multiplier×points and sorts desc", () => {
  const entries = [{ entry: 1, name: "Alice" }, { entry: 2, name: "Bob" }];
  const picks = {
    1: [{ element: 10, multiplier: 2 }, { element: 11, multiplier: 1 }, { element: 99, multiplier: 0 }],
    2: [{ element: 10, multiplier: 1 }],
  };
  const live = { 10: 6, 11: 2, 99: 5 };
  expect(computeLiveStandings(entries, picks, live)).toEqual([
    { manager: "Alice", entry: 1, points: 14 }, // 2*6 + 1*2 + 0*5
    { manager: "Bob", entry: 2, points: 6 },    // 1*6
  ]);
});

test("computeLiveStandings tolerates missing picks/points", () => {
  const out = computeLiveStandings([{ entry: 3, name: "Cara" }], {}, {});
  expect(out).toEqual([{ manager: "Cara", entry: 3, points: 0 }]);
});
```

- [ ] **Step 2: Run it — expect FAIL.** Run: `cd web && npx vitest run lib/live-compute.test.ts`

- [ ] **Step 3: Implement live-compute.ts**

Create `web/lib/live-compute.ts`:

```typescript
export type Fixture = { started: boolean; finished_provisional: boolean };

export function isGameweekLive(fixtures: Fixture[]): boolean {
  if (fixtures.length === 0) return false;
  const anyStarted = fixtures.some((f) => f.started);
  const allFinished = fixtures.every((f) => f.finished_provisional);
  return anyStarted && !allFinished;
}

export type LeagueEntry = { entry: number; name: string };
type Pick = { element: number; multiplier: number };

export function computeLiveStandings(
  entries: LeagueEntry[],
  picksByEntry: Record<number, Pick[]>,
  livePointsById: Record<number, number>,
): { manager: string; entry: number; points: number }[] {
  return entries
    .map((e) => {
      const picks = picksByEntry[e.entry] ?? [];
      const points = picks.reduce(
        (sum, p) => sum + p.multiplier * (livePointsById[p.element] ?? 0),
        0,
      );
      return { manager: e.name, entry: e.entry, points };
    })
    .sort((a, b) => b.points - a.points || a.manager.localeCompare(b.manager));
}
```

- [ ] **Step 4: Run it — expect PASS.** Run: `cd web && npx vitest run lib/live-compute.test.ts`

- [ ] **Step 5: Commit**

```bash
git add web/lib/live-compute.ts web/lib/live-compute.test.ts
git commit -m "feat: pure live-standings computation and gameweek-live detection"
```

---

### Task 2: FPL fetch layer (cached)

**Files:**
- Create: `web/lib/fpl.ts`
- Test: `web/lib/fpl.test.ts`

**Interfaces:**
- Consumes: nothing (uses global `fetch`; cache options are Next-specific and ignored in tests).
- Produces (all async, all use `fetch` with `{ next: { revalidate } }`):
  - `currentGameweek(): Promise<{ id: number; finished: boolean } | null>` — the `is_current` event from bootstrap.
  - `gameweekFixtures(gw: number): Promise<Fixture[]>`.
  - `livePointsById(gw: number): Promise<Record<number, number>>` — maps `elements[].id` → `stats.total_points`.
  - `leagueEntries(leagueId: number): Promise<LeagueEntry[]>` — from classic standings results (`{ entry, name: player_name }`).
  - `entryPicks(entry: number, gw: number): Promise<{element:number;multiplier:number}[]>`.
  - `FPL_BASE` constant.
  - A tiny pure helper `mapLivePoints(elements)` extracted for a unit test (the rest are thin fetch wrappers verified in the route/integration and by the app running).

- [ ] **Step 1: Write the failing test (pure mapper)**

Create `web/lib/fpl.test.ts`:

```typescript
import { mapLivePoints } from "./fpl";

test("mapLivePoints builds an id→total_points map", () => {
  const elements = [
    { id: 1, stats: { total_points: 6 } },
    { id: 2, stats: { total_points: 0 } },
  ];
  expect(mapLivePoints(elements)).toEqual({ 1: 6, 2: 0 });
});
```

- [ ] **Step 2: Run it — expect FAIL.** Run: `cd web && npx vitest run lib/fpl.test.ts`

- [ ] **Step 3: Implement fpl.ts**

Create `web/lib/fpl.ts`:

```typescript
import type { Fixture, LeagueEntry } from "./live-compute";

export const FPL_BASE = "https://fantasy.premierleague.com/api";

async function getJson(url: string, revalidate: number): Promise<unknown> {
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`FPL ${res.status} for ${url}`);
  return res.json();
}

export async function currentGameweek(): Promise<{ id: number; finished: boolean } | null> {
  const data = (await getJson(`${FPL_BASE}/bootstrap-static/`, 60)) as {
    events: { id: number; is_current: boolean; finished: boolean }[];
  };
  const ev = data.events.find((e) => e.is_current);
  return ev ? { id: ev.id, finished: ev.finished } : null;
}

export async function gameweekFixtures(gw: number): Promise<Fixture[]> {
  const data = (await getJson(`${FPL_BASE}/fixtures/?event=${gw}`, 60)) as Fixture[];
  return data.map((f) => ({ started: !!f.started, finished_provisional: !!f.finished_provisional }));
}

export function mapLivePoints(
  elements: { id: number; stats: { total_points: number } }[],
): Record<number, number> {
  const out: Record<number, number> = {};
  for (const e of elements) out[e.id] = e.stats.total_points;
  return out;
}

export async function livePointsById(gw: number): Promise<Record<number, number>> {
  const data = (await getJson(`${FPL_BASE}/event/${gw}/live/`, 60)) as {
    elements: { id: number; stats: { total_points: number } }[];
  };
  return mapLivePoints(data.elements);
}

export async function leagueEntries(leagueId: number): Promise<LeagueEntry[]> {
  const data = (await getJson(`${FPL_BASE}/leagues-classic/${leagueId}/standings/`, 3600)) as {
    standings: { results: { entry: number; player_name: string }[] };
  };
  return data.standings.results.map((r) => ({ entry: r.entry, name: r.player_name }));
}

export async function entryPicks(entry: number, gw: number): Promise<{ element: number; multiplier: number }[]> {
  const data = (await getJson(`${FPL_BASE}/entry/${entry}/event/${gw}/picks/`, 3600)) as {
    picks: { element: number; multiplier: number }[];
  };
  return data.picks.map((p) => ({ element: p.element, multiplier: p.multiplier }));
}
```

- [ ] **Step 4: Run it — expect PASS.** Run: `cd web && npx vitest run lib/fpl.test.ts`

- [ ] **Step 5: Commit**

```bash
git add web/lib/fpl.ts web/lib/fpl.test.ts
git commit -m "feat: cached FPL fetch layer for live scores"
```

---

### Task 3: `/api/live` route

**Files:**
- Create: `web/app/api/live/route.ts`
- Test: `web/app/api/live/route.test.ts`

**Interfaces:**
- Consumes: everything in `fpl.ts` (Task 2) + `isGameweekLive`, `computeLiveStandings` (Task 1).
- Produces:
  - `type LivePayload = { live: false } | { live: true; gameweek: number; standings: { manager: string; entry: number; points: number }[] }`.
  - `buildLivePayload(deps)` — a dependency-injected pure-ish orchestrator (so it's unit-testable without network): given injected `currentGameweek`, `gameweekFixtures`, `livePointsById`, `leagueEntries`, `entryPicks`, and `leagueId`, returns a `LivePayload`.
  - `GET()` route handler calling `buildLivePayload` with the real fpl functions and `NEXT_PUBLIC_CLASSIC_LEAGUE_ID` (fallback 218144); `export const revalidate = 60`.

- [ ] **Step 1: Write the failing test**

Create `web/app/api/live/route.test.ts`:

```typescript
import { buildLivePayload } from "./route";

const deps = {
  leagueId: 218144,
  currentGameweek: async () => ({ id: 2, finished: false }),
  gameweekFixtures: async () => [{ started: true, finished_provisional: false }],
  livePointsById: async () => ({ 10: 6 }),
  leagueEntries: async () => [{ entry: 1, name: "Alice" }],
  entryPicks: async () => [{ element: 10, multiplier: 2 }],
};

test("returns live standings when a gameweek is in progress", async () => {
  const payload = await buildLivePayload(deps);
  expect(payload).toEqual({
    live: true, gameweek: 2, standings: [{ manager: "Alice", entry: 1, points: 12 }],
  });
});

test("returns {live:false} when no current gameweek", async () => {
  expect(await buildLivePayload({ ...deps, currentGameweek: async () => null })).toEqual({ live: false });
});

test("returns {live:false} when fixtures are not in progress", async () => {
  const payload = await buildLivePayload({
    ...deps, gameweekFixtures: async () => [{ started: true, finished_provisional: true }],
  });
  expect(payload).toEqual({ live: false });
});
```

- [ ] **Step 2: Run it — expect FAIL.** Run: `cd web && npx vitest run app/api/live/route.test.ts`

- [ ] **Step 3: Implement the route**

Create `web/app/api/live/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { isGameweekLive, computeLiveStandings, type Fixture, type LeagueEntry } from "@/lib/live-compute";
import * as fpl from "@/lib/fpl";

export const revalidate = 60;

export type LivePayload =
  | { live: false }
  | { live: true; gameweek: number; standings: { manager: string; entry: number; points: number }[] };

type Deps = {
  leagueId: number;
  currentGameweek: () => Promise<{ id: number; finished: boolean } | null>;
  gameweekFixtures: (gw: number) => Promise<Fixture[]>;
  livePointsById: (gw: number) => Promise<Record<number, number>>;
  leagueEntries: (leagueId: number) => Promise<LeagueEntry[]>;
  entryPicks: (entry: number, gw: number) => Promise<{ element: number; multiplier: number }[]>;
};

export async function buildLivePayload(deps: Deps): Promise<LivePayload> {
  const current = await deps.currentGameweek();
  if (!current) return { live: false };

  const fixtures = await deps.gameweekFixtures(current.id);
  if (!isGameweekLive(fixtures)) return { live: false };

  const [live, entries] = await Promise.all([
    deps.livePointsById(current.id),
    deps.leagueEntries(deps.leagueId),
  ]);
  const picksByEntry: Record<number, { element: number; multiplier: number }[]> = {};
  await Promise.all(
    entries.map(async (e) => {
      picksByEntry[e.entry] = await deps.entryPicks(e.entry, current.id);
    }),
  );

  return {
    live: true,
    gameweek: current.id,
    standings: computeLiveStandings(entries, picksByEntry, live),
  };
}

export async function GET() {
  const leagueId = Number(process.env.NEXT_PUBLIC_CLASSIC_LEAGUE_ID) || 218144;
  try {
    const payload = await buildLivePayload({ leagueId, ...fpl });
    return NextResponse.json(payload);
  } catch {
    // fail closed on the live overlay — never break the page
    return NextResponse.json({ live: false } satisfies LivePayload);
  }
}
```

- [ ] **Step 4: Run it — expect PASS.** Run: `cd web && npx vitest run app/api/live/route.test.ts`

- [ ] **Step 5: Build.** Run: `cd web && NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder npm run build`

- [ ] **Step 6: Commit**

```bash
git add web/app/api/live
git commit -m "feat: /api/live route computing the live gameweek leaderboard"
```

---

### Task 4: LiveSection UI (polling) + wire into the dashboard

**Files:**
- Create: `web/app/components/LiveSection.tsx`
- Modify: `web/app/components/DashboardShell.tsx` (render `<LiveSection />` above the hero/tabs)
- Test: `web/app/components/LiveSection.test.tsx`

**Interfaces:**
- Consumes: `LivePayload` shape from the route (structurally; do not import server route code into the client — redefine the small type locally or import the type only).
- Produces:
  - `<LiveSection />` — a client component that fetches `/api/live` on mount and every 60s; renders nothing when `{live:false}`; renders a Direction-A "LIVE · GW{n}" strip with the sorted leaderboard when live. Accepts an optional `fetcher` prop (default `fetch`) for testability.

- [ ] **Step 1: Write the failing test**

Create `web/app/components/LiveSection.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { LiveSection } from "./LiveSection";

test("renders nothing when not live", async () => {
  const fetcher = async () => ({ live: false });
  const { container } = render(<LiveSection fetcher={fetcher as any} />);
  await waitFor(() => expect(container).toBeEmptyDOMElement());
});

test("renders the live leaderboard when live", async () => {
  const fetcher = async () => ({
    live: true, gameweek: 2,
    standings: [{ manager: "Alice", entry: 1, points: 68 }, { manager: "Bob", entry: 2, points: 54 }],
  });
  render(<LiveSection fetcher={fetcher as any} />);
  await waitFor(() => expect(screen.getByText(/LIVE/)).toBeInTheDocument());
  expect(screen.getByText(/GW2/)).toBeInTheDocument();
  expect(screen.getByText("Alice")).toBeInTheDocument();
  expect(screen.getByText("68")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it — expect FAIL.** Run: `cd web && npx vitest run app/components/LiveSection.test.tsx`

- [ ] **Step 3: Implement LiveSection**

Create `web/app/components/LiveSection.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";

type LiveRow = { manager: string; entry: number; points: number };
type LivePayload = { live: false } | { live: true; gameweek: number; standings: LiveRow[] };

async function defaultFetcher(): Promise<LivePayload> {
  const res = await fetch("/api/live");
  return res.json();
}

export function LiveSection({ fetcher = defaultFetcher }: { fetcher?: () => Promise<LivePayload> }) {
  const [data, setData] = useState<LivePayload>({ live: false });

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const payload = await fetcher();
        if (active) setData(payload);
      } catch {
        /* keep last state */
      }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => { active = false; clearInterval(id); };
  }, [fetcher]);

  if (!data.live) return null;

  return (
    <div className="mt-4 rounded-2xl border border-[rgba(255,77,109,0.28)] bg-[rgba(255,77,109,0.05)] p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#ff8ba3]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[--live]" aria-hidden />
        LIVE · GW{data.gameweek}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {data.standings.map((r, i) => (
          <div key={r.entry} className="flex items-center justify-between rounded-lg border border-[--line] bg-[--panel] px-3 py-2">
            <span className="text-sm"><span className="text-[--muted]">{i + 1}.</span> {r.manager}</span>
            <span className="font-display text-sm">{r.points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run it — expect PASS.** Run: `cd web && npx vitest run app/components/LiveSection.test.tsx`

- [ ] **Step 5: Wire into DashboardShell**

In `web/app/components/DashboardShell.tsx`, import `LiveSection` and render `<LiveSection />` immediately after the hero `<section>` and before `<ManagerSelect>/<Tabs>` (so it sits at the top, matching the Direction-A mock). It self-hides when not live, so no conditional needed.

- [ ] **Step 6: Build.** Run: `cd web && NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder npm run build`

- [ ] **Step 7: Commit**

```bash
git add web/app/components/LiveSection.tsx web/app/components/LiveSection.test.tsx web/app/components/DashboardShell.tsx
git commit -m "feat: live gameweek section on the dashboard, polling /api/live"
```

---

### Task 5: Env docs + full-suite verification

**Files:**
- Modify: `web/README.md`, `web/.env.example`

**Interfaces:**
- Consumes: everything above.
- Produces: documented `NEXT_PUBLIC_CLASSIC_LEAGUE_ID` and a green suite.

- [ ] **Step 1: Docs**

Append to `web/.env.example`:

```
# Classic league id for the live-scores overlay (defaults to 218144 if unset)
NEXT_PUBLIC_CLASSIC_LEAGUE_ID=218144
```

Add a "Live scores" note to `web/README.md`: the `/api/live` route computes the current-gameweek live leaderboard (cached 60s), the `LiveSection` polls it every 60s and only appears during match windows, and `NEXT_PUBLIC_CLASSIC_LEAGUE_ID` selects the league (optional; defaults to the PepRoulette Classic id). No deploy-time secret is required.

- [ ] **Step 2: Full suite**

Run: `cd web && npm run test`
Expected: all green (existing + the new live tests).

- [ ] **Step 3: Commit**

```bash
git add web/README.md web/.env.example
git commit -m "docs: live-scores env and behavior"
```

---

## Self-Review

**Spec coverage (§7):**
- Live only during match windows (`isGameweekLive` on fixtures) → Task 1, 3. ✓
- One `event/{gw}/live` call per poll; picks cached for the gameweek → Task 2 (revalidate) + Task 3. ✓
- Server-side caching decouples viewers from FPL (route `revalidate=60`, client polls 60s) → Task 3, 4. ✓
- Multiplier-weighted totals (captain/triple/bench handled) → Task 1 `computeLiveStandings`. ✓
- Additive overlay; never breaks the static page (route fails closed to `{live:false}`; section self-hides) → Task 3, 4. ✓
- Out of scope (noted): rank ▲/▼ deltas (need a baseline snapshot); per-user "you" highlight (could reuse the existing ManagerSelect later).

**Placeholder scan:** none — all steps carry real code.

**Type consistency:** `Fixture`/`LeagueEntry` defined in `live-compute.ts` and reused in `fpl.ts`/route; `LivePayload` shape identical between route (Task 3) and the client's local type (Task 4); `buildLivePayload` `Deps` matches the injected test doubles and the real `fpl` module's exported function signatures (`currentGameweek`, `gameweekFixtures`, `livePointsById`, `leagueEntries`, `entryPicks`). ✓

**Caching sanity:** `{ ...fpl }` spread into `buildLivePayload` passes the real cached fetchers; the route's own `revalidate=60` plus each fetch's `revalidate` means worst case ~1 `event/{gw}/live` upstream call/minute regardless of viewer count. Picks (revalidate 3600) refetch at most hourly. ✓
