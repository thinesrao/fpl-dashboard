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
