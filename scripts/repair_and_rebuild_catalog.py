"""
Repair truncated pdf_documents.json and rebuild full catalog from PDFs.
Run once after interrupted summary refresh: py -3.11 scripts/repair_and_rebuild_catalog.py
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_JSON = os.path.join(ROOT, "data", "pdf_documents.json")
BACKUP = DATA_JSON + ".corrupt.bak"


def salvage_partial(path: str) -> list[dict]:
    text = open(path, encoding="utf-8", errors="ignore").read().strip()
    if not text.startswith("["):
        return []
    # Drop incomplete trailing object after the last closed record.
    cut = text.rfind("\n  },")
    if cut == -1:
        cut = text.rfind("\n  }")
    if cut == -1:
        return []
    repaired = text[: cut + len("\n  }")] + "\n]"
    try:
        return json.loads(repaired)
    except json.JSONDecodeError:
        return []


def main() -> None:
    if os.path.isfile(DATA_JSON):
        shutil.copy2(DATA_JSON, BACKUP)
        partial = salvage_partial(DATA_JSON)
        print(f"Salvaged {len(partial)} complete records from corrupt file.")
        # Seed file with non-notification records only so ingest_* can merge.
        kept = [
            r
            for r in partial
            if r.get("doc_type") not in ("notification",) or r.get("admin_uploaded")
        ]
        with open(DATA_JSON, "w", encoding="utf-8") as f:
            json.dump(kept, f, indent=2, ensure_ascii=False)
        print(f"Wrote {len(kept)} seed records for merge.")
    else:
        print("No existing pdf_documents.json — full ingest from PDFs.")

    scripts = [
        "ingest_notifications.py",
        "ingest_circulars.py",
        "ingest_orders.py",
    ]
    py = sys.executable
    for name in scripts:
        path = os.path.join(os.path.dirname(__file__), name)
        if not os.path.isfile(path):
            continue
        print(f"Running {name}…")
        result = subprocess.run([py, path], cwd=ROOT)
        if result.returncode != 0:
            print(f"{name} failed with exit {result.returncode}", file=sys.stderr)
            sys.exit(result.returncode)

    with open(DATA_JSON, encoding="utf-8") as f:
        docs = json.load(f)
    ns = [d for d in docs if d.get("doc_type") == "notification"]
    notifies = sum(
        1 for d in ns if (d.get("summary_short") or "").strip().lower().startswith("notifies")
    )
    print(f"Rebuild complete: {len(docs)} total, {len(ns)} notifications, {notifies} with 'Notifies' detail.")


if __name__ == "__main__":
    main()