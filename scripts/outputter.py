"""Output module for saving proxy node results and generating summaries.

Provides ResultOutputter class for structured JSON output and
human-readable plain text summaries of proxy node results.
"""

import json
import logging
import os
from dataclasses import asdict
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional

from scripts.filter import NodeFilter
from scripts.parser import ProxyNode
from scripts.utils import ensure_dir

logger = logging.getLogger(__name__)

# China timezone (UTC+8)
_CST = timezone(timedelta(hours=8))


class ResultOutputter:
    """Handles serialization and summary of proxy node results."""

    def save_json(
        self,
        nodes: List[ProxyNode],
        filepath: str,
        timestamp: Optional[str] = None,
    ) -> str:
        """Save proxy node results as a structured JSON file.

        Args:
            nodes: List of proxy nodes to process.
            filepath: Destination file path (parent dir will be created).
            timestamp: ISO 8601 timestamp string. Auto-generated if omitted.

        Returns:
            The filepath that was written to.
        """
        # Ensure output directory exists
        parent = os.path.dirname(filepath)
        if parent:
            ensure_dir(parent)

        # Generate timestamp if not provided
        if timestamp is None:
            timestamp = datetime.now(_CST).isoformat()

        # Identify valid nodes
        valid_nodes = [
            n for n in nodes if n.latency_ms != -1 and n.speed_mbps != -1
        ]

        # Rank valid nodes by speed and take top 10
        top_raw = NodeFilter.rank_by_speed(valid_nodes)[:10]

        # Convert top nodes to dict, excluding raw_config
        top_nodes = []
        for node in top_raw:
            d = asdict(node)
            d.pop("raw_config", None)
            top_nodes.append(d)

        # Compute summary stats
        summary = self._generate_stats(valid_nodes)

        payload = {
            "generated_at": timestamp,
            "total_nodes": len(nodes),
            "valid_nodes": len(valid_nodes),
            "top_nodes": top_nodes,
            "summary": summary,
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)

        logger.info(
            "Saved JSON output to %s (%d nodes, %d valid)",
            filepath,
            len(nodes),
            len(valid_nodes),
        )
        return filepath

    def save_summary_text(self, nodes: List[ProxyNode]) -> str:
        """Generate a human-readable plain text summary.

        Args:
            nodes: List of proxy nodes.

        Returns:
            Multi-line summary string.
        """
        valid_nodes = [
            n for n in nodes if n.latency_ms != -1 and n.speed_mbps != -1
        ]
        stats = self._generate_stats(valid_nodes)

        lines = [
            f"Total nodes: {len(nodes)}",
            f"Valid nodes: {len(valid_nodes)}",
            f"Average latency: {stats['avg_latency']:.1f} ms"
            if stats["avg_latency"] >= 0
            else "Average latency: N/A",
            f"Average speed: {stats['avg_speed']:.1f} Mbps"
            if stats["avg_speed"] >= 0
            else "Average speed: N/A",
            f"Fastest node: {stats['fastest_node']}" if stats["fastest_node"] else "",
            f"Lowest latency node: {stats['lowest_latency_node']}" if stats["lowest_latency_node"] else "",
        ]
        return "\n".join(line for line in lines if line)

    def _generate_stats(self, nodes: List[ProxyNode]) -> Dict[str, object]:
        """Compute summary statistics from a list of valid proxy nodes.

        Args:
            nodes: List of valid proxy nodes (latency_ms != -1 and
                   speed_mbps != -1).

        Returns:
            Dict with keys: ``avg_latency``, ``avg_speed``,
            ``fastest_node``, ``lowest_latency_node``.
        """
        if not nodes:
            return {
                "avg_latency": -1.0,
                "avg_speed": -1.0,
                "fastest_node": "",
                "lowest_latency_node": "",
            }

        latencies = [n.latency_ms for n in nodes if n.latency_ms != -1]
        speeds = [n.speed_mbps for n in nodes if n.speed_mbps != -1]

        avg_latency = sum(latencies) / len(latencies) if latencies else -1.0
        avg_speed = sum(speeds) / len(speeds) if speeds else -1.0

        fastest_node = max(nodes, key=lambda n: n.speed_mbps).name if nodes else ""
        lowest_latency_node = (
            min(nodes, key=lambda n: n.latency_ms).name if nodes else ""
        )

        return {
            "avg_latency": avg_latency,
            "avg_speed": avg_speed,
            "fastest_node": fastest_node,
            "lowest_latency_node": lowest_latency_node,
        }
