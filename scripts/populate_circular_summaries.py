"""
Populate paragraph summaries for all circulars (reads full PDF text, no API).
Run: python scripts/populate_circular_summaries.py
     python scripts/populate_circular_summaries.py --force
"""
from __future__ import annotations

import argparse
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from summarize_circular import build_circular_paragraph_summary, build_circular_summary
from summarize_notification import clean_text

try:
    from pypdf import PdfReader
except ImportError:
    from PyPDF2 import PdfReader

DATA_JSON = os.path.join(ROOT, "data", "pdf_documents.json")


def extract_full_pdf_text(path: str, max_chars: int = 120000) -> str:
    try:
        reader = PdfReader(path)
        chunks: list[str] = []
        total = 0
        for page in reader.pages:
            t = page.extract_text() or ""
            if not t.strip():
                continue
            chunks.append(t)
            total += len(t)
            if total >= max_chars:
                break
        return clean_text(" ".join(chunks))[:max_chars]
    except Exception:
        return ""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    with open(DATA_JSON, encoding="utf-8") as f:
        docs = json.load(f)

    updated = 0
    skipped = 0

    for doc in docs:
        if doc.get("doc_type") != "circular" or doc.get("status") != "ready":
            continue
        if doc.get("summary") and not args.force:
            skipped += 1
            continue

        path = doc.get("file_path", "")
        text = extract_full_pdf_text(path) if path and os.path.isfile(path) else ""
        circular_no = doc.get("notification_no") or ""
        is_corr = bool(doc.get("is_corrigendum"))
        category = doc.get("category")

        if not doc.get("list_detail_manual"):
            list_detail = build_circular_summary(
                text, circular_no, is_corr, category
            )
            doc["summary_short"] = list_detail
            doc["title"] = list_detail

        summary = build_circular_paragraph_summary(
            text,
            circular_no,
            is_corr,
            category,
            doc.get("summary_short") or doc.get("title"),
        )
        doc["summary"] = summary
        updated += 1
        print(
            f"  {doc.get('notification_no')} — "
            f"detail {len(doc.get('summary_short') or '')} chars, "
            f"summary {len(summary)} chars"
        )

    with open(DATA_JSON, "w", encoding="utf-8") as f:
        json.dump(docs, f, indent=2, ensure_ascii=False)

    print(f"\nDone: {updated} updated, {skipped} skipped")


if __name__ == "__main__":
    main()