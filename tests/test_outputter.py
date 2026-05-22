"""Tests for scripts.outputter — JSON save, summary text, and stats."""

import json
import os
import tempfile

import pytest

from scripts.outputter import ResultOutputter
from scripts.parser import ProxyNode


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def outputter() -> ResultOutputter:
    return ResultOutputter()


@pytest.fixture
def valid_nodes() -> list[ProxyNode]:
    """Nodes with valid latency and speed measurements."""
    return [
        ProxyNode(
            name="fast-node",
            type="ss",
            server="s1.example.com",
            port=443,
            latency_ms=100.0,
            speed_mbps=200.0,
            raw_config={"method": "aes-256-gcm", "password": "supersecret"},
        ),
        ProxyNode(
            name="slow-node",
            type="trojan",
            server="s2.example.com",
            port=8443,
            latency_ms=300.0,
            speed_mbps=5.0,
            raw_config={"password": "trojanpw"},
        ),
        ProxyNode(
            name="medium-node",
            type="vmess",
            server="s3.example.com",
            port=2053,
            latency_ms=150.0,
            speed_mbps=50.0,
            raw_config={"uuid": "my-uuid"},
        ),
    ]


@pytest.fixture
def mixed_nodes() -> list[ProxyNode]:
    """Mix of valid and invalid nodes."""
    return [
        ProxyNode(
            name="valid", type="ss", server="s1.com", port=443,
            latency_ms=100.0, speed_mbps=50.0,
            raw_config={"method": "chacha20"},
        ),
        ProxyNode(
            name="invalid-latency", type="ss", server="s2.com", port=443,
            latency_ms=-1.0, speed_mbps=50.0,
        ),
        ProxyNode(
            name="invalid-speed", type="ss", server="s3.com", port=443,
            latency_ms=100.0, speed_mbps=-1.0,
        ),
        ProxyNode(
            name="invalid-both", type="ss", server="s4.com", port=443,
            latency_ms=-1.0, speed_mbps=-1.0,
        ),
    ]


# ---------------------------------------------------------------------------
# save_json
# ---------------------------------------------------------------------------

class TestSaveJson:
    """save_json — file creation, structure, and content."""

    def test_creates_file(self, outputter: ResultOutputter, valid_nodes: list[ProxyNode]) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "output.json")
            result_path = outputter.save_json(valid_nodes, filepath)
            assert result_path == filepath
            assert os.path.isfile(filepath)

    def test_structure(self, outputter: ResultOutputter, valid_nodes: list[ProxyNode]) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "output.json")
            outputter.save_json(valid_nodes, filepath)
            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)
            assert "generated_at" in data
            assert "total_nodes" in data
            assert "valid_nodes" in data
            assert "top_nodes" in data
            assert "summary" in data
            assert isinstance(data["summary"], dict)

    def test_no_raw_config_in_top_nodes(self, outputter: ResultOutputter, valid_nodes: list[ProxyNode]) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "output.json")
            outputter.save_json(valid_nodes, filepath)
            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)
            for node in data["top_nodes"]:
                assert "raw_config" not in node, (
                    f"raw_config should not be in output: {node}"
                )

    def test_no_passwords_leaked(self, outputter: ResultOutputter, valid_nodes: list[ProxyNode]) -> None:
        """Password values must NOT appear anywhere in the JSON."""
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "output.json")
            outputter.save_json(valid_nodes, filepath)
            with open(filepath, encoding="utf-8") as f:
                content = f.read()
            assert "supersecret" not in content
            assert "trojanpw" not in content

    def test_counters(self, outputter: ResultOutputter, mixed_nodes: list[ProxyNode]) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "output.json")
            outputter.save_json(mixed_nodes, filepath)
            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)
            assert data["total_nodes"] == 4
            assert data["valid_nodes"] == 1  # only "valid" has both != -1

    def test_empty_nodes(self, outputter: ResultOutputter) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "empty.json")
            outputter.save_json([], filepath)
            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)
            assert data["total_nodes"] == 0
            assert data["valid_nodes"] == 0
            assert data["top_nodes"] == []

    def test_timestamp_override(self, outputter: ResultOutputter, valid_nodes: list[ProxyNode]) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "output.json")
            outputter.save_json(valid_nodes, filepath, timestamp="2025-01-01T00:00:00")
            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)
            assert data["generated_at"] == "2025-01-01T00:00:00"

    def test_top_nodes_limit(self, outputter: ResultOutputter) -> None:
        """Only top 10 valid nodes by speed are included."""
        nodes = [
            ProxyNode(
                name=f"node-{i}",
                type="ss",
                server=f"s{i}.com",
                port=80,
                latency_ms=float(i),
                speed_mbps=float(i * 10),
            )
            for i in range(20)
        ]
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "output.json")
            outputter.save_json(nodes, filepath)
            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)
            assert len(data["top_nodes"]) == 10

    def test_directory_created(self, outputter: ResultOutputter, valid_nodes: list[ProxyNode]) -> None:
        """Parent directory is created automatically."""
        with tempfile.TemporaryDirectory() as tmpdir:
            nested_dir = os.path.join(tmpdir, "sub", "nested")
            filepath = os.path.join(nested_dir, "out.json")
            outputter.save_json(valid_nodes, filepath)
            assert os.path.isfile(filepath)
            assert os.path.isdir(nested_dir)


# ---------------------------------------------------------------------------
# save_summary_text
# ---------------------------------------------------------------------------

class TestSaveSummaryText:
    """save_summary_text — human-readable string."""

    def test_contains_expected_stats(self, outputter: ResultOutputter, valid_nodes: list[ProxyNode]) -> None:
        text = outputter.save_summary_text(valid_nodes)
        assert "Total nodes: 3" in text
        assert "Valid nodes: 3" in text
        assert "Average latency:" in text
        assert "Average speed:" in text
        assert "Fastest node:" in text
        assert "Lowest latency node:" in text
        assert "fast-node" in text  # fastest (200 Mbps)
        assert "fast-node" in text  # lowest latency (100 ms) — same name

    def test_empty_nodes(self, outputter: ResultOutputter) -> None:
        text = outputter.save_summary_text([])
        assert "Total nodes: 0" in text
        assert "Valid nodes: 0" in text

    def test_mixed_nodes(self, outputter: ResultOutputter, mixed_nodes: list[ProxyNode]) -> None:
        text = outputter.save_summary_text(mixed_nodes)
        assert "Total nodes: 4" in text
        assert "Valid nodes: 1" in text
        assert "valid" in text


# ---------------------------------------------------------------------------
# _generate_stats
# ---------------------------------------------------------------------------

class TestGenerateStats:
    """_generate_stats — internal stats computation."""

    def test_stats_values(self, outputter: ResultOutputter) -> None:
        nodes = [
            ProxyNode(name="n1", type="ss", server="s1", port=1,
                      latency_ms=100.0, speed_mbps=200.0),
            ProxyNode(name="n2", type="ss", server="s2", port=2,
                      latency_ms=300.0, speed_mbps=50.0),
        ]
        stats = outputter._generate_stats(nodes)
        assert stats["avg_latency"] == 200.0  # (100 + 300) / 2
        assert stats["avg_speed"] == 125.0  # (200 + 50) / 2
        assert stats["fastest_node"] == "n1"
        assert stats["lowest_latency_node"] == "n1"

    def test_empty_list(self, outputter: ResultOutputter) -> None:
        stats = outputter._generate_stats([])
        assert stats["avg_latency"] == -1.0
        assert stats["avg_speed"] == -1.0
        assert stats["fastest_node"] == ""
        assert stats["lowest_latency_node"] == ""

    def test_single_node(self, outputter: ResultOutputter) -> None:
        nodes = [
            ProxyNode(name="only", type="ss", server="s", port=1,
                      latency_ms=50.0, speed_mbps=10.0),
        ]
        stats = outputter._generate_stats(nodes)
        assert stats["avg_latency"] == 50.0
        assert stats["avg_speed"] == 10.0
        assert stats["fastest_node"] == "only"
        assert stats["lowest_latency_node"] == "only"
