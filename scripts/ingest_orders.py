"""
Ingest order PDFs from All Orders and merge into pdf_documents.json.
Run: python scripts/ingest_orders.py
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from datetime import datetime

from date_extract import extract_issued_date
from order_category import CATEGORY_LABELS, detect_order_category
from summarize_notification import clean_text, is_corrigendum_file
from summarize_order import (
    build_order_list_detail,
    build_order_paragraph_summary,
    extract_order_number,
)

try:
    from pypdf import PdfReader
except ImportError:
    from PyPDF2 import PdfReader

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ORDERS_DIR = os.path.join(ROOT, "All Orders")
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


def parse_order_meta(filename: str, folder: str, text: str):
    category = detect_order_category(filename, folder, text)
    label = CATEGORY_LABELS[category]
    base = os.path.splitext(filename)[0]
    is_corrigendum = is_corrigendum_file(filename)

    num = None
    year = None

    m = re.search(r"order\s*0*(\d+)\s*[-_](\d{4})", base, re.I)
    if m:
        num = int(m.group(1))
        year = int(m.group(2))
    else:
        m2 = re.search(r"order\s*0*(\d+)", base, re.I)
        if m2:
            num = int(m2.group(1))

    pdf_num, pdf_year = extract_order_number(text)
    if num is None and pdf_num is not None:
        num = pdf_num
    if year is None and pdf_year is not None:
        year = pdf_year

    if year is None:
        year = 2017

    if num is not None:
        order_no = f"{num:02d}/{year}-{label}"
    else:
        order_no = f"-/{year}-{label}"

    issued = extract_issued_date(text, filename, year)
    if issued and issued != f"{year}-01-01":
        year = int(issued[:4])

    list_detail = build_order_list_detail(text, order_no)
    paragraph = build_order_paragraph_summary(
        text, order_no, category, list_detail
    )

    return order_no, list_detail, paragraph, issued, year, category, is_corrigendum


def collect_pdfs() -> list[str]:
    if not os.path.isdir(ORDERS_DIR):
        print(f"Orders folder not found: {ORDERS_DIR}", file=sys.stderr)
        return []
    pdfs = []
    for dirpath, _, files in os.walk(ORDERS_DIR):
        for fname in files:
            if fname.lower().endswith(".pdf"):
                pdfs.append(os.path.join(dirpath, fname))
    return sorted(pdfs)


def load_existing() -> tuple[list[dict], dict[str, dict]]:
    if not os.path.exists(OUT_JSON):
        return [], {}
    with open(OUT_JSON, encoding="utf-8") as f:
        data = json.load(f)
    manual = {}
    for r in data:
        if r.get("doc_type") != "order":
            continue
        edits = {}
        if r.get("list_detail_manual"):
            edits["title"] = r.get("title")
            edits["summary_short"] = r.get("summary_short")
            edits["list_detail_manual"] = True
        if r.get("summary_manual"):
            edits["summary"] = r.get("summary")
            edits["summary_manual"] = True
        elif r.get("summary"):
            edits["summary"] = r.get("summary")
        if r.get("legal_status_manual"):
            edits["legal_status"] = r.get("legal_status")
            edits["legal_status_manual"] = True
        if edits:
            manual[r["file_hash"]] = edits
    return [
        r
        for r in data
        if r.get("doc_type") != "order" or r.get("admin_uploaded")
    ], manual


def main():
    pdfs = collect_pdfs()
    print(f"Found {len(pdfs)} order PDFs under {ORDERS_DIR}")

    existing, manual_edits = load_existing()
    records = list(existing)
    errors = 0

    for idx, path in enumerate(pdfs, 1):
        try:
            fname = os.path.basename(path)
            folder = os.path.dirname(path)
            text = extract_pdf_text(path)
            order_no, list_detail, paragraph, issued, year, category, is_corrigendum = (
                parse_order_meta(fname, folder, text)
            )

            fh = file_hash(path)
            entry = {
                "file_name": fname,
                "file_path": os.path.abspath(path),
                "file_hash": fh,
                "doc_type": "order",
                "category": category,
                "notification_no": order_no,
                "title": list_detail,
                "issued_date": issued,
                "year": year,
                "is_corrigendum": is_corrigendum,
                "summary_short": list_detail,
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

    def sort_num(rec: dict) -> int:
        m = re.match(r"(\d+)", rec.get("notification_no") or "")
        return int(m.group(1)) if m else 0

    notifications = [r for r in records if r.get("doc_type") == "notification"]
    circulars = [r for r in records if r.get("doc_type") == "circular"]
    orders = [r for r in records if r.get("doc_type") == "order"]
    other = [
        r
        for r in records
        if r.get("doc_type") not in ("notification", "circular", "order")
    ]

    sort_key = lambda r: (
        -r["year"],
        r.get("category") or "",
        -sort_num(r),
        1 if r.get("is_corrigendum") else 0,
        r.get("issued_date") or "",
    )

    notifications.sort(key=sort_key)
    circulars.sort(key=sort_key)
    orders.sort(key=sort_key)

    by_category: dict[str, int] = {}
    for rec in orders:
        cat = rec.get("category") or "unknown"
        by_category[cat] = by_category.get(cat, 0) + 1
    if by_category:
        print("  Orders by category:", ", ".join(f"{k}={v}" for k, v in sorted(by_category.items())))

    merged = notifications + circulars + orders + other
    for i, rec in enumerate(merged, 1):
        rec["id"] = i

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    print(
        f"Wrote {len(merged)} records ({len(notifications)} notifications, "
        f"{len(circulars)} circulars, {len(orders)} orders) to {OUT_JSON} ({errors} errors)"
    )


if __name__ == "__main__":
    main()