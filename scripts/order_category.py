"""Detect GST order category from folder, filename, and PDF text."""
from __future__ import annotations

import os

CATEGORY_LABELS = {
    "central_tax": "Central Tax",
    "integrated_tax": "Integrated Tax",
    "union_territory_tax": "Union Territory Tax",
    "compensation_cess": "Compensation Cess",
    "gst": "GST",
}


def detect_order_category(filename: str, folder: str = "", text: str = "") -> str:
    combined = f"{os.path.basename(folder)} {filename}".lower()
    hay = f"{combined} {(text or '').lower()}"

    if "igst" in combined or "integrated tax" in hay or "integrated goods and services tax" in hay:
        return "integrated_tax"
    if (
        "utgst" in combined
        or "ut tax" in hay
        or "union territory tax" in hay
        or "union territory goods and services tax" in hay
    ):
        return "union_territory_tax"
    if "comp" in combined and "cess" in combined:
        return "compensation_cess"
    if (
        "cgst" in combined
        or "central tax" in hay
        or "central goods and services tax" in hay
    ):
        return "central_tax"
    return "gst"