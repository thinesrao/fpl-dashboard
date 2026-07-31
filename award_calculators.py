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
