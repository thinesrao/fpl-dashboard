import pandas as pd
from gw_scores_export import build_gw_scores_wide


def test_build_gw_scores_wide_pivots_long_to_wide():
    records = [
        {"gameweek": 1, "manager_id": 10, "score": 60},
        {"gameweek": 2, "manager_id": 10, "score": 72},
        {"gameweek": 1, "manager_id": 20, "score": 55},
    ]
    names = {10: "Alice", 20: "Bob"}
    df = build_gw_scores_wide(records, names)
    assert list(df.columns) == ["Manager", "GW1", "GW2"]
    alice = df[df["Manager"] == "Alice"].iloc[0]
    assert alice["GW1"] == 60 and alice["GW2"] == 72
    bob = df[df["Manager"] == "Bob"].iloc[0]
    assert bob["GW1"] == 55 and bob["GW2"] == 0  # missing GW filled with 0


def test_build_gw_scores_wide_empty():
    df = build_gw_scores_wide([], {})
    assert list(df.columns) == ["Manager"]
    assert df.empty
