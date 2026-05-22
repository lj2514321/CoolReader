"""Proxy node connectivity and speed testing.

Provides NodeTester class that measures TCP ping latency and download
speed for a list of ProxyNode instances using concurrent workers.
"""

import logging
import socket
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List

import requests

import config
from scripts.parser import ProxyNode

logger = logging.getLogger(__name__)

# Protocols that can be used natively as an HTTP/SOCKS proxy
_NATIVE_PROXY_TYPES = {"socks5", "http"}


class NodeTester:
    """Connectivity (TCP ping) and speed testing for proxy nodes.

    All measurements are performed from **this machine** through standard
    TCP sockets and HTTP requests — no external proxy client required.
    """

    # ------------------------------------------------------------------
    # Connectivity (TCP ping)
    # ------------------------------------------------------------------

    def test_connectivity(self, node: ProxyNode) -> float:
        """Measure TCP handshake latency to ``node.server:node.port``.

        Uses :func:`socket.create_connection` with a 5-second timeout and
        records the elapsed time via :func:`time.perf_counter`.

        Args:
            node: The proxy node to test.

        Returns:
            Latency in milliseconds (rounded to 1 decimal), or ``-1.0``
            on any failure (timeout, connection refused, DNS error).
        """
        timeout = config.CONNECTIVITY_TEST_TIMEOUT
        start = time.perf_counter()
        try:
            with socket.create_connection(
                (node.server, node.port), timeout=timeout
            ):
                elapsed = (time.perf_counter() - start) * 1000  # → ms
            latency = round(elapsed, 1)
            logger.info(
                "connectivity OK  %s (%s:%d)  %.1f ms",
                node.name,
                node.server,
                node.port,
                latency,
            )
            return latency
        except Exception as exc:
            logger.warning(
                "connectivity FAIL %s (%s:%d)  %s",
                node.name,
                node.server,
                node.port,
                exc,
            )
            return -1.0

    # ------------------------------------------------------------------
    # Speed test (download)
    # ------------------------------------------------------------------

    def test_speed(self, node: ProxyNode) -> float:
        """Download a test file through *node* and measure throughput.

        The request is made via the proxy protocol supported by the node.
        For non-native protocols (ss, vmess, trojan, vless) the method
        falls back to ``socks5`` — this is a best-effort measurement and
        may not reflect true performance through the original protocol.

        Args:
            node: The proxy node to test (must have passed connectivity).

        Returns:
            Download speed in Mbps (megabits per second), or ``-1.0`` on
            any failure.
        """
        url = config.SPEED_TEST_URL
        timeout = config.SPEED_TEST_TIMEOUT
        proxies = self._get_proxy_dict(node)

        try:
            resp = requests.get(
                url, proxies=proxies, stream=True, timeout=timeout
            )
            resp.raise_for_status()

            start = time.perf_counter()
            total_bytes = 0
            for chunk in resp.iter_content(chunk_size=8192):
                if chunk:
                    total_bytes += len(chunk)

            elapsed = time.perf_counter() - start
            if elapsed <= 0:
                logger.warning(
                    "speed test %s (%s:%d)  elapsed <= 0, treating as failure",
                    node.name,
                    node.server,
                    node.port,
                )
                return -1.0

            speed_mbps = (total_bytes * 8) / 1_000_000 / elapsed
            speed = round(speed_mbps, 1)
            logger.info(
                "speed test OK  %s (%s:%d)  %.1f Mbps",
                node.name,
                node.server,
                node.port,
                speed,
            )
            return speed
        except Exception as exc:
            logger.warning(
                "speed test FAIL %s (%s:%d)  %s",
                node.name,
                node.server,
                node.port,
                exc,
            )
            return -1.0

    # ------------------------------------------------------------------
    # Concurrent batch testing
    # ------------------------------------------------------------------

    def test_all(
        self, nodes: List[ProxyNode], concurrency: int = 5
    ) -> List[ProxyNode]:
        """Run connectivity and speed tests on *nodes* concurrently.

        Workflow:

        1. **Connectivity** — all nodes are tested in parallel.
        2. **Speed** — only nodes that passed connectivity (latency != -1)
           are tested in parallel.

        Each node's ``latency_ms`` and ``speed_mbps`` attributes are
        updated in place.

        Args:
            nodes: List of proxy nodes to test.
            concurrency: Maximum number of parallel workers (default 5).

        Returns:
            The same list (mutated in place) for convenience.
        """

        # --- Phase 1: connectivity ---
        with ThreadPoolExecutor(max_workers=concurrency) as executor:
            fut_to_node = {
                executor.submit(self.test_connectivity, n): n for n in nodes
            }
            for future in as_completed(fut_to_node):
                node = fut_to_node[future]
                try:
                    node.latency_ms = future.result()
                except Exception as exc:
                    logger.error(
                        "Unexpected error in connectivity for %s: %s",
                        node.name,
                        exc,
                    )
                    node.latency_ms = -1.0

        # --- Phase 2: speed (only healthy nodes) ---
        healthy = [n for n in nodes if n.latency_ms != -1.0]
        if not healthy:
            logger.info("No healthy nodes to test speed on")
            return nodes

        with ThreadPoolExecutor(max_workers=concurrency) as executor:
            fut_to_node = {
                executor.submit(self.test_speed, n): n for n in healthy
            }
            for future in as_completed(fut_to_node):
                node = fut_to_node[future]
                try:
                    node.speed_mbps = future.result()
                except Exception as exc:
                    logger.error(
                        "Unexpected error in speed test for %s: %s",
                        node.name,
                        exc,
                    )
                    node.speed_mbps = -1.0

        return nodes

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _get_proxy_dict(node: ProxyNode) -> Dict[str, str]:
        """Build a ``requests``-compatible proxy dictionary for *node*.

        For native proxies (``socks5``, ``http``) the raw protocol is
        used.  For tunnelled protocols (``ss``, ``vmess``, ``trojan``,
        ``vless``) a ``socks5`` fallback is returned, since those
        protocols cannot be expressed as a simple HTTP/SOCKS proxy URL.

        Returns:
            A single-entry dict: ``{scheme: "scheme://server:port"}``.
        """
        scheme = node.type
        if scheme not in _NATIVE_PROXY_TYPES:
            scheme = "socks5"
        return {scheme: f"{scheme}://{node.server}:{node.port}"}
