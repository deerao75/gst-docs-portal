"""
Scrape GST Council press release archive (2017 onward), download PDFs,
and write data/gst_press_releases.json for the portal viewer.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from html import unescape

import fitz

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.path.join(ROOT, "data", "gst_press_releases")
CATALOG_PATH = os.path.join(ROOT, "data", "gst_press_releases.json")
ARCHIVE_BASE = "https://gstcouncil.gov.in/archive-press-release"
SITE_BASE = "https://gstcouncil.gov.in"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
MIN_DATE = datetime(2017, 1, 1)


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def fetch_text(url: str) -> str:
    return fetch_bytes(url).decode("utf-8", "replace")


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


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


def extract_pib_content(html: str) -> str:
    for pattern in (
        r'<div[^>]*class="[^"]*content-area[^"]*"[^>]*>(.*?)</div>\s*<div[^>]*class="[^"]*share',
        r'<div[^>]*id="divContentDesc"[^>]*>(.*?)</div>',
        r"<article[^>]*>(.*?)</article>",
    ):
        match = re.search(pattern, html, re.S | re.I)
        if match:
            text = re.sub(r"<script[^>]*>.*?</script>", "", match.group(1), flags=re.S | re.I)
            text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.S | re.I)
            return text
    body = re.search(r"<body[^>]*>(.*)</body>", html, re.S | re.I)
    return body.group(1) if body else html


def find_pdf_in_html(html: str, base_url: str) -> str | None:
    for match in re.finditer(r'href=["\']([^"\']+\.pdf[^"\']*)["\']', html, re.I):
        return urllib.parse.urljoin(base_url, match.group(1))
    return None


def html_to_text(html_fragment: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", html_fragment, flags=re.I)
    text = re.sub(r"</p>", "\n\n", text, flags=re.I)
    text = re.sub(r"<li[^>]*>", "\n- ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def text_to_pdf(text: str, out_path: str) -> None:
    doc = fitz.open()
    width, height = 595, 842
    margin = 36
    line_height = 13
    max_chars = 110

    def wrap_line(line: str) -> list[str]:
        line = line.strip()
        if not line:
            return [""]
        words = line.split()
        lines: list[str] = []
        current = ""
        for word in words:
            candidate = f"{current} {word}".strip()
            if len(candidate) <= max_chars:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        return lines or [""]

    y = margin
    page = doc.new_page(width=width, height=height)
    for paragraph in text.split("\n"):
        for line in wrap_line(paragraph):
            if y > height - margin:
                page = doc.new_page(width=width, height=height)
                y = margin
            page.insert_text((margin, y), line, fontsize=10, fontname="helv")
            y += line_height
        y += line_height // 2

    doc.save(out_path)
    doc.close()


def html_to_pdf(html_fragment: str, title: str, out_path: str) -> None:
    body = html_to_text(html_fragment)
    text_to_pdf(f"{title}\n\n{body}", out_path)


def download_pdf_url(url: str, dest: str) -> None:
    data = fetch_bytes(url)
    if len(data) < 500:
        raise ValueError("PDF too small")
    with open(dest, "wb") as f:
        f.write(data)


def materialize_item(item: dict, item_id: int) -> dict | None:
    parsed_date = parse_archive_date(item["date_raw"])
    if parsed_date and parsed_date < MIN_DATE:
        return None

    date_iso = parsed_date.strftime("%Y-%m-%d") if parsed_date else None
    slug = slugify(item["title"])
    file_name = f"press-release-{item_id:04d}-{slug}.pdf"
    dest = os.path.join(OUT_DIR, file_name)
    source_url = absolute_url(item["href"])
    source_type = "gstcouncil_pdf"

    if item["kind"] == "pdf":
        download_pdf_url(source_url, dest)
    else:
        html = fetch_text(source_url)
        pdf_url = find_pdf_in_html(html, source_url)
        if pdf_url:
            download_pdf_url(pdf_url, dest)
            source_type = "pib_pdf"
            source_url = pdf_url
        else:
            fragment = extract_pib_content(html)
            html_to_pdf(fragment, item["title"], dest)
            source_type = "pib_html_pdf"
            time.sleep(0.5)

    return {
        "id": item_id,
        "sr_no": item["sr"],
        "date": date_iso,
        "date_display": item["date_raw"],
        "title": item["title"],
        "slug": f"press-release-{item_id:04d}-{slug}",
        "file_name": file_name,
        "file_path": os.path.join("data", "gst_press_releases", file_name),
        "file_hash": sha256_file(dest),
        "source_url": source_url,
        "original_url": absolute_url(item["href"]),
        "source_type": source_type,
        "status": "ready",
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def load_existing_catalog() -> list[dict]:
    if not os.path.isfile(CATALOG_PATH):
        return []
    with open(CATALOG_PATH, encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    import sys

    max_items = int(sys.argv[1]) if len(sys.argv) > 1 else 0

    os.makedirs(OUT_DIR, exist_ok=True)
    items = scrape_archive()
    print(f"Found {len(items)} archive rows")

    items.sort(
        key=lambda x: (
            parse_archive_date(x["date_raw"]) or datetime.min,
            -x["sr"],
        ),
        reverse=True,
    )

    existing = load_existing_catalog()
    existing_titles = {e["title"] for e in existing}
    catalog = list(existing)
    next_id = max((e["id"] for e in catalog), default=0) + 1
    added = 0

    for item in items:
        if max_items and added >= max_items:
            break
        parsed = parse_archive_date(item["date_raw"])
        if parsed and parsed < MIN_DATE:
            continue
        if item["title"] in existing_titles:
            continue
        try:
            print(f"[{next_id}] {item['date_raw']} {item['title'][:70]}")
            entry = materialize_item(item, next_id)
            if entry:
                catalog.append(entry)
                existing_titles.add(item["title"])
                next_id += 1
                added += 1
        except (urllib.error.URLError, urllib.error.HTTPError, ValueError, OSError) as exc:
            print(f"  SKIP: {exc}")
        time.sleep(0.2)

    catalog.sort(
        key=lambda x: (x.get("date") or "", -x["id"]),
        reverse=True,
    )

    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"\nCatalog now has {len(catalog)} press releases at {CATALOG_PATH}")


if __name__ == "__main__":
    main()