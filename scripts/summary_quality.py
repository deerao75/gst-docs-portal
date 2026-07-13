"""Detect generic or ingest-style summaries that should be regenerated."""
from __future__ import annotations

import re

GENERIC_PATTERNS = [
    r"under Central Tax notifies",
    r"under Integrated Tax notifies",
    r"under Union Territory Tax notifies",
    r"notifies regulatory changes under",
    r"Compliance teams should",
    r"read the full notification",
    r"read the full circular",
    r"read the full order",
    r"communicate to clients",
    r"identify affected registrations",
    r"update checklists",
    r"the compliance impact centres",
    r"Geographic scope:",
    r"could not be fully auto-summarized",
    r"has little extractable text",
    r"stay updated",
    r"ensure compliance",
    r"avoid penalties",
    r"practitioners should",
    r"taxpayers should ensure",
]

GENERIC_RE = re.compile("|".join(GENERIC_PATTERNS), re.I)

INGEST_STYLE_RE = re.compile(
    r"^(?:Notification|Circular|Order)\s+No\.\s+\d+/\d{4}-.+\s+under\s+",
    re.I,
)


def is_generic_summary(summary: str | None) -> bool:
    text = (summary or "").strip()
    if not text:
        return True
    if len(text) < 60:
        return True
    if GENERIC_RE.search(text):
        return True
    if INGEST_STYLE_RE.match(text):
        return True
    return False