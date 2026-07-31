from unittest.mock import MagicMock

import gspread

from scripts.migrate_new_season_sheet import migrate, OLD_SHEET_NAME, ARCHIVE_SHEET_NAME, NEW_SHEET_NAME, MANUAL_PENALTY_HEADERS


def _worksheet(title):
    ws = MagicMock()
    ws.title = title
    return ws


def test_dry_run_does_not_mutate_anything():
    gc = MagicMock()
    old_sheet = MagicMock()
    gc.open.return_value = old_sheet

    migrate(gc, dry_run=True)

    gc.open.assert_called_once_with(OLD_SHEET_NAME)
    old_sheet.update_title.assert_not_called()
    gc.create.assert_not_called()


def test_real_run_archives_old_sheet_and_sets_up_manual_penalty_data():
    gc = MagicMock()
    old_sheet = MagicMock()
    new_sheet = MagicMock()
    sheet1 = _worksheet("Sheet1")
    penalty_ws = MagicMock()

    def open_side_effect(name):
        return old_sheet if name == OLD_SHEET_NAME else new_sheet

    gc.open.side_effect = open_side_effect
    new_sheet.worksheets.return_value = [sheet1]
    new_sheet.worksheet.side_effect = lambda title: {
        "Sheet1": sheet1, "manual_penalty_data": penalty_ws
    }[title]

    migrate(gc, dry_run=False)

    old_sheet.update_title.assert_called_once_with(ARCHIVE_SHEET_NAME)
    gc.open.assert_any_call(NEW_SHEET_NAME)
    gc.create.assert_not_called()
    new_sheet.add_worksheet.assert_called_once_with(
        title="manual_penalty_data", rows=1, cols=len(MANUAL_PENALTY_HEADERS)
    )
    penalty_ws.update.assert_called_once_with(range_name="A1", values=[MANUAL_PENALTY_HEADERS])
    new_sheet.del_worksheet.assert_called_once_with(sheet1)


def test_real_run_leaves_existing_manual_penalty_data_untouched():
    gc = MagicMock()
    old_sheet = MagicMock()
    new_sheet = MagicMock()

    def open_side_effect(name):
        return old_sheet if name == OLD_SHEET_NAME else new_sheet

    gc.open.side_effect = open_side_effect
    new_sheet.worksheets.return_value = [_worksheet("manual_penalty_data")]

    migrate(gc, dry_run=False)

    old_sheet.update_title.assert_called_once_with(ARCHIVE_SHEET_NAME)
    new_sheet.add_worksheet.assert_not_called()
    new_sheet.del_worksheet.assert_not_called()


def test_real_run_raises_with_clear_message_when_new_sheet_not_shared_yet():
    gc = MagicMock()
    old_sheet = MagicMock()

    def open_side_effect(name):
        if name == OLD_SHEET_NAME:
            return old_sheet
        raise gspread.SpreadsheetNotFound(name)

    gc.open.side_effect = open_side_effect

    try:
        migrate(gc, dry_run=False)
        assert False, "expected SpreadsheetNotFound to propagate"
    except gspread.SpreadsheetNotFound:
        pass

    # The old sheet was already renamed before we discovered the new one is missing --
    # that step doesn't need to be (and shouldn't be) undone or retried.
    old_sheet.update_title.assert_called_once_with(ARCHIVE_SHEET_NAME)
    gc.create.assert_not_called()
