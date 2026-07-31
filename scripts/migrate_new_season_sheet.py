"""One-off script: archive the 2025/26 season sheet and provision a fresh 2026/27 sheet.

Run manually, once, before the first 2026/27 pipeline run:
    python scripts/migrate_new_season_sheet.py --dry-run   # preview
    python scripts/migrate_new_season_sheet.py              # execute for real

After running this for real, update GOOGLE_SHEET_NAME to "FPL-Data-Pep-2026-27"
in BOTH data_pipeline.py and app.py -- until you do, both apps keep reading/writing
the old "FPL-Data-Pep" sheet even though it's been renamed to the archive name.
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
