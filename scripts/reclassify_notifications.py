"""Reclassify notification categories in pdf_documents.json without re-reading PDFs."""
import json
import os
import re
import sys
from datetime import datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_JSON = os.path.join(ROOT, "data", "pdf_documents.json")

sys.path.insert(0, os.path.dirname(__file__))
from notification_category import detect_category, notification_no_for_category


def main():
    with open(OUT_JSON, encoding="utf-8") as f:
        records = json.load(f)

    changed = 0
    for rec in records:
        if rec.get("doc_type") != "notification":
            continue
        folder = os.path.basename(os.path.dirname(rec.get("file_path", "")))
        fname = rec.get("file_name", "")
        new_cat = detect_category(fname, folder)
        old_cat = rec.get("category")
        if new_cat == old_cat:
            continue

        old_no = rec.get("notification_no", "")
        new_no = notification_no_for_category(old_no, new_cat)
        rec["category"] = new_cat
        rec["notification_no"] = new_no
        if rec.get("title") and old_no and old_no in rec["title"]:
            rec["title"] = rec["title"].replace(old_no, new_no, 1)
        changed += 1

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    print(f"Reclassified {changed} notifications in {OUT_JSON}")
    print(f"Updated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()