"""Unit tests for data_pipeline.write_worksheet.

The helper is the testable seam for the Google Sheets write path: it either
clears an existing worksheet or creates a new one, then writes the dataframe.
We stub gspread with fakes so no network/creds are needed.
"""
import gspread
import pandas as pd

import data_pipeline


class FakeWorksheet:
    def __init__(self, title):
        self.title = title
        self.cleared = False
        self.written = None

    def clear(self):
        self.cleared = True


class FakeSpreadsheet:
    """Fake spreadsheet whose `existing` titles are found, others raise."""

    def __init__(self, existing=()):
        self._sheets = {t: FakeWorksheet(t) for t in existing}
        self.added = []

    def worksheet(self, name):
        if name in self._sheets:
            return self._sheets[name]
        raise gspread.WorksheetNotFound(name)

    def add_worksheet(self, title, rows, cols):
        ws = FakeWorksheet(title)
        ws.rows, ws.cols = rows, cols
        self._sheets[title] = ws
        self.added.append(title)
        return ws


def _patch_writer(monkeypatch):
    """Capture set_with_dataframe calls instead of hitting the Sheets API."""
    calls = []
    monkeypatch.setattr(
        data_pipeline, "set_with_dataframe",
        lambda ws, df, include_index: calls.append((ws, df, include_index)),
    )
    return calls


def test_clears_and_writes_existing_sheet(monkeypatch):
    calls = _patch_writer(monkeypatch)
    ss = FakeSpreadsheet(existing=["manual_penalty_data"])
    df = pd.DataFrame([{"Gameweek": 1, "Player_Name": "Haaland", "Event_Type": "Penalty Scored"}])

    data_pipeline.write_worksheet(ss, "manual_penalty_data", df)

    assert ss._sheets["manual_penalty_data"].cleared is True
    assert ss.added == []  # not re-created
    ws, written_df, include_index = calls[0]
    assert include_index is False
    assert list(written_df.columns) == ["Gameweek", "Player_Name", "Event_Type"]


def test_creates_missing_sheet(monkeypatch):
    calls = _patch_writer(monkeypatch)
    ss = FakeSpreadsheet(existing=[])
    df = pd.DataFrame(columns=["Gameweek", "Player_Name", "Event_Type"])

    data_pipeline.write_worksheet(ss, "manual_penalty_data", df)

    assert ss.added == ["manual_penalty_data"]
    assert len(calls) == 1
