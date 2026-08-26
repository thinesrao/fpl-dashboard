from retry_util import retry_transient, api_error_status, TRANSIENT_API_STATUSES


class _Boom(Exception):
    pass


def _resp(status):
    class _R:
        status_code = status
    class _E(Exception):
        response = _R()
    return _E()


def test_api_error_status_reads_response_status():
    assert api_error_status(_resp(503)) == 503
    assert api_error_status(Exception("no response")) is None


def test_transient_statuses_cover_429_and_5xx():
    assert 429 in TRANSIENT_API_STATUSES
    assert 503 in TRANSIENT_API_STATUSES
    assert 400 not in TRANSIENT_API_STATUSES


def test_retries_transient_then_succeeds():
    calls = {"n": 0}

    def op():
        calls["n"] += 1
        if calls["n"] < 3:
            raise _Boom()
        return "ok"

    result = retry_transient(
        op, is_transient=lambda e: isinstance(e, _Boom),
        max_retries=5, initial_delay=0, sleep=lambda _: None,
    )
    assert result == "ok"
    assert calls["n"] == 3


def test_non_transient_raises_immediately():
    calls = {"n": 0}

    def op():
        calls["n"] += 1
        raise ValueError("nope")

    try:
        retry_transient(op, is_transient=lambda e: False, sleep=lambda _: None)
        assert False, "expected ValueError"
    except ValueError:
        pass
    assert calls["n"] == 1


def test_exhausts_retries_then_raises_last_error():
    calls = {"n": 0}

    def op():
        calls["n"] += 1
        raise RuntimeError("always")

    try:
        retry_transient(
            op, is_transient=lambda e: True,
            max_retries=3, initial_delay=0, sleep=lambda _: None,
        )
        assert False, "expected RuntimeError"
    except RuntimeError:
        pass
    assert calls["n"] == 3
