"""
Ingest circular PDFs from All Circulars and merge into pdf_documents.json.
Run: python scripts/ingest_circulars.py
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from datetime import datetime

from circular_category import CATEGORY_LABELS, detect_circular_category
from date_extract import extract_issued_date
from summarize_circular import build_circular_paragraph_summary, build_circular_summary
from summarize_notification import clean_text, is_corrigendum_file

try:
    from pypdf import PdfReader
except ImportError:
    from PyPDF2 import PdfReader

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CIRCULARS_DIR = os.path.join(ROOT, "All Circulars")
DATA_DIR = os.path.join(ROOT, "data")
OUT_JSON = os.path.join(DATA_DIR, "pdf_documents.json")


def file_hash(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def extract_pdf_text(path: str, max_pages: int = 6) -> str:
    try:
        reader = PdfReader(path)
        pages = min(len(reader.pages), max_pages)
        chunks = []
        for i in range(pages):
            t = reader.pages[i].extract_text() or ""
            if t.strip():
                chunks.append(t)
        return clean_text(" ".join(chunks))
    except Exception:
        return ""


def extract_circular_date(
    text: str,
    filename: str,
    year: int,
    month_hint: int | None,
    day_hint: int | None,
) -> str:
    """Prefer PDF date; avoid mis-parsing circular number as day (e.g. 255-01-2026)."""
    safe_name = re.sub(r"(?i)cir(?:cular)?\s*\d+\s*-\s*", "Cir-", filename)
    from_pdf = extract_issued_date(text, safe_name, year)
    fallback = f"{year}-01-01"

    if from_pdf != fallback:
        return from_pdf

    if month_hint is not None:
        day = day_hint if day_hint and 1 <= day_hint <= 31 else 1
        return f"{year}-{month_hint:02d}-{day:02d}"

    return from_pdf


def parse_circular_meta(filename: str, folder: str, text: str):
    category = detect_circular_category(filename, folder)
    label = CATEGORY_LABELS[category]
    base = os.path.splitext(filename)[0]
    is_corrigendum = is_corrigendum_file(filename)

    num = None
    year = 2017
    month_hint = None
    day_hint = None

    m = re.search(r"(\d+)\s*-\s*(\d+)\s*-\s*(\d{4})", base)
    if m:
        num = int(m.group(1))
        mid = int(m.group(2))
        year = int(m.group(3))
        if 1 <= mid <= 12:
            month_hint = mid
        else:
            day_hint = mid

    if num is None:
        m2 = re.search(r"cir(?:cular)?\s*(\d+)", base, re.I)
        if m2:
            num = int(m2.group(1))

    circular_no = f"{num:02d}/{year}-{label}" if num is not None else f"-/{year}-{label}"

    issued = extract_circular_date(text, filename, year, month_hint, day_hint)

    summary = build_circular_summary(text, circular_no, is_corrigendum, category)

    return circular_no, summary, issued, year, category, is_corrigendum


def collect_pdfs() -> list[str]:
    if not os.path.isdir(CIRCULARS_DIR):
        print(f"Circulars folder not found: {CIRCULARS_DIR}", file=sys.stderr)
        return []
    pdfs = []
    for dirpath, _, files in os.walk(CIRCULARS_DIR):
        for fname in files:
            if fname.lower().endswith(".pdf"):
                pdfs.append(os.path.join(dirpath, fname))
    return sorted(pdfs)


def load_existing() -> tuple[list[dict], dict[int, dict]]:
    if not os.path.exists(OUT_JSON):
        return [], {}
    with open(OUT_JSON, encoding="utf-8") as f:
        data = json.load(f)
    manual = {}
    for r in data:
        if r.get("doc_type") != "circular":
            continue
        edits = {}
        if r.get("list_detail_manual"):
            edits["title"] = r.get("title")
            edits["summary_short"] = r.get("summary_short")
            edits["list_detail_manual"] = True
        if r.get("summary_manual"):
            edits["summary"] = r.get("summary")
            edits["summary_manual"] = True
        if r.get("legal_status_manual"):
            edits["legal_status"] = r.get("legal_status")
            edits["legal_status_manual"] = True
        if edits:
            manual[r["file_hash"]] = edits
    return [
        r
        for r in data
        if r.get("doc_type") != "circular" or r.get("admin_uploaded")
    ], manual


def main():
    pdfs = collect_pdfs()
    print(f"Found {len(pdfs)} circular PDFs under {CIRCULARS_DIR} (all subfolders)")

    existing, manual_edits = load_existing()
    records = list(existing)
    errors = 0

    for idx, path in enumerate(pdfs, 1):
        try:
            fname = os.path.basename(path)
            folder = os.path.dirname(path)
            text = extract_pdf_text(path)
            circular_no, summary, issued, year, category, is_corrigendum = (
                parse_circular_meta(fname, folder, text)
            )
            paragraph = build_circular_paragraph_summary(
                text, circular_no, is_corrigendum, category, summary
            )

            fh = file_hash(path)
            entry = {
                "file_name": fname,
                "file_path": os.path.abspath(path),
                "file_hash": fh,
                "doc_type": "circular",
                "category": category,
                "notification_no": circular_no,
                "title": summary,
                "issued_date": issued,
                "year": year,
                "is_corrigendum": is_corrigendum,
                "summary_short": summary,
                "summary_bullets": None,
                "summary": paragraph,
                "practical_effect": None,
                "status": "ready",
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }
            if fh in manual_edits:
                for key, value in manual_edits[fh].items():
                    entry[key] = value
            records.append(entry)
        except Exception as exc:
            errors += 1
            print(f"Error on {path}: {exc}", file=sys.stderr)

        if idx % 50 == 0:
            print(f"  Processed {idx}/{len(pdfs)}")

    by_category: dict[str, int] = {}
    for rec in records:
        if rec.get("doc_type") == "circular":
            cat = rec.get("category") or "unknown"
            by_category[cat] = by_category.get(cat, 0) + 1
    if by_category:
        print("  By category:", ", ".join(f"{k}={v}" for k, v in sorted(by_category.items())))

    def sort_num(rec: dict) -> int:
        m = re.match(r"(\d+)", rec.get("notification_no") or "")
        return int(m.group(1)) if m else 0

    notifications = [r for r in records if r.get("doc_type") == "notification"]
    circulars = [r for r in records if r.get("doc_type") == "circular"]
    other = [r for r in records if r.get("doc_type") not in ("notification", "circular")]

    notifications.sort(
        key=lambda r: (
            -r["year"],
            r.get("category") or "",
            -sort_num(r),
            1 if r.get("is_corrigendum") else 0,
            r.get("issued_date") or "",
        )
    )
    circulars.sort(
        key=lambda r: (
            -r["year"],
            r.get("category") or "",
            -sort_num(r),
            1 if r.get("is_corrigendum") else 0,
            r.get("issued_date") or "",
        )
    )

    merged = notifications + circulars + other
    for i, rec in enumerate(merged, 1):
        rec["id"] = i

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    print(
        f"Wrote {len(merged)} records ({len(circulars)} circulars, "
        f"{len(notifications)} notifications) to {OUT_JSON} ({errors} errors)"
    )


if __name__ == "__main__":
    main()