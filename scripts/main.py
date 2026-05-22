"""Orchestration entry point for the auto node script pipeline.

Chains fetch -> parse -> dedup/filter -> test -> save -> email.
"""

import argparse
import logging
from datetime import datetime
from typing import List

from scripts.utils import setup_logger, Config, Timer, ensure_dir
from scripts.fetcher import SubscriptionFetcher
from scripts.parser import SubscriptionParser, ProxyNode
from scripts.filter import NodeFilter
from scripts.tester import NodeTester
from scripts.outputter import ResultOutputter
from scripts.mailer import Mailer

logger = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Proxy node auto subscription fetcher and tester.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Skip actual speed testing (fetch + parse + filter only).",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug-level logging.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    level = logging.DEBUG if args.verbose else logging.INFO
    setup_logger(__name__, level=level)
    cfg = Config()

    logger.info("Starting auto node script")
    logger.info("Dry-run mode: %s", args.dry_run)

    timer = Timer()
    with timer:
        all_nodes: List[ProxyNode] = []

        # ------------------------------------------------------------------
        # Step 1 — Fetch
        # ------------------------------------------------------------------
        try:
            fetcher = SubscriptionFetcher()
            raw_contents = fetcher.fetch_all(cfg.subscription_urls())
            logger.info("Fetched %d subscription URLs", len(raw_contents))
        except Exception as exc:
            logger.error("Fetch step failed: %s", exc)
            raw_contents = {}

        # ------------------------------------------------------------------
        # Step 2 — Parse (Clash YAML, fallback to Base64)
        # ------------------------------------------------------------------
        if raw_contents:
            try:
                parser = SubscriptionParser()
                for url, content in raw_contents.items():
                    nodes = parser.parse_clash_yaml(content)
                    if not nodes:
                        nodes = parser.parse_base64(content) or []
                    logger.info("Parsed %d nodes from %s", len(nodes), url)
                    all_nodes.extend(nodes)
            except Exception as exc:
                logger.error("Parse step failed: %s", exc)

        logger.info("Total parsed nodes before filter: %d", len(all_nodes))

        # ------------------------------------------------------------------
        # Step 3 — Filter (first pass: dedup + invalid + latency + speed)
        # ------------------------------------------------------------------
        try:
            node_filter = NodeFilter()
            all_nodes = node_filter.pipeline(all_nodes)
            logger.info("Nodes after first filter pass: %d", len(all_nodes))
        except Exception as exc:
            logger.error("First filter step failed: %s", exc)

        # ------------------------------------------------------------------
        # Step 4 — Guard: no nodes left after filtering
        # ------------------------------------------------------------------
        if not all_nodes:
            logger.warning(
                "No nodes remaining after filtering. Skipping test/save/email."
            )
            logger.info("Done (no nodes). Elapsed: %.2fs", timer.elapsed)
            return

        # ------------------------------------------------------------------
        # Step 5 — Speed test (skipped in dry-run mode)
        # ------------------------------------------------------------------
        if args.dry_run:
            logger.info("Dry-run mode -- skipping speed testing")
        else:
            try:
                tester = NodeTester()
                all_nodes = tester.test_all(all_nodes)
                logger.info("Testing complete")
            except Exception as exc:
                logger.error("Test step failed: %s", exc)

        # ------------------------------------------------------------------
        # Step 6 — Re-filter after testing (with fresh config thresholds)
        # ------------------------------------------------------------------
        try:
            node_filter = NodeFilter()
            all_nodes = node_filter.pipeline(
                all_nodes,
                max_latency=cfg.MAX_LATENCY_MS,
                min_speed=cfg.SPEED_THRESHOLD_MIN,
            )
            logger.info("Nodes after second filter pass: %d", len(all_nodes))
        except Exception as exc:
            logger.error("Second filter step failed: %s", exc)

        # ------------------------------------------------------------------
        # Step 7 — Save results (main + timestamped backup)
        # ------------------------------------------------------------------
        if all_nodes:
            try:
                out = ResultOutputter()
                ensure_dir(cfg.OUTPUT_DIR)
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")

                main_path = f"{cfg.OUTPUT_DIR}/results.json"
                out.save_json(all_nodes, main_path)

                backup_path = f"{cfg.OUTPUT_DIR}/results_{ts}.json"
                out.save_json(all_nodes, backup_path)

                logger.info("Results saved to %s and %s", main_path, backup_path)
            except Exception as exc:
                logger.error("Save step failed: %s", exc)

        # ------------------------------------------------------------------
        # Step 8 — Send email notification
        # ------------------------------------------------------------------
        try:
            mailer = Mailer(cfg)
            if mailer.config.smtp_configured():
                html = mailer.generate_html_report(all_nodes)
                valid_count = sum(1 for n in all_nodes if n.latency_ms != -1.0)
                subject = f"Proxy Node Report -- {valid_count} valid nodes"
                mailer.send_email(subject, html)
        except Exception as exc:
            logger.error("Email step failed: %s", exc)

    # ------------------------------------------------------------------
    # Done — log elapsed time and stats
    # ------------------------------------------------------------------
    total = len(all_nodes)
    valid = sum(
        1 for n in all_nodes if n.latency_ms != -1.0 and n.speed_mbps != -1.0
    )
    logger.info(
        "Done. Elapsed: %.2fs | Total nodes: %d | Valid: %d",
        timer.elapsed,
        total,
        valid,
    )


if __name__ == "__main__":
    main()
