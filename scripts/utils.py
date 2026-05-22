"""Utility functions: logger setup, timer, directory helper, and config access."""

import logging
import os
import time
from typing import List

import config


def setup_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """Return a logger configured with a standard format and stream handler.

    Format: ``[YYYY-MM-DD HH:MM:SS] LEVEL name: message``
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


class Timer:
    """Context manager that measures elapsed time in seconds."""

    def __init__(self) -> None:
        self._start: float = 0.0
        self._end: float = 0.0

    def __enter__(self) -> "Timer":
        self._start = time.perf_counter()
        return self

    def __exit__(self, *exc: object) -> None:
        self._end = time.perf_counter()

    @property
    def elapsed(self) -> float:
        """Return elapsed seconds between enter and exit."""
        if self._end == 0.0:
            return time.perf_counter() - self._start
        return self._end - self._start


def ensure_dir(path: str) -> str:
    """Create *path* as a directory if it does not already exist.

    Returns the *path* string for convenience (chainable).
    """
    os.makedirs(path, exist_ok=True)
    return path


class Config:
    """Read-only access to configuration values defined in ``config``.

    Attributes mirror the module-level constants from :mod:`config`.
    """

    # --- Subscription ---
    SUBSCRIPTION_URLS: List[str] = config.SUBSCRIPTION_URLS

    # --- Speed test ---
    SPEED_TEST_URL: str = config.SPEED_TEST_URL
    SPEED_TEST_TIMEOUT: int = config.SPEED_TEST_TIMEOUT

    # --- Connectivity test ---
    CONNECTIVITY_TEST_HOST: str = config.CONNECTIVITY_TEST_HOST
    CONNECTIVITY_TEST_TIMEOUT: int = config.CONNECTIVITY_TEST_TIMEOUT

    # --- Thresholds ---
    SPEED_THRESHOLD_MIN: float = config.SPEED_THRESHOLD_MIN
    MAX_LATENCY_MS: int = config.MAX_LATENCY_MS

    # --- Output ---
    OUTPUT_DIR: str = config.OUTPUT_DIR

    # --- SMTP notification ---
    SMTP_SERVER: str = config.SMTP_SERVER
    SMTP_PORT: int = config.SMTP_PORT
    SMTP_USER: str = config.SMTP_USER
    SMTP_PASS: str = config.SMTP_PASS
    SMTP_FROM: str = config.SMTP_FROM
    SMTP_TO: str = config.SMTP_TO

    def smtp_configured(self) -> bool:
        """Return True when both SMTP_USER and SMTP_PASS are non-empty."""
        return bool(self.SMTP_USER and self.SMTP_PASS)

    def subscription_urls(self) -> List[str]:
        """Return the list of subscription URLs."""
        return config.SUBSCRIPTION_URLS
