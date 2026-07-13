"""
Audit summary quality for notifications, circulars, and orders in pdf_documents.json.

Run: python scripts/audit_summaries.py
"""
from __future__ import annotations

import json
import os
import re
import statistics
import sys
from dataclasses import dataclass, field
from typing import Any

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from summary_quality import is_generic_summary

DATA_JSON = os.path.join(ROOT, "data", "pdf_documents.json")
TARGET_TYPES = ("notification", "circular", "order")

# Opening pattern matchers (first 80 chars, case-insensitive)
BOILERPLATE_RE = re.compile(
    r"^(?:"
    r"Notification\s+No\.|"
    r"(?:CGST|IGST|UTGST|GST)?\s*Circular\s+No\.|"
    r"Order\s+No\.|"
    r"(?:Central|Integrated|Union\s+Territory)\s+Tax\s+No\."
    r")",
    re.I,
)

FORMAL_OPENER_RE = re.compile(
    r"^(?:The\s+Government|This\s+(?:notification|circular|order)\b)",
    re.I,
)

SUBJECT_MATTER_RE = re.compile(
    r"^(?:"
    r"Amends?|Extends?|Waives?|Exempts?|Clarif(?:y|ies|ication)|Withdraws?|"
    r"Notif(?:y|ies|ication)|Prescribes?|Assigns?|Authoris(?:e|es)|"
    r"Appoints?|Revis(?:e|es)|Modif(?:y|ies)|Deletes?|Inserts?|"
    r"Supersedes?|Cancels?|Revokes?|Issues?|Directs?|Orders?|"
    r"Provides?|Seeks?|Invites?|Communicates?|Deals?\s+with|"
    r"Extension|Withdrawal|Clarification|Authorisation|Appointment"
    r")",
    re.I,
)

GRAMMAR_CHECKS = [
    ("double_spaces", re.compile(r"  +")),
    ("space_before_period", re.compile(r" \.")),
    ("space_before_comma", re.compile(r" ,")),
    ("repeated_the", re.compile(r"\bthe\s+the\b", re.I)),
    ("repeated_a", re.compile(r"\ba\s+a\b", re.I)),
]


@dataclass
class DocRecord:
    notification_no: str
    summary: str
    word_count: int
    opening_pattern: str
    is_generic: bool
    grammar_flags: list[str] = field(default_factory=list)
    worst_score: int = 0
    worst_reasons: list[str] = field(default_factory=list)


def word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text))


def classify_opening(summary: str, doc_type: str) -> str:
    head = (summary or "").strip()[:80]
    if not head:
        return "empty"
    if BOILERPLATE_RE.match(head):
        return "boilerplate_no"
    if FORMAL_OPENER_RE.match(head):
        return "formal_this"
    if SUBJECT_MATTER_RE.match(head):
        return "subject_matter"
    return "other"


def grammar_red_flags(summary: str) -> list[str]:
    flags: list[str] = []
    for name, pattern in GRAMMAR_CHECKS:
        if pattern.search(summary):
            flags.append(name)
    return flags


def worst_score(
    *,
    is_generic: bool,
    wc: int,
    opening: str,
    grammar_flags: list[str],
) -> tuple[int, list[str]]:
    score = 0
    reasons: list[str] = []

    if is_generic:
        score += 100
        reasons.append("generic")
    if wc < 60:
        score += 50
        reasons.append(f"too_short({wc}w)")
    elif wc < 80:
        score += 20
        reasons.append(f"under_80w({wc}w)")
    if opening == "boilerplate_no":
        score += 40
        reasons.append("boilerplate_opener")
    if grammar_flags:
        score += 10 * len(grammar_flags)
        reasons.append(f"grammar({','.join(grammar_flags)})")

    return score, reasons


def good_score(
    *,
    is_generic: bool,
    wc: int,
    opening: str,
    grammar_flags: list[str],
) -> int:
    if is_generic or wc < 80 or opening == "boilerplate_no" or grammar_flags:
        return -1
    score = wc
    if opening == "subject_matter":
        score += 30
    elif opening == "formal_this":
        score += 10
    return score


def median_or_zero(values: list[int]) -> float:
    return statistics.median(values) if values else 0.0


def load_ready_docs() -> dict[str, list[dict[str, Any]]]:
    with open(DATA_JSON, encoding="utf-8") as f:
        all_docs = json.load(f)

    grouped: dict[str, list[dict[str, Any]]] = {t: [] for t in TARGET_TYPES}
    for doc in all_docs:
        doc_type = doc.get("doc_type")
        if doc_type in grouped and doc.get("status") == "ready":
            grouped[doc_type].append(doc)
    return grouped


def analyze_doc_type(docs: list[dict[str, Any]], doc_type: str) -> dict[str, Any]:
    total = len(docs)
    with_summary = 0
    missing_summary = 0
    generic_count = 0

    opening_counts = {
        "boilerplate_no": 0,
        "formal_this": 0,
        "subject_matter": 0,
        "other": 0,
        "empty": 0,
    }

    word_counts: list[int] = []
    under_60 = 0
    under_80 = 0

    grammar_totals = {name: 0 for name, _ in GRAMMAR_CHECKS}
    records: list[DocRecord] = []

    for doc in docs:
        summary = (doc.get("summary") or "").strip()
        notification_no = doc.get("notification_no") or doc.get("file_name") or "(unknown)"

        if summary:
            with_summary += 1
        else:
            missing_summary += 1

        generic = is_generic_summary(summary)
        if generic:
            generic_count += 1

        opening = classify_opening(summary, doc_type)
        opening_counts[opening] += 1

        wc = word_count(summary) if summary else 0
        if summary:
            word_counts.append(wc)
            if wc < 60:
                under_60 += 1
            if wc < 80:
                under_80 += 1

        gflags = grammar_red_flags(summary) if summary else []
        for flag in gflags:
            grammar_totals[flag] += 1

        wscore, reasons = worst_score(
            is_generic=generic,
            wc=wc,
            opening=opening,
            grammar_flags=gflags,
        )

        records.append(
            DocRecord(
                notification_no=notification_no,
                summary=summary,
                word_count=wc,
                opening_pattern=opening,
                is_generic=generic,
                grammar_flags=gflags,
                worst_score=wscore,
                worst_reasons=reasons,
            )
        )

    worst = sorted(records, key=lambda r: (-r.worst_score, r.word_count, r.notification_no))[:15]

    good_candidates = [
        r
        for r in records
        if good_score(
            is_generic=r.is_generic,
            wc=r.word_count,
            opening=r.opening_pattern,
            grammar_flags=r.grammar_flags,
        )
        >= 0
    ]
    good = sorted(
        good_candidates,
        key=lambda r: (
            -good_score(
                is_generic=r.is_generic,
                wc=r.word_count,
                opening=r.opening_pattern,
                grammar_flags=r.grammar_flags,
            ),
            r.notification_no,
        ),
    )[:3]

    return {
        "doc_type": doc_type,
        "total": total,
        "with_summary": with_summary,
        "missing_summary": missing_summary,
        "generic_count": generic_count,
        "opening_counts": opening_counts,
        "word_stats": {
            "min": min(word_counts) if word_counts else 0,
            "max": max(word_counts) if word_counts else 0,
            "median": median_or_zero(word_counts),
            "under_60": under_60,
            "under_80": under_80,
            "count_with_summary": len(word_counts),
        },
        "grammar_totals": grammar_totals,
        "worst": worst,
        "good": good,
    }


def truncate(text: str, limit: int = 200) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


def print_report(results: list[dict[str, Any]]) -> None:
    print("=" * 72)
    print("SUMMARY AUDIT REPORT — notifications, circulars, orders (status=ready)")
    print("=" * 72)

    for result in results:
        dt = result["doc_type"].upper()
        print(f"\n{'─' * 72}")
        print(f"  {dt}")
        print(f"{'─' * 72}")

        print(f"\n1. COUNTS")
        print(f"   Total:              {result['total']}")
        print(f"   With summary:       {result['with_summary']}")
        print(f"   Missing summary:    {result['missing_summary']}")
        print(f"   Flagged generic:    {result['generic_count']}")

        print(f"\n2. OPENING PATTERN (first 80 chars)")
        oc = result["opening_counts"]
        print(f"   Boilerplate No.:    {oc['boilerplate_no']}")
        print(f"   Formal This/The:    {oc['formal_this']}")
        print(f"   Subject matter:     {oc['subject_matter']}")
        print(f"   Other:              {oc['other']}")
        print(f"   Empty:              {oc['empty']}")

        ws = result["word_stats"]
        print(f"\n3. WORD COUNT STATS (docs with summary)")
        print(f"   Min:                {ws['min']}")
        print(f"   Max:                {ws['max']}")
        print(f"   Median:             {ws['median']:.1f}")
        print(f"   Under 60 words:     {ws['under_60']}")
        print(f"   Under 80 words:     {ws['under_80']}")

        print(f"\n4. GRAMMAR RED FLAGS")
        gt = result["grammar_totals"]
        for name, count in gt.items():
            print(f"   {name:20s} {count}")

        print(f"\n5. TOP 15 WORST EXAMPLES")
        for i, rec in enumerate(result["worst"], 1):
            reasons = ", ".join(rec.worst_reasons) or "n/a"
            print(f"   {i:2d}. {rec.notification_no}")
            print(f"       score={rec.worst_score} | {rec.word_count}w | opener={rec.opening_pattern} | {reasons}")
            if rec.summary:
                print(f"       {truncate(rec.summary, 220)}")

        print(f"\n6. SAMPLE GOOD EXAMPLES (up to 3)")
        if not result["good"]:
            print("   (none found matching criteria: non-generic, >=80w, no boilerplate opener, no grammar flags)")
        for i, rec in enumerate(result["good"], 1):
            print(f"   {i}. {rec.notification_no} ({rec.word_count}w, opener={rec.opening_pattern})")
            print(f"      {truncate(rec.summary, 280)}")

    print(f"\n{'=' * 72}")
    print("END OF REPORT")
    print("=" * 72)


def main() -> None:
    grouped = load_ready_docs()
    results = [analyze_doc_type(grouped[t], t) for t in TARGET_TYPES]
    print_report(results)


if __name__ == "__main__":
    main()