"""
Download full Finance Act PDFs (2017 onward) into data/finance_acts/
and write data/finance_acts.json for the portal PDF viewer.
"""
from __future__ import annotations

import hashlib
import json
import os
import urllib.error
import urllib.request
from datetime import datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.path.join(ROOT, "data", "finance_acts")
CATALOG_PATH = os.path.join(ROOT, "data", "finance_acts.json")

# slug -> list of candidate URLs (first successful download wins)
SOURCES: list[dict] = [
    {
        "id": 1,
        "year": 2017,
        "title": "Finance Act, 2017",
        "slug": "finance-act-2017",
        "assent_date": "2017-03-31",
        "urls": [
            "https://egazette.gov.in/WriteReadData/2017/175141.pdf",
            "https://www.indiabudget.gov.in/budget2017-2018/ub2017-18/fb/bill.pdf",
        ],
        "source_label": "eGazette / India Budget",
    },
    {
        "id": 2,
        "year": 2018,
        "title": "Finance Act, 2018",
        "slug": "finance-act-2018",
        "assent_date": "2018-03-29",
        "urls": [
            "https://egazette.gov.in/writereaddata/2018/184302.pdf",
            "https://www.indiabudget.gov.in/budget2018-2019/ub2018-19/fb/bill.pdf",
        ],
        "source_label": "eGazette / India Budget",
    },
    {
        "id": 3,
        "year": 2019,
        "title": "Finance Act, 2019",
        "slug": "finance-act-2019",
        "assent_date": "2019-02-21",
        "urls": [
            "https://gstcouncil.gov.in/sites/default/files/2024-04/finance_act_2019.pdf",
        ],
        "source_label": "GST Council / eGazette",
    },
    {
        "id": 4,
        "year": 2019,
        "title": "Finance (No. 2) Act, 2019",
        "slug": "finance-no-2-act-2019",
        "assent_date": "2019-08-01",
        "urls": [
            "https://www.indiabudget.gov.in/budget2019-20/doc/Finance_Bill.pdf",
        ],
        "source_label": "India Budget (Finance Bill 2019-20)",
    },
    {
        "id": 5,
        "year": 2020,
        "title": "Finance Act, 2020",
        "slug": "finance-act-2020",
        "assent_date": "2020-03-27",
        "urls": [
            "https://gstcouncil.gov.in/sites/default/files/2024-04/finance_act_2020.pdf",
            "https://www.indiabudget.gov.in/budget2020-21/doc/Finance_Bill.pdf",
        ],
        "source_label": "GST Council / India Budget",
    },
    {
        "id": 6,
        "year": 2021,
        "title": "Finance Act, 2021",
        "slug": "finance-act-2021",
        "assent_date": "2021-03-28",
        "urls": [
            "https://www.indiabudget.gov.in/budget2021-22/doc/Finance_Bill.pdf",
            "https://gstcouncil.gov.in/sites/default/files/2024-04/finance_act_2021.pdf",
        ],
        "source_label": "India Budget / eGazette",
    },
    {
        "id": 7,
        "year": 2022,
        "title": "Finance Act, 2022",
        "slug": "finance-act-2022",
        "assent_date": "2022-03-30",
        "urls": [
            "https://www.indiabudget.gov.in/budget2022-23/doc/Finance_Bill.pdf",
            "https://gstcouncil.gov.in/sites/default/files/2024-04/finance_act_of_2022.pdf",
        ],
        "source_label": "India Budget / eGazette",
    },
    {
        "id": 8,
        "year": 2023,
        "title": "Finance Act, 2023",
        "slug": "finance-act-2023",
        "assent_date": "2023-03-31",
        "urls": [
            "https://www.indiabudget.gov.in/budget2023-24/doc/Finance_Bill.pdf",
            "https://gstcouncil.gov.in/sites/default/files/gst-knowledge/Finance-Bill-2023.pdf",
            "https://gstcouncil.gov.in/sites/default/files/2024-04/finance_act_of_2023.pdf",
        ],
        "source_label": "India Budget / eGazette",
    },
    {
        "id": 9,
        "year": 2024,
        "title": "Finance Act, 2024",
        "slug": "finance-act-2024",
        "assent_date": "2024-02-15",
        "urls": [
            "https://d23z1tp9il9etb.cloudfront.net/download/pdf24/THE-FINANCE-ACT-2024.pdf",
        ],
        "source_label": "eGazette (Interim Budget)",
    },
    {
        "id": 10,
        "year": 2024,
        "title": "Finance (No. 2) Act, 2024",
        "slug": "finance-no-2-act-2024",
        "assent_date": "2024-08-16",
        "urls": [
            "https://egazette.gov.in/WriteReadData/2024/256436.pdf",
            "https://www.indiabudget.gov.in/budget2024-25/doc/Finance_Bill.pdf",
        ],
        "source_label": "eGazette / India Budget",
    },
    {
        "id": 11,
        "year": 2025,
        "title": "Finance Act, 2025",
        "slug": "finance-act-2025",
        "assent_date": "2025-03-29",
        "urls": [
            "https://www.indiabudget.gov.in/budget2025-26/doc/Finance_Bill.pdf",
        ],
        "source_label": "India Budget / eGazette",
    },
    {
        "id": 12,
        "year": 2026,
        "title": "Finance Act, 2026",
        "slug": "finance-act-2026",
        "assent_date": None,
        "urls": [
            "https://www.indiabudget.gov.in/doc/Finance_Bill.pdf",
        ],
        "source_label": "India Budget (Finance Bill 2026-27)",
    },
]


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url: str, dest: str) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    if len(data) < 1000:
        raise ValueError(f"Response too small ({len(data)} bytes)")
    with open(dest, "wb") as f:
        f.write(data)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    catalog: list[dict] = []

    for entry in SOURCES:
        slug = entry["slug"]
        file_name = f"{slug}.pdf"
        dest = os.path.join(OUT_DIR, file_name)
        source_url = None
        last_err = None

        best_size = 0
        best_tmp = ""
        for idx, url in enumerate(entry["urls"]):
            tmp = f"{dest}.{idx}.tmp"
            try:
                print(f"Downloading {entry['title']} from {url}")
                download(url, tmp)
                size = os.path.getsize(tmp)
                print(f"  OK {size} bytes")
                if size > best_size:
                    if best_tmp and os.path.isfile(best_tmp):
                        os.remove(best_tmp)
                    best_size = size
                    best_tmp = tmp
                    source_url = url
                else:
                    os.remove(tmp)
            except (urllib.error.URLError, urllib.error.HTTPError, ValueError) as exc:
                last_err = exc
                print(f"  FAIL {exc}")
                if os.path.isfile(tmp):
                    os.remove(tmp)

        if source_url and best_tmp:
            os.replace(best_tmp, dest)

        if not source_url:
            print(f"SKIPPED {entry['title']}: {last_err}")
            continue

        catalog.append(
            {
                "id": entry["id"],
                "year": entry["year"],
                "title": entry["title"],
                "slug": slug,
                "file_name": file_name,
                "file_path": os.path.join("data", "finance_acts", file_name),
                "file_hash": sha256_file(dest),
                "source_url": source_url,
                "source_label": entry["source_label"],
                "assent_date": entry["assent_date"],
                "status": "ready",
                "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }
        )

    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"\nWrote {len(catalog)} acts to {CATALOG_PATH}")


if __name__ == "__main__":
    main()