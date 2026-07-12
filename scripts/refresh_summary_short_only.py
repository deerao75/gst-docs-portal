"""Refresh summary_short (list detail) for notifications missing 'Notifies' prefix."""
from __future__ import annotations

import json
import logging
import os
import sys
import warnings

warnings.filterwarnings("ignore")
logging.getLogger("pypdf").setLevel(logging.ERROR)
logging.getLogger("PyPDF2").setLevel(logging.ERROR)

sys.path.insert(0, os.path.dirname(__file__))

from ingest_notifications import extract_pdf_text, parse_notification_meta
from refresh_summaries import HAND_CRAFTED
from summarize_notification import build_summaries

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_JSON = os.path.join(ROOT, "data", "pdf_documents.json")


def _save_records(records: list[dict]) -> None:
    tmp = OUT_JSON + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
    os.replace(tmp, OUT_JSON)


def needs_refresh(rec: dict) -> bool:
    if rec.get("doc_type") != "notification":
        return False
    short = (rec.get("summary_short") or "").strip()
    return not short.lower().startswith("notifies")


def main() -> None:
    with open(OUT_JSON, encoding="utf-8") as f:
        records = json.load(f)

    pending = [r for r in records if needs_refresh(r)]
    print(f"Refreshing summary_short for {len(pending)} notifications…")

    updated = 0
    errors = 0

    for idx, rec in enumerate(pending, 1):
        try:
            path = rec["file_path"]
            if not os.path.isabs(path):
                path = os.path.normpath(os.path.join(ROOT, path))
            if not os.path.exists(path):
                raise FileNotFoundError(path)

            fname = rec["file_name"]
            folder = os.path.basename(os.path.dirname(path))
            size = os.path.getsize(path)
            max_pages = 14 if size > 350000 else 10 if size > 150000 else 8
            text = extract_pdf_text(path, max_pages=max_pages)
            notification_no, title, _, _, category, is_corrigendum = parse_notification_meta(
                fname, folder, text
            )
            summary_short, _, _, _ = build_summaries(
                text,
                notification_no,
                title,
                category,
                fname,
                is_corrigendum,
            )

            override = HAND_CRAFTED.get(notification_no)
            if override and not is_corrigendum:
                summary_short = override.get("summary_short", summary_short)

            rec["summary_short"] = summary_short
            if not rec.get("title"):
                rec["title"] = title
            updated += 1
        except Exception as exc:
            errors += 1
            print(f"Error on {rec.get('file_name')}: {exc}", file=sys.stderr)

        if idx % 100 == 0:
            print(f"  {idx}/{len(pending)} …")
            _save_records(records)

    _save_records(records)

    print(f"Done: {updated} updated, {errors} errors")


if __name__ == "__main__":
    main()