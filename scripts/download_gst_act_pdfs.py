"""
Download GST Act PDFs that are not in the compiled docx (e.g. amendment acts).
Writes data/gst_act_pdfs.json and stores files under data/gst_act_pdfs/.
"""
from __future__ import annotations

import hashlib
import json
import os
import urllib.error
import urllib.request
from datetime import datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.path.join(ROOT, "data", "gst_act_pdfs")
CATALOG_PATH = os.path.join(ROOT, "data", "gst_act_pdfs.json")

SOURCES: list[dict] = [
    {
        "slug": "central-goods-and-services-tax-amendment-act-2018",
        "title": "Central Goods and Services Tax (Amendment) Act, 2018",
        "year": 2018,
        "act_no": "31 of 2018",
        "assent_date": "2018-08-30",
        "urls": [
            "https://prsindia.org/files/bills_acts/acts_parliament/2018/the-central-goods-and-services-tax-(amendment)-act,-2018.pdf",
            "https://www.indiacode.nic.in/bitstream/123456789/11230/1/cgst_amendment_act_2018.pdf",
        ],
        "source_label": "PRS India / India Code",
    },
]


def sha256_file(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download_pdf(url: str, dest: str) -> bool:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; GSTDocsPortal/1.0)"},
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            data = response.read()
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        print(f"  failed: {exc}")
        return False

    if len(data) < 1024 or not data[:5].startswith(b"%PDF-"):
        print("  failed: response is not a PDF")
        return False

    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as handle:
        handle.write(data)
    return True


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    catalog: list[dict] = []
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for index, item in enumerate(SOURCES, start=1):
        slug = item["slug"]
        file_name = f"{slug}.pdf"
        file_path = os.path.join("data", "gst_act_pdfs", file_name)
        abs_path = os.path.join(ROOT, file_path.replace("/", os.sep))

        source_url = ""
        if os.path.isfile(abs_path):
            print(f"[skip] {slug} already exists")
            source_url = item["urls"][0]
        else:
            print(f"[download] {slug}")
            for url in item["urls"]:
                print(f"  trying {url}")
                if download_pdf(url, abs_path):
                    source_url = url
                    print("  ok")
                    break

        if not os.path.isfile(abs_path):
            print(f"[error] could not download {slug}")
            continue

        catalog.append(
            {
                "id": index,
                "slug": slug,
                "title": item["title"],
                "year": item["year"],
                "act_no": item.get("act_no"),
                "file_name": file_name,
                "file_path": file_path.replace("/", "\\"),
                "file_hash": sha256_file(abs_path),
                "source_url": source_url,
                "source_label": item.get("source_label", ""),
                "assent_date": item.get("assent_date"),
                "status": "ready",
                "updated_at": now,
            }
        )

    with open(CATALOG_PATH, "w", encoding="utf-8") as handle:
        json.dump(catalog, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    print(f"Wrote {len(catalog)} entries to {CATALOG_PATH}")


if __name__ == "__main__":
    main()