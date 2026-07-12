"""
Download CGST Rules Part-B (consolidated GST forms) and split into per-form PDFs.
Writes data/gst_forms.json and stores files under data/gst_forms/.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime

import fitz

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.path.join(ROOT, "data", "gst_forms")
CATALOG_PATH = os.path.join(ROOT, "data", "gst_forms.json")
CONSOLIDATED_NAME = "cgst-rules-2017-part-b-forms-consolidated.pdf"
CONSOLIDATED_PATH = os.path.join(OUT_DIR, CONSOLIDATED_NAME)

PART_B_URL = (
    "https://cbic-gst.gov.in/pdf/01012022-CGST-Rules-2017-amended-Part-B.pdf"
)
SOURCE_LABEL = "CBIC CGST Rules 2017 Part-B (amended to 01.01.2022)"
AMENDED_TO = "2022-01-01"

TOC_PAGE_START = 1
TOC_PAGE_END = 5
FORM_PAGE_OFFSET = 6


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
        with urllib.request.urlopen(request, timeout=180) as response:
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


def normalize_form_code(raw: str) -> str:
    code = raw.upper().strip()
    code = code.replace("–", "-").replace("—", "-")
    code = re.sub(r"\s+", "", code)
    code = re.sub(r"^FORM-?GST-?", "", code)
    if code.startswith("GSTR"):
        return code
    code = re.sub(r"^GST-?", "", code)
    if re.fullmatch(r"R-\d+.*", code):
        return f"GSTR{code[1:]}"
    return code


def slugify_form_code(code: str) -> str:
    if code.startswith("GSTR"):
        return code.lower()
    slug = code.lower().replace("/", "-")
    return f"gst-{slug}"


def parse_toc(doc: fitz.Document) -> list[dict]:
    text = ""
    for page_index in range(TOC_PAGE_START, TOC_PAGE_END + 1):
        text += doc[page_index].get_text() + "\n"

    entries: list[dict] = []
    seen: set[str] = set()
    pattern = re.compile(
        r"\[?\s*FORM[\s-]+(?:GST[\s-]+)?(GSTR[\s\-–—0-9A-Z]+|[A-Z]{2,}[\s\-–—0-9A-Z]+)\s*"
        r"[\.\u2026…]+?\s*(\d+)\s*$",
        re.MULTILINE,
    )

    for match in pattern.finditer(text):
        code = normalize_form_code(match.group(1))
        if not code or code in seen:
            continue
        seen.add(code)
        entries.append(
            {
                "code": code,
                "title": form_title(code),
                "toc_page": int(match.group(2)),
            }
        )

    return entries


def form_title(code: str) -> str:
    if code.startswith("GSTR"):
        return f"FORM {code}"
    return f"FORM GST {code}"


def form_header_pattern(code: str) -> re.Pattern[str]:
    escaped = re.escape(code).replace(r"\-", r"[\s\-–—]*")
    suffix_guard = r"(?![\s\-–—]*[A-Z0-9])"
    if code.startswith("GSTR"):
        return re.compile(
            rf"^\s*\[?FORM[\s-]+{escaped}{suffix_guard}",
            re.IGNORECASE | re.MULTILINE,
        )
    return re.compile(
        rf"^\s*\[?FORM[\s-]+(?:GST[\s-]+)?{escaped}{suffix_guard}",
        re.IGNORECASE | re.MULTILINE,
    )


def is_form_header_match(text: str, pattern: re.Pattern[str]) -> bool:
    match = pattern.search(text)
    if not match:
        return False
    return match.start() < max(400, len(text) * 0.4)


def find_form_start_pages(doc: fitz.Document, entries: list[dict]) -> list[dict]:
    located: list[dict] = []
    header_patterns = {
        entry["code"]: form_header_pattern(entry["code"]) for entry in entries
    }

    search_from = FORM_PAGE_OFFSET
    for entry in sorted(entries, key=lambda item: item["toc_page"]):
        pattern = header_patterns[entry["code"]]
        start_pdf = None

        for page_index in range(search_from, doc.page_count):
            text = doc[page_index].get_text()
            if is_form_header_match(text, pattern):
                start_pdf = page_index
                break

        if start_pdf is None:
            for page_index in range(FORM_PAGE_OFFSET, doc.page_count):
                text = doc[page_index].get_text()
                if is_form_header_match(text, pattern):
                    start_pdf = page_index
                    break

        if start_pdf is None:
            start_pdf = entry["toc_page"] + FORM_PAGE_OFFSET - 1

        located.append({**entry, "start_pdf": start_pdf})
        search_from = max(search_from, start_pdf)

    located.sort(key=lambda item: (item["start_pdf"], item["toc_page"]))
    return located


def split_forms(doc: fitz.Document, entries: list[dict]) -> list[dict]:
    catalog: list[dict] = []
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    located = find_form_start_pages(doc, entries)

    for index, entry in enumerate(located, start=1):
        start_pdf = entry["start_pdf"]
        if index < len(located):
            end_pdf = located[index]["start_pdf"] - 1
        else:
            end_pdf = doc.page_count - 1

        if end_pdf < start_pdf:
            end_pdf = start_pdf

        if start_pdf < 0 or start_pdf >= doc.page_count:
            print(f"[skip] invalid page range for {entry['code']}")
            continue

        slug = slugify_form_code(entry["code"])
        file_name = f"{slug}.pdf"
        abs_path = os.path.join(OUT_DIR, file_name)

        split_doc = fitz.open()
        split_doc.insert_pdf(doc, from_page=start_pdf, to_page=end_pdf)
        split_doc.save(abs_path)
        split_doc.close()

        catalog.append(
            {
                "id": len(catalog) + 1,
                "code": entry["code"],
                "title": entry["title"],
                "slug": slug,
                "file_name": file_name,
                "file_path": os.path.join("data", "gst_forms", file_name).replace(
                    "/", "\\"
                ),
                "page_start": start_pdf + 1,
                "page_end": end_pdf + 1,
                "page_count": end_pdf - start_pdf + 1,
                "file_hash": sha256_file(abs_path),
                "source_url": PART_B_URL,
                "source_label": SOURCE_LABEL,
                "amended_to": AMENDED_TO,
                "status": "ready",
                "updated_at": now,
            }
        )
        print(f"[ok] {entry['title']} ({end_pdf - start_pdf + 1} pages)")

    return catalog


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)

    if os.path.isfile(CONSOLIDATED_PATH):
        print(f"[skip] consolidated PDF already exists")
    else:
        print("[download] CGST Rules Part-B consolidated forms PDF")
        if not download_pdf(PART_B_URL, CONSOLIDATED_PATH):
            raise SystemExit("Could not download Part-B PDF")

    doc = fitz.open(CONSOLIDATED_PATH)
    print(f"[info] {doc.page_count} pages in consolidated PDF")

    entries = parse_toc(doc)
    print(f"[info] parsed {len(entries)} forms from table of contents")

    # Remove old per-form PDFs so renamed codes are rebuilt cleanly.
    for name in os.listdir(OUT_DIR):
        if name.endswith(".pdf") and name != CONSOLIDATED_NAME:
            os.remove(os.path.join(OUT_DIR, name))

    catalog = split_forms(doc, entries)
    doc.close()

    with open(CATALOG_PATH, "w", encoding="utf-8") as handle:
        json.dump(catalog, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    print(f"Wrote {len(catalog)} forms to {CATALOG_PATH}")


if __name__ == "__main__":
    main()