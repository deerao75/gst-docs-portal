"""Probe GST Council press release archive pagination and link types."""
from __future__ import annotations

import re
import urllib.request
from html import unescape

BASE = "https://gstcouncil.gov.in/archive-press-release"
HEADERS = {"User-Agent": "Mozilla/5.0"}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", "replace")


def parse_page(html: str) -> list[dict]:
    items: list[dict] = []
    pattern = re.compile(
        (
            r'views-field-counter">(\d+)\s*</td>.*?'
            r'views-field-field-date-of-uploading">([^<]+)</td>.*?'
            r'views-field-title">(.*?)</td>\s*</tr>'
        ),
        re.S,
    )
    for row in pattern.finditer(html):
        cell = unescape(row.group(3))
        link = re.search(r'<a href="([^"]+)"[^>]*>(.*?)</a>', cell, re.S)
        if not link:
            continue
        href = link.group(1).strip()
        title_text = re.sub(r"<[^>]+>", "", link.group(2))
        title_text = re.sub(r"\s+", " ", title_text).strip()
        kind = "pdf" if ".pdf" in href.lower() or "application-pdf" in cell.lower() else "external"
        items.append(
            {
                "sr": int(row.group(1)),
                "date": row.group(2).strip(),
                "title": title_text,
                "href": href,
                "kind": kind,
            }
        )
    return items


def main() -> None:
    all_items: list[dict] = []
    for page in range(0, 30):
        url = BASE if page == 0 else f"{BASE}?page={page}"
        html = fetch(url)
        items = parse_page(html)
        if not items:
            print(f"page {page}: empty, stop")
            break
        print(f"page {page}: {len(items)} items, dates {items[0]['date']} .. {items[-1]['date']}")
        all_items.extend(items)

    pdf = [i for i in all_items if i["kind"] == "pdf"]
    ext = [i for i in all_items if i["kind"] == "external"]
    print(f"\nTotal {len(all_items)} | direct PDF {len(pdf)} | external {len(ext)}")
    if all_items:
        print("Earliest:", all_items[-1]["date"], all_items[-1]["title"][:80])
        print("Latest:", all_items[0]["date"], all_items[0]["title"][:80])


if __name__ == "__main__":
    main()