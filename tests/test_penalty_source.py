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
