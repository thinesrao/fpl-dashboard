# 2026/27 Season Award Changes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 8 rule changes for the "Pep Roulette™" FPL league's 2026/27 season (per `Fantasy Premier League 2026-27.pdf`) — 2 changed awards, 2 removed awards, 5 new awards — without corrupting or losing the 2025/26 season's data in the shared Google Sheet.

**Architecture:** `data_pipeline.py` fetches from the FPL API, computes 28 award categories per manager, and rewrites every worksheet in a Google Sheet on each run (scheduled every 6h via GitHub Actions). `app.py` is a Streamlit dashboard that reads those worksheets. Award-scoring math for the new/changed awards is extracted into a new pandas-free module (`award_calculators.py`) so it can be unit tested without mocking Google Sheets or the FPL API; `data_pipeline.py` keeps orchestration (fetching, DataFrame shaping, writing).

**Tech Stack:** Python 3.11, pandas, gspread + gspread-dataframe, requests, Streamlit, Plotly. Testing: pytest (new, dev-only dependency — this repo currently has zero automated tests).

## Global Constraints

- Python 3.11 (matches `.github/workflows/run_fpl_pipeline.yml`).
- `award_calculators.py` must have **no pandas/gspread/requests imports** — plain Python only (dicts, lists) — so every function is testable with hand-built fixtures and has zero network/Sheets dependency.
- The 2026/27 season has not started: GW1's deadline is 2026-08-21T17:30:00Z (verified live against `bootstrap-static/` on 2026-07-31). `event/{gw}/live/` returns `{"elements": []}` until kickoff, so there is no real per-gameweek data to test against yet. Every new/changed calculation must be verified via unit tests with synthetic fixtures; a real end-to-end pipeline run can only be smoke-tested after GW1 finishes.
- `CLASSIC_LEAGUE_ID` (665732), `H2H_LEAGUE_ID` (818813), `FPL_CHALLENGE_LEAGUE_ID` (5008) are the **2025/26** league IDs and currently 404 on the FPL API. The rules PDF states league registration is due 22 Aug 2026 — the real 2026/27 IDs are not yet known. Do not guess replacement values; leave a `TODO` marker (Task 9).
- The pipeline does `worksheet.clear()` + full rewrite on every run, keyed by worksheet name and by `Gameweek`/`gameweek` number (1–38). Running the unmodified pipeline against the existing "FPL-Data-Pep" sheet for the new season would silently overwrite/corrupt the 2025/26 season's award history and manual penalty log. Task 2 must run (and be confirmed against production) **before** any 2026/27 pipeline run touches Google Sheets.
- No Playwright/E2E test is included in this plan. This is a personal, non-customer-facing Streamlit dashboard; the actual risk surface (real money awards, per the PDF's RM7,060 prize pool) is the *award scoring math*, which unit tests cover directly. This is a deliberate scope decision, not an oversight.
- `pytest` goes in a new `requirements-dev.txt`, not `requirements.txt` — the GitHub Actions pipeline only runs `data_pipeline.py`, not tests, so production dependencies stay unchanged.

---

## File Structure

- **Create** `award_calculators.py` — pure scoring functions for Dream Team, Penalty King, Expects King, Hardworking AF, Half Season Wonders, Bad Luck H2H, Reversed MotW.
- **Create** `tests/test_award_calculators.py` — unit tests for every function above.
- **Create** `scripts/migrate_new_season_sheet.py` — one-off script: archives the 2025/26 Google Sheet and provisions a fresh 2026/27 spreadsheet.
- **Create** `tests/test_migrate_new_season_sheet.py` — mock-based test asserting the migration script's call sequence (no real Google API calls).
- **Create** `requirements-dev.txt` — `pytest`.
- **Modify** `requirements.txt` — add `toml` (already required by `get_secrets()` for local dev; was missing, discovered while testing this session).
- **Modify** `data_pipeline.py` — wire in the new calculators; remove Best Underdog, Steady King (Pts/Transfer), and the Time Machine mechanism; add Half Season Wonders / Bad Luck H2H / Reversed MotW blocks; update `GOOGLE_SHEET_NAME` and flag league ID constants.
- **Modify** `app.py` — update `SPECIAL_AWARD_CONFIG` (remove 2, add 6); update `GOOGLE_SHEET_NAME` to match.

---

### Task 1: Test harness + repo hygiene

**Files:**
- Create: `requirements-dev.txt`
- Create: `tests/test_smoke.py`
- Modify: `requirements.txt`

**Interfaces:**
- Produces: a working `pytest` invocation (`python -m pytest`) that later tasks' tests plug into.

- [ ] **Step 1: Add `toml` to `requirements.txt`**

Current `requirements.txt`:
```
pandas
requests
gspread
gspread-dataframe
oauth2client
plotly
```

New `requirements.txt`:
```
pandas
requests
gspread
gspread-dataframe
oauth2client
plotly
toml
```

`get_secrets()` in `data_pipeline.py` (line 42) already does `import toml` for local dev when `.streamlit/secrets.toml` exists — it was missing from `requirements.txt` (confirmed by `ModuleNotFoundError: No module named 'toml'` when running `python data_pipeline.py` locally this session).

- [ ] **Step 2: Create `requirements-dev.txt`**

```
pytest
```

- [ ] **Step 3: Install dev dependencies**

Run: `pip install -r requirements.txt -r requirements-dev.txt`
Expected: installs cleanly, no errors.

- [ ] **Step 4: Write a smoke test**

`tests/test_smoke.py`:
```python
def test_pytest_runs():
    assert 1 + 1 == 2
```

- [ ] **Step 5: Run it**

Run: `python -m pytest tests/test_smoke.py -v`
Expected: `1 passed`

- [ ] **Step 6: Commit**

```bash
git add requirements.txt requirements-dev.txt tests/test_smoke.py
git commit -m "chore: add pytest harness and fix missing toml dependency"
```

---

### Task 2: Season migration script (archive 2025/26, provision 2026/27)

**Files:**
- Create: `scripts/migrate_new_season_sheet.py`
- Test: `tests/test_migrate_new_season_sheet.py`

**Interfaces:**
- Consumes: `get_secrets()`, `get_credentials()` from `data_pipeline.py` (existing, unchanged signatures — `get_secrets() -> dict | str | None`, `get_credentials(gcp_creds) -> gspread.Client | None`).
- Produces: (when run for real against production) a Google Sheet named `FPL-Data-Pep-2025-26-Archive` containing the untouched 2025/26 data, and a new Google Sheet named `FPL-Data-Pep-2026-27` with an empty `manual_penalty_data` worksheet (headers only), shared with `thinesdidier087@gmail.com` as writer.

> ⚠️ **This script performs hard-to-reverse actions on production Google Drive (renaming the live season sheet, creating a new spreadsheet).** Write and unit-test it in this task, but do **not** run it against production without the user explicitly confirming — surface the dry-run output and ask first.

- [ ] **Step 1: Write the failing test (mocked gspread client, no network)**

`tests/test_migrate_new_season_sheet.py`:
```python
from unittest.mock import MagicMock, call

from scripts.migrate_new_season_sheet import migrate, OLD_SHEET_NAME, ARCHIVE_SHEET_NAME, NEW_SHEET_NAME, SHARE_WITH_EMAIL, MANUAL_PENALTY_HEADERS


def test_dry_run_does_not_mutate_anything():
    gc = MagicMock()
    old_sheet = MagicMock()
    gc.open.return_value = old_sheet

    migrate(gc, dry_run=True)

    gc.open.assert_called_once_with(OLD_SHEET_NAME)
    old_sheet.update_title.assert_not_called()
    gc.create.assert_not_called()


def test_real_run_archives_old_and_provisions_new_sheet():
    gc = MagicMock()
    old_sheet = MagicMock()
    new_sheet = MagicMock()
    default_ws = MagicMock()
    penalty_ws = MagicMock()

    gc.open.return_value = old_sheet
    gc.create.return_value = new_sheet
    new_sheet.sheet1 = default_ws
    new_sheet.add_worksheet.return_value = penalty_ws

    migrate(gc, dry_run=False)

    old_sheet.update_title.assert_called_once_with(ARCHIVE_SHEET_NAME)
    gc.create.assert_called_once_with(NEW_SHEET_NAME)
    new_sheet.share.assert_called_once_with(SHARE_WITH_EMAIL, perm_type="user", role="writer")
    new_sheet.add_worksheet.assert_called_once_with(
        title="manual_penalty_data", rows=1, cols=len(MANUAL_PENALTY_HEADERS)
    )
    penalty_ws.update.assert_called_once_with("A1", [MANUAL_PENALTY_HEADERS])
    new_sheet.del_worksheet.assert_called_once_with(default_ws)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_migrate_new_season_sheet.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scripts'` (module doesn't exist yet)

- [ ] **Step 3: Write the implementation**

Create `scripts/__init__.py` (empty file, makes `scripts` importable).

`scripts/migrate_new_season_sheet.py`:
```python
"""One-off script: archive the 2025/26 season sheet and provision a fresh 2026/27 sheet.

Run manually, once, before the first 2026/27 pipeline run:
    python scripts/migrate_new_season_sheet.py --dry-run   # preview
    python scripts/migrate_new_season_sheet.py              # execute for real
"""
import argparse
import sys

from data_pipeline import get_secrets, get_credentials

OLD_SHEET_NAME = "FPL-Data-Pep"
ARCHIVE_SHEET_NAME = "FPL-Data-Pep-2025-26-Archive"
NEW_SHEET_NAME = "FPL-Data-Pep-2026-27"
SHARE_WITH_EMAIL = "thinesdidier087@gmail.com"
MANUAL_PENALTY_HEADERS = ["Gameweek", "Player_Name", "Event_Type"]


def migrate(gc, dry_run):
    print(f"Opening '{OLD_SHEET_NAME}'...")
    old_sheet = gc.open(OLD_SHEET_NAME)

    print(f"Renaming '{OLD_SHEET_NAME}' -> '{ARCHIVE_SHEET_NAME}'...")
    if dry_run:
        print("  (dry-run: skipped)")
        print(f"Would create new spreadsheet '{NEW_SHEET_NAME}' and stop here.")
        return
    old_sheet.update_title(ARCHIVE_SHEET_NAME)

    print(f"Creating new spreadsheet '{NEW_SHEET_NAME}'...")
    new_sheet = gc.create(NEW_SHEET_NAME)

    print(f"Sharing '{NEW_SHEET_NAME}' with {SHARE_WITH_EMAIL}...")
    new_sheet.share(SHARE_WITH_EMAIL, perm_type="user", role="writer")

    print("Pre-creating empty 'manual_penalty_data' worksheet...")
    default_ws = new_sheet.sheet1
    penalty_ws = new_sheet.add_worksheet(
        title="manual_penalty_data", rows=1, cols=len(MANUAL_PENALTY_HEADERS)
    )
    penalty_ws.update("A1", [MANUAL_PENALTY_HEADERS])
    new_sheet.del_worksheet(default_ws)

    print("Done. New spreadsheet ID:", new_sheet.id)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    gcp_creds = get_secrets()
    if not gcp_creds:
        print("ERROR: no GCP credentials found.")
        sys.exit(1)
    gc = get_credentials(gcp_creds)
    if not gc:
        print("ERROR: failed to authenticate.")
        sys.exit(1)

    migrate(gc, args.dry_run)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_migrate_new_season_sheet.py -v`
Expected: `2 passed`

- [ ] **Step 5: Dry-run against production to preview (safe, read-only)**

Run: `python scripts/migrate_new_season_sheet.py --dry-run`
Expected: prints the plan, confirms `FPL-Data-Pep` opens successfully, makes no changes.

- [ ] **Step 6: Commit**

```bash
git add scripts/__init__.py scripts/migrate_new_season_sheet.py tests/test_migrate_new_season_sheet.py
git commit -m "feat: add one-off script to archive 2025/26 sheet and provision 2026/27 sheet"
```

- [ ] **Step 7: STOP — confirm with the user before running for real**

Do not run `python scripts/migrate_new_season_sheet.py` (without `--dry-run`) until the user explicitly confirms. This renames the live production spreadsheet and creates a new one under the service account. Once confirmed and run, note the new spreadsheet ID for Task 9.

---

### Task 3: Dream Team (4→5 points) + Penalty King (missed penalty −2)

**Files:**
- Create: `award_calculators.py` (this task starts the file; later tasks append to it)
- Test: `tests/test_award_calculators.py` (this task starts the file; later tasks append to it)
- Modify: `data_pipeline.py:201-204` (long_format_data dict — no change needed, both awards already present), `data_pipeline.py:209-210` (hoist `live_stats_by_id`), `data_pipeline.py:311` (Dream Team scoring), `data_pipeline.py:324-347` (Penalty King block)

**Interfaces:**
- Produces: `calculate_dream_team_score(active_squad_ids, dream_team_players, top_performers, top_performer_points=5) -> int`
- Produces: `calculate_penalty_score(active_squad_ids, live_stats_by_id, manual_events) -> int` where `manual_events` is `list[{'player_id': int | None, 'event_type': str}]`

- [ ] **Step 1: Write the failing tests**

`tests/test_award_calculators.py`:
```python
from award_calculators import calculate_dream_team_score, calculate_penalty_score


def test_dream_team_non_dream_team_player_scores_zero():
    assert calculate_dream_team_score(
        active_squad_ids=[1, 2], dream_team_players={3}, top_performers=set()
    ) == 0


def test_dream_team_appearance_scores_one():
    assert calculate_dream_team_score(
        active_squad_ids=[1, 2], dream_team_players={1}, top_performers=set()
    ) == 1


def test_dream_team_top_performer_scores_five():
    assert calculate_dream_team_score(
        active_squad_ids=[1], dream_team_players={1}, top_performers={1}
    ) == 5


def test_dream_team_tied_top_performers_all_score_five():
    score = calculate_dream_team_score(
        active_squad_ids=[1, 2, 3],
        dream_team_players={1, 2, 3},
        top_performers={1, 2},  # tied at the top score
    )
    assert score == 5 + 5 + 1


def test_penalty_score_automatic_save_and_miss():
    live_stats_by_id = {10: {"penalties_saved": 1, "penalties_missed": 1}}
    score = calculate_penalty_score(
        active_squad_ids=[10], live_stats_by_id=live_stats_by_id, manual_events=[]
    )
    assert score == 3 - 2  # save (+3) and miss (-2) by the same player


def test_penalty_score_manual_scored_and_won():
    manual_events = [
        {"player_id": 20, "event_type": "Penalty Scored"},
        {"player_id": 20, "event_type": "Penalty Won"},
    ]
    score = calculate_penalty_score(
        active_squad_ids=[20], live_stats_by_id={}, manual_events=manual_events
    )
    assert score == 2


def test_penalty_score_ignores_player_not_in_active_squad():
    manual_events = [{"player_id": 99, "event_type": "Penalty Scored"}]
    score = calculate_penalty_score(
        active_squad_ids=[20], live_stats_by_id={}, manual_events=manual_events
    )
    assert score == 0


def test_penalty_score_ignores_unmatched_player_name():
    manual_events = [{"player_id": None, "event_type": "Penalty Scored"}]
    score = calculate_penalty_score(
        active_squad_ids=[20], live_stats_by_id={}, manual_events=manual_events
    )
    assert score == 0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_award_calculators.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'award_calculators'`

- [ ] **Step 3: Write the minimal implementation**

`award_calculators.py`:
```python
"""Pure scoring functions for the 2026/27 Pep Roulette award changes.

No pandas/gspread/requests imports here on purpose: these functions take
plain dicts and lists so they can be unit tested without mocking Google
Sheets or the FPL API. data_pipeline.py owns fetching data and shaping it
into the inputs these functions expect.
"""


def calculate_dream_team_score(active_squad_ids, dream_team_players, top_performers, top_performer_points=5):
    return sum(
        top_performer_points if pid in top_performers else 1
        for pid in active_squad_ids
        if pid in dream_team_players
    )


def calculate_penalty_score(active_squad_ids, live_stats_by_id, manual_events):
    score = 0
    for pid in active_squad_ids:
        stats = live_stats_by_id.get(pid)
        if stats:
            score += stats.get("penalties_saved", 0) * 3
            score -= stats.get("penalties_missed", 0) * 2
    for event in manual_events:
        if event["player_id"] in active_squad_ids and event["event_type"] in ("Penalty Scored", "Penalty Won"):
            score += 1
    return score
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_award_calculators.py -v`
Expected: `8 passed`

- [ ] **Step 5: Wire into `data_pipeline.py`**

Add import near the top (after line 9's `import os`):
```python
from award_calculators import calculate_dream_team_score, calculate_penalty_score
```

Replace lines 208-210:
```python
    for gw in range(1, last_finished_gw + 1):
        live_gw_data = get_json_from_url(LIVE_EVENT_URL.format(GW=gw))
        if not live_gw_data: print(f"Could not fetch live data for GW{gw}. Skipping."); continue
```
with:
```python
    for gw in range(1, last_finished_gw + 1):
        live_gw_data = get_json_from_url(LIVE_EVENT_URL.format(GW=gw))
        if not live_gw_data: print(f"Could not fetch live data for GW{gw}. Skipping."); continue
        live_stats_by_id = {p['id']: p['stats'] for p in live_gw_data.get('elements', [])}
```

Replace line 311:
```python
                dream_team_score = sum(4 if p_id in top_performers else 1 for p_id in active_squad_ids if p_id in dream_team_players)
```
with:
```python
                dream_team_score = calculate_dream_team_score(active_squad_ids, dream_team_players, top_performers)
```

Replace lines 324-347 (the entire "Penalty King: DEFINITIVE HYBRID LOGIC" block, from the comment through the `long_format_data['penalty_king'].append(...)` line) with:
```python
                # --- Penalty King: automatic (saved/missed) + manual (scored/won) ---
                gw_penalty_events = manual_penalty_df[manual_penalty_df['Gameweek'] == gw]
                manual_events = [
                    {'player_id': player_name_to_id.get(row['Player_Name']), 'event_type': row['Event_Type']}
                    for _, row in gw_penalty_events.iterrows()
                ]
                penalty_score_gw = calculate_penalty_score(active_squad_ids, live_stats_by_id, manual_events)
                long_format_data['penalty_king'].append({'gameweek': gw, 'manager_name': manager_name, 'score': penalty_score_gw})
```

- [ ] **Step 6: Run the full test suite**

Run: `python -m pytest -v`
Expected: all tests still pass (no regressions from the wiring change; this step doesn't add new tests, it validates the wiring didn't break anything already covered).

- [ ] **Step 7: Commit**

```bash
git add award_calculators.py tests/test_award_calculators.py data_pipeline.py
git commit -m "feat: award 5pts for Dream Team top performer, deduct 2pts for missed penalties"
```

---

### Task 4: Expects King (xG+xA) and Hardworking AF (minutes) — new awards

**Files:**
- Modify: `award_calculators.py` (append)
- Modify: `tests/test_award_calculators.py` (append)
- Modify: `data_pipeline.py:201-204` (add dict keys), `data_pipeline.py:~325` (add per-GW calls, right after the Penalty King block from Task 3), `data_pipeline.py:390-408` (pivot loop — preserve float precision for `expects_king`)
- Modify: `app.py:162-173` (`SPECIAL_AWARD_CONFIG`)

**Interfaces:**
- Consumes: `live_stats_by_id` (produced in Task 3, `data_pipeline.py`), `active_squad_ids` (existing).
- Produces: `calculate_xgi_score(active_squad_ids, live_stats_by_id) -> float` (rounded to 2dp), `calculate_minutes_score(active_squad_ids, live_stats_by_id) -> int`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_award_calculators.py`:
```python
from award_calculators import calculate_xgi_score, calculate_minutes_score


def test_xgi_score_sums_expected_goals_and_assists():
    live_stats_by_id = {
        1: {"expected_goals": "0.50", "expected_assists": "0.25"},
        2: {"expected_goals": "0.10", "expected_assists": "0.00"},
    }
    score = calculate_xgi_score([1, 2], live_stats_by_id)
    assert score == 0.85


def test_xgi_score_handles_missing_player_and_missing_fields():
    live_stats_by_id = {1: {}}
    score = calculate_xgi_score([1, 2], live_stats_by_id)  # player 2 has no stats at all
    assert score == 0.0


def test_xgi_score_rounds_to_two_decimal_places():
    live_stats_by_id = {1: {"expected_goals": "0.111", "expected_assists": "0.222"}}
    assert calculate_xgi_score([1], live_stats_by_id) == 0.33


def test_minutes_score_sums_minutes_played():
    live_stats_by_id = {1: {"minutes": 90}, 2: {"minutes": 63}}
    assert calculate_minutes_score([1, 2], live_stats_by_id) == 153


def test_minutes_score_missing_player_counts_zero():
    assert calculate_minutes_score([1, 2], {1: {"minutes": 90}}) == 90
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_award_calculators.py -v`
Expected: FAIL with `ImportError: cannot import name 'calculate_xgi_score'`

- [ ] **Step 3: Write the minimal implementation**

Append to `award_calculators.py`:
```python
def calculate_xgi_score(active_squad_ids, live_stats_by_id):
    total = 0.0
    for pid in active_squad_ids:
        stats = live_stats_by_id.get(pid)
        if stats:
            total += float(stats.get("expected_goals", 0) or 0)
            total += float(stats.get("expected_assists", 0) or 0)
    return round(total, 2)


def calculate_minutes_score(active_squad_ids, live_stats_by_id):
    return sum(live_stats_by_id.get(pid, {}).get("minutes", 0) for pid in active_squad_ids)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_award_calculators.py -v`
Expected: `13 passed`

- [ ] **Step 5: Wire into `data_pipeline.py`**

Update import (from Task 3) to:
```python
from award_calculators import (
    calculate_dream_team_score,
    calculate_penalty_score,
    calculate_xgi_score,
    calculate_minutes_score,
)
```

Update the `long_format_data` dict (lines 201-204):
```python
    long_format_data = {
        "golden_boot": [], "playmaker": [], "golden_glove": [], "best_gk": [], "best_def": [], "best_mid": [], "best_fwd": [], "best_vc": [],
        "transfer_king": [], "bench_king": [], "dream_team": [], "defensive_king": [], "shooting_stars": [], "best_underdog": [], "penalty_king": [],
        "expects_king": [], "hardworking_af": []
    }
```
(`best_underdog` stays here for now — its computation block still exists elsewhere in the file at this point in the plan and appends to it every gameweek. Task 8 removes the key and the block together, atomically, so the dict is never missing a key something still writes to.)

Immediately after the `long_format_data['penalty_king'].append(...)` line added in Task 3, add:
```python
                xgi_gw = calculate_xgi_score(active_squad_ids, live_stats_by_id)
                long_format_data['expects_king'].append({'gameweek': gw, 'manager_name': manager_name, 'score': xgi_gw})

                minutes_gw = calculate_minutes_score(active_squad_ids, live_stats_by_id)
                long_format_data['hardworking_af'].append({'gameweek': gw, 'manager_name': manager_name, 'score': minutes_gw})
```

Replace the pivot loop (originally lines 390-408, "Process special historical awards"):
```python
    for award_name, history_data in long_format_data.items():
        if not history_data: continue
        long_df = pd.DataFrame(history_data)
        wide_df = long_df.pivot(index='manager_name', columns='gameweek', values='score').fillna(0).astype(int)
        wide_df.columns = [f"GW{col}" for col in wide_df.columns]
        wide_df['Total'] = wide_df[[col for col in wide_df.columns if col.startswith('GW')]].sum(axis=1)
```
with:
```python
    FLOAT_AWARDS = {'expects_king'}
    for award_name, history_data in long_format_data.items():
        if not history_data: continue
        long_df = pd.DataFrame(history_data)
        wide_df = long_df.pivot(index='manager_name', columns='gameweek', values='score').fillna(0)
        wide_df = wide_df.round(2) if award_name in FLOAT_AWARDS else wide_df.astype(int)
        wide_df.columns = [f"GW{col}" for col in wide_df.columns]
        wide_df['Total'] = wide_df[[col for col in wide_df.columns if col.startswith('GW')]].sum(axis=1)
        if award_name in FLOAT_AWARDS:
            wide_df['Total'] = wide_df['Total'].round(2)
```

(Without this, `.astype(int)` truncates every gameweek's xG+xA to 0 or a whole number, destroying the whole point of the award — this is the one existing block that genuinely needs a behavior change, not just an added call.)

- [ ] **Step 6: Update `app.py` `SPECIAL_AWARD_CONFIG`**

Add two entries to the dict at `app.py:162-173`:
```python
            "expects_king": ["🔮 Expects King", "xGI"], "hardworking_af": ["💪 Hardworking AF", "Mins"],
```

- [ ] **Step 7: Run the full test suite**

Run: `python -m pytest -v`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add award_calculators.py tests/test_award_calculators.py data_pipeline.py app.py
git commit -m "feat: add Expects King (xGI) and Hardworking AF (minutes) awards"
```

---

### Task 5: Half Season Wonders (GW1-19 / GW20-38) — new award

**Files:**
- Modify: `award_calculators.py` (append)
- Modify: `tests/test_award_calculators.py` (append)
- Modify: `data_pipeline.py:~121` (add `build_standings_df` helper before `main()`), `data_pipeline.py:~463` (add half-season block after the `classic_league_standings` write)
- Modify: `app.py:162-173` (`SPECIAL_AWARD_CONFIG`)

**Interfaces:**
- Consumes: `gw_scores_list` (existing, built at `data_pipeline.py:447-453` — `list[{'manager_id': int, 'gameweek': int, 'score': int}]`, `score` = `points - event_transfers_cost`, all 38 GWs including chip weeks), `manager_df` (existing pandas DataFrame with columns `manager_id`, `manager_name`, `team_name`).
- Produces: `calculate_half_season_totals(gw_scores, first_half_gws=range(1,20), second_half_gws=range(20,39)) -> (dict[int, int], dict[int, int])`; `build_standings_df(score_by_manager_id, manager_df) -> pd.DataFrame` with columns `['Standings', 'Team', 'Manager', 'Score']` (this helper is also consumed by Tasks 6 and 7).

- [ ] **Step 1: Write the failing test**

Append to `tests/test_award_calculators.py`:
```python
from award_calculators import calculate_half_season_totals


def test_half_season_totals_splits_gw1_19_and_gw20_38():
    gw_scores = [
        {"manager_id": 1, "gameweek": 5, "score": 60},
        {"manager_id": 1, "gameweek": 19, "score": 55},
        {"manager_id": 1, "gameweek": 20, "score": 70},
        {"manager_id": 1, "gameweek": 38, "score": 65},
        {"manager_id": 2, "gameweek": 19, "score": 40},
    ]
    first_half, second_half = calculate_half_season_totals(gw_scores)
    assert first_half == {1: 115, 2: 40}
    assert second_half == {1: 135}


def test_half_season_totals_empty_input():
    first_half, second_half = calculate_half_season_totals([])
    assert first_half == {}
    assert second_half == {}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_award_calculators.py -v`
Expected: FAIL with `ImportError: cannot import name 'calculate_half_season_totals'`

- [ ] **Step 3: Write the minimal implementation**

Append to `award_calculators.py`:
```python
def calculate_half_season_totals(gw_scores, first_half_gws=range(1, 20), second_half_gws=range(20, 39)):
    first_half, second_half = {}, {}
    first_set, second_set = set(first_half_gws), set(second_half_gws)
    for record in gw_scores:
        manager_id, gw, score = record["manager_id"], record["gameweek"], record["score"]
        if gw in first_set:
            first_half[manager_id] = first_half.get(manager_id, 0) + score
        elif gw in second_set:
            second_half[manager_id] = second_half.get(manager_id, 0) + score
    return first_half, second_half
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_award_calculators.py -v`
Expected: `15 passed`

- [ ] **Step 5: Add `build_standings_df` helper to `data_pipeline.py`**

Insert before `def main():` (after `get_all_h2h_matches`, i.e. after the existing line 120):
```python
def build_standings_df(score_by_manager_id, manager_df):
    """Build a Standings/Team/Manager/Score dataframe from a {manager_id: score} mapping."""
    rows = [{'manager_id': mid, 'Score': score_by_manager_id.get(mid, 0)} for mid in manager_df['manager_id']]
    df = pd.DataFrame(rows).merge(manager_df[['manager_id', 'manager_name', 'team_name']], on='manager_id')
    df.rename(columns={'manager_name': 'Manager', 'team_name': 'Team'}, inplace=True)
    df = df.sort_values(by='Score', ascending=False).reset_index(drop=True)
    df['Standings'] = df['Score'].rank(method='min', ascending=False).astype(int)
    return df[['Standings', 'Team', 'Manager', 'Score']]
```

Update the import line from Task 4 to also bring in `calculate_half_season_totals`:
```python
from award_calculators import (
    calculate_dream_team_score,
    calculate_penalty_score,
    calculate_xgi_score,
    calculate_minutes_score,
    calculate_half_season_totals,
)
```

- [ ] **Step 6: Wire the half-season block into `data_pipeline.py`**

Immediately after the line `worksheets_to_write["classic_league_standings"] = classic_standings_df` (originally line 462), insert:
```python

    # --- Half Season Wonders (GW1-19 and GW20-38) ---
    first_half_totals, second_half_totals = calculate_half_season_totals(gw_scores_list)
    if last_finished_gw >= 1:
        worksheets_to_write['half_season_first'] = build_standings_df(first_half_totals, manager_df)
    if last_finished_gw >= 20:
        worksheets_to_write['half_season_second'] = build_standings_df(second_half_totals, manager_df)
```

- [ ] **Step 7: Update `app.py` `SPECIAL_AWARD_CONFIG`**

Add two entries:
```python
            "half_season_first": ["🌗 Half Season Wonders (H1)", "Pts"], "half_season_second": ["🌓 Half Season Wonders (H2)", "Pts"],
```

- [ ] **Step 8: Run the full test suite**

Run: `python -m pytest -v`
Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add award_calculators.py tests/test_award_calculators.py data_pipeline.py app.py
git commit -m "feat: add Half Season Wonders award (GW1-19 and GW20-38)"
```

---

### Task 6: Bad Luck H2H (longest non-winning streak) — new award

**Files:**
- Modify: `award_calculators.py` (append)
- Modify: `tests/test_award_calculators.py` (append)
- Modify: `data_pipeline.py:~572` (H2H matches block)

**Interfaces:**
- Consumes: `h2h_matches_df` (existing pandas DataFrame built at `data_pipeline.py:572` from `h2h_matches_data`, columns include `event`, `entry_1_entry`, `entry_1_points`, `entry_2_entry`, `entry_2_points`), `manager_df['manager_id']` (existing), `build_standings_df` (from Task 5).
- Produces: `longest_non_winning_streak(results: list[str]) -> int` (results are `'W'`/`'D'`/`'L'`); `calculate_bad_luck_h2h(h2h_matches: list[dict], manager_ids: list[int]) -> dict[int, int]` where each match dict has keys `gameweek`, `entry_1_entry`, `entry_1_points`, `entry_2_entry`, `entry_2_points`.

> Assumption: a gameweek where a manager has no recorded H2H match (a bye, if the league has an odd number of teams) is skipped, not counted as a loss/draw — the streak is computed over played matches in gameweek order, not over calendar gameweeks.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_award_calculators.py`:
```python
from award_calculators import longest_non_winning_streak, calculate_bad_luck_h2h


def test_longest_non_winning_streak_all_wins_is_zero():
    assert longest_non_winning_streak(["W", "W", "W"]) == 0


def test_longest_non_winning_streak_resets_on_win():
    assert longest_non_winning_streak(["W", "L", "L", "W", "D", "D", "D"]) == 3


def test_longest_non_winning_streak_trailing_run():
    assert longest_non_winning_streak(["L", "D", "L"]) == 3


def test_longest_non_winning_streak_empty_is_zero():
    assert longest_non_winning_streak([]) == 0


def test_calculate_bad_luck_h2h_two_managers():
    matches = [
        {"gameweek": 1, "entry_1_entry": 1, "entry_1_points": 50, "entry_2_entry": 2, "entry_2_points": 60},
        {"gameweek": 2, "entry_1_entry": 1, "entry_1_points": 40, "entry_2_entry": 2, "entry_2_points": 40},
        {"gameweek": 3, "entry_1_entry": 1, "entry_1_points": 70, "entry_2_entry": 2, "entry_2_points": 30},
    ]
    streaks = calculate_bad_luck_h2h(matches, manager_ids=[1, 2])
    # manager 1: L, D, W -> longest non-winning streak = 2 (the L, D run)
    # manager 2: W, D, L -> longest non-winning streak = 2 (the D, L run)
    assert streaks == {1: 2, 2: 2}


def test_calculate_bad_luck_h2h_manager_with_no_matches_is_zero():
    streaks = calculate_bad_luck_h2h([], manager_ids=[1, 2])
    assert streaks == {1: 0, 2: 0}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_award_calculators.py -v`
Expected: FAIL with `ImportError: cannot import name 'longest_non_winning_streak'`

- [ ] **Step 3: Write the minimal implementation**

Append to `award_calculators.py`:
```python
def longest_non_winning_streak(results):
    longest = current = 0
    for result in results:
        if result == "W":
            current = 0
        else:
            current += 1
            longest = max(longest, current)
    return longest


def calculate_bad_luck_h2h(h2h_matches, manager_ids):
    results_by_manager = {mid: [] for mid in manager_ids}
    for match in sorted(h2h_matches, key=lambda m: m["gameweek"]):
        for manager_id, own_pts, opp_pts in (
            (match["entry_1_entry"], match["entry_1_points"], match["entry_2_points"]),
            (match["entry_2_entry"], match["entry_2_points"], match["entry_1_points"]),
        ):
            if manager_id not in results_by_manager:
                continue
            result = "W" if own_pts > opp_pts else ("L" if own_pts < opp_pts else "D")
            results_by_manager[manager_id].append(result)
    return {mid: longest_non_winning_streak(results) for mid, results in results_by_manager.items()}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_award_calculators.py -v`
Expected: `21 passed`

- [ ] **Step 5: Wire into `data_pipeline.py`**

Update the import to add `calculate_bad_luck_h2h`:
```python
from award_calculators import (
    calculate_dream_team_score,
    calculate_penalty_score,
    calculate_xgi_score,
    calculate_minutes_score,
    calculate_half_season_totals,
    calculate_bad_luck_h2h,
)
```

The `--- H2H Monthly Manager ---` section (originally lines 571-573) is:
```python
    h2h_matches_df = pd.DataFrame(h2h_matches_data.get('results', []))
    if not h2h_matches_df.empty:
        # Define the official FPL monthly gameweek ranges
        FPL_MONTH_MAP = {
```
Insert the new block as the **first lines inside** the `if not h2h_matches_df.empty:` body — right after that `if` line, before the `# Define the official FPL monthly gameweek ranges` comment (note the 8-space indent, one level deeper than `h2h_matches_df`'s own 4-space assignment line, since this runs inside the `if`):
```python
    h2h_matches_df = pd.DataFrame(h2h_matches_data.get('results', []))
    if not h2h_matches_df.empty:
        # --- Bad Luck H2H: longest non-winning streak ---
        match_records = h2h_matches_df.rename(columns={'event': 'gameweek'}).to_dict('records')
        bad_luck_totals = calculate_bad_luck_h2h(match_records, manager_df['manager_id'].tolist())
        worksheets_to_write['bad_luck_h2h'] = build_standings_df(bad_luck_totals, manager_df)

        # Define the official FPL monthly gameweek ranges
        FPL_MONTH_MAP = {
```
(Reuses the existing `if not h2h_matches_df.empty:` guard rather than duplicating it — Bad Luck H2H and H2H Monthly Manager both need the same non-empty check.)

- [ ] **Step 6: Update `app.py` `SPECIAL_AWARD_CONFIG`**

Add:
```python
            "bad_luck_h2h": ["😢 Bad Luck H2H", "GW Streak"],
```

- [ ] **Step 7: Run the full test suite**

Run: `python -m pytest -v`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add award_calculators.py tests/test_award_calculators.py data_pipeline.py app.py
git commit -m "feat: add Bad Luck H2H award (longest non-winning streak)"
```

---

### Task 7: Reversed MotW (most times scoring the league's lowest GW score) — new award

**Files:**
- Modify: `award_calculators.py` (append)
- Modify: `tests/test_award_calculators.py` (append)
- Modify: `data_pipeline.py:~467` (right after the Half Season Wonders block from Task 5)
- Modify: `app.py:162-173` (`SPECIAL_AWARD_CONFIG`)

**Interfaces:**
- Consumes: `gw_scores_list` (existing, same source as Half Season Wonders — all 38 GWs including chip weeks, since the PDF's Reversed MotW description has no "(excluding chips)" qualifier unlike Weekly Manager), `build_standings_df` (Task 5).
- Produces: `calculate_reversed_motw(gw_scores) -> dict[int, int]` (manager_id → number of gameweeks that manager recorded the league's lowest score that week; ties are all credited).

- [ ] **Step 1: Write the failing test**

Append to `tests/test_award_calculators.py`:
```python
from award_calculators import calculate_reversed_motw


def test_reversed_motw_counts_clear_lowest():
    gw_scores = [
        {"manager_id": 1, "gameweek": 1, "score": 40},
        {"manager_id": 2, "gameweek": 1, "score": 80},
        {"manager_id": 1, "gameweek": 2, "score": 90},
        {"manager_id": 2, "gameweek": 2, "score": 30},
    ]
    counts = calculate_reversed_motw(gw_scores)
    assert counts == {1: 1, 2: 1}


def test_reversed_motw_ties_credit_all():
    gw_scores = [
        {"manager_id": 1, "gameweek": 1, "score": 40},
        {"manager_id": 2, "gameweek": 1, "score": 40},
        {"manager_id": 3, "gameweek": 1, "score": 90},
    ]
    counts = calculate_reversed_motw(gw_scores)
    assert counts == {1: 1, 2: 1}
    assert 3 not in counts


def test_reversed_motw_empty_input():
    assert calculate_reversed_motw([]) == {}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_award_calculators.py -v`
Expected: FAIL with `ImportError: cannot import name 'calculate_reversed_motw'`

- [ ] **Step 3: Write the minimal implementation**

Append to `award_calculators.py`:
```python
def calculate_reversed_motw(gw_scores):
    scores_by_gw = {}
    for record in gw_scores:
        scores_by_gw.setdefault(record["gameweek"], []).append((record["manager_id"], record["score"]))

    counts = {}
    for entries in scores_by_gw.values():
        if not entries:
            continue
        min_score = min(score for _, score in entries)
        for manager_id, score in entries:
            if score == min_score:
                counts[manager_id] = counts.get(manager_id, 0) + 1
    return counts
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_award_calculators.py -v`
Expected: `24 passed`

- [ ] **Step 5: Wire into `data_pipeline.py`**

Update the import to add `calculate_reversed_motw`:
```python
from award_calculators import (
    calculate_dream_team_score,
    calculate_penalty_score,
    calculate_xgi_score,
    calculate_minutes_score,
    calculate_half_season_totals,
    calculate_bad_luck_h2h,
    calculate_reversed_motw,
)
```

The end of the Half Season Wonders block added in Task 5 looks like this (note the second `worksheets_to_write` line is nested inside `if last_finished_gw >= 20:`, at 8-space indent):
```python
    if last_finished_gw >= 1:
        worksheets_to_write['half_season_first'] = build_standings_df(first_half_totals, manager_df)
    if last_finished_gw >= 20:
        worksheets_to_write['half_season_second'] = build_standings_df(second_half_totals, manager_df)
```
Insert the Reversed MotW block **after both `if` blocks end**, back at the outer 4-space indent (unconditional — unlike Half Season Wonders, Reversed MotW doesn't need a minimum-gameweek gate):
```python
    if last_finished_gw >= 1:
        worksheets_to_write['half_season_first'] = build_standings_df(first_half_totals, manager_df)
    if last_finished_gw >= 20:
        worksheets_to_write['half_season_second'] = build_standings_df(second_half_totals, manager_df)

    # --- Reversed MotW: most times scoring the league's lowest GW score ---
    reversed_motw_totals = calculate_reversed_motw(gw_scores_list)
    worksheets_to_write['reversed_motw'] = build_standings_df(reversed_motw_totals, manager_df)
```

- [ ] **Step 6: Update `app.py` `SPECIAL_AWARD_CONFIG`**

Add:
```python
            "reversed_motw": ["🔻 Reversed MotW", "Times Lowest"]
```

- [ ] **Step 7: Run the full test suite**

Run: `python -m pytest -v`
Expected: all tests pass (24+ tests).

- [ ] **Step 8: Commit**

```bash
git add award_calculators.py tests/test_award_calculators.py data_pipeline.py app.py
git commit -m "feat: add Reversed MotW award (most times scoring the league's lowest GW score)"
```

---

### Task 8: Remove Best Underdog, Steady King (Pts/Transfer), and the Time Machine mechanism

**Files:**
- Modify: `data_pipeline.py` (multiple removals — see below)
- Modify: `app.py:162-173` (`SPECIAL_AWARD_CONFIG`)

**Interfaces:**
- No new interfaces. This task only deletes code. `time_machine_df` / `_time_machine_ranks` is used **exclusively** by Best Underdog (verified: the only occurrences of `time_machine` in `data_pipeline.py` are the load at lines 170-177, the two reads inside the Best Underdog block at lines 351/366, and the write-back at lines 710-735) — removing Best Underdog makes the whole mechanism dead code.

- [ ] **Step 1: Remove the Time Machine load block**

Delete lines 170-177:
```python
    # --- THE DEFINITIVE TIME MACHINE (based on your superior logic) ---
    print("Loading historical rank 'Time Machine' from Google Sheet...")
    try:
        time_machine_sheet = spreadsheet.worksheet("_time_machine_ranks")
        time_machine_df = pd.DataFrame(time_machine_sheet.get_all_records())
    except gspread.WorksheetNotFound:
        print("  '_time_machine_ranks' not found. Will be created at the end of this run.")
        time_machine_df = pd.DataFrame(columns=['gameweek', 'manager_id', 'manager_name', 'classic_rank', 'h2h_rank'])
```

- [ ] **Step 2: Remove the Best Underdog computation block and its dict key together**

Delete the entire block from the `# --- Best Underdog (Definitive Self-Sufficient Logic) ---` comment through `long_format_data['best_underdog'].append(...)` (originally lines 349-381, immediately following the Penalty King block — by this point in the plan that area has already been rewritten by Task 3/4, so locate it by the `# --- Best Underdog` comment, not the original line numbers).

In the same commit, remove `"best_underdog": []` from the `long_format_data` dict initializer (added back in Task 4 Step 5 specifically so it would survive until this step):
```python
    long_format_data = {
        "golden_boot": [], "playmaker": [], "golden_glove": [], "best_gk": [], "best_def": [], "best_mid": [], "best_fwd": [], "best_vc": [],
        "transfer_king": [], "bench_king": [], "dream_team": [], "defensive_king": [], "shooting_stars": [], "penalty_king": [],
        "expects_king": [], "hardworking_af": []
    }
```

Do these two removals in the same step/commit — removing only one of them leaves either a `KeyError` (block still appends to a deleted key) or a permanently-empty unused key (dict has it, nothing writes to it).

- [ ] **Step 3: Remove the Time Machine write-back block**

Delete (originally lines 710-735):
```python
    # --- Update the Time Machine for the next run ---
    print("Updating the '_time_machine_ranks' sheet...")

    classic_ranks_now = {s['entry']: s['rank'] for s in classic_league_data.get('standings', {}).get('results', [])}
    h2h_ranks_now = {s['entry']: s['rank'] for s in h2h_league_data.get('standings', {}).get('results', [])}

    # Remove any old data for the current gameweek to prevent duplicates
    time_machine_df = time_machine_df[time_machine_df['gameweek'] != last_finished_gw]

    # Create new rows for the current gameweek's final ranks
    new_ranks_list = []
    for _, manager in manager_df.iterrows():
        manager_id = manager['manager_id']
        new_ranks_list.append({
            'gameweek': last_finished_gw,
            'manager_id': manager_id,
            'manager_name': manager['manager_name'],
            'classic_rank': classic_ranks_now.get(manager_id, 999),
            'h2h_rank': h2h_ranks_now.get(manager_id, 999)
        })

    new_ranks_df = pd.DataFrame(new_ranks_list)

    # Combine old and new data and save
    updated_time_machine_df = pd.concat([time_machine_df, new_ranks_df]).sort_values(by=['gameweek', 'classic_rank'])
    worksheets_to_write["_time_machine_ranks"] = updated_time_machine_df
```

- [ ] **Step 4: Remove Steady King (Pts/Transfer)**

In the `single_value_awards` dict initializer, remove `"steady_king": []`:
```python
    single_value_awards = {"highest_gw_score": [], "freehit_king": [], "benchboost_king": [], "triplecaptain_king": []}
```

In the per-manager loop that builds `single_value_awards`, remove the now-dead lines (`transfers`, `chip_weeks`, `total_transfers`, `total_points`, and the `steady_king` append — all four are used **only** by the Steady King calculation):
```python
    for _, manager in manager_df.iterrows():
        manager_id, manager_name, team_name = manager['manager_id'], manager['manager_name'], manager['team_name']
        history = manager_histories.get(manager_id, {})

        fh_scores, bb_scores, tc_scores, normal_scores = [], [], [], []
```
(i.e. delete the `transfers = ...`, `chip_weeks = ...`, `total_transfers = ...`, `total_points = ...`, and `single_value_awards['steady_king'].append(...)` lines, keeping everything else in the loop unchanged.)

- [ ] **Step 5: Search for any other reference**

Run: `grep -n "best_underdog\|steady_king\|time_machine" data_pipeline.py`
Expected: no output (empty).

- [ ] **Step 6: Update `app.py` `SPECIAL_AWARD_CONFIG`**

Remove these two entries entirely:
```python
            "defensive_king": ["🧱 Defensive King", "Contribution"], "best_underdog": ["🥊 Best Underdog", "Wins"],
            "penalty_king": ["🎯 Penalty King", "Pts"], "steady_king": ["🧘 Steady King", "Pts/Transfer"],
```
becomes:
```python
            "defensive_king": ["🧱 Defensive King", "Contribution"],
            "penalty_king": ["🎯 Penalty King", "Pts"],
```

- [ ] **Step 7: Confirm `app.py` has no other reference**

Run: `grep -n "best_underdog\|steady_king" app.py`
Expected: no output (empty).

- [ ] **Step 8: Run the full test suite**

Run: `python -m pytest -v`
Expected: all tests pass — this task removes only dead/duplicated code paths that had no unit test coverage (they were pre-existing, untested inline logic), so no test file changes are needed here.

- [ ] **Step 9: Commit**

```bash
git add data_pipeline.py app.py
git commit -m "refactor: remove Best Underdog, Steady King (Pts/Transfer), and the now-unused Time Machine mechanism"
```

---

### Task 9: Season constants, final assembly, and manual verification

**Files:**
- Modify: `data_pipeline.py:12-15`
- Modify: `app.py:12`

**Interfaces:** none — final wiring/config only.

- [ ] **Step 1: Update `GOOGLE_SHEET_NAME` in both files**

Only do this step once Task 2's migration script has actually been run against production and the new spreadsheet `FPL-Data-Pep-2026-27` exists.

`data_pipeline.py:15`:
```python
GOOGLE_SHEET_NAME = "FPL-Data-Pep-2026-27"
```

`app.py:12`:
```python
GOOGLE_SHEET_NAME = "FPL-Data-Pep-2026-27"
```

- [ ] **Step 2: Flag the stale league IDs**

`data_pipeline.py:12-14`:
```python
CLASSIC_LEAGUE_ID = 665732       # TODO(2026/27): replace with the new classic league ID once admins confirm (registration due 22 Aug 2026)
H2H_LEAGUE_ID = 818813           # TODO(2026/27): replace with the new H2H league ID once admins confirm
FPL_CHALLENGE_LEAGUE_ID = 5008   # TODO(2026/27): replace with the new FPL Challenge league ID once admins confirm
```

Do not replace the numeric values with a guess. When the real IDs are known, replace the constant and delete the `TODO` comment.

- [ ] **Step 3: Run the full test suite one more time**

Run: `python -m pytest -v`
Expected: all tests pass (24+ tests across `award_calculators.py`'s 7 functions, the migration script, and the smoke test).

- [ ] **Step 4: Manual verification checklist (cannot be automated — GW1 hasn't happened yet)**

- [ ] `grep -n "SPECIAL_AWARD_CONFIG" -A 20 app.py` shows exactly 24 entries (18 unchanged + 6 new − 0 remaining removed ones — confirms Task 4/5/6/7/8 all landed correctly).
- [ ] `python -c "import data_pipeline"` succeeds with no `ImportError` or `SyntaxError`.
- [ ] `python -c "import app"` fails only with a Streamlit-context error (expected outside `streamlit run`), not an import/syntax error.
- [ ] Once GW1 finishes (after 2026-08-21) and real league IDs are set: run `python data_pipeline.py` once manually, then `streamlit run app.py` and visually confirm all 6 new award tiles render in the "🏅 Special Awards" tab and their detail expanders work in "📊 Detailed Standings".

- [ ] **Step 5: Commit**

```bash
git add data_pipeline.py app.py
git commit -m "chore: point at 2026/27 Google Sheet, flag stale league IDs pending admin confirmation"
```
