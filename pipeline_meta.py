"""Pure helpers for pipeline metadata, kept dependency-free and unit-testable.

- Month boundaries are derived from the live FPL gameweek->month map (deadline
  based), so postponed fixtures that shift deadlines never desync the month
  ranges. This is the single source of truth shared by the Classic and H2H
  monthly tables.
- The "penalties reviewed through GW N" marker is carried forward across runs
  and only advanced when the admin explicitly publishes.
"""


def group_gameweeks_by_month(gw_month_map):
    """Group gameweek ids by their deadline month, in calendar order.

    `gw_month_map` is {gw_id: month_name}. Returns {month_name: [gw_id, ...]}
    with gameweeks ascending and months in the order they first occur.
    """
    grouped = {}
    for gw_id in sorted(gw_month_map):
        grouped.setdefault(gw_month_map[gw_id], []).append(gw_id)
    return grouped


def month_last_gw_map(gw_month_map):
    """{month_name: last (highest) gameweek id of that month}."""
    return {month: max(gws) for month, gws in group_gameweeks_by_month(gw_month_map).items()}


def fetch_prior_reviewed_gw(dashboard_url, admin_triggered, getter):
    """Read `penalties_reviewed_through_gw` from the previously published
    dashboard.json, fail-closed on scheduled runs.

    The marker is persisted only in the published dashboard.json, so a bad read
    on a non-admin (scheduled) run must NOT silently reset it — that would
    republish 0 and flip finalized weeks back to "provisional" until an admin
    re-publishes. So on a non-admin run any read failure (or a missing
    DASHBOARD_URL) re-raises and lets the run abort, keeping the last-good
    publish live. A 404 means the blob isn't published yet (genuine first run)
    -> 0. An admin publish tolerates a missing prior because it advances the
    marker regardless. `getter(url)` returns a requests-style response.
    """
    if not dashboard_url:
        if admin_triggered:
            return 0
        raise RuntimeError(
            "DASHBOARD_URL is required on scheduled runs to preserve the penalty-review marker"
        )
    try:
        resp = getter(dashboard_url)
        if getattr(resp, "status_code", 200) == 404:
            return 0  # blob not published yet (first run)
        resp.raise_for_status()
        meta = resp.json().get("generated_from_metadata", {}) or {}
        return int(meta.get("penalties_reviewed_through_gw", 0) or 0)
    except Exception:
        if admin_triggered:
            return 0
        raise


def resolve_penalties_reviewed_gw(prior, last_finished_gw, admin_triggered):
    """The gameweek through which manual penalties are confirmed.

    Carried forward from the previous publish (`prior`); advanced to the current
    `last_finished_gw` only when the run was triggered by the admin's Publish
    (`admin_triggered`). Never moves backwards.
    """
    prior = int(prior or 0)
    if admin_triggered:
        return max(prior, int(last_finished_gw))
    return prior
