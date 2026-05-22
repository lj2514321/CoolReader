import os
from typing import List


# --- Subscription ---
SUBSCRIPTION_URLS: List[str] = os.environ.get("SUBSCRIPTION_URLS", "").split(",")
# Filter out empty strings from a potentially empty env var
SUBSCRIPTION_URLS = [url.strip() for url in SUBSCRIPTION_URLS if url.strip()]

# --- Speed test ---
SPEED_TEST_URL: str = os.environ.get(
    "SPEED_TEST_URL",
    "https://proof.ovh.net/files/5Mb.dat",
)
SPEED_TEST_TIMEOUT: int = int(os.environ.get("SPEED_TEST_TIMEOUT", "30"))

# --- Connectivity test ---
CONNECTIVITY_TEST_HOST: str = os.environ.get("CONNECTIVITY_TEST_HOST", "google.com")
CONNECTIVITY_TEST_TIMEOUT: int = int(os.environ.get("CONNECTIVITY_TEST_TIMEOUT", "5"))

# --- Thresholds ---
SPEED_THRESHOLD_MIN: float = float(os.environ.get("SPEED_THRESHOLD_MIN", "0.5"))
MAX_LATENCY_MS: int = int(os.environ.get("MAX_LATENCY_MS", "500"))

# --- Output ---
OUTPUT_DIR: str = os.environ.get("OUTPUT_DIR", "output")

# --- SMTP notification ---
SMTP_SERVER: str = os.environ.get("SMTP_SERVER", "smtp.qq.com")
SMTP_PORT: int = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER: str = os.environ.get("SMTP_USER", "")
SMTP_PASS: str = os.environ.get("SMTP_PASS", "")
SMTP_FROM: str = os.environ.get("SMTP_FROM", "")
SMTP_TO: str = os.environ.get("SMTP_TO", "")
