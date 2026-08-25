from gw_gate import latest_finalized_gw, should_run


def _events(spec):
    # spec: list of (id, finished, data_checked)
    return [
        {"id": i, "finished": f, "data_checked": d} for (i, f, d) in spec
    ]


def test_latest_finalized_gw_picks_highest_checked():
    events = _events([(1, True, True), (2, True, True), (3, True, False)])
    assert latest_finalized_gw(events) == 2


def test_latest_finalized_gw_none_finalized():
    events = _events([(1, True, False), (2, False, False)])
    assert latest_finalized_gw(events) == 0


def test_should_run_when_new_gw_finalized():
    events = _events([(1, True, True), (2, True, True)])
    assert should_run(events, published_last_finished_gw=1, publish_pending=False) is True


def test_should_run_when_publish_pending():
    events = _events([(1, True, True)])
    assert should_run(events, published_last_finished_gw=1, publish_pending=True) is True


def test_should_not_run_when_nothing_changed():
    events = _events([(1, True, True)])
    assert should_run(events, published_last_finished_gw=1, publish_pending=False) is False
