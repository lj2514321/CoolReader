import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List

import requests
from requests.exceptions import RequestException

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
)
REQUEST_TIMEOUT = 30


class SubscriptionFetcher:
    """Fetch proxy subscription content from URLs."""

    def _with_retry(
        self,
        url: str,
        max_retries: int = 3,
        base_delay: float = 1.0,
    ) -> str:
        """Fetch url with retry and exponential backoff."""
        last_exc: Exception | None = None
        for attempt in range(max_retries):
            try:
                resp = requests.get(
                    url,
                    headers={"User-Agent": USER_AGENT},
                    timeout=REQUEST_TIMEOUT,
                )
                resp.raise_for_status()
                return resp.text
            except RequestException as e:
                last_exc = e
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    logger.warning(
                        "Attempt %d/%d failed for %s: %s. Retrying in %.1fs...",
                        attempt + 1,
                        max_retries,
                        url,
                        e,
                        delay,
                    )
                    time.sleep(delay)
        logger.error("All %d attempts failed for %s", max_retries, url)
        raise last_exc  # type: ignore[misc]

    def fetch(self, url: str) -> str:
        """Fetch subscription content from a single URL.

        Returns raw text response.
        Raises ``requests.HTTPError`` on non-200 status.
        """
        return self._with_retry(url)

    def fetch_all(self, urls: List[str]) -> Dict[str, str]:
        """Fetch subscription content from multiple URLs concurrently.

        Returns a dict mapping each URL to its raw text content.
        """
        results: Dict[str, str] = {}
        with ThreadPoolExecutor(max_workers=len(urls) or 1) as pool:
            future_map = {
                pool.submit(self.fetch, url): url for url in urls
            }
            for future in as_completed(future_map):
                url = future_map[future]
                try:
                    results[url] = future.result()
                except Exception as e:
                    logger.error("Failed to fetch %s: %s", url, e)
        return results
