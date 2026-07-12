"""
Ingest notification PDFs from data/notifications, generate summaries, export JSON.
Run: python scripts/ingest_notifications.py
"""
import hashlib
import json
import os
import re
import sys
from datetime import datetime

from date_extract import extract_issued_date
from notification_category import CATEGORY_LABELS, detect_category
from catalog_lock import acquire, release, save_json_atomic
from summarize_notification import (
    build_summaries,
    build_title,
    clean_text,
    is_corrigendum_file,
)

try:
    from pypdf import PdfReader
except ImportError:
    from PyPDF2 import PdfReader

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ALL_NOTIFICATIONS = os.path.join(ROOT, "All Notifications")
NOTIFICATIONS_DIR = (
    ALL_NOTIFICATIONS
    if os.path.isdir(ALL_NOTIFICATIONS)
    else os.path.join(ROOT, "data", "notifications")
)
DATA_DIR = os.path.join(ROOT, "data")
OUT_JSON = os.path.join(DATA_DIR, "pdf_documents.json")

def file_hash(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def extract_pdf_text(path, max_pages=8):
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


def parse_notification_meta(filename, folder, text):
    base = os.path.splitext(filename)[0]
    category = detect_category(filename, folder)
    label = CATEGORY_LABELS[category]

    num = None
    year = None

    m = re.search(r"(\d{1,3})[_/-](\d{4})", base)
    if m:
        num = int(m.group(1))
        year = int(m.group(2))
    else:
        m2 = re.search(r"(\d{4})", base)
        if m2:
            year = int(m2.group(1))

    if num is None:
        m4 = re.search(r"(?:notification|notifications)\s+(\d+)", base, re.I)
        if m4:
            num = int(m4.group(1))

    if year is None:
        year = 2017

    if num is not None:
        notification_no = f"{num:02d}/{year}-{label}"
    else:
        notification_no = f"-/{year}-{label}"

    is_corrigendum = is_corrigendum_file(filename)
    title = build_title(text, notification_no, category, filename, is_corrigendum)

    issued = extract_issued_date(text, filename, year)

    return notification_no, title, issued, year, category, is_corrigendum


def collect_pdfs():
    pdfs = []
    for dirpath, _, files in os.walk(NOTIFICATIONS_DIR):
        for fname in files:
            if fname.lower().endswith(".pdf"):
                pdfs.append(os.path.join(dirpath, fname))
    return sorted(pdfs)


def load_existing() -> tuple[list[dict], dict[str, dict]]:
    if not os.path.exists(OUT_JSON):
        return [], {}
    try:
        with open(OUT_JSON, encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError:
        print("Warning: corrupt pdf_documents.json — rebuilding notifications only.", flush=True)
        return [], {}
    manual = {}
    for r in data:
        if r.get("doc_type") != "notification":
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
        if r.get("doc_type") != "notification" or r.get("admin_uploaded")
    ], manual


def main():
    if not acquire("ingest_notifications"):
        sys.exit(1)
    try:
        _run_ingest()
    finally:
        release()


def _run_ingest():
    pdfs = collect_pdfs()
    print(f"Found {len(pdfs)} notification PDFs", flush=True)

    existing, manual_edits = load_existing()
    records = list(existing)
    errors = 0

    for idx, path in enumerate(pdfs, 1):
        try:
            folder = os.path.basename(os.path.dirname(path))
            fname = os.path.basename(path)
            text = extract_pdf_text(path, max_pages=10 if os.path.getsize(path) > 200000 else 6)
            notification_no, title, issued, year, category, is_corrigendum = (
                parse_notification_meta(fname, folder, text)
            )
            summary_short, summary_bullets, summary, practical = build_summaries(
                text,
                notification_no,
                title,
                category,
                fname,
                is_corrigendum,
            )

            fh = file_hash(path)
            entry = {
                "file_name": fname,
                "file_path": os.path.abspath(path),
                "file_hash": fh,
                "doc_type": "notification",
                "category": category,
                "notification_no": notification_no,
                "title": title,
                "issued_date": issued,
                "year": year,
                "is_corrigendum": is_corrigendum,
                "summary_short": summary_short,
                "summary_bullets": summary_bullets,
                "summary": summary,
                "practical_effect": practical,
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

        if idx % 100 == 0:
            print(f"Processed {idx}/{len(pdfs)}", flush=True)

    def sort_num(rec):
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

    save_json_atomic(OUT_JSON, merged)

    print(
        f"Wrote {len(merged)} records ({len(notifications)} notifications, "
        f"{len(circulars)} circulars) to {OUT_JSON} ({errors} errors)",
        flush=True,
    )


if __name__ == "__main__":
    main()