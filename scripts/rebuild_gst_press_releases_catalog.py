"""
Rebuild data/gst_press_releases.json from the GST Council archive scrape
and existing PDFs in data/gst_press_releases/.
"""
from __future__ import annotations

import glob
import hashlib
import json
import os
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime
from html import unescape

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.path.join(ROOT, "data", "gst_press_releases")
CATALOG_PATH = os.path.join(ROOT, "data", "gst_press_releases.json")
ARCHIVE_BASE = "https://gstcouncil.gov.in/archive-press-release"
SITE_BASE = "https://gstcouncil.gov.in"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
MIN_DATE = datetime(2017, 1, 1)


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read().decode("utf-8", "replace")


def slugify(text: str, max_len: int = 80) -> str:
    slug = text.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug[:max_len] or "press-release"


def parse_archive_date(value: str) -> datetime | None:
    value = value.strip()
    for fmt in ("%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            pass
    return None


def parse_archive_page(html: str) -> list[dict]:
    items: list[dict] = []
    pattern = re.compile(
        (
            r'views-field-counter">(\d+)\s*</td>.*?'
            r'views-field-field-date-of-uploading">([^<]+)</td>.*?'
            r'views-field-title">(.*?)</td>\s*</tr>'
        ),
        re.S,
    )
    for match in pattern.finditer(html):
        cell = unescape(match.group(3))
        link = re.search(r'<a href="([^"]+)"[^>]*>(.*?)</a>', cell, re.S)
        if not link:
            continue
        href = link.group(1).strip()
        title = re.sub(r"<[^>]+>", "", link.group(2)).strip()
        title = re.sub(r"\s+", " ", title)
        kind = "pdf" if ".pdf" in href.lower() or "application-pdf" in cell.lower() else "external"
        items.append(
            {
                "sr": int(match.group(1)),
                "date_raw": match.group(2).strip(),
                "title": title,
                "href": href,
                "kind": kind,
            }
        )
    return items


def scrape_archive() -> list[dict]:
    all_items: list[dict] = []
    for page in range(0, 40):
        url = ARCHIVE_BASE if page == 0 else f"{ARCHIVE_BASE}?page={page}"
        print(f"Scraping {url}")
        items = parse_archive_page(fetch_text(url))
        if not items:
            break
        all_items.extend(items)
        time.sleep(0.3)
    return all_items


def absolute_url(href: str) -> str:
    if href.startswith("http"):
        return href
    return urllib.parse.urljoin(SITE_BASE, href)


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def find_pdf_for_id(item_id: int) -> str | None:
    pattern = os.path.join(OUT_DIR, f"press-release-{item_id:04d}-*.pdf")
    matches = glob.glob(pattern)
    return matches[0] if matches else None


def infer_source_type(href: str, kind: str) -> str:
    if kind == "pdf":
        return "gstcouncil_pdf"
    if "pib.gov.in" in href.lower():
        return "pib_html_pdf"
    return "external"


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)

    items = scrape_archive()
    items.sort(
        key=lambda x: (
            parse_archive_date(x["date_raw"]) or datetime.min,
            -x["sr"],
        ),
        reverse=True,
    )

    filtered = []
    for item in items:
        parsed = parse_archive_date(item["date_raw"])
        if parsed and parsed < MIN_DATE:
            continue
        filtered.append(item)

    print(f"Archive rows since 2017: {len(filtered)}")

    existing_by_id: dict[int, dict] = {}
    if os.path.isfile(CATALOG_PATH):
        with open(CATALOG_PATH, encoding="utf-8") as f:
            for entry in json.load(f):
                existing_by_id[entry["id"]] = entry

    catalog: list[dict] = []
    missing_pdfs: list[int] = []
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for item_id, item in enumerate(filtered, start=1):
        pdf_path = find_pdf_for_id(item_id)
        if not pdf_path:
            missing_pdfs.append(item_id)
            continue

        parsed_date = parse_archive_date(item["date_raw"])
        date_iso = parsed_date.strftime("%Y-%m-%d") if parsed_date else None
        slug = slugify(item["title"])
        file_name = os.path.basename(pdf_path)
        original_url = absolute_url(item["href"])

        prior = existing_by_id.get(item_id, {})
        source_url = prior.get("source_url") or original_url
        source_type = prior.get("source_type") or infer_source_type(item["href"], item["kind"])

        catalog.append(
            {
                "id": item_id,
                "sr_no": item["sr"],
                "date": date_iso,
                "date_display": item["date_raw"],
                "title": item["title"],
                "slug": f"press-release-{item_id:04d}-{slug}",
                "file_name": file_name,
                "file_path": os.path.join("data", "gst_press_releases", file_name),
                "file_hash": sha256_file(pdf_path),
                "source_url": source_url,
                "original_url": original_url,
                "source_type": source_type,
                "status": "ready",
                "updated_at": now,
            }
        )

    catalog.sort(
        key=lambda x: (x.get("date") or "", -x["id"]),
        reverse=True,
    )

    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Catalog rebuilt with {len(catalog)} entries at {CATALOG_PATH}")
    if missing_pdfs:
        print(f"Missing PDFs for ids: {missing_pdfs}")
        print("Run: python scripts/download_gst_press_releases.py")


if __name__ == "__main__":
    main()