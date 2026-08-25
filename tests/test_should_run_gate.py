import os
import subprocess
import sys

from scripts.should_run_gate import published_gw_from_dashboard, decide


def _events(spec):
    return [{"id": i, "finished": f, "data_checked": d} for (i, f, d) in spec]


def test_published_gw_reads_metadata():
    assert published_gw_from_dashboard({"generated_from_metadata": {"last_finished_gw": 3}}) == 3
    assert published_gw_from_dashboard({}) == 0


def test_decide_runs_when_new_gw_finalized():
    events = _events([(1, True, True), (2, True, True)])
    assert decide(events, {"generated_from_metadata": {"last_finished_gw": 1}}) is True


def test_decide_skips_when_nothing_new():
    events = _events([(1, True, True)])
    assert decide(events, {"generated_from_metadata": {"last_finished_gw": 1}}) is False


def test_script_runs_as_the_workflow_invokes_it():
    result = subprocess.run(
        [sys.executable, "scripts/should_run_gate.py"],
        capture_output=True, text=True,
        env={**os.environ, "DASHBOARD_URL": ""},
    )
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() in ("true", "false")
