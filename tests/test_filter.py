"""Tests for scripts.filter — dedup, filter, rank, and pipeline."""

import copy

import pytest

from scripts.filter import NodeFilter
from scripts.parser import ProxyNode


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def nf() -> NodeFilter:
    return NodeFilter()


@pytest.fixture
def sample_nodes() -> list[ProxyNode]:
    """Return 3 nodes: 2 unique (server,port) pairs, 1 duplicate of the first."""
    return [
        ProxyNode(name="A", type="ss", server="s1.com", port=443,
                  latency_ms=100.0, speed_mbps=50.0),
        ProxyNode(name="B", type="ss", server="s2.com", port=443,
                  latency_ms=200.0, speed_mbps=30.0),
        ProxyNode(name="A-dup", type="ss", server="s1.com", port=443,
                  latency_ms=100.0, speed_mbps=50.0),
    ]


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

class TestDeduplicate:
    """deduplicate by (server, port)."""

    def test_removes_duplicates(self, nf: NodeFilter, sample_nodes: list[ProxyNode]) -> None:
        result = nf.deduplicate(sample_nodes)
        assert len(result) == 2

    def test_preserves_order(self, nf: NodeFilter) -> None:
        nodes = [
            ProxyNode(name="X", type="ss", server="s1.com", port=1),
            ProxyNode(name="Y", type="ss", server="s2.com", port=2),
            ProxyNode(name="Z", type="ss", server="s1.com", port=1),  # dup of X
        ]
        result = nf.deduplicate(nodes)
        assert len(result) == 2
        assert result[0].name == "X"  # first occurrence kept
        assert result[1].name == "Y"

    def test_no_duplicates(self, nf: NodeFilter) -> None:
        nodes = [
            ProxyNode(name="A", type="ss", server="s1.com", port=1),
            ProxyNode(name="B", type="ss", server="s2.com", port=2),
        ]
        result = nf.deduplicate(nodes)
        assert result == nodes

    def test_empty_list(self, nf: NodeFilter) -> None:
        assert nf.deduplicate([]) == []


# ---------------------------------------------------------------------------
# Validity filtering
# ---------------------------------------------------------------------------

class TestFilterInvalid:
    """filter_invalid — removes nodes with latency_ms == -1."""

    def test_removes_invalid(self, nf: NodeFilter) -> None:
        nodes = [
            ProxyNode(name="good", type="ss", server="s1", port=1,
                      latency_ms=50.0),
            ProxyNode(name="bad", type="ss", server="s2", port=2,
                      latency_ms=-1.0),
            ProxyNode(name="good2", type="ss", server="s3", port=3,
                      latency_ms=100.0),
        ]
        result = nf.filter_invalid(nodes)
        assert len(result) == 2
        for node in result:
            assert node.latency_ms != -1

    def test_empty_list(self, nf: NodeFilter) -> None:
        assert nf.filter_invalid([]) == []

    def test_all_invalid(self, nf: NodeFilter) -> None:
        nodes = [
            ProxyNode(name="a", type="ss", server="s", port=1, latency_ms=-1.0),
        ]
        assert nf.filter_invalid(nodes) == []


# ---------------------------------------------------------------------------
# Latency filtering
# ---------------------------------------------------------------------------

class TestFilterByLatency:
    """filter_by_latency — keeps nodes below max_ms."""

    def test_keeps_below_threshold(self, nf: NodeFilter) -> None:
        nodes = [
            ProxyNode(name="low", type="ss", server="s1", port=1,
                      latency_ms=50.0),
            ProxyNode(name="mid", type="ss", server="s2", port=2,
                      latency_ms=200.0),
            ProxyNode(name="high", type="ss", server="s3", port=3,
                      latency_ms=600.0),
        ]
        result = nf.filter_by_latency(nodes, max_ms=300)
        assert len(result) == 2
        assert all(n.latency_ms <= 300 for n in result)

    def test_excludes_untested(self, nf: NodeFilter) -> None:
        nodes = [
            ProxyNode(name="untested", type="ss", server="s", port=1,
                      latency_ms=-1.0),
            ProxyNode(name="tested", type="ss", server="s", port=2,
                      latency_ms=100.0),
        ]
        result = nf.filter_by_latency(nodes, max_ms=500)
        assert len(result) == 1
        assert result[0].name == "tested"

    def test_empty_list(self, nf: NodeFilter) -> None:
        assert nf.filter_by_latency([]) == []

    def test_default_threshold(self, nf: NodeFilter) -> None:
        nodes = [
            ProxyNode(name="n1", type="ss", server="s1", port=1,
                      latency_ms=400.0),
            ProxyNode(name="n2", type="ss", server="s2", port=2,
                      latency_ms=600.0),
        ]
        result = nf.filter_by_latency(nodes)  # default max_ms=500
        assert len(result) == 1
        assert result[0].name == "n1"


# ---------------------------------------------------------------------------
# Speed filtering
# ---------------------------------------------------------------------------

class TestFilterBySpeed:
    """filter_by_speed — keeps nodes above min_mbps."""

    def test_keeps_above_threshold(self, nf: NodeFilter) -> None:
        nodes = [
            ProxyNode(name="fast", type="ss", server="s1", port=1,
                      speed_mbps=100.0),
            ProxyNode(name="slow", type="ss", server="s2", port=2,
                      speed_mbps=0.1),
            ProxyNode(name="medium", type="ss", server="s3", port=3,
                      speed_mbps=10.0),
        ]
        result = nf.filter_by_speed(nodes, min_mbps=1.0)
        assert len(result) == 2
        assert all(n.speed_mbps >= 1.0 for n in result)

    def test_excludes_untested(self, nf: NodeFilter) -> None:
        nodes = [
            ProxyNode(name="untested", type="ss", server="s", port=1,
                      speed_mbps=-1.0),
            ProxyNode(name="tested", type="ss", server="s", port=2,
                      speed_mbps=50.0),
        ]
        result = nf.filter_by_speed(nodes)
        assert len(result) == 1
        assert result[0].name == "tested"

    def test_empty_list(self, nf: NodeFilter) -> None:
        assert nf.filter_by_speed([]) == []

    def test_default_threshold(self, nf: NodeFilter) -> None:
        nodes = [
            ProxyNode(name="n1", type="ss", server="s1", port=1,
                      speed_mbps=2.0),
            ProxyNode(name="n2", type="ss", server="s2", port=2,
                      speed_mbps=0.1),
        ]
        result = nf.filter_by_speed(nodes)  # default min_mbps=0.5
        assert len(result) == 1
        assert result[0].name == "n1"


# ---------------------------------------------------------------------------
# Ranking
# ---------------------------------------------------------------------------

class TestRankBySpeed:
    """rank_by_speed — fastest-first by default."""

    def test_fastest_first(self, nf: NodeFilter) -> None:
        nodes = [
            ProxyNode(name="slow", type="ss", server="s1", port=1,
                      speed_mbps=1.0),
            ProxyNode(name="fast", type="ss", server="s2", port=2,
                      speed_mbps=100.0),
            ProxyNode(name="medium", type="ss", server="s3", port=3,
                      speed_mbps=10.0),
        ]
        result = nf.rank_by_speed(nodes)
        assert [n.name for n in result] == ["fast", "medium", "slow"]

    def test_ascending(self, nf: NodeFilter) -> None:
        nodes = [
            ProxyNode(name="fast", type="ss", server="s1", port=1,
                      speed_mbps=100.0),
            ProxyNode(name="slow", type="ss", server="s2", port=2,
                      speed_mbps=1.0),
        ]
        result = nf.rank_by_speed(nodes, ascending=True)
        assert [n.name for n in result] == ["slow", "fast"]

    def test_empty_list(self, nf: NodeFilter) -> None:
        assert nf.rank_by_speed([]) == []


class TestRankByLatency:
    """rank_by_latency — lowest-first by default."""

    def test_lowest_first(self, nf: NodeFilter) -> None:
        nodes = [
            ProxyNode(name="high", type="ss", server="s1", port=1,
                      latency_ms=300.0),
            ProxyNode(name="low", type="ss", server="s2", port=2,
                      latency_ms=50.0),
            ProxyNode(name="mid", type="ss", server="s3", port=3,
                      latency_ms=150.0),
        ]
        result = nf.rank_by_latency(nodes)
        assert [n.name for n in result] == ["low", "mid", "high"]

    def test_descending(self, nf: NodeFilter) -> None:
        nodes = [
            ProxyNode(name="low", type="ss", server="s1", port=1,
                      latency_ms=50.0),
            ProxyNode(name="high", type="ss", server="s2", port=2,
                      latency_ms=300.0),
        ]
        result = nf.rank_by_latency(nodes, ascending=False)
        assert [n.name for n in result] == ["high", "low"]

    def test_empty_list(self, nf: NodeFilter) -> None:
        assert nf.rank_by_latency([]) == []


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

class TestPipeline:
    """pipeline — runs the full chain of operations."""

    def test_pipeline_chain(self, nf: NodeFilter) -> None:
        """Runs all filters in order and returns ranked results."""
        nodes = [
            ProxyNode(name="dup1", type="ss", server="s1.com", port=443,
                      latency_ms=100.0, speed_mbps=50.0),
            ProxyNode(name="dup2", type="ss", server="s1.com", port=443,
                      latency_ms=100.0, speed_mbps=50.0),  # duplicate
            ProxyNode(name="slow", type="ss", server="s2.com", port=443,
                      latency_ms=50.0, speed_mbps=0.1),  # too slow
            ProxyNode(name="high-latency", type="ss", server="s3.com", port=443,
                      latency_ms=600.0, speed_mbps=50.0),  # too high latency
            ProxyNode(name="invalid", type="ss", server="s4.com", port=443,
                      latency_ms=-1.0, speed_mbps=-1.0),  # invalid
            ProxyNode(name="fast", type="ss", server="s5.com", port=443,
                      latency_ms=30.0, speed_mbps=100.0),
            ProxyNode(name="medium", type="ss", server="s6.com", port=443,
                      latency_ms=150.0, speed_mbps=20.0),
        ]
        result = nf.pipeline(nodes, max_latency=300, min_speed=1.0)
        # After dedup: 6 unique (dup2 removed)
        # After filter_invalid: 5 (invalid removed)
        # After filter_by_latency(300): 4 (high-latency removed)
        # After filter_by_speed(1.0): 3 (slow removed)
        # After rank_by_speed: fastest-first → fast, dup1, medium
        assert len(result) == 3
        assert [n.name for n in result] == ["fast", "dup1", "medium"]

    def test_pipeline_empty(self, nf: NodeFilter) -> None:
        assert nf.pipeline([]) == []

    def test_pipeline_all_filtered_out(self, nf: NodeFilter) -> None:
        nodes = [
            ProxyNode(name="bad", type="ss", server="s", port=1,
                      latency_ms=-1.0, speed_mbps=-1.0),
        ]
        assert nf.pipeline(nodes) == []


# ---------------------------------------------------------------------------
# No mutation guarantee
# ---------------------------------------------------------------------------

class TestNoMutation:
    """All filter methods must not mutate the input list."""

    def test_no_mutation_after_operations(self, nf: NodeFilter) -> None:
        original = [
            ProxyNode(name="A", type="ss", server="s1.com", port=443,
                      latency_ms=100.0, speed_mbps=50.0),
            ProxyNode(name="B", type="ss", server="s2.com", port=443,
                      latency_ms=200.0, speed_mbps=30.0),
            ProxyNode(name="C", type="ss", server="s1.com", port=443,
                      latency_ms=100.0, speed_mbps=50.0),
        ]
        original_copy = copy.deepcopy(original)

        nf.deduplicate(original)
        assert original == original_copy

        nf.filter_invalid(original)
        assert original == original_copy

        nf.filter_by_latency(original)
        assert original == original_copy

        nf.filter_by_speed(original)
        assert original == original_copy

        nf.rank_by_speed(original)
        assert original == original_copy

        nf.rank_by_latency(original)
        assert original == original_copy

        nf.pipeline(original)
        assert original == original_copy
