"""One-off script: archive last season's sheet and provision a fresh one for the new season.

Run manually, once, before the first pipeline run of a new season:
    python scripts/migrate_new_season_sheet.py --dry-run   # preview
    python scripts/migrate_new_season_sheet.py              # execute for real

IMPORTANT -- the service account has no Google Drive storage quota of its own
(a known limitation for service accounts not tied to a Workspace domain), so
it cannot create a brand-new spreadsheet via the API. Before running this for
real, create a blank Google Sheet named exactly NEW_SHEET_NAME (see below) in
your own Google account and share it with the service account email
(SHARE_WITH_EMAIL) as Editor. This script will open that existing sheet
rather than trying to create one -- it only falls back to creating a new
sheet if opening fails for a reason other than "not found" isn't applicable
here; if the sheet doesn't exist yet, it prints instructions and exits.

After running this for real, update GOOGLE_SHEET_NAME to NEW_SHEET_NAME's
value in BOTH data_pipeline.py and app.py -- until you do, nothing is named
OLD_SHEET_NAME any more (it's been renamed to the archive name), so both
apps hard-fail with SpreadsheetNotFound instead of silently reading stale
data.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import gspread

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
        print(f"Would open/set up new spreadsheet '{NEW_SHEET_NAME}' and stop here.")
        return
    old_sheet.update_title(ARCHIVE_SHEET_NAME)

    print(f"Opening '{NEW_SHEET_NAME}'...")
    try:
        new_sheet = gc.open(NEW_SHEET_NAME)
        print("  Found it (already created and shared with the service account).")
    except gspread.SpreadsheetNotFound:
        print(
            f"ERROR: '{NEW_SHEET_NAME}' doesn't exist or isn't shared with this "
            f"service account yet.\n"
            f"  1. Create a blank Google Sheet named exactly '{NEW_SHEET_NAME}' "
            f"in your own Google account.\n"
            f"  2. Share it with {SHARE_WITH_EMAIL} as Editor.\n"
            f"  3. Re-run this script.\n"
            f"('{OLD_SHEET_NAME}' has already been renamed to '{ARCHIVE_SHEET_NAME}' "
            f"above -- that part doesn't need redoing.)"
        )
        raise

    existing_titles = {ws.title for ws in new_sheet.worksheets()}
    if "manual_penalty_data" in existing_titles:
        print("'manual_penalty_data' already exists, leaving it as-is.")
    else:
        print("Pre-creating empty 'manual_penalty_data' worksheet...")
        new_sheet.add_worksheet(
            title="manual_penalty_data", rows=1, cols=len(MANUAL_PENALTY_HEADERS)
        )
        new_sheet.worksheet("manual_penalty_data").update(
            range_name="A1", values=[MANUAL_PENALTY_HEADERS]
        )
        # We just added a worksheet above, so there are >=2 now -- safe to
        # delete Sheet1 without re-fetching the (possibly stale) worksheet list.
        if "Sheet1" in existing_titles:
            new_sheet.del_worksheet(new_sheet.worksheet("Sheet1"))

    print("Done. Spreadsheet ID:", new_sheet.id)


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
