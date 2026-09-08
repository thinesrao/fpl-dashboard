import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from pipeline_meta import (
    fetch_prior_reviewed_gw,
    group_gameweeks_by_month,
    month_last_gw_map,
    resolve_penalties_reviewed_gw,
)


class FakeResp:
    def __init__(self, status=200, payload=None):
        self.status_code = status
        self._payload = payload or {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self._payload


def _getter(resp):
    return lambda url: resp


def _raising_getter(url):
    raise RuntimeError("network blip")

# Real 2026/27 shape: Aug = GW1-2, Sep = GW3-5 (GW3 deadline is Sept 4).
SAMPLE = {1: "August", 2: "August", 3: "September", 4: "September", 5: "September"}


def test_group_gameweeks_by_month_is_calendar_ordered():
    grouped = group_gameweeks_by_month(SAMPLE)
    assert list(grouped.keys()) == ["August", "September"]
    assert grouped["August"] == [1, 2]
    assert grouped["September"] == [3, 4, 5]


def test_group_handles_unsorted_input():
    grouped = group_gameweeks_by_month({3: "September", 1: "August", 2: "August"})
    assert grouped["August"] == [1, 2]
    assert grouped["September"] == [3]


def test_month_last_gw_map():
    assert month_last_gw_map(SAMPLE) == {"August": 2, "September": 5}


def test_penalties_reviewed_carries_forward_when_not_admin():
    assert resolve_penalties_reviewed_gw(prior=2, last_finished_gw=3, admin_triggered=False) == 2


def test_penalties_reviewed_advances_on_admin_publish():
    assert resolve_penalties_reviewed_gw(prior=2, last_finished_gw=3, admin_triggered=True) == 3


def test_penalties_reviewed_never_goes_backwards():
    # an admin re-publish on an older view must not lower the confirmed GW
    assert resolve_penalties_reviewed_gw(prior=5, last_finished_gw=3, admin_triggered=True) == 5


def test_penalties_reviewed_defaults_missing_prior_to_zero():
    assert resolve_penalties_reviewed_gw(prior=None, last_finished_gw=2, admin_triggered=False) == 0


PAYLOAD = {"generated_from_metadata": {"penalties_reviewed_through_gw": 5}}


def test_fetch_prior_reads_the_marker_on_success():
    resp = FakeResp(200, PAYLOAD)
    assert fetch_prior_reviewed_gw("http://x", admin_triggered=False, getter=_getter(resp)) == 5


def test_fetch_prior_returns_zero_when_field_absent():
    resp = FakeResp(200, {"generated_from_metadata": {}})
    assert fetch_prior_reviewed_gw("http://x", admin_triggered=False, getter=_getter(resp)) == 0


def test_fetch_prior_treats_404_as_first_run():
    resp = FakeResp(404)
    assert fetch_prior_reviewed_gw("http://x", admin_triggered=False, getter=_getter(resp)) == 0


def test_fetch_prior_reraises_on_read_failure_for_scheduled_run():
    # Fail-closed: a scheduled run must abort rather than reset the marker to 0.
    with pytest.raises(Exception):
        fetch_prior_reviewed_gw("http://x", admin_triggered=False, getter=_raising_getter)


def test_fetch_prior_reraises_on_5xx_for_scheduled_run():
    resp = FakeResp(503)
    with pytest.raises(Exception):
        fetch_prior_reviewed_gw("http://x", admin_triggered=False, getter=_getter(resp))


def test_fetch_prior_missing_url_aborts_scheduled_run():
    with pytest.raises(Exception):
        fetch_prior_reviewed_gw("", admin_triggered=False, getter=_raising_getter)


def test_fetch_prior_admin_tolerates_read_failure():
    # Admin publish advances the marker regardless, so a failure defaults to 0.
    assert fetch_prior_reviewed_gw("http://x", admin_triggered=True, getter=_raising_getter) == 0
    assert fetch_prior_reviewed_gw("", admin_triggered=True, getter=_raising_getter) == 0
