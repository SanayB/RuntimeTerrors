"""
classifier.py — M2 Risk Assessment Engine (Part A)
Pre-classification layer: determines whether a domain is approved, blocked,
or unknown, and checks whether a payload represents a genuine login event.

NOTE: No risk scoring happens here — that is handled by a separate module.
"""

from __future__ import annotations

import json
from pathlib import Path

from app.core.models import ExtensionPayload

# ---------------------------------------------------------------------------
# Resolve the data directory relative to this file so the module works
# regardless of the caller's working directory.
# ---------------------------------------------------------------------------

_DATA_DIR = Path(__file__).parent / "data"
_APPROVED_PATH = _DATA_DIR / "approved.json"
_BLOCKLIST_PATH = _DATA_DIR / "blocklist.json"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _load_domain_list(path: Path) -> list[str]:
    """
    Load a JSON file containing a list of domain strings.

    Args:
        path: Absolute path to the JSON file.

    Returns:
        A list of lower-cased domain strings.

    Raises:
        FileNotFoundError: If the JSON file does not exist at the given path.
        ValueError: If the file content is not a JSON array.
    """
    if not path.exists():
        raise FileNotFoundError(f"Domain list not found: {path}")

    with path.open(encoding="utf-8") as fh:
        data = json.load(fh)

    if not isinstance(data, list):
        raise ValueError(f"Expected a JSON array in {path}, got {type(data).__name__}")

    return [entry.strip().lower() for entry in data]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def classify(domain: str) -> str:
    """
    Classify a domain as 'approved', 'blocked', or 'unknown'.

    The function checks the approved list first, then the blocklist.
    Matching is case-insensitive and strips surrounding whitespace.

    Args:
        domain: The domain string to classify (e.g. "slack.com").

    Returns:
        One of: "approved" | "blocked" | "unknown"
    """
    normalised = domain.strip().lower()

    approved = _load_domain_list(_APPROVED_PATH)
    if normalised in approved:
        return "approved"

    blocklist = _load_domain_list(_BLOCKLIST_PATH)
    if normalised in blocklist:
        return "blocked"

    return "unknown"


def is_login_page(payload: ExtensionPayload) -> bool:
    """
    Determine whether a payload represents a genuine login event.

    Both conditions must be True:
      - site.isLoginPage  — the extension identified the page as a login page
      - site.hasPasswordField — a password input field was detected in the DOM

    A page that has a password field but is not flagged as a login page (or
    vice versa) returns False to avoid false positives for the scoring layer.

    Args:
        payload: A validated ExtensionPayload instance.

    Returns:
        True only when both flags are set; False otherwise.
    """
    return payload.site.isLoginPage and payload.site.hasPasswordField


# ---------------------------------------------------------------------------
# Sample usage — run with: python -m risk_engine.classifier
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 50)
    print("  M2 Classifier — Sample Usage")
    print("=" * 50)

    test_domains = [
        "slack.com",          # expected: approved
        "github.com",         # expected: approved
        "ngrok.io",           # expected: blocked
        "snusbase.com",       # expected: blocked
        "unknown-tool.io",    # expected: unknown
        "random-startup.com", # expected: unknown
    ]

    for d in test_domains:
        result = classify(d)
        label = {
            "approved": "[APPROVED]",
            "blocked":  "[BLOCKED] ",
            "unknown":  "[UNKNOWN] ",
        }[result]
        print(f"  classify({d!r:<30}) -> {label}")

    print("=" * 50)
