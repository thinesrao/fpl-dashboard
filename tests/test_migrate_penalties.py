from scripts.migrate_penalties_to_supabase import rows_from_sheet_records


def test_maps_and_filters_rows():
    records = [
        {"Gameweek": 3, "Player_Name": "Haaland", "Event_Type": "scored"},
        {"Gameweek": "", "Player_Name": "Nobody", "Event_Type": "won"},   # bad gw -> skip
        {"Gameweek": 4, "Player_Name": "", "Event_Type": "won"},          # empty name -> skip
        {"Gameweek": "5", "Player_Name": "Salah", "Event_Type": "won"},
    ]
    out = rows_from_sheet_records(records)
    assert out == [
        {"gameweek": 3, "player_name": "Haaland", "event_type": "scored"},
        {"gameweek": 5, "player_name": "Salah", "event_type": "won"},
    ]
