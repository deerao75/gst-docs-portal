"""
Generate 1–2 paragraph Show Summary text for all notifications → pdf_documents.json.
Run: python scripts/generate_notification_summaries.py
     python scripts/generate_notification_summaries.py --force
     python scripts/generate_notification_summaries.py --limit 10

Requires OPENAI_API_KEY in .env.local
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from generate_ai_summaries import (
    build_notification_index,
    build_prompt,
    extract_amendment_refs,
    lookup_parent_context,
    load_env_local,
    sanitize_result,
)
from ingest_notifications import extract_pdf_text
from summary_quality import is_generic_summary

DATA_JSON = os.path.join(ROOT, "data", "pdf_documents.json")

SYSTEM_PROMPT = """You are an Indian GST expert writing for chartered accountants, tax practitioners, and business clients.

Read the full notification text and write a clear summary of its gist for the "Show Summary" panel.

Rules:
- Return JSON: { "summary": "..." }
- Use 1 paragraph for short or single-topic notifications; use 2 paragraphs only when long or multi-topic.
- State only facts from the notification: what changed, who is affected, key dates, forms, rule/section references, rates, exemptions, table entries, districts/states if any.
- When parent notification context is supplied, explain the specific clause/table/proviso amended and the before/after change.
- Do NOT open with "Notification No. X under Central Tax notifies…" or similar boilerplate.
- Do NOT add generic compliance advice, penalty warnings, or "read the full notification".
- No bullet lists.
- Minimum 80 words when source text allows."""


def call_openai(prompt: str, api_key: str, model: str) -> str:
    payload = {
        "model": model,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    result = json.loads(body["choices"][0]["message"]["content"])
    return re.sub(r"\s+", " ", str(result.get("summary", ""))).strip()


def fallback_summary(doc: dict, text: str) -> str:
    short = (doc.get("summary_short") or doc.get("title") or "").strip()
    no = doc.get("notification_no") or "This notification"
    if text and len(text) >= 80 and doc.get("summary"):
        existing = (doc.get("summary") or "").strip()
        if len(existing) >= 100:
            return existing
    if short:
        return (
            f"{no} concerns {short.rstrip('.')}. "
            f"Read the full notification for operative provisions, dates, and references."
        )
    return f"{no}. Read the full notification for operative guidance."


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    load_env_local()
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini").strip()
    if not api_key:
        print("OPENAI_API_KEY not set in .env.local", file=sys.stderr)
        sys.exit(1)

    with open(DATA_JSON, encoding="utf-8") as f:
        docs = json.load(f)

    notifications = [
        d
        for d in docs
        if d.get("doc_type") == "notification" and d.get("status") == "ready"
    ]
    if args.limit:
        notifications = notifications[: args.limit]

    index = build_notification_index(docs)
    updated = 0
    skipped = 0
    errors = 0

    for idx, doc in enumerate(notifications, 1):
        doc_id = doc["id"]
        if doc.get("summary_manual") and not args.force:
            skipped += 1
            continue
        if (
            doc.get("summary")
            and not args.force
            and not is_generic_summary(doc.get("summary"))
        ):
            skipped += 1
            continue

        path = doc.get("file_path", "")
        text = extract_pdf_text(path, max_pages=10) if path and os.path.isfile(path) else ""

        try:
            if text and len(text) >= 80:
                refs = extract_amendment_refs(text)
                parent_context = lookup_parent_context(refs, index, doc_id)
                prompt = build_prompt(doc, text, parent_context)
                prompt += "\n\nWrite only the summary paragraph(s) for Show Summary (no key_points)."
                summary = call_openai(prompt, api_key, model)
                if len(summary) < 40 or is_generic_summary(summary):
                    summary = fallback_summary(doc, text)
            else:
                summary = fallback_summary(doc, text)

            for d in docs:
                if d.get("id") == doc_id:
                    d["summary"] = summary
                    break
            updated += 1
            print(f"  [{idx}/{len(notifications)}] {doc.get('notification_no')} — OK ({len(summary)} chars)")

            if updated % 25 == 0:
                with open(DATA_JSON, "w", encoding="utf-8") as f:
                    json.dump(docs, f, indent=2, ensure_ascii=False)
                print(f"  ... checkpoint saved ({updated} updated)")

            time.sleep(0.35)
        except urllib.error.HTTPError as exc:
            errors += 1
            summary = fallback_summary(doc, text)
            for d in docs:
                if d.get("id") == doc_id:
                    d["summary"] = summary
                    break
            updated += 1
            print(f"  [{idx}] API error, used fallback", file=sys.stderr)
            time.sleep(2)
        except Exception as exc:
            errors += 1
            print(f"  [{idx}] {doc.get('notification_no')} — {exc}", file=sys.stderr)

    with open(DATA_JSON, "w", encoding="utf-8") as f:
        json.dump(docs, f, indent=2, ensure_ascii=False)

    print(
        f"\nDone: {updated} updated, {skipped} skipped, {errors} errors "
        f"(total notifications: {len(notifications)})"
    )


if __name__ == "__main__":
    main()