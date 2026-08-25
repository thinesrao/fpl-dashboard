# Plan 3 — Admin Panel + Smart Scheduling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the single admin an authenticated `/admin` area in the existing Next.js app to enter penalty events (replacing the Google Sheet workflow) and a "Publish now" button that triggers the pipeline; and replace the blind 6-hour cron with a gated hourly run so the dashboard refreshes within ~1h of a gameweek finalizing.

**Architecture:** The public dashboard stays untouched and static. A new authenticated `/admin` section (Supabase Auth, email+password, one admin) writes penalty events to the `manual_penalty_events` Supabase table the pipeline already reads. A "Publish now" button (admin-gated server route) calls the GitHub API to dispatch the pipeline workflow. Scheduling moves from a blind 6h cron to an hourly workflow whose first step is the `should_run` gate (`gw_gate.py`, built in Plan 1) — the heavy pipeline runs only when a new gameweek finalizes or on manual dispatch.

**Tech Stack:** Next.js App Router + TypeScript, `@supabase/ssr` (cookie-based auth), Zod (form validation), Tailwind (Direction A), Vitest; Python 3.11 + `requests` (gate); GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-25-vercel-migration-design.md` (§4 scheduling, §5 data model, §6.3 admin, §9 auth/security)

## Global Constraints

- **App location:** all web work under `web/` (App Router, no `src/`, import alias `@/*`). Pipeline/gate work at the repo root and `scripts/`.
- **Auth:** Supabase Auth, **email + password**, a single admin account (created manually in the Supabase dashboard). Use `@supabase/ssr` — do NOT hand-roll sessions or tokens.
- **Env vars (exact names):**
  - Vercel **Config** (public, browser-exposed): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the anon/"publishable" key), plus the existing `NEXT_PUBLIC_DASHBOARD_URL`.
  - Vercel **Secret** (server-only): `GH_DISPATCH_TOKEN` — a fine-grained GitHub PAT with **Actions: read and write** on the `thinesrao/fpl-dashboard` repo. NEVER `NEXT_PUBLIC_*`.
  - The Supabase **service-role key stays pipeline-only** (GitHub Actions) — it must never appear in `web/`.
- **Repo/workflow constants:** owner/repo = `thinesrao/fpl-dashboard`; workflow file = `run_fpl_pipeline.yml`; default branch = `main`.
- **Penalty event vocabulary (must match the pipeline + DB CHECK constraint):** `event_type` ∈ `{ "Penalty Scored", "Penalty Won", "Penalty Missed", "Penalty Saved" }`. `player_name` must match the `Player_Name` values in the `_player_names` sheet of `dashboard.json` (format like `"A.Becker (Liverpool)"`) so the pipeline's name→ID lookup resolves.
- **RLS is already enabled** on `manual_penalty_events` (Plan 1) with an authenticated-only full-access policy; all admin writes go through the user's Supabase session (anon key + cookie), never the service key.
- **Security:** the Publish route MUST verify a valid Supabase session server-side before dispatching. Zod-validate all form input. `GH_DISPATCH_TOKEN` used only in server code.
- **Tests** in `web/**/*.test.ts(x)` (Vitest) and `tests/` (pytest). Conventional commits.

---

### Task 1: Supabase SSR clients + auth middleware + deps

**Files:**
- Create: `web/lib/supabase/client.ts`, `web/lib/supabase/server.ts`, `web/middleware.ts`, `web/.env.example` (append)
- Modify: `web/package.json` (add `@supabase/ssr`, `@supabase/supabase-js`)
- Test: `web/lib/supabase/env.test.ts`

**Interfaces:**
- Produces:
  - `createClient()` (browser) from `client.ts` — `createBrowserClient(url, anonKey)`.
  - `createClient()` (server, async) from `server.ts` — `createServerClient` wired to `next/headers` cookies.
  - `middleware` in `web/middleware.ts` refreshing the session and redirecting unauthenticated `/admin/*` (except `/admin/login`) to `/admin/login`.
  - `SUPABASE_ENV` helper exporting `{ url, anonKey }` read from `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

- [ ] **Step 1: Install deps**

```bash
cd web && npm install @supabase/ssr @supabase/supabase-js
```

- [ ] **Step 2: Write the failing env test**

Create `web/lib/supabase/env.test.ts`:

```typescript
import { SUPABASE_ENV } from "./env";

test("SUPABASE_ENV reads url and anon key from environment", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  expect(SUPABASE_ENV()).toEqual({ url: "https://x.supabase.co", anonKey: "anon-key" });
});
```

- [ ] **Step 3: Run it — expect FAIL** (`Cannot find module './env'`). Run: `cd web && npx vitest run lib/supabase/env.test.ts`

- [ ] **Step 4: Implement env.ts, client.ts, server.ts, middleware.ts**

Create `web/lib/supabase/env.ts`:

```typescript
export function SUPABASE_ENV() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };
}
```

Create `web/lib/supabase/client.ts`:

```typescript
"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ENV } from "./env";

export function createClient() {
  const { url, anonKey } = SUPABASE_ENV();
  return createBrowserClient(url, anonKey);
}
```

Create `web/lib/supabase/server.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ENV } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = SUPABASE_ENV();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // called from a Server Component; middleware refreshes the session
        }
      },
    },
  });
}
```

Create `web/middleware.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do nothing between createServerClient and getUser()
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin") && path !== "/admin/login" && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

- [ ] **Step 5: Append env example**

Append to `web/.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 6: Run test + build**

Run: `cd web && npx vitest run lib/supabase/env.test.ts && npm run build`
Expected: test passes; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add web/lib/supabase web/middleware.ts web/.env.example web/package.json web/package-lock.json
git commit -m "feat: supabase ssr clients and admin auth middleware"
```

---

### Task 2: Admin login page + sign-in / sign-out actions

**Files:**
- Create: `web/app/admin/login/page.tsx`, `web/app/admin/actions.ts`, `web/app/admin/layout.tsx`
- Test: `web/app/admin/actions.test.ts`

**Interfaces:**
- Consumes: `createClient` (server, Task 1).
- Produces:
  - `signIn(formData: FormData)` — `'use server'`; validates email/password with Zod, calls `supabase.auth.signInWithPassword`, redirects to `/admin/penalties` on success or back to `/admin/login?error=1` on failure.
  - `signOut()` — `'use server'`; `supabase.auth.signOut()`, redirect `/admin/login`.
  - `/admin/login` page with the email+password form.
  - `/admin/layout.tsx` — shared admin shell (Direction A styling, a header with a sign-out button when logged in).

- [ ] **Step 1: Write the failing validation test**

Create `web/app/admin/actions.test.ts`:

```typescript
import { credentialsSchema } from "./actions";

test("credentialsSchema accepts valid email+password", () => {
  expect(credentialsSchema.safeParse({ email: "a@b.com", password: "secret12" }).success).toBe(true);
});

test("credentialsSchema rejects bad email and short password", () => {
  expect(credentialsSchema.safeParse({ email: "nope", password: "secret12" }).success).toBe(false);
  expect(credentialsSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(false);
});
```

- [ ] **Step 2: Run it — expect FAIL.** Run: `cd web && npx vitest run app/admin/actions.test.ts`

- [ ] **Step 3: Implement actions.ts**

Create `web/app/admin/actions.ts`:

```typescript
"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function signIn(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/admin/login?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/admin/login?error=auth");

  revalidatePath("/admin", "layout");
  redirect("/admin/penalties");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
```

> Note: `z` comes from `zod`. If `zod` isn't already a dep in `web/`, add it: `cd web && npm install zod` (and include `web/package.json`/`web/package-lock.json` in this task's commit).

- [ ] **Step 4: Run it — expect PASS.** Run: `cd web && npx vitest run app/admin/actions.test.ts`

- [ ] **Step 5: Implement the login page + admin layout**

Create `web/app/admin/login/page.tsx`:

```tsx
import { signIn } from "../actions";

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="font-display mb-6 text-2xl">Admin sign in</h1>
      {error && (
        <p className="mb-4 rounded-lg border border-[--live] bg-[rgba(255,77,109,0.1)] px-3 py-2 text-sm text-[#ff8ba3]">
          {error === "auth" ? "Wrong email or password." : "Please enter a valid email and password."}
        </p>
      )}
      <form action={signIn} className="space-y-3">
        <input name="email" type="email" placeholder="Email" required
          className="w-full rounded-lg border border-[--line] bg-[--panel] px-3 py-2 text-[--ink]" />
        <input name="password" type="password" placeholder="Password" required
          className="w-full rounded-lg border border-[--line] bg-[--panel] px-3 py-2 text-[--ink]" />
        <button type="submit"
          className="w-full rounded-lg bg-[--accent] px-4 py-2 font-semibold text-[#06231a]">
          Sign in
        </button>
      </form>
    </main>
  );
}
```

Create `web/app/admin/layout.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div>
      <header className="border-b border-[--line]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <span className="font-display">PepRoulette™ Admin</span>
          {user && (
            <form action={signOut}>
              <button className="text-sm text-[--muted] hover:text-[--ink]">Sign out</button>
            </form>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Build.** Run: `cd web && npm run build`

- [ ] **Step 7: Commit**

```bash
git add web/app/admin web/package.json web/package-lock.json
git commit -m "feat: admin login page with email/password auth"
```

---

### Task 3: Penalty data access (server) + player-name source

**Files:**
- Create: `web/lib/penalties.ts`, `web/lib/players.ts`
- Test: `web/lib/penalties.test.ts`

**Interfaces:**
- Consumes: `createClient` (server, Task 1); `loadDashboard`/`getSheet` (Plan 2) for player names.
- Produces:
  - `PenaltyEvent` type: `{ id: string; gameweek: number; player_name: string; event_type: PenaltyType }`.
  - `PENALTY_TYPES: readonly ["Penalty Scored","Penalty Won","Penalty Missed","Penalty Saved"]` and `penaltyEventSchema` (Zod).
  - `listPenaltyEvents(): Promise<PenaltyEvent[]>` — reads `manual_penalty_events` ordered by gameweek desc, id.
  - `addPenaltyEvent(input): Promise<void>` and `deletePenaltyEvent(id: string): Promise<void>` — insert/delete via the session client (RLS-enforced).
  - `listPlayerNames(): Promise<string[]>` — the `Player_Name` column from the `_player_names` sheet of `dashboard.json` (via `loadDashboard`), sorted.

- [ ] **Step 1: Write the failing schema test**

Create `web/lib/penalties.test.ts`:

```typescript
import { penaltyEventSchema, PENALTY_TYPES } from "./penalties";

test("penaltyEventSchema accepts a valid event", () => {
  const ok = penaltyEventSchema.safeParse({
    gameweek: 3, player_name: "A.Becker (Liverpool)", event_type: "Penalty Scored",
  });
  expect(ok.success).toBe(true);
});

test("penaltyEventSchema rejects bad gameweek and unknown event_type", () => {
  expect(penaltyEventSchema.safeParse({ gameweek: 0, player_name: "X", event_type: "Penalty Scored" }).success).toBe(false);
  expect(penaltyEventSchema.safeParse({ gameweek: 3, player_name: "X", event_type: "Goal" }).success).toBe(false);
});

test("PENALTY_TYPES matches the pipeline vocabulary", () => {
  expect(PENALTY_TYPES).toEqual(["Penalty Scored", "Penalty Won", "Penalty Missed", "Penalty Saved"]);
});
```

- [ ] **Step 2: Run it — expect FAIL.** Run: `cd web && npx vitest run lib/penalties.test.ts`

- [ ] **Step 3: Implement penalties.ts and players.ts**

Create `web/lib/penalties.ts`:

```typescript
import { z } from "zod";
import { createClient } from "./supabase/server";

export const PENALTY_TYPES = ["Penalty Scored", "Penalty Won", "Penalty Missed", "Penalty Saved"] as const;
export type PenaltyType = (typeof PENALTY_TYPES)[number];

export const penaltyEventSchema = z.object({
  gameweek: z.coerce.number().int().min(1).max(38),
  player_name: z.string().min(1),
  event_type: z.enum(PENALTY_TYPES),
});

export type PenaltyEvent = {
  id: string;
  gameweek: number;
  player_name: string;
  event_type: PenaltyType;
};

const TABLE = "manual_penalty_events";

export async function listPenaltyEvents(): Promise<PenaltyEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, gameweek, player_name, event_type")
    .order("gameweek", { ascending: false })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PenaltyEvent[];
}

export async function addPenaltyEvent(input: z.infer<typeof penaltyEventSchema>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert(input);
  if (error) throw new Error(error.message);
}

export async function deletePenaltyEvent(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
```

Create `web/lib/players.ts`:

```typescript
import { loadDashboard } from "./data";
import { getSheet } from "./types";

export async function listPlayerNames(): Promise<string[]> {
  const data = await loadDashboard();
  const rows = getSheet(data, "_player_names");
  return rows
    .map((r) => String(r.Player_Name ?? ""))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}
```

- [ ] **Step 4: Run it — expect PASS.** Run: `cd web && npx vitest run lib/penalties.test.ts`

- [ ] **Step 5: Commit**

```bash
git add web/lib/penalties.ts web/lib/players.ts web/lib/penalties.test.ts
git commit -m "feat: penalty-event data access and player-name source"
```

---

### Task 4: Penalty form UI (add/list/delete) with player autocomplete

**Files:**
- Create: `web/app/admin/penalties/page.tsx`, `web/app/admin/penalties/actions.ts`, `web/app/admin/penalties/PenaltyForm.tsx`
- Test: `web/app/admin/penalties/PenaltyForm.test.tsx`

**Interfaces:**
- Consumes: `listPenaltyEvents`, `addPenaltyEvent`, `deletePenaltyEvent`, `penaltyEventSchema`, `PENALTY_TYPES` (Task 3); `listPlayerNames` (Task 3).
- Produces:
  - `addPenaltyAction(formData)` / `deletePenaltyAction(formData)` — `'use server'`; validate + call the data layer; `revalidatePath("/admin/penalties")`.
  - `/admin/penalties` server page: loads events + player names, renders the current events table and `<PenaltyForm players={...} />`.
  - `<PenaltyForm players: string[] />` — client form: gameweek (number), player (`<input list>` datalist autocomplete over `players`), event_type (`<select>` over `PENALTY_TYPES`), submit.

- [ ] **Step 1: Write the failing form test**

Create `web/app/admin/penalties/PenaltyForm.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { PenaltyForm } from "./PenaltyForm";

test("renders gameweek, player, and event-type inputs with the 4 penalty types", () => {
  render(<PenaltyForm players={["A.Becker (Liverpool)"]} action={async () => {}} />);
  expect(screen.getByLabelText(/gameweek/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/player/i)).toBeInTheDocument();
  const select = screen.getByLabelText(/event/i);
  expect(select).toBeInTheDocument();
  ["Penalty Scored", "Penalty Won", "Penalty Missed", "Penalty Saved"].forEach((t) =>
    expect(screen.getByRole("option", { name: t })).toBeInTheDocument()
  );
});
```

- [ ] **Step 2: Run it — expect FAIL.** Run: `cd web && npx vitest run app/admin/penalties/PenaltyForm.test.tsx`

- [ ] **Step 3: Implement actions.ts, PenaltyForm.tsx, page.tsx**

Create `web/app/admin/penalties/actions.ts`:

```typescript
"use server";
import { revalidatePath } from "next/cache";
import { addPenaltyEvent, deletePenaltyEvent, penaltyEventSchema } from "@/lib/penalties";

export async function addPenaltyAction(formData: FormData) {
  const parsed = penaltyEventSchema.safeParse({
    gameweek: formData.get("gameweek"),
    player_name: formData.get("player_name"),
    event_type: formData.get("event_type"),
  });
  if (!parsed.success) throw new Error("Invalid penalty event");
  await addPenaltyEvent(parsed.data);
  revalidatePath("/admin/penalties");
}

export async function deletePenaltyAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  await deletePenaltyEvent(id);
  revalidatePath("/admin/penalties");
}
```

Create `web/app/admin/penalties/PenaltyForm.tsx`:

```tsx
"use client";
import { PENALTY_TYPES } from "@/lib/penalties";

export function PenaltyForm({
  players, action,
}: { players: string[]; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[100px_1fr_180px_auto] sm:items-end">
      <label className="text-sm">
        <span className="mb-1 block text-[--muted]">Gameweek</span>
        <input name="gameweek" type="number" min={1} max={38} required aria-label="gameweek"
          className="w-full rounded-lg border border-[--line] bg-[--panel] px-3 py-2 text-[--ink]" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-[--muted]">Player</span>
        <input name="player_name" list="player-list" required aria-label="player" autoComplete="off"
          placeholder="Start typing…"
          className="w-full rounded-lg border border-[--line] bg-[--panel] px-3 py-2 text-[--ink]" />
        <datalist id="player-list">
          {players.map((p) => <option key={p} value={p} />)}
        </datalist>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-[--muted]">Event</span>
        <select name="event_type" aria-label="event" defaultValue="Penalty Scored"
          className="w-full rounded-lg border border-[--line] bg-[--panel] px-3 py-2 text-[--ink]">
          {PENALTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <button type="submit" className="rounded-lg bg-[--accent] px-4 py-2 font-semibold text-[#06231a]">
        Add
      </button>
    </form>
  );
}
```

Create `web/app/admin/penalties/page.tsx`:

```tsx
import { listPenaltyEvents } from "@/lib/penalties";
import { listPlayerNames } from "@/lib/players";
import { addPenaltyAction, deletePenaltyAction } from "./actions";
import { PenaltyForm } from "./PenaltyForm";
import { PublishButton } from "../PublishButton";

export const dynamic = "force-dynamic";

export default async function PenaltiesPage() {
  const [events, players] = await Promise.all([listPenaltyEvents(), listPlayerNames()]);
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl">Penalty events</h1>
        <PublishButton />
      </div>
      <div className="mb-8 rounded-2xl border border-[--line] bg-[--panel] p-4">
        <PenaltyForm players={players} action={addPenaltyAction} />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[--muted]">
            <th className="py-2">GW</th><th>Player</th><th>Event</th><th></th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-t border-[--line]">
              <td className="py-2">{e.gameweek}</td>
              <td>{e.player_name}</td>
              <td>{e.event_type}</td>
              <td className="text-right">
                <form action={deletePenaltyAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="text-[--muted] hover:text-[--live]">Delete</button>
                </form>
              </td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr><td colSpan={4} className="py-4 text-[--muted]">No penalty events yet.</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
```

- [ ] **Step 4: Run it — expect PASS.** Run: `cd web && npx vitest run app/admin/penalties/PenaltyForm.test.tsx`

> `page.tsx` imports `PublishButton` (Task 5). If executing strictly in order, create a temporary stub `web/app/admin/PublishButton.tsx` exporting `export function PublishButton() { return null; }` to keep the build green, and Task 5 replaces it. Note the stub in your report.

- [ ] **Step 5: Build.** Run: `cd web && npm run build`

- [ ] **Step 6: Commit**

```bash
git add web/app/admin/penalties web/app/admin/PublishButton.tsx
git commit -m "feat: penalty entry form with player autocomplete and delete"
```

---

### Task 5: "Publish now" — admin-gated workflow dispatch

**Files:**
- Create: `web/app/api/publish/route.ts`, `web/app/admin/PublishButton.tsx` (replace stub)
- Test: `web/app/api/publish/route.test.ts`

**Interfaces:**
- Consumes: `createClient` (server, Task 1); env `GH_DISPATCH_TOKEN`.
- Produces:
  - `POST /api/publish` route handler: verifies a Supabase session (401 if none), then calls the GitHub API to dispatch `run_fpl_pipeline.yml` on `main`; returns `{ ok: true }` (202) or an error status.
  - `dispatchPipeline(token: string): Promise<Response>` — exported helper that performs the GitHub `POST .../actions/workflows/run_fpl_pipeline.yml/dispatches` fetch (so it's unit-testable with a mocked fetch).
  - `<PublishButton />` — client button that POSTs `/api/publish` and shows "Publishing… / live in ~2 min" / error.

- [ ] **Step 1: Write the failing dispatch test**

Create `web/app/api/publish/route.test.ts`:

```typescript
import { dispatchPipeline } from "./route";

test("dispatchPipeline calls the correct GitHub workflow dispatch endpoint with auth + ref", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fakeFetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(null, { status: 204 });
  }) as unknown as typeof fetch;

  const res = await dispatchPipeline("tok_123", fakeFetch);
  expect(res.status).toBe(204);
  expect(calls[0].url).toBe(
    "https://api.github.com/repos/thinesrao/fpl-dashboard/actions/workflows/run_fpl_pipeline.yml/dispatches"
  );
  const headers = calls[0].init.headers as Record<string, string>;
  expect(headers.Authorization).toBe("Bearer tok_123");
  expect(JSON.parse(String(calls[0].init.body))).toEqual({ ref: "main" });
});
```

- [ ] **Step 2: Run it — expect FAIL.** Run: `cd web && npx vitest run app/api/publish/route.test.ts`

- [ ] **Step 3: Implement the route**

Create `web/app/api/publish/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DISPATCH_URL =
  "https://api.github.com/repos/thinesrao/fpl-dashboard/actions/workflows/run_fpl_pipeline.yml/dispatches";

export async function dispatchPipeline(token: string, fetchImpl: typeof fetch = fetch): Promise<Response> {
  return fetchImpl(DISPATCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: "main" }),
  });
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const token = process.env.GH_DISPATCH_TOKEN;
  if (!token) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const gh = await dispatchPipeline(token);
  if (gh.status !== 204) {
    return NextResponse.json({ error: `dispatch failed (${gh.status})` }, { status: 502 });
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}
```

- [ ] **Step 4: Run it — expect PASS.** Run: `cd web && npx vitest run app/api/publish/route.test.ts`

- [ ] **Step 5: Implement the button (replace the Task 4 stub)**

Replace `web/app/admin/PublishButton.tsx`:

```tsx
"use client";
import { useState } from "react";

export function PublishButton() {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  async function publish() {
    setState("busy");
    const res = await fetch("/api/publish", { method: "POST" });
    setState(res.ok ? "done" : "error");
  }
  return (
    <div className="flex items-center gap-3">
      {state === "done" && <span className="text-xs text-[--accent]">Started — live in ~2 min</span>}
      {state === "error" && <span className="text-xs text-[--live]">Failed — try again</span>}
      <button onClick={publish} disabled={state === "busy"}
        className="rounded-lg bg-[--accent] px-4 py-2 font-semibold text-[#06231a] disabled:opacity-60">
        {state === "busy" ? "Publishing…" : "Publish now"}
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Build.** Run: `cd web && npm run build`

- [ ] **Step 7: Commit**

```bash
git add web/app/api/publish web/app/admin/PublishButton.tsx
git commit -m "feat: admin-gated Publish now button dispatching the pipeline"
```

---

### Task 6: `should_run` gate script (Python) + test

**Files:**
- Create: `scripts/should_run_gate.py`
- Test: `tests/test_should_run_gate.py`

**Interfaces:**
- Consumes: `gw_gate.latest_finalized_gw`, `gw_gate.should_run` (Plan 1).
- Produces:
  - `published_gw_from_dashboard(dashboard: dict) -> int` — reads `generated_from_metadata.last_finished_gw` (0 if absent).
  - `decide(events: list, dashboard: dict) -> bool` — `should_run(events, published_gw_from_dashboard(dashboard), publish_pending=False)`.
  - a `main()` that fetches `bootstrap-static` and the published `dashboard.json` (from env `DASHBOARD_URL`), prints `true`/`false` to stdout. On any fetch error it prints `true` (fail-open: better to run than to silently stall).

- [ ] **Step 1: Write the failing test**

Create `tests/test_should_run_gate.py`:

```python
from scripts.should_run_gate import published_gw_from_dashboard, decide


def _events(spec):
    return [{"id": i, "finished": f, "data_checked": d} for (i, f, d) in spec]


def test_published_gw_reads_metadata():
    assert published_gw_from_dashboard({"generated_from_metadata": {"last_finished_gw": 3}}) == 3
    assert published_gw_from_dashboard({}) == 0


def test_decide_runs_when_new_gw_finalized():
    events = _events([(1, True, True), (2, True, True)])
    assert decide(events, {"generated_from_metadata": {"last_finished_gw": 1}}) is True


def test_decide_skips_when_nothing_new():
    events = _events([(1, True, True)])
    assert decide(events, {"generated_from_metadata": {"last_finished_gw": 1}}) is False
```

- [ ] **Step 2: Run it — expect FAIL.** Run: `python -m pytest tests/test_should_run_gate.py -v`

- [ ] **Step 3: Implement the gate**

Create `scripts/should_run_gate.py`:

```python
"""Decide whether the heavy pipeline should run this scheduled tick.

Prints "true" or "false" to stdout for a GitHub Actions step to capture.
Fail-open: any error prints "true" so a transient hiccup never silently
stalls updates. Manual workflow_dispatch bypasses this gate entirely.
"""
import os

import requests

from gw_gate import latest_finalized_gw, should_run

BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"


def published_gw_from_dashboard(dashboard: dict) -> int:
    meta = (dashboard or {}).get("generated_from_metadata", {})
    try:
        return int(meta.get("last_finished_gw", 0) or 0)
    except (TypeError, ValueError):
        return 0


def decide(events: list, dashboard: dict) -> bool:
    return should_run(events, published_gw_from_dashboard(dashboard), publish_pending=False)


def main():
    try:
        events = requests.get(BOOTSTRAP_URL, timeout=30).json().get("events", [])
        dashboard_url = os.environ.get("DASHBOARD_URL")
        dashboard = requests.get(dashboard_url, timeout=30).json() if dashboard_url else {}
        print("true" if decide(events, dashboard) else "false")
    except Exception as e:
        print("true")  # fail-open
        import sys
        print(f"gate error (running anyway): {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run it — expect PASS.** Run: `python -m pytest tests/test_should_run_gate.py -v`

- [ ] **Step 5: Commit**

```bash
git add scripts/should_run_gate.py tests/test_should_run_gate.py
git commit -m "feat: should_run gate script for watch-and-gate scheduling"
```

---

### Task 7: Rewire the workflow — gated hourly run (retire the blind 6h cron)

**Files:**
- Modify: `.github/workflows/run_fpl_pipeline.yml`

**Interfaces:**
- Consumes: `scripts/should_run_gate.py` (Task 6).
- Produces: the `build` job runs hourly, but the heavy pipeline steps run only when the gate says a new gameweek finalized, OR on `workflow_dispatch`. The `test` job is unchanged.

- [ ] **Step 1: Change the schedule + gate the build job**

In `.github/workflows/run_fpl_pipeline.yml`:

Change the cron:

```yaml
  schedule:
    - cron: '0 * * * *'   # hourly; the gate decides whether the heavy pipeline runs
```

Rewrite the `build` job's steps so the gate runs first and the heavy work is conditional. Replace the existing `build` job steps (checkout → setup-python → install → run pipeline → node → publish) with:

```yaml
    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Gate — should the pipeline run?
        id: gate
        run: |
          python -m pip install --quiet requests
          echo "run=$(python3 scripts/should_run_gate.py)" >> "$GITHUB_OUTPUT"
        env:
          DASHBOARD_URL: ${{ vars.DASHBOARD_URL }}

      - name: Install dependencies
        if: steps.gate.outputs.run == 'true' || github.event_name == 'workflow_dispatch'
        run: pip install -r requirements.txt

      - name: Run FPL Data Pipeline
        if: steps.gate.outputs.run == 'true' || github.event_name == 'workflow_dispatch'
        run: python3 data_pipeline.py
        env:
          GCP_CREDENTIALS: ${{ secrets.GCP_CREDENTIALS }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

      - name: Set up Node
        if: steps.gate.outputs.run == 'true' || github.event_name == 'workflow_dispatch'
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Publish dashboard.json to Vercel Blob
        if: steps.gate.outputs.run == 'true' || github.event_name == 'workflow_dispatch'
        run: |
          if [ -f dashboard.json ]; then
            npm install
            node scripts/publish_blob.mjs
          else
            echo "dashboard.json not produced (pipeline exited early); skipping blob publish."
          fi
        env:
          BLOB_READ_WRITE_TOKEN: ${{ secrets.BLOB_READ_WRITE_TOKEN }}
```

Keep the `build` job's existing `if:` guard on the job itself (`github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'`). Bumping `checkout@v3→v4` and `setup-python@v4→v5` also clears the Node 20 deprecation warnings.

- [ ] **Step 2: Validate the YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/run_fpl_pipeline.yml'))" && echo OK`
Expected: `OK` (valid YAML).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/run_fpl_pipeline.yml
git commit -m "ci: gated hourly pipeline run, retiring the blind 6h cron"
```

> Deploy note (human): add a GitHub Actions **variable** (not secret) `DASHBOARD_URL` = the public Blob URL, so the gate can read the currently-published gameweek. Settings → Secrets and variables → Actions → Variables.

---

### Task 8: Env/setup docs, full-suite verification

**Files:**
- Modify: `docs/INFRA.md`, `web/README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: documented setup for the new env vars + admin user, and a verified green build/test.

- [ ] **Step 1: Update INFRA.md**

Append to `docs/INFRA.md` a "Plan 3 — Admin + scheduling" section documenting:
- Supabase: create the single admin user (Authentication → Users → Add user, email+password). The anon/publishable key + project URL go in **Vercel** as `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Config type).
- GitHub PAT: fine-grained token, repo `thinesrao/fpl-dashboard`, **Actions: Read and write**; store in **Vercel** as `GH_DISPATCH_TOKEN` (Secret type).
- GitHub Actions **variable** `DASHBOARD_URL` = the public Blob URL (for the gate).
- Note: schedule is now hourly-gated; manual "Publish now" (or Actions → Run workflow) always runs.

- [ ] **Step 2: Update web/README.md**

Add an "Admin" section: `/admin/login` (email+password), `/admin/penalties` (entry + Publish now), and the four required Vercel env vars (the two `NEXT_PUBLIC_SUPABASE_*`, `GH_DISPATCH_TOKEN`, and the existing `NEXT_PUBLIC_DASHBOARD_URL`).

- [ ] **Step 3: Full suites**

Run: `cd web && npm run test` (all green) and `python -m pytest -q` (all green).

- [ ] **Step 4: Commit**

```bash
git add docs/INFRA.md web/README.md
git commit -m "docs: admin panel and gated-scheduling setup"
```

---

## Self-Review

**Spec coverage:**
- Supabase Auth, single admin, email+password (§5, §6.3, §9) → Tasks 1, 2. ✓
- Penalty form writing to `manual_penalty_events`, player-name lookup from `_player_names` (§6.3) → Tasks 3, 4. ✓
- Vocabulary matches the pipeline/DB (`"Penalty Scored"` etc.) → Task 3 `PENALTY_TYPES` + schema. ✓
- Publish button → `workflow_dispatch`, admin-gated, PAT server-only (§4, §9) → Task 5. ✓
- Watch-and-gate scheduling replacing the blind 6h cron, using `gw_gate.py` (§4) → Tasks 6, 7. ✓
- RLS enforced via session client (§9) → Task 3 (no service key in web/). ✓
- Out of scope: live scores overlay (§7 → Plan 4).

**Placeholder scan:** No "TBD"/"handle later" — every code step has real code. The Task 4→5 `PublishButton` stub is an explicit, described ordering aid, replaced in Task 5.

**Type consistency:** `createClient` (server/browser) used consistently; `PenaltyEvent`/`penaltyEventSchema`/`PENALTY_TYPES` shared across Tasks 3–4; `dispatchPipeline(token, fetchImpl?)` signature matches its test; `decide`/`published_gw_from_dashboard`/`should_run`/`latest_finalized_gw` consistent across Task 6 and `gw_gate.py`. ✓

**Security check:** service-role key never in `web/`; `GH_DISPATCH_TOKEN` only in the server route; Publish route verifies session before dispatch; Zod validation on login + penalty inputs; RLS on the table. ✓
