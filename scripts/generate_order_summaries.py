"""
Generate 1–2 paragraph Show Summary text for all orders → pdf_documents.json.
Run: python scripts/generate_order_summaries.py
     python scripts/generate_order_summaries.py --force
     python scripts/generate_order_summaries.py --limit 10

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

from generate_circular_summaries import extract_full_pdf_text, load_env_local
from ingest_orders import extract_pdf_text
from summary_quality import is_generic_summary

ORDER_LABEL = "GST"

DATA_JSON = os.path.join(ROOT, "data", "pdf_documents.json")

SYSTEM_PROMPT = """You are an Indian GST expert writing for chartered accountants, tax practitioners, and business clients.

Read the full GST order text supplied and write a clear summary of what the order does.

Rules:
- Return JSON only: { "summary": "..." }
- Use 1 paragraph for short or single-topic orders; use 2 paragraphs only when long or multi-topic.
- State only facts from the order: subject matter, extended deadlines with exact dates, forms (e.g. GST TRAN-1, CMP-03), rules/sections cited, superseded prior orders, authorised officers or committees, and who is affected.
- Do NOT add generic compliance advice, penalty warnings, or phrases like "taxpayers should ensure" or "read the full order".
- Do NOT repeat the order number as a boilerplate opener.
- Minimum 80 words when the source text allows."""


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


def build_prompt(doc: dict, text: str) -> str:
    label = ORDER_LABEL
    parts = [
        f"Order No.: {doc.get('notification_no')}",
        f"Category: {label}",
        f"Year: {doc.get('year')}",
        f"Issued date: {doc.get('issued_date')}",
        f"List title: {doc.get('summary_short') or doc.get('title') or ''}",
        "",
        "Full order text:",
        text or "(No extractable text — use list title and order number only.)",
    ]
    return "\n".join(parts)


def fallback_summary(doc: dict, text: str) -> str:
    title = (doc.get("summary_short") or doc.get("title") or "").strip()
    no = doc.get("notification_no") or "This order"
    if title and title != no:
        return f"{no} — {title.rstrip('.')}."
    return f"{no}."


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

    orders = [
        d
        for d in docs
        if d.get("doc_type") == "order" and d.get("status") == "ready"
    ]
    if args.limit:
        orders = orders[: args.limit]

    updated = 0
    skipped = 0
    errors = 0

    for idx, doc in enumerate(orders, 1):
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
        text = extract_full_pdf_text(path) if path and os.path.isfile(path) else ""

        try:
            if text and len(text) >= 80:
                prompt = build_prompt(doc, text)
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
            print(
                f"  [{idx}/{len(orders)}] {doc.get('notification_no')} — OK ({len(summary)} chars)"
            )

            if updated % 10 == 0:
                with open(DATA_JSON, "w", encoding="utf-8") as f:
                    json.dump(docs, f, indent=2, ensure_ascii=False)
                print(f"  ... checkpoint saved ({updated} updated)")

            time.sleep(0.35)
        except urllib.error.HTTPError:
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
        f"(total orders: {len(orders)})"
    )


if __name__ == "__main__":
    main()