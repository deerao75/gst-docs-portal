"""
Scrape GST advisories from www.gst.gov.in (text/HTML, not PDF).

Source API:
  GET https://www.gst.gov.in/fomessage/newsupdates        -> latest 20 items
  GET https://www.gst.gov.in/fomessage/newsupdates/{id}   -> single item

Advisories are identified by title containing "advisory" (GST portal does not
use module == "Advisory" in the API).

Run:
  python scripts/scrape_gst_advisories.py
  python scripts/scrape_gst_advisories.py --quick   # latest feed only
"""
from __future__ import annotations

import argparse
import json
import os
import re
import time
import urllib.error
import urllib.request
from datetime import datetime
from html import unescape

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_PATH = os.path.join(ROOT, "data", "gst_advisories.json")

LIST_URL = "https://www.gst.gov.in/fomessage/newsupdates"
DETAIL_URL = "https://www.gst.gov.in/fomessage/newsupdates/{id}"
PDF_LINK_RE = re.compile(
    r'href=["\'](https?://[^"\']+\.pdf[^"\']*)["\']',
    re.IGNORECASE,
)


def fetch_json(url: str, retries: int = 5) -> dict | list | None:
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            # Default urllib User-Agent; custom browser headers trigger GST WAF.
            request = urllib.request.Request(url)
            with urllib.request.urlopen(request, timeout=90) as response:
                raw = response.read().decode("utf-8", errors="replace")
            if raw.lstrip().startswith("<"):
                return None
            return json.loads(raw)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            time.sleep(1.5 + attempt)
    if last_error:
        print(f"  failed {url}: {last_error}")
    return None


def parse_date(value: str | None) -> str | None:
    if not value:
        return None
    match = re.match(r"(\d{2})/(\d{2})/(\d{4})", value.strip())
    if not match:
        return None
    day, month, year = match.groups()
    return f"{year}-{month}-{day}"


def parse_year(value: str | None) -> int | None:
    iso = parse_date(value)
    if not iso:
        return None
    return int(iso[:4])


def normalize_module(value: str | None) -> str:
    if not value:
        return "General"
    cleaned = re.sub(r"\s+", " ", value.strip())
    mapping = {
        "e-way bill": "E-Way Bill",
        "eway bill": "E-Way Bill",
        "e-invoice": "E-Invoice",
        "appeal": "Appeal",
        "returns": "Returns",
        "registration": "Registration",
        "refund": "Refund",
        "others": "Others",
    }
    return mapping.get(cleaned.lower(), cleaned)


def is_advisory_title(title: str) -> bool:
    return "advisory" in title.lower()


def extract_pdf_urls(content_html: str) -> list[str]:
    urls = []
    for match in PDF_LINK_RE.findall(content_html or ""):
        url = unescape(match).strip()
        if url not in urls:
            urls.append(url)
    return urls


def normalize_item(raw: dict) -> dict | None:
    title = (raw.get("title") or "").strip()
    if not title or not is_advisory_title(title):
        return None

    source_id = int(raw["id"])
    issued_date = parse_date(raw.get("date"))
    content_html = raw.get("content") or ""

    return {
        "id": source_id,
        "source_id": source_id,
        "title": title,
        "module": normalize_module(raw.get("module")),
        "issued_date": issued_date,
        "year": parse_year(raw.get("date")),
        "content_html": content_html,
        "pdf_urls": extract_pdf_urls(content_html),
        "is_external": str(raw.get("IsExternal", "N")).upper() == "Y",
        "external_url": (raw.get("linkURl") or "").strip() or None,
        "source_url": f"https://www.gst.gov.in/newsandupdates/read/{source_id}",
    }


def fetch_list_items() -> list[dict]:
    payload = fetch_json(LIST_URL)
    if not isinstance(payload, dict):
        return []
    return payload.get("data") or []


def fetch_item(item_id: int) -> dict | None:
    payload = fetch_json(DETAIL_URL.format(id=item_id))
    if not isinstance(payload, dict):
        return None
    rows = payload.get("data") or []
    if not rows:
        return None
    row = rows[0]
    row["id"] = item_id
    return row


def scrape(quick: bool = False, max_id: int | None = None) -> list[dict]:
    print("Fetching latest feed...")
    latest = fetch_list_items()
    known_ids = {int(item["id"]) for item in latest if item.get("id") is not None}
    discovered_max = max(known_ids) if known_ids else 0
    upper = max_id or (discovered_max + 5)

    raw_by_id: dict[int, dict] = {
        int(item["id"]): item for item in latest if item.get("id") is not None
    }

    if not quick:
        print(f"Backfilling IDs 1..{upper} ({len(raw_by_id)} already from feed)")
        for item_id in range(1, upper + 1):
            if item_id in raw_by_id:
                continue
            row = fetch_item(item_id)
            if row:
                raw_by_id[item_id] = row
            if item_id % 25 == 0:
                print(f"  scanned {item_id}/{upper}, found {len(raw_by_id)} items")
            time.sleep(0.35)

    advisories: list[dict] = []
    for item_id in sorted(raw_by_id.keys(), reverse=True):
        normalized = normalize_item(raw_by_id[item_id])
        if normalized:
            advisories.append(normalized)

    print(f"Collected {len(raw_by_id)} news items, {len(advisories)} advisories")
    return advisories


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--quick", action="store_true", help="Only scrape latest feed")
    parser.add_argument("--max-id", type=int, default=None)
    args = parser.parse_args()

    advisories = scrape(quick=args.quick, max_id=args.max_id)
    catalog = {
        "source": "https://www.gst.gov.in/newsandupdates",
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "count": len(advisories),
        "items": advisories,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as handle:
        json.dump(catalog, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(f"Wrote {len(advisories)} advisories to {OUT_PATH}")


if __name__ == "__main__":
    main()