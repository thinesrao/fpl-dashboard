"""Pure scoring functions for the 2026/27 Pep Roulette award changes.

No pandas/gspread/requests imports here on purpose: these functions take
plain dicts and lists so they can be unit tested without mocking Google
Sheets or the FPL API. data_pipeline.py owns fetching data and shaping it
into the inputs these functions expect.
"""


def calculate_dream_team_score(active_squad_ids, dream_team_players, top_performers, top_performer_points=5):
    return sum(
        top_performer_points if pid in top_performers else 1
        for pid in active_squad_ids
        if pid in dream_team_players
    )


def calculate_penalty_score(active_squad_ids, live_stats_by_id, manual_events):
    score = 0
    for pid in active_squad_ids:
        stats = live_stats_by_id.get(pid)
        if stats:
            score += stats.get("penalties_saved", 0) * 3
            score -= stats.get("penalties_missed", 0) * 2
    for event in manual_events:
        if event["player_id"] in active_squad_ids and event["event_type"] in ("Penalty Scored", "Penalty Won"):
            score += 1
    return score


def calculate_xgi_score(active_squad_ids, live_stats_by_id):
    total = 0.0
    for pid in active_squad_ids:
        stats = live_stats_by_id.get(pid)
        if stats:
            total += float(stats.get("expected_goals", 0) or 0)
            total += float(stats.get("expected_assists", 0) or 0)
    return round(total, 2)


def calculate_minutes_score(active_squad_ids, live_stats_by_id):
    return sum(live_stats_by_id.get(pid, {}).get("minutes", 0) for pid in active_squad_ids)


def calculate_half_season_totals(gw_scores, first_half_gws=range(1, 20), second_half_gws=range(20, 39)):
    first_half, second_half = {}, {}
    first_set, second_set = set(first_half_gws), set(second_half_gws)
    for record in gw_scores:
        manager_id, gw, score = record["manager_id"], record["gameweek"], record["score"]
        if gw in first_set:
            first_half[manager_id] = first_half.get(manager_id, 0) + score
        elif gw in second_set:
            second_half[manager_id] = second_half.get(manager_id, 0) + score
    return first_half, second_half


def longest_non_winning_streak(results):
    longest = current = 0
    for result in results:
        if result == "W":
            current = 0
        else:
            current += 1
            longest = max(longest, current)
    return longest


def calculate_bad_luck_h2h(h2h_matches, manager_ids):
    results_by_manager = {mid: [] for mid in manager_ids}
    for match in sorted(h2h_matches, key=lambda m: m["gameweek"]):
        for manager_id, own_pts, opp_pts in (
            (match["entry_1_entry"], match["entry_1_points"], match["entry_2_points"]),
            (match["entry_2_entry"], match["entry_2_points"], match["entry_1_points"]),
        ):
            if manager_id not in results_by_manager:
                continue
            result = "W" if own_pts > opp_pts else ("L" if own_pts < opp_pts else "D")
            results_by_manager[manager_id].append(result)
    return {mid: longest_non_winning_streak(results) for mid, results in results_by_manager.items()}


def calculate_reversed_motw(gw_scores):
    scores_by_gw = {}
    for record in gw_scores:
        scores_by_gw.setdefault(record["gameweek"], []).append((record["manager_id"], record["score"]))

    counts = {}
    for entries in scores_by_gw.values():
        if not entries:
            continue
        min_score = min(score for _, score in entries)
        for manager_id, score in entries:
            if score == min_score:
                counts[manager_id] = counts.get(manager_id, 0) + 1
    return counts
