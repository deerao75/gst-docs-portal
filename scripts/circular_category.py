"""Detect circular category from folder path and filename."""
from __future__ import annotations

import os

CATEGORY_LABELS = {
    "cgst_circular": "CGST Circular",
    "igst_circular": "IGST Circular",
    "compensation_cess_circular": "Compensation Cess Circular",
}

FOLDER_TO_CATEGORY = {
    "circulars cgst": "cgst_circular",
    "cgst": "cgst_circular",
    "circulars igst": "igst_circular",
    "igst": "igst_circular",
    "circulars comp cess": "compensation_cess_circular",
    "comp cess": "compensation_cess_circular",
    "compensation cess": "compensation_cess_circular",
}


def detect_circular_category(filename: str, folder: str = "") -> str:
    folder_key = os.path.basename(folder).lower().strip()
    if folder_key in FOLDER_TO_CATEGORY:
        return FOLDER_TO_CATEGORY[folder_key]

    combined = f"{folder_key} {filename}".lower()
    if "igst" in combined:
        return "igst_circular"
    if "comp" in combined and "cess" in combined:
        return "compensation_cess_circular"
    if "cgst" in combined:
        return "cgst_circular"
    return "cgst_circular"