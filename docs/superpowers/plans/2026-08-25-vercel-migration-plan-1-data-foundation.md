# Plan 1 — Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the pipeline's single manual input (penalty events) from Google Sheets to Supabase, and have the pipeline emit a static `dashboard.json` to Vercel Blob for the future frontend — without changing any award-scoring math.

**Architecture:** The Python pipeline keeps its award logic untouched. Its penalty *input* is read from a Supabase Postgres table instead of a Google Sheet. Its *output* gains one step: serialize the computed data to `dashboard.json` on disk, which a small Node step uploads to Vercel Blob using the official `@vercel/blob` SDK. The Google Sheet write loop stays as a passive backup. A pure `should_run` gate is added for the future Vercel Cron watcher.

**Tech Stack:** Python 3.11, pandas, `supabase` (supabase-py), pytest; Node 20 + `@vercel/blob` for the upload step; Supabase Postgres; Vercel Blob; GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-25-vercel-migration-design.md`

## Global Constraints

- **Python 3.11** (matches `.github/workflows/run_fpl_pipeline.yml`).
- **Do NOT change any award-scoring logic** in `award_calculators.py` or the compute sections of `data_pipeline.py`. This plan only swaps the penalty *input source* and adds an *output* step.
- **Flat module layout** at repo root (follow existing convention: `data_pipeline.py`, `award_calculators.py` are top-level). New Python modules go at repo root; one-off scripts go in `scripts/`.
- **Tests** live in `tests/`, run with `python -m pytest -v` (flat pytest, matching existing `tests/test_*.py`).
- **Stay on free tiers** (Supabase, Vercel Blob, GitHub Actions).
- **Commit messages:** conventional commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).
- **Penalty event columns** the pipeline expects downstream (do not rename): `Gameweek` (numeric), `Player_Name` (str), `Event_Type` (str).
- **Secrets/env names (exact):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BLOB_READ_WRITE_TOKEN`.

---

### Task 1: Provision Supabase + penalty table schema

**Files:**
- Create: `supabase/migrations/0001_manual_penalty_events.sql`
- Create: `docs/INFRA.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a Supabase table `public.manual_penalty_events` with columns `id uuid`, `gameweek int`, `player_name text`, `event_type text`, `created_at timestamptz`, `created_by uuid`; a `penalty_event_type` check constraint over `('scored','won','missed','saved')`; RLS enabled with an authenticated-only write/read policy. The service-role key bypasses RLS for the pipeline.

This task is infrastructure + SQL, so its "test" is applying the migration and verifying the table exists. No pytest.

- [ ] **Step 1: Create the Supabase project (manual, one-time)**

In the Supabase dashboard: create a new project named `fpl-dashboard`. Note the **Project URL** and, under Project Settings → API, the **`anon` public key** and the **`service_role` secret key**. Under Authentication → Users, create one admin user (your email) — this is the only account.

- [ ] **Step 2: Write the migration SQL**

Create `supabase/migrations/0001_manual_penalty_events.sql`:

```sql
-- Manual penalty events: the only human-entered data in the system.
-- Penalty scored/won player names are not exposed by the FPL API.

create table if not exists public.manual_penalty_events (
  id          uuid primary key default gen_random_uuid(),
  gameweek    integer not null check (gameweek between 1 and 38),
  player_name text    not null,
  event_type  text    not null check (event_type in ('scored','won','missed','saved')),
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id)
);

create index if not exists idx_penalty_events_gw
  on public.manual_penalty_events (gameweek);

alter table public.manual_penalty_events enable row level security;

-- Authenticated admin(s) may do everything. The pipeline uses the
-- service-role key, which bypasses RLS entirely.
create policy "authenticated full access"
  on public.manual_penalty_events
  for all
  to authenticated
  using (true)
  with check (true);
```

- [ ] **Step 3: Apply the migration**

In the Supabase dashboard → SQL Editor, paste and run the file contents. (Alternatively `supabase db push` if the Supabase CLI is set up.)

- [ ] **Step 4: Verify the table exists**

In the SQL Editor run:

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'manual_penalty_events'
order by ordinal_position;
```

Expected: 6 rows (`id`, `gameweek`, `player_name`, `event_type`, `created_at`, `created_by`).

- [ ] **Step 5: Document infra + secrets**

Create `docs/INFRA.md`:

```markdown
# Infrastructure & Secrets

## Supabase
- Project: `fpl-dashboard`
- Env vars (pipeline, server-side only):
  - `SUPABASE_URL` — Project URL
  - `SUPABASE_SERVICE_ROLE_KEY` — service_role secret key (bypasses RLS; NEVER ship to a browser)
- `SUPABASE_ANON_KEY` is used later by the frontend admin (Plan 3), not the pipeline.
- Schema migrations: `supabase/migrations/`.

## Vercel Blob
- Env var (pipeline publish step): `BLOB_READ_WRITE_TOKEN` (read-write token from the Blob store).
- Public output object: `dashboard.json` (stable URL, no random suffix).

## GitHub Actions secrets (Settings → Secrets and variables → Actions)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BLOB_READ_WRITE_TOKEN`
- (existing) `GCP_CREDENTIALS`
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0001_manual_penalty_events.sql docs/INFRA.md
git commit -m "chore: add Supabase penalty-events schema and infra docs"
```

---

### Task 2: Penalty source module (read events from Supabase)

**Files:**
- Create: `penalty_source.py`
- Test: `tests/test_penalty_source.py`

**Interfaces:**
- Consumes: nothing from other tasks (takes an injected client).
- Produces:
  - `fetch_penalty_events(client) -> pandas.DataFrame` with columns `['Gameweek','Player_Name','Event_Type']`, `Gameweek` numeric (coerced, NaN dropped), returning an **empty DataFrame with those exact columns** when there are no rows. `client` is any object exposing `.table(name).select("*").execute()` returning an object with a `.data` list of dicts (the supabase-py contract).
  - `get_supabase_client() -> Client` — factory reading `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the environment.

- [ ] **Step 1: Write the failing test**

Create `tests/test_penalty_source.py`:

```python
import pandas as pd
from penalty_source import fetch_penalty_events


class _FakeResp:
    def __init__(self, data):
        self.data = data


class _FakeTable:
    def __init__(self, data):
        self._data = data

    def select(self, *_):
        return self

    def execute(self):
        return _FakeResp(self._data)


class _FakeClient:
    def __init__(self, data):
        self._data = data

    def table(self, _name):
        return _FakeTable(self._data)


def test_fetch_returns_expected_columns_and_types():
    client = _FakeClient([
        {"gameweek": 3, "player_name": "Erling Haaland", "event_type": "scored"},
        {"gameweek": "4", "player_name": "Bruno F.", "event_type": "won"},
    ])
    df = fetch_penalty_events(client)
    assert list(df.columns) == ["Gameweek", "Player_Name", "Event_Type"]
    assert df["Gameweek"].tolist() == [3, 4]
    assert df.iloc[0]["Player_Name"] == "Erling Haaland"
    assert df.iloc[1]["Event_Type"] == "won"


def test_fetch_empty_returns_empty_frame_with_columns():
    df = fetch_penalty_events(_FakeClient([]))
    assert df.empty
    assert list(df.columns) == ["Gameweek", "Player_Name", "Event_Type"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_penalty_source.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'penalty_source'`.

- [ ] **Step 3: Write minimal implementation**

Create `penalty_source.py`:

```python
"""Read the manual penalty events (the only human input) from Supabase.

Replaces the former `manual_penalty_data` Google Sheet read. Returns a
DataFrame shaped exactly like the old sheet read so downstream award logic
is unchanged.
"""
import os

import pandas as pd

TABLE = "manual_penalty_events"
COLUMNS = ["Gameweek", "Player_Name", "Event_Type"]


def fetch_penalty_events(client) -> pd.DataFrame:
    """Return penalty events as a DataFrame with columns COLUMNS.

    `Gameweek` is coerced to numeric and NaN rows are dropped. An empty
    result yields an empty DataFrame that still has COLUMNS.
    """
    rows = client.table(TABLE).select("*").execute().data or []
    if not rows:
        return pd.DataFrame(columns=COLUMNS)

    df = pd.DataFrame(rows)
    df = df.rename(columns={
        "gameweek": "Gameweek",
        "player_name": "Player_Name",
        "event_type": "Event_Type",
    })
    df["Gameweek"] = pd.to_numeric(df["Gameweek"], errors="coerce")
    df = df.dropna(subset=["Gameweek"])
    df["Gameweek"] = df["Gameweek"].astype(int)
    return df[COLUMNS].reset_index(drop=True)


def get_supabase_client():
    """Build a service-role Supabase client from the environment."""
    from supabase import create_client

    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_penalty_source.py -v`
Expected: PASS (both tests).

- [ ] **Step 5: Add the dependency**

Append `supabase` to `requirements.txt` (new line).

- [ ] **Step 6: Commit**

```bash
git add penalty_source.py tests/test_penalty_source.py requirements.txt
git commit -m "feat: read manual penalty events from Supabase"
```

---

### Task 3: Wire the Supabase penalty read into the pipeline

**Files:**
- Modify: `data_pipeline.py` (the penalty-read block, ~lines 191–201, inside `main()`)
- Test: `tests/test_penalty_wiring.py`

**Interfaces:**
- Consumes: `penalty_source.fetch_penalty_events`, `penalty_source.get_supabase_client` (Task 2).
- Produces: `main()` populates the existing local `manual_penalty_df` variable from Supabase. Same variable name, same columns — everything downstream (`calculate_penalty_score`) is untouched.

- [ ] **Step 1: Read the current penalty block**

Run: `sed -n '188,205p' data_pipeline.py` to confirm the exact lines. You should see the `manual_penalty_data` worksheet read wrapped in a `try/except gspread.WorksheetNotFound`.

- [ ] **Step 2: Write the failing test**

Create `tests/test_penalty_wiring.py`:

```python
import ast


def test_pipeline_uses_supabase_penalty_source_not_sheet():
    src = open("data_pipeline.py").read()
    # The pipeline must call the new source and no longer read the old sheet.
    assert "fetch_penalty_events" in src
    assert "manual_penalty_data" not in src
    # It must still import from penalty_source.
    tree = ast.parse(src)
    imported = {
        n.module
        for n in ast.walk(tree)
        if isinstance(n, ast.ImportFrom)
    }
    assert "penalty_source" in imported
```

- [ ] **Step 3: Run test to verify it fails**

Run: `python -m pytest tests/test_penalty_wiring.py -v`
Expected: FAIL (`manual_penalty_data` still present / `penalty_source` not imported).

- [ ] **Step 4: Edit the pipeline**

At the top of `data_pipeline.py`, add near the other imports:

```python
from penalty_source import fetch_penalty_events, get_supabase_client
```

Replace the penalty-read block (the `try/except` that does
`spreadsheet.worksheet('manual_penalty_data')` … through the
`except gspread.WorksheetNotFound:` fallback) with:

```python
    # --- Read the manual penalty data from Supabase and create player name map ---
    print("Fetching manual penalty data from Supabase...")
    try:
        supabase_client = get_supabase_client()
        manual_penalty_df = fetch_penalty_events(supabase_client)
        if not manual_penalty_df.empty:
            manual_penalty_df['Gameweek'] = pd.to_numeric(
                manual_penalty_df['Gameweek'], errors='coerce'
            ).dropna()
    except Exception as e:
        print(f"Warning: could not load penalty events from Supabase ({e}). "
              f"Penalty King award will be zero.")
        manual_penalty_df = pd.DataFrame(
            columns=['Gameweek', 'Player_Name', 'Event_Type']
        )
```

Leave every line after this (the award loop, `calculate_penalty_score`, etc.) unchanged.

- [ ] **Step 5: Run the wiring test + full suite**

Run: `python -m pytest tests/test_penalty_wiring.py tests/test_award_calculators.py -v`
Expected: PASS. The award-calculator tests prove the scoring math is unaffected.

- [ ] **Step 6: Commit**

```bash
git add data_pipeline.py tests/test_penalty_wiring.py
git commit -m "feat: source penalty events from Supabase in the pipeline"
```

---

### Task 4: `dashboard.json` serializer (pure)

**Files:**
- Create: `dashboard_export.py`
- Test: `tests/test_dashboard_export.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `build_dashboard_payload(worksheets: dict[str, pandas.DataFrame]) -> dict` returning `{"sheets": {name: list_of_row_dicts}, "generated_from_metadata": {...}}`. Each DataFrame becomes `df.to_dict(orient="records")`. If a `"metadata"` sheet is present, its first row is copied into `generated_from_metadata` (so the frontend can read `last_finished_gw` / `last_updated_utc` without special-casing).
  - `write_dashboard_json(payload: dict, path: str) -> None` — writes UTF-8 JSON.

- [ ] **Step 1: Write the failing test**

Create `tests/test_dashboard_export.py`:

```python
import json

import pandas as pd
from dashboard_export import build_dashboard_payload, write_dashboard_json


def test_build_payload_serializes_sheets_and_metadata():
    worksheets = {
        "classic_league_standings": pd.DataFrame(
            [{"Manager": "A", "Total": 100}, {"Manager": "B", "Total": 90}]
        ),
        "metadata": pd.DataFrame(
            [{"last_finished_gw": 3, "last_updated_utc": "2026-08-25T10:00:00+00:00"}]
        ),
    }
    payload = build_dashboard_payload(worksheets)
    assert payload["sheets"]["classic_league_standings"][0] == {"Manager": "A", "Total": 100}
    assert payload["generated_from_metadata"]["last_finished_gw"] == 3


def test_write_dashboard_json_roundtrips(tmp_path):
    payload = {"sheets": {"x": [{"a": 1}]}, "generated_from_metadata": {}}
    out = tmp_path / "dashboard.json"
    write_dashboard_json(payload, str(out))
    assert json.loads(out.read_text())["sheets"]["x"][0]["a"] == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_dashboard_export.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'dashboard_export'`.

- [ ] **Step 3: Write minimal implementation**

Create `dashboard_export.py`:

```python
"""Serialize the pipeline's computed worksheets into a single dashboard.json.

This is the handoff artifact the Next.js frontend reads. Kept pure (no I/O
beyond write_dashboard_json) so it is trivially testable.
"""
import json


def build_dashboard_payload(worksheets: dict) -> dict:
    sheets = {
        name: df.to_dict(orient="records")
        for name, df in worksheets.items()
    }
    metadata = {}
    meta_df = worksheets.get("metadata")
    if meta_df is not None and not meta_df.empty:
        metadata = meta_df.iloc[0].to_dict()
    return {"sheets": sheets, "generated_from_metadata": metadata}


def write_dashboard_json(payload: dict, path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, default=str)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_dashboard_export.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add dashboard_export.py tests/test_dashboard_export.py
git commit -m "feat: add dashboard.json serializer for the frontend handoff"
```

---

### Task 5: Emit `dashboard.json` from the pipeline

**Files:**
- Modify: `data_pipeline.py` (end of `main()`, after `worksheets_to_write` is fully built and after/around the Google Sheets write loop at ~lines 707–714)
- Test: `tests/test_dashboard_emit_wiring.py`

**Interfaces:**
- Consumes: `dashboard_export.build_dashboard_payload`, `dashboard_export.write_dashboard_json` (Task 4); the existing `worksheets_to_write` dict.
- Produces: a `dashboard.json` file written to the repo working directory at the end of every pipeline run. The Google Sheets backup loop is preserved.

- [ ] **Step 1: Write the failing test**

Create `tests/test_dashboard_emit_wiring.py`:

```python
def test_pipeline_writes_dashboard_json():
    src = open("data_pipeline.py").read()
    assert "build_dashboard_payload" in src
    assert "write_dashboard_json" in src
    assert "dashboard.json" in src
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_dashboard_emit_wiring.py -v`
Expected: FAIL.

- [ ] **Step 3: Edit the pipeline**

Add to the imports in `data_pipeline.py`:

```python
from dashboard_export import build_dashboard_payload, write_dashboard_json
```

Immediately **after** the existing `for name, df in worksheets_to_write.items():`
Google-Sheets write loop finishes (keep that loop as the backup), add:

```python
    # --- Emit the static dashboard.json for the Vercel frontend ---
    print("Writing dashboard.json...")
    payload = build_dashboard_payload(worksheets_to_write)
    write_dashboard_json(payload, "dashboard.json")
    print("dashboard.json written.")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_dashboard_emit_wiring.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data_pipeline.py tests/test_dashboard_emit_wiring.py
git commit -m "feat: emit dashboard.json at end of pipeline run"
```

---

### Task 6: Node publish step — upload `dashboard.json` to Vercel Blob

**Files:**
- Create: `scripts/publish_blob.mjs`
- Create: `package.json` (repo root, minimal — for the `@vercel/blob` dependency)
- Modify: `.github/workflows/run_fpl_pipeline.yml` (the `build` job)

**Interfaces:**
- Consumes: `dashboard.json` on disk (Task 5); env `BLOB_READ_WRITE_TOKEN`.
- Produces: a public Blob object at pathname `dashboard.json` with a **stable URL** (no random suffix, overwrite allowed). The script prints the URL to stdout.

The upload needs a real token, so it is verified in CI / manually, not via pytest.

- [ ] **Step 1: Create the Node publish script**

Create `scripts/publish_blob.mjs`:

```javascript
// Uploads the pipeline's dashboard.json to Vercel Blob at a stable public URL.
// Requires env BLOB_READ_WRITE_TOKEN. Run: node scripts/publish_blob.mjs
import { readFile } from "node:fs/promises";
import { put } from "@vercel/blob";

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("BLOB_READ_WRITE_TOKEN is not set");
  process.exit(1);
}

const body = await readFile("dashboard.json");
const blob = await put("dashboard.json", body, {
  access: "public",
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: "application/json",
  cacheControlMaxAge: 60,
  token,
});

console.log(blob.url);
```

- [ ] **Step 2: Create the minimal package.json**

Create `package.json` at repo root:

```json
{
  "name": "fpl-dashboard-pipeline-publish",
  "private": true,
  "type": "module",
  "dependencies": {
    "@vercel/blob": "^0.27.0"
  }
}
```

- [ ] **Step 3: Install and smoke-test locally (with a token)**

Run:

```bash
npm install
BLOB_READ_WRITE_TOKEN=<your-token> node scripts/publish_blob.mjs
```

Expected: prints a URL like `https://<store-id>.public.blob.vercel-storage.com/dashboard.json`. Open it — it returns the JSON. **Record this URL in `docs/INFRA.md`** (the frontend uses it in Plan 2).

- [ ] **Step 4: Wire the publish step into the workflow**

In `.github/workflows/run_fpl_pipeline.yml`, in the `build` job, after the
`Run FPL Data Pipeline` step, add the Supabase/Blob env to that step and a Node
publish step:

```yaml
      - name: Run FPL Data Pipeline
        run: python3 data_pipeline.py
        env:
          GCP_CREDENTIALS: ${{ secrets.GCP_CREDENTIALS }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Publish dashboard.json to Vercel Blob
        run: |
          npm install
          node scripts/publish_blob.mjs
        env:
          BLOB_READ_WRITE_TOKEN: ${{ secrets.BLOB_READ_WRITE_TOKEN }}
```

- [ ] **Step 5: Add Node artifacts to .gitignore**

Confirm `.gitignore` ignores `node_modules/` at the repo root (add a line `node_modules/` if not already covered — the existing `web/node_modules/` entry does NOT cover the root).

- [ ] **Step 6: Commit**

```bash
git add scripts/publish_blob.mjs package.json .github/workflows/run_fpl_pipeline.yml .gitignore
git commit -m "feat: publish dashboard.json to Vercel Blob from CI"
```

---

### Task 7: `should_run` gate (pure) for the future watcher

**Files:**
- Create: `gw_gate.py`
- Test: `tests/test_gw_gate.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `latest_finalized_gw(events: list[dict]) -> int` — given the `events` array from FPL `bootstrap-static` (each dict has `id`, `finished`, `data_checked`), returns the highest `id` where `finished and data_checked`, else `0`.
  - `should_run(events: list[dict], published_last_finished_gw: int, publish_pending: bool) -> bool` — returns `True` when a newly finalized gameweek exists beyond what is published, or a manual publish is pending.

- [ ] **Step 1: Write the failing test**

Create `tests/test_gw_gate.py`:

```python
from gw_gate import latest_finalized_gw, should_run


def _events(spec):
    # spec: list of (id, finished, data_checked)
    return [
        {"id": i, "finished": f, "data_checked": d} for (i, f, d) in spec
    ]


def test_latest_finalized_gw_picks_highest_checked():
    events = _events([(1, True, True), (2, True, True), (3, True, False)])
    assert latest_finalized_gw(events) == 2


def test_latest_finalized_gw_none_finalized():
    events = _events([(1, True, False), (2, False, False)])
    assert latest_finalized_gw(events) == 0


def test_should_run_when_new_gw_finalized():
    events = _events([(1, True, True), (2, True, True)])
    assert should_run(events, published_last_finished_gw=1, publish_pending=False) is True


def test_should_run_when_publish_pending():
    events = _events([(1, True, True)])
    assert should_run(events, published_last_finished_gw=1, publish_pending=True) is True


def test_should_not_run_when_nothing_changed():
    events = _events([(1, True, True)])
    assert should_run(events, published_last_finished_gw=1, publish_pending=False) is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_gw_gate.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'gw_gate'`.

- [ ] **Step 3: Write minimal implementation**

Create `gw_gate.py`:

```python
"""Pure decision helpers for the watch-and-gate scheduler.

The Vercel Cron watcher (Plan 3) calls an endpoint that uses this logic to
decide whether to dispatch the heavy pipeline. Kept dependency-free so it is
unit-testable and reusable server-side.
"""


def latest_finalized_gw(events: list) -> int:
    finalized = [
        e["id"] for e in events
        if e.get("finished") and e.get("data_checked")
    ]
    return max(finalized) if finalized else 0


def should_run(
    events: list,
    published_last_finished_gw: int,
    publish_pending: bool,
) -> bool:
    if publish_pending:
        return True
    return latest_finalized_gw(events) > published_last_finished_gw
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_gw_gate.py -v`
Expected: PASS (all five).

- [ ] **Step 5: Commit**

```bash
git add gw_gate.py tests/test_gw_gate.py
git commit -m "feat: add pure should_run gate for the watch-and-gate scheduler"
```

---

### Task 8: One-off migration — Google Sheet penalties → Supabase

**Files:**
- Create: `scripts/migrate_penalties_to_supabase.py`
- Test: `tests/test_migrate_penalties.py`

**Interfaces:**
- Consumes: `penalty_source.get_supabase_client` (Task 2); the existing gspread connection pattern used elsewhere in the repo.
- Produces:
  - `rows_from_sheet_records(records: list[dict]) -> list[dict]` — pure transform mapping old sheet rows (`Gameweek`, `Player_Name`, `Event_Type`) to Supabase insert dicts (`gameweek`, `player_name`, `event_type`), skipping rows with a blank/invalid gameweek or empty player name.
  - a `main()` that reads the `manual_penalty_data` worksheet and inserts the rows into `manual_penalty_events`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_migrate_penalties.py`:

```python
from scripts.migrate_penalties_to_supabase import rows_from_sheet_records


def test_maps_and_filters_rows():
    records = [
        {"Gameweek": 3, "Player_Name": "Haaland", "Event_Type": "scored"},
        {"Gameweek": "", "Player_Name": "Nobody", "Event_Type": "won"},   # bad gw -> skip
        {"Gameweek": 4, "Player_Name": "", "Event_Type": "won"},          # empty name -> skip
        {"Gameweek": "5", "Player_Name": "Salah", "Event_Type": "won"},
    ]
    out = rows_from_sheet_records(records)
    assert out == [
        {"gameweek": 3, "player_name": "Haaland", "event_type": "scored"},
        {"gameweek": 5, "player_name": "Salah", "event_type": "won"},
    ]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_migrate_penalties.py -v`
Expected: FAIL — module not found. (`scripts/__init__.py` already exists, so `scripts.` imports resolve.)

- [ ] **Step 3: Write minimal implementation**

Create `scripts/migrate_penalties_to_supabase.py`:

```python
"""One-off: copy existing manual_penalty_data sheet rows into Supabase.

Run once before cutover:
    python -m scripts.migrate_penalties_to_supabase
Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and the same Google
credentials the pipeline uses.
"""
import pandas as pd

from penalty_source import get_supabase_client


def rows_from_sheet_records(records: list) -> list:
    out = []
    for r in records:
        gw = pd.to_numeric(r.get("Gameweek"), errors="coerce")
        name = str(r.get("Player_Name", "")).strip()
        etype = str(r.get("Event_Type", "")).strip()
        if pd.isna(gw) or not name:
            continue
        out.append({
            "gameweek": int(gw),
            "player_name": name,
            "event_type": etype,
        })
    return out


def main():
    import gspread
    from data_pipeline import get_secrets, get_credentials  # reuse existing auth

    creds_dict = get_secrets()
    client = gspread.authorize(get_credentials(creds_dict))
    sheet = client.open("FPL-Data-Pep-2026-27").worksheet("manual_penalty_data")
    rows = rows_from_sheet_records(sheet.get_all_records())

    supabase = get_supabase_client()
    if rows:
        supabase.table("manual_penalty_events").insert(rows).execute()
    print(f"Migrated {len(rows)} penalty rows to Supabase.")


if __name__ == "__main__":
    main()
```

> Note: confirm the helper names `get_secrets` / `get_credentials` exist in
> `data_pipeline.py` (they are at lines 44 and 65). If their signatures differ,
> adapt the two `main()` lines only — the tested `rows_from_sheet_records`
> transform does not change.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_migrate_penalties.py -v`
Expected: PASS.

- [ ] **Step 5: Run the migration once (manual)**

Run: `python -m scripts.migrate_penalties_to_supabase`
Expected: prints `Migrated N penalty rows to Supabase.` Verify in the Supabase
table editor that the rows appear.

- [ ] **Step 6: Commit**

```bash
git add scripts/migrate_penalties_to_supabase.py tests/test_migrate_penalties.py
git commit -m "chore: one-off migration of penalty data from Sheets to Supabase"
```

---

### Task 9: Full-suite green + pipeline dry-run verification

**Files:**
- Modify: none (verification task; fold any small fixes into the relevant task above)

**Interfaces:**
- Consumes: everything above.
- Produces: a verified end-to-end pipeline run producing `dashboard.json` whose sheet set matches the Google Sheet.

- [ ] **Step 1: Run the entire test suite**

Run: `python -m pytest -v`
Expected: all tests pass, including the pre-existing `tests/test_award_calculators.py`, `tests/test_smoke.py`, and `tests/test_migrate_new_season_sheet.py`.

- [ ] **Step 2: Run the pipeline end-to-end locally**

With `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and Google credentials set:

Run: `python data_pipeline.py`
Expected: completes, writes to the Google Sheet (backup) **and** produces a local `dashboard.json`.

- [ ] **Step 3: Verify dashboard.json content**

Run:

```bash
python -c "import json; d=json.load(open('dashboard.json')); print(sorted(d['sheets'].keys())); print(d['generated_from_metadata'])"
```

Expected: the sheet-name list matches the worksheets in the Google Sheet
(e.g. `classic_league_standings`, `h2h_league_standings`, `metadata`, the
special-award sheets, monthly sheets), and `generated_from_metadata` shows the
current `last_finished_gw` and `last_updated_utc`.

- [ ] **Step 4: Confirm dashboard.json is not committed to git**

Run: `git status --porcelain dashboard.json`
Expected: no output only if ignored. Add `dashboard.json` to `.gitignore` (it is
a build artifact, republished each run) and commit that change:

```bash
git add .gitignore
git commit -m "chore: ignore generated dashboard.json artifact"
```

---

## Self-Review

**Spec coverage (Plan 1 scope — spec §4, §5, §8):**
- Supabase schema + RLS (spec §5) → Task 1. ✓
- Penalty read swap (spec §8.1) → Tasks 2–3. ✓
- `dashboard.json` emit (spec §8.2) → Tasks 4–5. ✓
- Vercel Blob publish (spec §3.2, §8.2) → Task 6. ✓
- `should_run` gate (spec §4, §8.3) → Task 7. ✓
- Penalty migration (spec §5) → Task 8. ✓
- Google Sheets backup preserved (spec §8.2) → verified in Tasks 5 & 9 (loop untouched). ✓
- New secrets documented (spec §8.4) → Task 1 Step 5. ✓
- Out of Plan 1 scope (later plans): frontend (§6), auth/admin (§9 write-side), live overlay (§7), Vercel Cron watcher wiring (§4). Noted, not gaps.

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N" — every code step has real code. The only advisory note (Task 8 Step 3) points at concrete existing line numbers to confirm, not a placeholder.

**Type consistency:** `fetch_penalty_events(client) -> DataFrame[Gameweek,Player_Name,Event_Type]` used consistently in Tasks 2/3; `build_dashboard_payload`/`write_dashboard_json` signatures match across Tasks 4/5; `latest_finalized_gw`/`should_run` signatures match across Task 7 test and impl; `rows_from_sheet_records` shape matches across Task 8 test and impl. ✓
