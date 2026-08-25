"""End-to-end (no network) lock on the penalty event_type vocabulary contract.

Confirms that values coming out of `fetch_penalty_events` (Supabase's
`event_type` column) match what `award_calculators.calculate_penalty_score`
actually checks for ('Penalty Scored' / 'Penalty Won'), via the same
`manual_events` construction data_pipeline.py performs.
"""
from award_calculators import calculate_penalty_score
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


def _manual_events_from_df(df, name_to_id):
    return [
        {"player_id": name_to_id.get(r["Player_Name"]), "event_type": r["Event_Type"]}
        for _, r in df.iterrows()
    ]


def test_penalty_vocabulary_scores_via_full_pipeline_shape():
    client = _FakeClient([
        {"gameweek": 3, "player_name": "Erling Haaland", "event_type": "Penalty Scored"},
        {"gameweek": 3, "player_name": "Bruno", "event_type": "Penalty Won"},
    ])
    df = fetch_penalty_events(client)

    name_to_id = {"Erling Haaland": 1, "Bruno": 2}
    active_squad_ids = [1, 2]
    manual_events = _manual_events_from_df(df, name_to_id)

    assert calculate_penalty_score(active_squad_ids, {}, manual_events) == 2


def test_penalty_missed_event_type_is_ignored_by_calculator():
    client = _FakeClient([
        {"gameweek": 3, "player_name": "Erling Haaland", "event_type": "Penalty Missed"},
    ])
    df = fetch_penalty_events(client)

    name_to_id = {"Erling Haaland": 1}
    active_squad_ids = [1]
    manual_events = _manual_events_from_df(df, name_to_id)

    assert calculate_penalty_score(active_squad_ids, {}, manual_events) == 0
