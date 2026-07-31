from award_calculators import calculate_dream_team_score, calculate_penalty_score


def test_dream_team_non_dream_team_player_scores_zero():
    assert calculate_dream_team_score(
        active_squad_ids=[1, 2], dream_team_players={3}, top_performers=set()
    ) == 0


def test_dream_team_appearance_scores_one():
    assert calculate_dream_team_score(
        active_squad_ids=[1, 2], dream_team_players={1}, top_performers=set()
    ) == 1


def test_dream_team_top_performer_scores_five():
    assert calculate_dream_team_score(
        active_squad_ids=[1], dream_team_players={1}, top_performers={1}
    ) == 5


def test_dream_team_tied_top_performers_all_score_five():
    score = calculate_dream_team_score(
        active_squad_ids=[1, 2, 3],
        dream_team_players={1, 2, 3},
        top_performers={1, 2},  # tied at the top score
    )
    assert score == 5 + 5 + 1


def test_penalty_score_automatic_save_and_miss():
    live_stats_by_id = {10: {"penalties_saved": 1, "penalties_missed": 1}}
    score = calculate_penalty_score(
        active_squad_ids=[10], live_stats_by_id=live_stats_by_id, manual_events=[]
    )
    assert score == 3 - 2  # save (+3) and miss (-2) by the same player


def test_penalty_score_manual_scored_and_won():
    manual_events = [
        {"player_id": 20, "event_type": "Penalty Scored"},
        {"player_id": 20, "event_type": "Penalty Won"},
    ]
    score = calculate_penalty_score(
        active_squad_ids=[20], live_stats_by_id={}, manual_events=manual_events
    )
    assert score == 2


def test_penalty_score_ignores_player_not_in_active_squad():
    manual_events = [{"player_id": 99, "event_type": "Penalty Scored"}]
    score = calculate_penalty_score(
        active_squad_ids=[20], live_stats_by_id={}, manual_events=manual_events
    )
    assert score == 0


def test_penalty_score_ignores_unmatched_player_name():
    manual_events = [{"player_id": None, "event_type": "Penalty Scored"}]
    score = calculate_penalty_score(
        active_squad_ids=[20], live_stats_by_id={}, manual_events=manual_events
    )
    assert score == 0
