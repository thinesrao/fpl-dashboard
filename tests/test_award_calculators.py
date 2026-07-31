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


from award_calculators import calculate_xgi_score, calculate_minutes_score


def test_xgi_score_sums_expected_goals_and_assists():
    live_stats_by_id = {
        1: {"expected_goals": "0.50", "expected_assists": "0.25"},
        2: {"expected_goals": "0.10", "expected_assists": "0.00"},
    }
    score = calculate_xgi_score([1, 2], live_stats_by_id)
    assert score == 0.85


def test_xgi_score_handles_missing_player_and_missing_fields():
    live_stats_by_id = {1: {}}
    score = calculate_xgi_score([1, 2], live_stats_by_id)  # player 2 has no stats at all
    assert score == 0.0


def test_xgi_score_rounds_to_two_decimal_places():
    live_stats_by_id = {1: {"expected_goals": "0.111", "expected_assists": "0.222"}}
    assert calculate_xgi_score([1], live_stats_by_id) == 0.33


def test_minutes_score_sums_minutes_played():
    live_stats_by_id = {1: {"minutes": 90}, 2: {"minutes": 63}}
    assert calculate_minutes_score([1, 2], live_stats_by_id) == 153


def test_minutes_score_missing_player_counts_zero():
    assert calculate_minutes_score([1, 2], {1: {"minutes": 90}}) == 90


from award_calculators import calculate_half_season_totals


def test_half_season_totals_splits_gw1_19_and_gw20_38():
    gw_scores = [
        {"manager_id": 1, "gameweek": 5, "score": 60},
        {"manager_id": 1, "gameweek": 19, "score": 55},
        {"manager_id": 1, "gameweek": 20, "score": 70},
        {"manager_id": 1, "gameweek": 38, "score": 65},
        {"manager_id": 2, "gameweek": 19, "score": 40},
    ]
    first_half, second_half = calculate_half_season_totals(gw_scores)
    assert first_half == {1: 115, 2: 40}
    assert second_half == {1: 135}


def test_half_season_totals_empty_input():
    first_half, second_half = calculate_half_season_totals([])
    assert first_half == {}
    assert second_half == {}


from award_calculators import longest_non_winning_streak, calculate_bad_luck_h2h


def test_longest_non_winning_streak_all_wins_is_zero():
    assert longest_non_winning_streak(["W", "W", "W"]) == 0


def test_longest_non_winning_streak_resets_on_win():
    assert longest_non_winning_streak(["W", "L", "L", "W", "D", "D", "D"]) == 3


def test_longest_non_winning_streak_trailing_run():
    assert longest_non_winning_streak(["L", "D", "L"]) == 3


def test_longest_non_winning_streak_empty_is_zero():
    assert longest_non_winning_streak([]) == 0


def test_calculate_bad_luck_h2h_two_managers():
    matches = [
        {"gameweek": 1, "entry_1_entry": 1, "entry_1_points": 50, "entry_2_entry": 2, "entry_2_points": 60},
        {"gameweek": 2, "entry_1_entry": 1, "entry_1_points": 40, "entry_2_entry": 2, "entry_2_points": 40},
        {"gameweek": 3, "entry_1_entry": 1, "entry_1_points": 70, "entry_2_entry": 2, "entry_2_points": 30},
    ]
    streaks = calculate_bad_luck_h2h(matches, manager_ids=[1, 2])
    # manager 1: L, D, W -> longest non-winning streak = 2 (the L, D run)
    # manager 2: W, D, L -> longest non-winning streak = 2 (the D, L run)
    assert streaks == {1: 2, 2: 2}


def test_calculate_bad_luck_h2h_manager_with_no_matches_is_zero():
    streaks = calculate_bad_luck_h2h([], manager_ids=[1, 2])
    assert streaks == {1: 0, 2: 0}


from award_calculators import calculate_reversed_motw


def test_reversed_motw_counts_clear_lowest():
    gw_scores = [
        {"manager_id": 1, "gameweek": 1, "score": 40},
        {"manager_id": 2, "gameweek": 1, "score": 80},
        {"manager_id": 1, "gameweek": 2, "score": 90},
        {"manager_id": 2, "gameweek": 2, "score": 30},
    ]
    counts = calculate_reversed_motw(gw_scores)
    assert counts == {1: 1, 2: 1}


def test_reversed_motw_ties_credit_all():
    gw_scores = [
        {"manager_id": 1, "gameweek": 1, "score": 40},
        {"manager_id": 2, "gameweek": 1, "score": 40},
        {"manager_id": 3, "gameweek": 1, "score": 90},
    ]
    counts = calculate_reversed_motw(gw_scores)
    assert counts == {1: 1, 2: 1}
    assert 3 not in counts


def test_reversed_motw_empty_input():
    assert calculate_reversed_motw([]) == {}


def test_calculate_bad_luck_h2h_ignores_matches_not_passed_in():
    # Simulates the caller already having filtered out unplayed (0-0) future fixtures.
    played_matches_only = [
        {"gameweek": 1, "entry_1_entry": 1, "entry_1_points": 40, "entry_2_entry": 2, "entry_2_points": 60},
        {"gameweek": 2, "entry_1_entry": 1, "entry_1_points": 30, "entry_2_entry": 2, "entry_2_points": 70},
    ]
    streaks = calculate_bad_luck_h2h(played_matches_only, manager_ids=[1, 2])
    assert streaks == {1: 2, 2: 0}


def test_reversed_motw_skips_gameweek_with_missing_manager_data():
    gw_scores = [
        {"manager_id": 1, "gameweek": 1, "score": 40},
        {"manager_id": 2, "gameweek": 1, "score": 80},
        # manager 3 is missing for gameweek 1 (e.g. a failed API fetch) -- only 2 of 3 expected managers present
        {"manager_id": 1, "gameweek": 2, "score": 50},
        {"manager_id": 2, "gameweek": 2, "score": 60},
        {"manager_id": 3, "gameweek": 2, "score": 20},
    ]
    counts = calculate_reversed_motw(gw_scores, expected_manager_count=3)
    # gameweek 1 skipped (only 2/3 managers present, count could be wrong); gameweek 2 counted normally
    assert counts == {3: 1}


def test_reversed_motw_expected_manager_count_none_disables_the_check():
    gw_scores = [
        {"manager_id": 1, "gameweek": 1, "score": 40},
        {"manager_id": 2, "gameweek": 1, "score": 80},
    ]
    counts = calculate_reversed_motw(gw_scores)  # no expected_manager_count -> old behavior
    assert counts == {1: 1}
