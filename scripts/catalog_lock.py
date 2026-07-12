"""Prevent concurrent writers from corrupting pdf_documents.json."""
from __future__ import annotations

import os
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LOCK_PATH = os.path.join(ROOT, "data", ".catalog.lock")
STALE_MINUTES = 30


def acquire(label: str) -> bool:
    if os.path.exists(LOCK_PATH):
        age = (time.time() - os.path.getmtime(LOCK_PATH)) / 60
        if age < STALE_MINUTES:
            print(
                f"Another catalog operation is running ({label}, lock {age:.1f} min old). "
                "Wait for it to finish.",
                flush=True,
            )
            return False
        try:
            os.remove(LOCK_PATH)
        except OSError:
            return False
    with open(LOCK_PATH, "w", encoding="utf-8") as f:
        f.write(label)
    return True


def release() -> None:
    try:
        if os.path.exists(LOCK_PATH):
            os.remove(LOCK_PATH)
    except OSError:
        pass


def save_json_atomic(path: str, records: list) -> None:
    import json

    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
    os.replace(tmp, path)