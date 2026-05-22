"""Tests for scripts.fetcher — mock-based fetch and retry."""

from unittest.mock import MagicMock, patch

import pytest
import requests

from scripts.fetcher import REQUEST_TIMEOUT, USER_AGENT, SubscriptionFetcher


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_response(text: str, status_code: int = 200) -> MagicMock:
    """Build a mocked ``requests.Response`` object."""
    resp = MagicMock(spec=requests.Response)
    resp.text = text
    resp.status_code = status_code
    resp.ok = status_code < 400
    return resp


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def fetcher() -> SubscriptionFetcher:
    return SubscriptionFetcher()


# ---------------------------------------------------------------------------
# fetch — success
# ---------------------------------------------------------------------------

class TestFetchSuccess:
    """fetch returns the response text on success."""

    def test_returns_text(self, fetcher: SubscriptionFetcher) -> None:
        with patch("scripts.fetcher.requests.get") as mock_get:
            mock_get.return_value = _make_response("subscription data here")

            result = fetcher.fetch("https://example.com/sub")

            assert result == "subscription data here"
            mock_get.assert_called_once_with(
                "https://example.com/sub",
                headers={"User-Agent": USER_AGENT},
                timeout=REQUEST_TIMEOUT,
            )

    def test_sets_headers(self, fetcher: SubscriptionFetcher) -> None:
        with patch("scripts.fetcher.requests.get") as mock_get:
            mock_get.return_value = _make_response("ok")
            fetcher.fetch("https://example.com")
            _, kwargs = mock_get.call_args
            assert "User-Agent" in kwargs["headers"]
            assert kwargs["timeout"] == 30


# ---------------------------------------------------------------------------
# fetch — retry logic
# ---------------------------------------------------------------------------

class TestFetchRetry:
    """_with_retry retries on failure with exponential backoff."""

    def test_retry_on_failure_then_succeed(self, fetcher: SubscriptionFetcher) -> None:
        """Fails twice, succeeds on third attempt."""
        success_resp = _make_response("finally ok")

        with (
            patch("scripts.fetcher.requests.get") as mock_get,
            patch("scripts.fetcher.time.sleep") as mock_sleep,
        ):
            mock_get.side_effect = [
                requests.exceptions.RequestException("fail 1"),
                requests.exceptions.RequestException("fail 2"),
                success_resp,
            ]

            result = fetcher.fetch("https://example.com/sub")

            assert result == "finally ok"
            assert mock_get.call_count == 3
            # sleep called twice with exponential backoff (1s, 2s)
            assert mock_sleep.call_count == 2
            mock_sleep.assert_any_call(1.0)
            mock_sleep.assert_any_call(2.0)

    def test_all_attempts_fail(self, fetcher: SubscriptionFetcher) -> None:
        """Raises the last exception after exhausting all retries."""
        with (
            patch("scripts.fetcher.requests.get") as mock_get,
            patch("scripts.fetcher.time.sleep"),
        ):
            mock_get.side_effect = requests.exceptions.RequestException("always fail")

            with pytest.raises(requests.exceptions.RequestException, match="always fail"):
                fetcher.fetch("https://example.com/sub")

            assert mock_get.call_count == 3

    def test_first_attempt_succeeds(self, fetcher: SubscriptionFetcher) -> None:
        """No retry needed on first success."""
        with (
            patch("scripts.fetcher.requests.get") as mock_get,
            patch("scripts.fetcher.time.sleep") as mock_sleep,
        ):
            mock_get.return_value = _make_response("instant success")

            result = fetcher.fetch("https://example.com/sub")

            assert result == "instant success"
            assert mock_get.call_count == 1
            mock_sleep.assert_not_called()

    def test_http_error_triggers_retry(self, fetcher: SubscriptionFetcher) -> None:
        """Non-2xx status raises HTTPError which triggers retries."""
        with (
            patch("scripts.fetcher.requests.get") as mock_get,
            patch("scripts.fetcher.time.sleep"),
        ):
            err_resp = _make_response("not found", status_code=404)
            err_resp.raise_for_status.side_effect = requests.exceptions.HTTPError(
                "404 Client Error"
            )
            ok_resp = _make_response("found", status_code=200)

            mock_get.side_effect = [err_resp, ok_resp]

            result = fetcher.fetch("https://example.com/sub")
            assert result == "found"
            assert mock_get.call_count == 2


# ---------------------------------------------------------------------------
# fetch_all
# ---------------------------------------------------------------------------

class TestFetchAll:
    """fetch_all fetches multiple URLs concurrently."""

    def test_all_succeed(self, fetcher: SubscriptionFetcher) -> None:
        """Both URLs return content successfully."""
        with patch("scripts.fetcher.requests.get") as mock_get:
            def side_effect(url, **kwargs):
                if "url1" in url:
                    return _make_response("content-1")
                return _make_response("content-2")

            mock_get.side_effect = side_effect

            results = fetcher.fetch_all([
                "https://example.com/url1",
                "https://example.com/url2",
            ])

            assert len(results) == 2
            assert results["https://example.com/url1"] == "content-1"
            assert results["https://example.com/url2"] == "content-2"
            assert mock_get.call_count == 2

    def test_partial_failure(self, fetcher: SubscriptionFetcher) -> None:
        """One URL fails, the other succeeds — logs error and continues."""
        with (
            patch("scripts.fetcher.requests.get") as mock_get,
            patch("scripts.fetcher.time.sleep"),
            patch("scripts.fetcher.logger") as mock_logger,
        ):
            def side_effect(url, **kwargs):
                if "bad" in url:
                    raise requests.exceptions.RequestException("timeout")
                return _make_response("good content")

            mock_get.side_effect = side_effect

            results = fetcher.fetch_all([
                "https://example.com/good",
                "https://example.com/bad",
            ])

            # Only the successful URL is in results
            assert "https://example.com/good" in results
            assert results["https://example.com/good"] == "good content"
            # The failed URL is NOT in results
            assert "https://example.com/bad" not in results

            # Verify error was logged (2 calls: one from _with_retry
            # "All attempts failed", one from fetch_all "Failed to fetch")
            assert mock_logger.error.call_count >= 1
            # Check that at least one call is the fetch_all failure message
            found = any(
                "Failed to fetch" in call.args[0]
                for call in mock_logger.error.call_args_list
            )
            assert found, "Expected a 'Failed to fetch' log call"

    def test_empty_urls(self, fetcher: SubscriptionFetcher) -> None:
        """Empty URL list returns empty dict."""
        results = fetcher.fetch_all([])
        assert results == {}

    def test_single_url(self, fetcher: SubscriptionFetcher) -> None:
        """Single URL works without threading issues."""
        with patch("scripts.fetcher.requests.get") as mock_get:
            mock_get.return_value = _make_response("single result")

            results = fetcher.fetch_all(["https://example.com/only"])
            assert results == {"https://example.com/only": "single result"}
