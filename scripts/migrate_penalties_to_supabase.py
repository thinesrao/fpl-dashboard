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
    migrated = 0
    for row in rows:
        try:
            supabase.table("manual_penalty_events").insert(row).execute()
            migrated += 1
        except Exception as exc:
            print(f"Skipping row {row!r}: {exc}")
    print(f"Migrated {migrated} of {len(rows)} penalty rows to Supabase.")


if __name__ == "__main__":
    main()
