"""Decide whether the heavy pipeline should run this scheduled tick.

Prints "true" or "false" to stdout for a GitHub Actions step to capture.
Fail-open: any error prints "true" so a transient hiccup never silently
stalls updates. Manual workflow_dispatch bypasses this gate entirely.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests

from gw_gate import should_run

BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"


def published_gw_from_dashboard(dashboard: dict) -> int:
    meta = (dashboard or {}).get("generated_from_metadata", {})
    try:
        return int(meta.get("last_finished_gw", 0) or 0)
    except (TypeError, ValueError):
        return 0


def decide(events: list, dashboard: dict) -> bool:
    return should_run(events, published_gw_from_dashboard(dashboard), publish_pending=False)


def main():
    try:
        events = requests.get(BOOTSTRAP_URL, timeout=30).json().get("events", [])
        dashboard_url = os.environ.get("DASHBOARD_URL")
        dashboard = requests.get(dashboard_url, timeout=30).json() if dashboard_url else {}
        print("true" if decide(events, dashboard) else "false")
    except Exception as e:
        print("true")  # fail-open
        import sys
        print(f"gate error (running anyway): {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
