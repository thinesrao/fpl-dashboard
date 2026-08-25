import json

import numpy as np
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


def test_numpy_ints_and_nan_serialize_as_real_json_numbers(tmp_path):
    df = pd.DataFrame({
        "Manager": ["A", "B"],
        "Total": np.array([100, 90], dtype=np.int64),
        "Bonus": [np.nan, 5.0],
    })
    assert df["Total"].dtype == np.int64
    assert df["Bonus"].dtype == np.float64
    worksheets = {"classic_league_standings": df}

    payload = build_dashboard_payload(worksheets)
    out = tmp_path / "dashboard.json"
    write_dashboard_json(payload, str(out))

    reloaded = json.loads(out.read_text())
    rows = reloaded["sheets"]["classic_league_standings"]
    total_a = rows[0]["Total"]
    bonus_a = rows[0]["Bonus"]

    assert isinstance(total_a, int) and not isinstance(total_a, str)
    assert total_a == 100
    assert bonus_a is None
