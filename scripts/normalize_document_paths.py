"""
Rewrite pdf_documents.json file_path entries to portable relative paths (forward slashes).
Resolves files under data/notifications, All Circulars, All Orders, etc.
"""
from __future__ import annotations

import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CATALOG = os.path.join(ROOT, "data", "pdf_documents.json")

SEARCH_ROOTS = [
    "data/notifications",
    "data/circulars",
    "data/orders",
    "data/instructions",
    "All Notifications",
    "All Circulars",
    "All Orders",
    "All Instructions",
    "data/admin-uploads",
]


def build_index() -> dict[str, str]:
    index: dict[str, str] = {}
    for rel_root in SEARCH_ROOTS:
        abs_root = os.path.join(ROOT, rel_root)
        if not os.path.isdir(abs_root):
            continue
        for dirpath, _, filenames in os.walk(abs_root):
            for name in filenames:
                if not name.lower().endswith(".pdf"):
                    continue
                rel = os.path.relpath(os.path.join(dirpath, name), ROOT).replace("\\", "/")
                key = name.lower()
                index.setdefault(key, rel)
    return index


def main() -> None:
    index = build_index()
    docs = json.load(open(CATALOG, encoding="utf-8"))
    updated = 0
    missing: list[str] = []

    for doc in docs:
        old = doc.get("file_path", "")
        name = os.path.basename(old.replace("\\", "/"))
        rel = index.get(name.lower())
        if not rel:
            missing.append(name)
            continue
        if doc["file_path"] != rel:
            doc["file_path"] = rel
            updated += 1

    with open(CATALOG, "w", encoding="utf-8") as handle:
        json.dump(docs, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    print(f"Updated {updated} paths in {CATALOG}")
    if missing:
        print(f"Warning: {len(missing)} files not found on disk")
        for name in missing[:10]:
            print(f"  - {name}")


if __name__ == "__main__":
    main()