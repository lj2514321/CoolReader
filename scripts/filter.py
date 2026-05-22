"""Proxy node filtering, deduplication, and ranking utilities.

Provides NodeFilter class that chains deduplication, validity checks,
latency/speed filtering, and ranking operations on ProxyNode lists.
"""

from typing import List

from scripts.parser import ProxyNode


class NodeFilter:
    """Stateless filter for ProxyNode deduplication, filtering, and ranking.

    All methods return new lists — the input list is never mutated.
    """

    # ------------------------------------------------------------------
    # Deduplication
    # ------------------------------------------------------------------

    @staticmethod
    def deduplicate(nodes: List[ProxyNode]) -> List[ProxyNode]:
        """Remove duplicate nodes by (server, port).

        Keeps the first occurrence of each unique (server, port) pair.
        Operates in O(n) time via a set of tuples.

        Args:
            nodes: Input list of proxy nodes.

        Returns:
            New list with duplicates removed.
        """
        seen: set = set()
        result: List[ProxyNode] = []
        for node in nodes:
            key = (node.server, node.port)
            if key not in seen:
                seen.add(key)
                result.append(node)
        return result

    # ------------------------------------------------------------------
    # Validity filtering
    # ------------------------------------------------------------------

    @staticmethod
    def filter_invalid(nodes: List[ProxyNode]) -> List[ProxyNode]:
        """Remove nodes whose connectivity test failed.

        A node is considered invalid when ``latency_ms == -1``.

        Args:
            nodes: Input list of proxy nodes.

        Returns:
            New list containing only nodes with a valid latency measurement.
        """
        return [node for node in nodes if node.latency_ms != -1]

    # ------------------------------------------------------------------
    # Latency filtering
    # ------------------------------------------------------------------

    @staticmethod
    def filter_by_latency(
        nodes: List[ProxyNode], max_ms: int = 500
    ) -> List[ProxyNode]:
        """Keep nodes whose latency does not exceed *max_ms*.

        Nodes with ``latency_ms == -1`` (untested) are excluded.

        Args:
            nodes: Input list of proxy nodes.
            max_ms: Maximum acceptable latency in milliseconds (default 500).

        Returns:
            New list of nodes satisfying the latency constraint.
        """
        return [
            node
            for node in nodes
            if node.latency_ms != -1 and node.latency_ms <= max_ms
        ]

    # ------------------------------------------------------------------
    # Speed filtering
    # ------------------------------------------------------------------

    @staticmethod
    def filter_by_speed(
        nodes: List[ProxyNode], min_mbps: float = 0.5
    ) -> List[ProxyNode]:
        """Keep nodes whose speed is at least *min_mbps*.

        Nodes with ``speed_mbps == -1`` (untested) are excluded.

        Args:
            nodes: Input list of proxy nodes.
            min_mbps: Minimum acceptable speed in Mbps (default 0.5).

        Returns:
            New list of nodes satisfying the speed constraint.
        """
        return [
            node
            for node in nodes
            if node.speed_mbps != -1 and node.speed_mbps >= min_mbps
        ]

    # ------------------------------------------------------------------
    # Ranking
    # ------------------------------------------------------------------

    @staticmethod
    def rank_by_speed(
        nodes: List[ProxyNode], ascending: bool = False
    ) -> List[ProxyNode]:
        """Sort nodes by speed.

        Args:
            nodes: Input list of proxy nodes.
            ascending: If ``True`` sort slowest-first (default ``False``:
                       fastest-first).

        Returns:
            New sorted list.
        """
        return sorted(
            nodes, key=lambda n: n.speed_mbps, reverse=not ascending
        )

    @staticmethod
    def rank_by_latency(
        nodes: List[ProxyNode], ascending: bool = True
    ) -> List[ProxyNode]:
        """Sort nodes by latency.

        Args:
            nodes: Input list of proxy nodes.
            ascending: If ``True`` sort lowest-latency-first (default).

        Returns:
            New sorted list.
        """
        return sorted(
            nodes, key=lambda n: n.latency_ms, reverse=not ascending
        )

    # ------------------------------------------------------------------
    # Combined pipeline
    # ------------------------------------------------------------------

    def pipeline(
        self,
        nodes: List[ProxyNode],
        max_latency: int = 500,
        min_speed: float = 0.5,
    ) -> List[ProxyNode]:
        """Run the full filter pipeline on *nodes*.

        Chain order::

            deduplicate
            → filter_invalid
            → filter_by_latency(max_latency)
            → filter_by_speed(min_speed)
            → rank_by_speed

        Args:
            nodes: Input list of proxy nodes.
            max_latency: Maximum acceptable latency (passed to
                         ``filter_by_latency``).
            min_speed: Minimum acceptable speed (passed to
                       ``filter_by_speed``).

        Returns:
            New filtered and ranked list.
        """
        result = self.deduplicate(nodes)
        result = self.filter_invalid(result)
        result = self.filter_by_latency(result, max_ms=max_latency)
        result = self.filter_by_speed(result, min_mbps=min_speed)
        result = self.rank_by_speed(result)
        return result
