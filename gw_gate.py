"""Pure decision helpers for the watch-and-gate scheduler.

The Vercel Cron watcher (Plan 3) calls an endpoint that uses this logic to
decide whether to dispatch the heavy pipeline. Kept dependency-free so it is
unit-testable and reusable server-side.
"""


def latest_finalized_gw(events: list) -> int:
    finalized = [
        e["id"] for e in events
        if e.get("finished") and e.get("data_checked")
    ]
    return max(finalized) if finalized else 0


def should_run(
    events: list,
    published_last_finished_gw: int,
    publish_pending: bool,
) -> bool:
    if publish_pending:
        return True
    return latest_finalized_gw(events) > published_last_finished_gw
