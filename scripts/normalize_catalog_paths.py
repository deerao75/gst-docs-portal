"""Normalize file_path fields in JSON catalogs to forward slashes (Linux/Vercel safe)."""
from __future__ import annotations

import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CATALOGS = [
    "data/finance_acts.json",
    "data/gst_act_pdfs.json",
    "data/gst_forms.json",
    "data/gst_press_releases.json",
    "data/pdf_documents.json",
]


def normalize_file(obj: dict) -> bool:
    if "file_path" not in obj:
        return False
    old = obj["file_path"]
    new = old.replace("\\", "/")
    if new != old:
        obj["file_path"] = new
        return True
    return False


def main() -> None:
    total = 0
    for rel in CATALOGS:
        path = os.path.join(ROOT, rel)
        if not os.path.isfile(path):
            print(f"[skip] {rel}")
            continue
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
        changed = 0
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and normalize_file(item):
                    changed += 1
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2, ensure_ascii=False)
            handle.write("\n")
        print(f"[ok] {rel}: {changed} paths normalized")
        total += changed
    print(f"Done. {total} paths updated.")


if __name__ == "__main__":
    main()