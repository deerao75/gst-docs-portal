"""
Extract withdrawn / rescinded / amended status for notifications and circulars.
Run: python scripts/extract_document_legal_status.py

Writes legal_status onto each record in data/pdf_documents.json
(skips records with legal_status_manual).
"""
from __future__ import annotations

import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(ROOT, "data")
DOCS_JSON = os.path.join(DATA_DIR, "pdf_documents.json")
CHANGES_JSON = os.path.join(DATA_DIR, "notification_changes.json")

sys.path.insert(0, os.path.dirname(__file__))
from summarize_notification import clean_text

WITHDRAWAL_HINT = re.compile(
    r"withdraw(?:al|n|ed|s)?\s+of\s+(?:the\s+)?(?:circular|notification)",
    re.I,
)


def ref_from_doc(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "notification_no": doc.get("notification_no"),
        "title": doc.get("summary_short") or doc.get("title"),
        "issued_date": doc.get("issued_date"),
    }


def normalize_key(s: str) -> str:
    return re.sub(r"\s+", " ", clean_text(s).lower())


def build_lookup(docs: list[dict]) -> dict[str, list[dict]]:
    lookup: dict[str, list[dict]] = {}
    for doc in docs:
        no = doc.get("notification_no")
        if no:
            lookup.setdefault(normalize_key(no), []).append(doc)
        fn = os.path.splitext(doc.get("file_name") or "")[0]
        if fn:
            lookup.setdefault(normalize_key(fn), []).append(doc)
    return lookup


def extract_withdrawal_refs(text: str) -> list[str]:
    refs: list[str] = []
    patterns = [
        r"withdraw(?:al|n|ed|s)?\s+of\s+(?:circular|notification)\s+no\.?\s*([^–—\n]{6,80})",
        r"withdraw(?:al|n|ed|s)?\s+of\s+(?:the\s+)?(?:circular|notification)\s+([^–—\n]{6,80})",
    ]
    for pat in patterns:
        for m in re.finditer(pat, text, re.I):
            chunk = clean_text(m.group(1))
            chunk = re.split(r"\s+dated\b", chunk, flags=re.I)[0].strip(" .,-")
            if chunk and chunk not in refs:
                refs.append(chunk)
    return refs


def resolve_ref_string(ref: str, docs: list[dict], lookup: dict) -> list[dict]:
    ref_clean = normalize_key(ref)
    if ref_clean in lookup:
        return lookup[ref_clean]

    num_year = re.search(r"(\d+)\s*/\s*(\d{4})", ref)
    if num_year:
        num, year = int(num_year.group(1)), int(num_year.group(2))
        hits = []
        for doc in docs:
            parsed = re.match(r"(\d+)/(\d{4})", doc.get("notification_no") or "")
            if parsed and int(parsed.group(1)) == num and int(parsed.group(2)) == year:
                hits.append(doc)
        if len(hits) == 1:
            return hits
        if hits:
            return hits

    partial = [d for d in docs if ref_clean[:20] in normalize_key(d.get("notification_no") or "")]
    return partial[:3]


def resolve_doc_by_notification(
    notification_no: str | None,
    category: str | None,
    docs: list[dict],
    *,
    prefer_non_corrigendum: bool = True,
) -> dict | None:
    if not notification_no:
        return None
    matches = [
        d
        for d in docs
        if d.get("notification_no") == notification_no
        and (not category or d.get("category") == category)
    ]
    if prefer_non_corrigendum:
        non_corr = [d for d in matches if not d.get("is_corrigendum")]
        if len(non_corr) == 1:
            return non_corr[0]
        if non_corr:
            return min(non_corr, key=lambda x: x.get("issued_date") or "9999")
    if len(matches) == 1:
        return matches[0]
    if matches:
        return min(matches, key=lambda x: x.get("issued_date") or "9999")
    return None


def resolve_amendment_target_id(record: dict, docs: list[dict]) -> int | None:
    """
    Map a notification_changes record to the current parent notification id.
    After re-ingest, numeric ids shift but notification_no + category stay stable.
    """
    record_id = record.get("original_id")
    record_no = (record.get("original_notification_no") or "").strip()
    if not record_no:
        return record_id

    amendments = record.get("amendments") or []
    target_cat = None
    for amend in amendments:
        target_cat = amend.get("amending_category")
        if target_cat:
            break

    doc_by_id = {d["id"]: d for d in docs}
    direct = doc_by_id.get(record_id) if record_id else None
    if (
        direct
        and direct.get("notification_no") == record_no
        and not direct.get("is_corrigendum")
    ):
        return direct["id"]

    parents = [
        d
        for d in docs
        if d.get("notification_no") == record_no
        and not d.get("is_corrigendum")
        and (not target_cat or d.get("category") == target_cat)
    ]
    if len(parents) == 1:
        return parents[0]["id"]
    if parents:
        return min(parents, key=lambda x: x.get("issued_date") or "9999")["id"]
    return record_id


def load_notification_amendments(docs: list[dict]) -> dict[int, list[dict]]:
    if not os.path.isfile(CHANGES_JSON):
        return {}
    with open(CHANGES_JSON, encoding="utf-8") as f:
        payload = json.load(f)
    doc_by_id = {d["id"]: d for d in docs}
    by_id: dict[int, list[dict]] = {}
    for _doc_id_str, record in payload.get("documents", {}).items():
        target_id = resolve_amendment_target_id(record, docs)
        if target_id is None:
            continue
        target_doc = doc_by_id.get(target_id)
        target_cat = target_doc.get("category") if target_doc else None
        entries = []
        for a in record.get("amendments") or []:
            # A notification may only be amended within its own category.
            if target_cat and a.get("amending_category") != target_cat:
                continue
            amending_doc = doc_by_id.get(a.get("amending_id"))
            if (
                amending_doc
                and amending_doc.get("notification_no")
                != a.get("amending_notification_no")
            ):
                amending_doc = None
            if not amending_doc:
                amending_doc = resolve_doc_by_notification(
                    a.get("amending_notification_no"),
                    a.get("amending_category"),
                    docs,
                    prefer_non_corrigendum=not a.get("is_corrigendum"),
                )
            entries.append(
                {
                    "id": amending_doc["id"] if amending_doc else a.get("amending_id"),
                    "notification_no": a.get("amending_notification_no"),
                    "title": a.get("amending_title"),
                    "issued_date": a.get("amending_date"),
                    "category": a.get("amending_category"),
                    "year": a.get("amending_year"),
                    "note": a.get("change_description"),
                }
            )
        if entries:
            existing = by_id.get(target_id, [])
            by_id[target_id] = dedupe_refs(existing + entries)
    return by_id


def scan_circular_amendments(docs: list[dict], lookup: dict) -> dict[int, list[dict]]:
    circulars = [d for d in docs if d.get("doc_type") == "circular"]
    by_target: dict[int, list[dict]] = {}
    amend_re = re.compile(
        r"(?:amend(?:ment|s|ed)?|clarif(?:ication|ies)|modif(?:ication|ies))\s+"
        r"(?:to|of)\s+circular\s+no\.?\s*([^,\n]{6,60})",
        re.I,
    )
    for doc in circulars:
        hay = " ".join(
            filter(
                None,
                [
                    doc.get("title"),
                    doc.get("summary_short"),
                    doc.get("summary"),
                ],
            )
        )
        for m in amend_re.finditer(hay):
            for target in resolve_ref_string(m.group(1), docs, lookup):
                if target["id"] == doc["id"]:
                    continue
                by_target.setdefault(target["id"], []).append(ref_from_doc(doc))
    return by_target


def dedupe_refs(refs: list[dict]) -> list[dict]:
    seen: set[int] = set()
    out: list[dict] = []
    for r in refs:
        rid = r.get("id")
        if rid is None or rid in seen:
            continue
        seen.add(rid)
        out.append(r)
    return out


def main() -> None:
    with open(DOCS_JSON, encoding="utf-8") as f:
        docs = json.load(f)

    ready = [d for d in docs if d.get("status") == "ready"]
    lookup = build_lookup(ready)
    notif_amended = load_notification_amendments(ready)
    circular_amended = scan_circular_amendments(ready, lookup)

    withdrawn_by_source: dict[int, list[dict]] = {}
    withdrawal_targets_by_source: dict[int, list[dict]] = {}

    for doc in ready:
        if doc.get("doc_type") not in ("notification", "circular"):
            continue
        hay = " ".join(
            filter(
                None,
                [doc.get("title"), doc.get("summary_short"), doc.get("summary")],
            )
        )
        if not WITHDRAWAL_HINT.search(hay):
            continue
        refs = extract_withdrawal_refs(hay)
        targets: list[dict] = []
        for ref in refs:
            for target in resolve_ref_string(ref, ready, lookup):
                if target["id"] != doc["id"]:
                    targets.append(ref_from_doc(target))
        targets = dedupe_refs(targets)
        if targets:
            withdrawal_targets_by_source[doc["id"]] = targets
            for t in targets:
                withdrawn_by_source.setdefault(t["id"], []).append(ref_from_doc(doc))

    updated = 0
    skipped_manual = 0
    for doc in docs:
        if doc.get("legal_status_manual"):
            skipped_manual += 1
            continue
        if doc.get("doc_type") not in ("notification", "circular"):
            continue
        if doc.get("status") != "ready":
            continue

        doc_id = doc["id"]
        withdrawn_targets = dedupe_refs(withdrawal_targets_by_source.get(doc_id, []))
        rescinded_by = dedupe_refs(withdrawn_by_source.get(doc_id, []))

        # Notifications: only later notifications in the same category amend this one.
        if doc.get("doc_type") == "notification":
            amended_by = dedupe_refs(notif_amended.get(doc_id) or [])
        else:
            amended_by = dedupe_refs(
                (circular_amended.get(doc_id) or []) + (rescinded_by or [])
            )

        button_label = None
        if amended_by:
            button_label = "amended"
        elif rescinded_by:
            button_label = "rescinded"
        elif withdrawn_targets:
            button_label = "withdrawn"

        status: dict = {}
        if button_label:
            status["button_label"] = button_label
        if withdrawn_targets:
            status["withdrawn_targets"] = withdrawn_targets
        if rescinded_by:
            status["rescinded_by"] = rescinded_by
        if amended_by:
            status["amended_by"] = amended_by

        if status:
            doc["legal_status"] = status
            updated += 1
        else:
            doc.pop("legal_status", None)

    with open(DOCS_JSON, "w", encoding="utf-8") as f:
        json.dump(docs, f, indent=2, ensure_ascii=False)

    print(
        f"Updated legal_status on {updated} documents "
        f"({skipped_manual} manual overrides kept)"
    )


if __name__ == "__main__":
    main()