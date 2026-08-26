"""Retry helper for transient Google Sheets API errors.

Kept dependency-light (gspread is imported lazily) so it can be unit tested
without the full pipeline dependency stack installed.
"""
import time

# 429 = rate limit; 5xx = transient Google backend errors.
TRANSIENT_API_STATUSES = (429, 500, 502, 503, 504)


def api_error_status(exc):
    """Return the HTTP status code carried by a gspread APIError, or None."""
    response = getattr(exc, "response", None)
    return getattr(response, "status_code", None)


def is_transient_gspread_error(exc) -> bool:
    """True for gspread APIErrors whose status is a retryable transient one."""
    try:
        import gspread
    except ImportError:
        return False
    return (
        isinstance(exc, gspread.exceptions.APIError)
        and api_error_status(exc) in TRANSIENT_API_STATUSES
    )


def retry_transient(operation, is_transient=is_transient_gspread_error,
                    max_retries=5, initial_delay=3, sleep=time.sleep):
    """Run `operation` (no args), retrying transient failures with backoff.

    Retries only when `is_transient(exc)` is true; re-raises any other error
    immediately, and re-raises the last error after `max_retries` attempts.
    `sleep` is injectable so tests run instantly.
    """
    for attempt in range(max_retries):
        try:
            return operation()
        except Exception as exc:
            if is_transient(exc) and attempt < max_retries - 1:
                wait = initial_delay * (2 ** attempt)
                print(f"  Transient error; retry {attempt + 1}/{max_retries} in {wait}s...")
                sleep(wait)
                continue
            raise
