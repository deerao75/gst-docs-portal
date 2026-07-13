"""
Rebuild Show Summary text for all notifications, circulars, and orders.

Uses improved rule-based generators (no API key required).

Run: python scripts/refresh_all_summaries.py
     python scripts/refresh_all_summaries.py --dry-run
     python scripts/refresh_all_summaries.py --type notification
"""
from __future__ import annotations

import argparse
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from generate_circular_summaries import extract_full_pdf_text
from summarize_circular import build_circular_paragraph_summary
from summarize_notification import build_summaries, strip_boilerplate
from summarize_order import build_order_paragraph_summary
from summary_quality import is_generic_summary
from summary_style import clean_grammar, is_generic_effect, notifies_to_prose

DATA_JSON = os.path.join(ROOT, "data", "pdf_documents.json")
TARGET_TYPES = ("notification", "circular", "order")


def resolve_path(file_path: str) -> str:
    normalized = file_path.replace("\\", "/")
    if os.path.isabs(normalized):
        return normalized
    return os.path.join(ROOT, normalized)


def rebuild_notification(doc: dict, text: str) -> str:
    no = doc.get("notification_no") or ""
    label_cat = doc.get("category") or ""
    is_corr = bool(doc.get("is_corrigendum"))
    title = doc.get("summary_short") or doc.get("title") or ""

    if text and len(strip_boilerplate(text)) >= 80:
        _, _, summary, _ = build_summaries(
            text, no, title, label_cat, doc.get("file_name") or "", is_corr
        )
        return clean_grammar(summary)

    short = title or doc.get("summary_short") or ""
    if short:
        lead = notifies_to_prose(short)
        return clean_grammar(
            f"{lead} Refer to Notification No. {no} for operative dates, "
            f"table entries, and statutory references."
        )
    return clean_grammar(f"GST notification {no}.")


def rebuild_circular(doc: dict, text: str) -> str:
    return clean_grammar(
        build_circular_paragraph_summary(
            text,
            doc.get("notification_no") or "",
            bool(doc.get("is_corrigendum")),
            doc.get("category"),
            doc.get("summary_short") or doc.get("title"),
        )
    )


def rebuild_order(doc: dict, text: str) -> str:
    return clean_grammar(
        build_order_paragraph_summary(
            text,
            doc.get("notification_no") or "",
            doc.get("category"),
            doc.get("summary_short") or doc.get("title"),
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--type", choices=TARGET_TYPES)
    parser.add_argument("--force", action="store_true", help="Rebuild even if summary_manual")
    args = parser.parse_args()

    with open(DATA_JSON, encoding="utf-8") as f:
        docs = json.load(f)

    targets = [
        d
        for d in docs
        if d.get("doc_type") in TARGET_TYPES
        and d.get("status") == "ready"
        and (not args.type or d.get("doc_type") == args.type)
    ]

    updated = 0
    skipped_manual = 0
    improved = 0
    still_generic = 0

    for idx, doc in enumerate(targets, 1):
        if doc.get("summary_manual") and not args.force:
            skipped_manual += 1
            continue

        path = resolve_path(doc.get("file_path") or "")
        text = extract_full_pdf_text(path, max_chars=90000) if os.path.isfile(path) else ""

        doc_type = doc.get("doc_type")
        if doc_type == "notification":
            new_summary = rebuild_notification(doc, text)
        elif doc_type == "circular":
            new_summary = rebuild_circular(doc, text)
        else:
            new_summary = rebuild_order(doc, text)

        old_summary = (doc.get("summary") or "").strip()
        was_bad = is_generic_summary(old_summary)

        if not args.dry_run:
            doc["summary"] = new_summary

        updated += 1
        if was_bad and not is_generic_summary(new_summary):
            improved += 1
        if is_generic_summary(new_summary):
            still_generic += 1

        if idx % 100 == 0:
            print(f"  … processed {idx}/{len(targets)}")
            if not args.dry_run:
                with open(DATA_JSON, "w", encoding="utf-8") as f:
                    json.dump(docs, f, indent=2, ensure_ascii=False)

    if not args.dry_run:
        with open(DATA_JSON, "w", encoding="utf-8") as f:
            json.dump(docs, f, indent=2, ensure_ascii=False)

    print(
        f"\nDone: {updated} rebuilt, {improved} improved from generic, "
        f"{still_generic} still generic, {skipped_manual} skipped (manual)"
    )
    if args.dry_run:
        print("(dry-run — no files written)")


if __name__ == "__main__":
    main()