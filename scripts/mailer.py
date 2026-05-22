"""Mailer module for sending HTML proxy node test reports via QQ SMTP.

Provides the :class:`Mailer` class which generates HTML reports from
:class:`~scripts.parser.ProxyNode` lists and sends them over QQ SMTP
with SSL (default port 465).
"""

import logging
import os
import re
import smtplib
from datetime import datetime
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional

from scripts.parser import ProxyNode
from scripts.utils import Config

logger = logging.getLogger(__name__)


class Mailer:
    """Send proxy node test reports via QQ SMTP with HTML formatting.

    Args:
        config: A :class:`~scripts.utils.Config` instance.  If ``None``
            a fresh one will be created from environment variables.
    """

    def __init__(self, config: Optional[Config] = None) -> None:
        self.config = config or Config()

        if self.config.smtp_configured():
            logger.info(
                "SMTP configured — %s@%s:%d",
                self.config.SMTP_USER,
                self.config.SMTP_SERVER,
                self.config.SMTP_PORT,
            )
        else:
            logger.warning("SMTP not configured — email sending disabled")

    # ------------------------------------------------------------------
    # HTML report generation
    # ------------------------------------------------------------------

    def generate_html_report(self, nodes: List[ProxyNode]) -> str:
        """Generate an HTML report with summary stats and a top‑20 speed table.

        Args:
            nodes: Full list of proxy nodes (may include invalid/untested).

        Returns:
            Complete HTML document as a string with inline CSS.
        """
        # --- Summary stats ---
        valid = [n for n in nodes if n.latency_ms != -1.0]
        total_count = len(nodes)
        valid_count = len(valid)
        avg_latency = (
            sum(n.latency_ms for n in valid) / valid_count if valid_count else 0.0
        )
        avg_speed = (
            sum(n.speed_mbps for n in valid) / valid_count if valid_count else 0.0
        )

        # Top 20 by speed (descending)
        top20 = sorted(valid, key=lambda n: n.speed_mbps, reverse=True)[:20]

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # --- Build table rows ---
        table_rows = ""
        for i, node in enumerate(top20, 1):
            lat = node.latency_ms
            if lat < 100.0:
                lat_class = "lat-green"
            elif lat < 300.0:
                lat_class = "lat-orange"
            else:
                lat_class = "lat-red"

            speed_str = f"{node.speed_mbps:.2f}" if node.speed_mbps >= 0.0 else "N/A"
            lat_str = f"{lat:.0f}" if lat >= 0.0 else "N/A"

            table_rows += f"""\
            <tr>
                <td>{i}</td>
                <td>{self._escape_html(node.name)}</td>
                <td>{node.type}</td>
                <td>{node.server}</td>
                <td>{node.port}</td>
                <td class="{lat_class}">{lat_str}</td>
                <td>{speed_str}</td>
            </tr>
"""

        html = f"""\
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body {{
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 20px;
        background: #f5f5f5;
        color: #333;
    }}
    .container {{
        max-width: 900px;
        margin: 0 auto;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        padding: 24px;
    }}
    h1 {{
        color: #2c3e50;
        border-bottom: 2px solid #3498db;
        padding-bottom: 10px;
    }}
    .summary {{
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        margin: 16px 0;
    }}
    .summary-item {{
        background: #f8f9fa;
        border-radius: 6px;
        padding: 12px 18px;
        flex: 1;
        min-width: 120px;
        text-align: center;
    }}
    .summary-item .label {{
        font-size: 12px;
        color: #7f8c8d;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }}
    .summary-item .value {{
        font-size: 24px;
        font-weight: 700;
        color: #2c3e50;
        margin-top: 4px;
    }}
    table {{
        width: 100%;
        border-collapse: collapse;
        margin-top: 16px;
    }}
    th {{
        background: #3498db;
        color: #fff;
        padding: 10px 12px;
        text-align: left;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }}
    td {{
        padding: 8px 12px;
        border-bottom: 1px solid #eee;
        font-size: 14px;
    }}
    tr:hover td {{
        background: #f0f7ff;
    }}
    .lat-green {{ color: #27ae60; font-weight: 600; }}
    .lat-orange {{ color: #f39c12; font-weight: 600; }}
    .lat-red {{ color: #e74c3c; font-weight: 600; }}
    .footer {{
        margin-top: 20px;
        font-size: 12px;
        color: #95a5a6;
        text-align: center;
        border-top: 1px solid #eee;
        padding-top: 12px;
    }}
</style>
</head>
<body>
<div class="container">
    <h1>Proxy Node Report</h1>
    <p style="color:#7f8c8d;">Generated at {now}</p>

    <div class="summary">
        <div class="summary-item">
            <div class="label">Total Nodes</div>
            <div class="value">{total_count}</div>
        </div>
        <div class="summary-item">
            <div class="label">Valid Nodes</div>
            <div class="value">{valid_count}</div>
        </div>
        <div class="summary-item">
            <div class="label">Avg Latency</div>
            <div class="value">{avg_latency:.0f} ms</div>
        </div>
        <div class="summary-item">
            <div class="label">Avg Speed</div>
            <div class="value">{avg_speed:.2f} Mbps</div>
        </div>
    </div>

    <h2>Top 20 Nodes by Speed</h2>
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Name</th>
                <th>Type</th>
                <th>Server</th>
                <th>Port</th>
                <th>Latency (ms)</th>
                <th>Speed (Mbps)</th>
            </tr>
        </thead>
        <tbody>
{table_rows}
        </tbody>
    </table>

    <div class="footer">
        CoolReader Proxy Report &mdash; Generated automatically
    </div>
</div>
</body>
</html>
"""
        return html

    # ------------------------------------------------------------------
    # Plain text alternative
    # ------------------------------------------------------------------

    def generate_text_alternative(self, nodes: List[ProxyNode]) -> str:
        """Generate a plain‑text version of the report for email fallback.

        Args:
            nodes: Full list of proxy nodes.

        Returns:
            Plain text report string.
        """
        valid = [n for n in nodes if n.latency_ms != -1.0]
        total_count = len(nodes)
        valid_count = len(valid)
        avg_latency = (
            sum(n.latency_ms for n in valid) / valid_count if valid_count else 0.0
        )
        avg_speed = (
            sum(n.speed_mbps for n in valid) / valid_count if valid_count else 0.0
        )

        top20 = sorted(valid, key=lambda n: n.speed_mbps, reverse=True)[:20]

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        lines = [
            "Proxy Node Report",
            "=" * 60,
            f"Generated at: {now}",
            "",
            f"Total nodes: {total_count}",
            f"Valid nodes: {valid_count}",
            f"Average latency: {avg_latency:.0f} ms",
            f"Average speed: {avg_speed:.2f} Mbps",
            "",
            "Top 20 Nodes by Speed",
            "-" * 80,
            f"{'#':<4} {'Name':<20} {'Type':<8} {'Server':<18} {'Port':<6} {'Latency(ms)':<14} {'Speed(Mbps)':<10}",
            "-" * 80,
        ]

        for i, node in enumerate(top20, 1):
            lat = f"{node.latency_ms:.0f}" if node.latency_ms >= 0.0 else "N/A"
            speed = f"{node.speed_mbps:.2f}" if node.speed_mbps >= 0.0 else "N/A"
            lines.append(
                f"{i:<4} {node.name[:20]:<20} {node.type:<8} {node.server[:18]:<18} "
                f"{node.port:<6} {lat:<14} {speed:<10}"
            )

        lines.extend(
            [
                "",
                "-" * 80,
                "CoolReader Proxy Report — Generated automatically",
            ]
        )

        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Email sending
    # ------------------------------------------------------------------

    def send_email(
        self,
        subject: str,
        html_body: str,
        attachments: Optional[List[str]] = None,
    ) -> bool:
        """Send an HTML email via QQ SMTP (SSL, port 465).

        Args:
            subject: Email subject line.
            html_body: HTML string for the email body (main content).
            attachments: Optional list of file paths to attach.

        Returns:
            ``True`` on success.  ``False`` if SMTP is not configured or
            if any error occurs during sending (logged but not raised).
        """
        if not self.config.smtp_configured():
            logger.warning("SMTP not configured — cannot send email")
            return False

        cfg = self.config

        try:
            # --- Build the multipart/alternative part (HTML + plain text) ---
            alt = MIMEMultipart("alternative")
            alt["Subject"] = subject
            alt["From"] = cfg.SMTP_FROM or cfg.SMTP_USER
            alt["To"] = cfg.SMTP_TO

            # Plain text fallback (stripped from HTML)
            text_fallback = self._strip_html(html_body) or (
                "This email requires an HTML-compatible client."
            )
            alt.attach(MIMEText(text_fallback, "plain", "utf-8"))
            alt.attach(MIMEText(html_body, "html", "utf-8"))

            # --- If there are attachments, wrap in multipart/mixed ---
            if attachments:
                msg: MIMEMultipart = MIMEMultipart("mixed")
                msg["Subject"] = subject
                msg["From"] = cfg.SMTP_FROM or cfg.SMTP_USER
                msg["To"] = cfg.SMTP_TO
                msg.attach(alt)

                for filepath in attachments:
                    if not os.path.isfile(filepath):
                        logger.warning("Attachment not found: %s", filepath)
                        continue
                    with open(filepath, "rb") as f:
                        part = MIMEApplication(
                            f.read(), Name=os.path.basename(filepath)
                        )
                    part["Content-Disposition"] = (
                        f'attachment; filename="{os.path.basename(filepath)}"'
                    )
                    msg.attach(part)
            else:
                msg = alt

            # --- Connect via SSL and send ---
            logger.info("Connecting to SMTP %s:%d", cfg.SMTP_SERVER, cfg.SMTP_PORT)
            with smtplib.SMTP_SSL(
                cfg.SMTP_SERVER, cfg.SMTP_PORT, timeout=30
            ) as server:
                server.login(cfg.SMTP_USER, cfg.SMTP_PASS)
                server.send_message(msg)

            logger.info("Email sent successfully to %s", cfg.SMTP_TO)
            return True

        except Exception as exc:
            logger.error("Failed to send email: %s", exc)
            return False

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _escape_html(text: str) -> str:
        """Escape HTML special characters in *text*."""
        return (
            text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&#x27;")
        )

    @staticmethod
    def _strip_html(html: str) -> str:
        """Strip HTML tags for a plain‑text fallback."""
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text).strip()
        return text
