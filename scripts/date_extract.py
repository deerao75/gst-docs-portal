"""Extract notification issued dates from PDF text and filenames."""
from __future__ import annotations

import re
from typing import Optional

MONTHS = {
    "january": "01",
    "february": "02",
    "march": "03",
    "april": "04",
    "may": "05",
    "june": "06",
    "july": "07",
    "august": "08",
    "september": "09",
    "october": "10",
    "november": "11",
    "december": "12",
}


def _to_iso(day: str, month: str, year: str) -> Optional[str]:
    mo = MONTHS.get(month.lower())
    if not mo:
        return None
    d = int(day)
    y = int(year)
    if not (1 <= d <= 31 and 2010 <= y <= 2035):
        return None
    return f"{y}-{mo}-{day.zfill(2)}"


def extract_issued_date(text: str, filename: str, fallback_year: int) -> str:
    base = filename

    m = re.search(r"(\d{1,2})-(\d{1,2})-(\d{4})", base)
    if m:
        d, mo, y = m.group(1), m.group(2), m.group(3)
        if 1 <= int(mo) <= 12:
            return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"

    m2 = re.search(r"_(\d{1,2})-(\d{1,2})-(\d{4})", base)
    if m2:
        d, mo, y = m2.groups()
        if 1 <= int(mo) <= 12:
            return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"

    if text:
        t = re.sub(r"\s+", " ", text)
        month_pat = (
            r"(January|February|March|April|May|June|July|August|"
            r"September|October|November|December)"
        )
        patterns = [
            rf"New Delhi,?\s*(?:the\s+)?(\d{{1,2}})(?:st|nd|rd|th)?\s+{month_pat}\s*,?\s*(\d{{4}})",
            rf"New Delhi,?\s*dated\s*(?:the\s+)?(\d{{1,2}})(?:st|nd|rd|th)?\s+{month_pat}\s*,?\s*(\d{{4}})",
            rf"(?:CENTRAL TAX|INTEGRATED TAX|UNION TERRITORY)[^\d]{{0,80}}(\d{{1,2}})(?:st|nd|rd|th)?\s+{month_pat}\s*,?\s*(\d{{4}})",
            rf"dated\s*(?:the\s+)?(\d{{1,2}})(?:st|nd|rd|th)?\s+{month_pat}\s*,?\s*(\d{{4}})",
            rf"G\.S\.R\.[^,]{{0,40}}(\d{{1,2}})(?:st|nd|rd|th)?\s+{month_pat}\s*,?\s*(\d{{4}})",
        ]
        for pat in patterns:
            m3 = re.search(pat, t, re.I)
            if m3:
                iso = _to_iso(m3.group(1), m3.group(2), m3.group(3))
                if iso:
                    return iso

    return f"{fallback_year}-01-01"