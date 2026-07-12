"""
Scan all notification PDFs (full text) and build amendment index from legal content.
Run: python scripts/extract_notification_changes.py
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from notification_category import CATEGORY_LABELS
from summarize_notification import (
    clean_text,
    describe_operative_effect,
    extract_amended_ref,
    is_corrigendum_file,
)

try:
    from pypdf import PdfReader
except ImportError:
    from PyPDF2 import PdfReader

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(ROOT, "data")
IN_JSON = os.path.join(DATA_DIR, "pdf_documents.json")
OUT_JSON = os.path.join(DATA_DIR, "notification_changes.json")

LABEL_TO_CATEGORY = [
    ("central tax (rate)", "central_tax_rate"),
    ("integrated tax (rate)", "integrated_tax_rate"),
    ("union territory tax (rate)", "union_territory_tax_rate"),
    ("compensation cess (rate)", "compensation_cess_rate"),
    ("central tax", "central_tax"),
    ("integrated tax", "integrated_tax"),
    ("union territory tax", "union_territory_tax"),
    ("compensation cess", "compensation_cess"),
    ("goods and services tax compensation", "compensation_cess"),
]

# Operative legal effects: amendment, substitution, withdrawal, supersession, rescission, etc.
AMENDMENT_MARKERS = re.compile(
    r"amend(?:s|ed|ment|ing)?|substitut(?:e|ed|ion|ing)?|"
    r"shall\s+be\s+(?:inserted|substituted|omitted|added|deleted|replaced)|"
    r"in\s+the\s+said\s+notification|in\s+notification\s+no\.?|"
    r"corrigendum|rectif(?:y|ication)|"
    r"supersed(?:e|ed|es|ing)?|supersession|shall\s+stand\s+superseded|"
    r"modif(?:y|ies|ication)|rescind(?:ed|ing|ment)?|"
    r"withdraw(?:al|n|ed|s)?(?:\s+of)?|"
    r"stand\s+rescinded|stand\s+withdrawn|withdrawn\s+with\s+immediate\s+effect|"
    r"is\s+hereby\s+(?:withdrawn|rescinded|superseded)|"
    r"are\s+hereby\s+(?:withdrawn|rescinded)|"
    r"repeal(?:ed|ing)?|cancel(?:led|lation)?",
    re.I,
)

OPERATIVE_EFFECT = re.compile(
    r"shall\s+be\s+(?:inserted|substituted|omitted|deleted|replaced)|"
    r"is\s+hereby\s+(?:amended|modified|rescinded|withdrawn|superseded)|"
    r"are\s+hereby\s+(?:amended|modified|rescinded|withdrawn)|"
    r"shall\s+stand\s+superseded|stand\s+(?:rescinded|withdrawn|superseded)|"
    r"withdraw(?:al|n)\s+of\s+(?:the\s+)?notification",
    re.I,
)

# Prior-notification citations, not operative amendments by this notification.
HISTORICAL_CITATION = re.compile(
    r"(?:were\s+)?la?\s*st\s+amended\s*,?\s*(?:vide|by)\s+notification|"
    r"as\s+amended\s+from\s+time\s+to\s+time|"
    r"originally\s+published[^.]{0,120}?and\s+(?:were\s+)?la?\s*st\s+amended",
    re.I,
)

REF_PATTERNS = [
    re.compile(
        r"notification\s*(?:no\.?|number)\s*(\d+)\s*/\s*(\d{4})\s*[-–]?\s*([^,(\n]{3,120})",
        re.I,
    ),
    re.compile(
        r"notification\s+of\s+the\s+Government[\s\S]{0,300}?No\.?\s*(\d+)\s*/\s*(\d{4})\s*[-–]?\s*([^,(\n]{3,120})",
        re.I,
    ),
    re.compile(
        r"published[^,]{0,120}?No\.?\s*(\d+)\s*/\s*(\d{4})\s*[-–]?\s*([^,(\n]{3,120})",
        re.I,
    ),
    re.compile(
        r"in\s+the\s+said\s+notification[^,]{0,80}?No\.?\s*(\d+)\s*/\s*(\d{4})\s*[-–]?\s*([^,(\n]{3,120})",
        re.I,
    ),
    re.compile(
        r"withdraw(?:al|n|ed|s)?\s+of\s+(?:the\s+)?notification\s*(?:no\.?|number)\s*"
        r"(\d+)\s*/\s*(\d{4})\s*[-–]?\s*([^,(\n]{3,120})",
        re.I,
    ),
    re.compile(
        r"supersession\s+of\s+(?:the\s+)?notification\s*(?:no\.?|number)\s*"
        r"(\d+)\s*/\s*(\d{4})\s*[-–]?\s*([^,(\n]{3,120})",
        re.I,
    ),
]


def extract_pdf_text(path: str, max_chars: int = 120_000) -> str:
    try:
        reader = PdfReader(path)
        chunks: List[str] = []
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


def parse_doc_number(notification_no: str) -> Optional[Tuple[int, int]]:
    m = re.match(r"(\d+)/(\d{4})", notification_no or "")
    if not m:
        return None
    return int(m.group(1)), int(m.group(2))


def label_to_category(label: str) -> Optional[str]:
    l = clean_text(label).lower()
    for key, cat in LABEL_TO_CATEGORY:
        if key in l:
            return cat
    return None


def footer_note_start(text: str) -> Optional[int]:
    """Footer Note blocks are bibliographic — never used to infer amendment targets."""
    m = re.search(r"\bnote\s*:", text, re.I)
    return m.start() if m else None


def is_historical_citation(text: str, start: int, end: int) -> bool:
    """True when the reference cites a prior amendment, not an action by this notification."""
    snippet = clean_text(text[max(0, start - 200) : start + 60])
    if not HISTORICAL_CITATION.search(snippet):
        return False
    after = clean_text(text[end : min(len(text), end + 220)])
    return not OPERATIVE_EFFECT.search(after)


def has_amendment_context(text: str, start: int, end: int, window: int = 450) -> bool:
    note_at = footer_note_start(text)
    if note_at is not None and start >= note_at:
        return False
    if is_historical_citation(text, start, end):
        return False
    snippet = text[max(0, start - window) : min(len(text), end + window)]
    if not AMENDMENT_MARKERS.search(snippet):
        return False
    # Require operative language near the reference, not a bare citation.
    return bool(OPERATIVE_EFFECT.search(snippet)) or bool(
        re.search(
            r"amend(?:s|ment|ing)\s+(?:to|of)\s+(?:the\s+)?notification|"
            r"in\s+the\s+said\s+notification[^.]{0,120}shall\s+be|"
            r"withdraw(?:al|n)\s+of\s+(?:the\s+)?notification|"
            r"supersession\s+of\s+(?:the\s+)?notification|"
            r"corrigendum",
            snippet,
            re.I,
        )
    )


def clean_ref_label(label: str) -> str:
    label = clean_text(label)
    label = re.split(r"\s+dated\b", label, flags=re.I)[0].strip()
    label = re.split(r"\s+published\b", label, flags=re.I)[0].strip()
    label = re.split(r"\s+except\b", label, flags=re.I)[0].strip()
    return label.strip(" .,-")


def extract_all_amended_refs(text: str) -> List[Tuple[int, int, str, int, int]]:
    """Return (num, year, label, match_start, match_end) only with amendment context."""
    refs: List[Tuple[int, int, str, int, int]] = []
    seen = set()

    for pat in REF_PATTERNS:
        for m in pat.finditer(text):
            if not has_amendment_context(text, m.start(), m.end()):
                continue
            num = int(m.group(1))
            year = int(m.group(2))
            label = clean_ref_label(m.group(3))
            key = (num, year, label.lower()[:60])
            if key in seen:
                continue
            seen.add(key)
            refs.append((num, year, label, m.start(), m.end()))

    return refs


def describe_change_near_match(
    text: str,
    start: int,
    end: int,
    category: str,
    is_corr: bool,
    amended_ref: Optional[str],
) -> str:
    window = text[max(0, start - 280) : min(len(text), end + 700)]
    if is_corr:
        fixes = re.findall(
            r"for\s+[“\"']([^”\"']+)[”\"'],\s*(?:read|substituted\s+with)\s+[“\"']([^”\"']+)[”\"']",
            window,
            re.I,
        )
        if fixes:
            a, b = fixes[0]
            return (
                f"Corrects text in Notification No. {amended_ref or 'parent'}: "
                f'"{a}" replaced with "{b}".'
            )
        return (
            f"Corrigendum correcting published text in Notification No. "
            f"{amended_ref or 'parent'}."
        )

    operative = describe_operative_effect(window, category, False)
    if operative and len(operative) > 30:
        return operative

    sentences = re.split(r"(?<=[.!?])\s+", window)
    for sentence in sentences:
        if AMENDMENT_MARKERS.search(sentence) and len(sentence) > 40:
            s = clean_text(sentence)
            return s[:280] + ("…" if len(s) > 280 else "")

    return describe_operative_effect(text, category, is_corr)


def resolve_targets(
    num: int,
    year: int,
    label: str,
    docs: List[dict],
    amending_doc: dict,
) -> List[dict]:
    """
    Resolve amendment targets strictly within the amending notification's category.
    A Central Tax notification can only be amended by a later Central Tax notification;
    likewise for each category (including Rate variants).
    """
    amending_cat = amending_doc.get("category")
    if not amending_cat:
        return []

    amending_id = amending_doc["id"]
    cat_hint = label_to_category(label)

    # Text may cite a parallel CGST/IGST/UTGST notification number — ignore if the
    # extracted label points to a different category than the amending notification.
    if cat_hint and cat_hint != amending_cat:
        return []

    candidates: List[dict] = []
    for doc in docs:
        if doc["id"] == amending_id:
            continue
        parsed = parse_doc_number(doc.get("notification_no") or "")
        if not parsed or parsed[0] != num or parsed[1] != year:
            continue
        if doc.get("category") != amending_cat:
            continue
        candidates.append(doc)

    if len(candidates) > 1:
        non_corr = [d for d in candidates if not d.get("is_corrigendum")]
        if len(non_corr) == 1:
            return non_corr
        if non_corr:
            candidates = non_corr

    return candidates


def is_subsequent_amendment(amending: dict, target: dict) -> bool:
    ad = amending.get("issued_date") or ""
    td = target.get("issued_date") or ""
    if ad and td:
        if ad > td:
            return True
        if ad < td:
            # Fall through: issued_date in the catalog can be a placeholder.
            pass
        else:
            return True
    ap = parse_doc_number(amending.get("notification_no") or "")
    tp = parse_doc_number(target.get("notification_no") or "")
    if ap and tp and ap[1] == tp[1]:
        if ap[0] > tp[0]:
            return True
        if ap[0] < tp[0]:
            return False
    return amending.get("id", 0) > target.get("id", 0)


def find_parent_by_notification_key(doc: dict, docs: List[dict]) -> Optional[dict]:
    key = (doc.get("notification_no"), doc.get("category"))
    for other in docs:
        if other["id"] == doc["id"]:
            continue
        if other.get("is_corrigendum"):
            continue
        if (other.get("notification_no"), other.get("category")) == key:
            return other
    return None


def main() -> None:
    with open(IN_JSON, encoding="utf-8") as f:
        docs = [d for d in json.load(f) if d.get("doc_type") == "notification"]

    print(f"Reading full text of {len(docs)} notifications…")
    amendments_by_target: Dict[int, List[dict]] = {}
    errors = 0

    for idx, doc in enumerate(docs, 1):
        try:
            path = doc.get("file_path")
            if not path or not os.path.isfile(path):
                continue

            text = extract_pdf_text(path)
            if not text:
                continue

            is_corr = bool(doc.get("is_corrigendum")) or is_corrigendum_file(
                doc.get("file_name", "")
            )
            amended_ref = extract_amended_ref(text)
            category = doc.get("category") or "central_tax"
            targets: Dict[int, dict] = {}

            for num, year, label, mstart, mend in extract_all_amended_refs(text):
                change_desc = describe_change_near_match(
                    text, mstart, mend, category, is_corr, amended_ref
                )
                for target in resolve_targets(num, year, label, docs, doc):
                    if target.get("category") != doc.get("category"):
                        continue
                    if not is_subsequent_amendment(doc, target):
                        continue
                    targets[target["id"]] = target
                    entry = {
                        "amending_id": doc["id"],
                        "amending_notification_no": doc.get("notification_no"),
                        "amending_title": doc.get("title") or doc.get("summary_short"),
                        "amending_date": doc.get("issued_date"),
                        "amending_category": doc.get("category"),
                        "amending_year": doc.get("year"),
                        "change_description": change_desc,
                        "is_corrigendum": is_corr,
                    }
                    amendments_by_target.setdefault(target["id"], []).append(entry)

            if is_corr:
                parent = find_parent_by_notification_key(doc, docs)
                corr_desc = describe_change_near_match(
                    text, 0, min(400, len(text)), category, True, amended_ref
                )
                entry = {
                    "amending_id": doc["id"],
                    "amending_notification_no": doc.get("notification_no"),
                    "amending_title": doc.get("title") or doc.get("summary_short"),
                    "amending_date": doc.get("issued_date"),
                    "amending_category": doc.get("category"),
                    "amending_year": doc.get("year"),
                    "change_description": corr_desc,
                    "is_corrigendum": True,
                }
                if parent and is_subsequent_amendment(doc, parent):
                    amendments_by_target.setdefault(parent["id"], []).append(entry)
                elif amended_ref:
                    m = re.match(r"(\d+)/(\d{4})", amended_ref)
                    label_tail = (
                        amended_ref.split("-", 1)[-1] if "-" in amended_ref else ""
                    )
                    if m:
                        for target in resolve_targets(
                            int(m.group(1)),
                            int(m.group(2)),
                            label_tail,
                            docs,
                            doc,
                        ):
                            if target.get("category") != doc.get("category"):
                                continue
                            if is_subsequent_amendment(doc, target):
                                amendments_by_target.setdefault(target["id"], []).append(
                                    entry
                                )

        except Exception as exc:
            errors += 1
            print(f"Error on {doc.get('file_name')}: {exc}", file=sys.stderr)

        if idx % 100 == 0:
            print(f"  Processed {idx}/{len(docs)}")

    output_docs = {}
    for doc in docs:
        entries = amendments_by_target.get(doc["id"], [])
        unique: List[dict] = []
        seen_ids = set()
        for e in sorted(
            entries,
            key=lambda x: (x.get("amending_date") or "", x.get("amending_id", 0)),
            reverse=True,
        ):
            aid = e["amending_id"]
            if aid in seen_ids:
                continue
            seen_ids.add(aid)
            unique.append(e)

        output_docs[str(doc["id"])] = {
            "has_changes": len(unique) > 0,
            "original_id": doc["id"],
            "original_notification_no": doc.get("notification_no"),
            "original_title": doc.get("title") or doc.get("summary_short"),
            "amendments": unique,
        }

    payload = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_notifications": len(docs),
        "notifications_with_changes": sum(
            1 for v in output_docs.values() if v["has_changes"]
        ),
        "documents": output_docs,
    }

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(
        f"Wrote {OUT_JSON}: {payload['notifications_with_changes']} notifications "
        f"amended by subsequent notifications ({errors} errors)"
    )


if __name__ == "__main__":
    main()