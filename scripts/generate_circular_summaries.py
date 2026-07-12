"""
Generate 1–2 paragraph summaries for all GST circulars and save to pdf_documents.json.
Run: python scripts/generate_circular_summaries.py
     python scripts/generate_circular_summaries.py --force
     python scripts/generate_circular_summaries.py --limit 10

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
from datetime import datetime, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from summarize_circular import build_circular_paragraph_summary
from summarize_notification import clean_text
from summary_quality import is_generic_summary

try:
    from pypdf import PdfReader
except ImportError:
    from PyPDF2 import PdfReader

DATA_JSON = os.path.join(ROOT, "data", "pdf_documents.json")
ENV_LOCAL = os.path.join(ROOT, ".env.local")

CATEGORY_LABELS = {
    "cgst_circular": "CGST Circular",
    "igst_circular": "IGST Circular",
    "compensation_cess_circular": "Compensation Cess Circular",
}

SYSTEM_PROMPT = """You are an Indian GST expert writing for chartered accountants, tax practitioners, and business clients.

Read the full circular text supplied and write a clear summary of its gist.

Rules:
- Use 1 paragraph for short or single-topic circulars; use 2 paragraphs only when the circular is long or covers clearly separate topics.
- State only facts from the circular: issue addressed, guidance given, procedures, forms, rule/notification references, effective dates, and who is affected.
- Do NOT open with "Circular No. X…" boilerplate or add generic compliance advice.
- Do NOT say "read the full circular" or warn about penalties.
- No bullet lists.
- For corrigenda, state what is being corrected and the corrected position.
- Minimum 80 words when the source text allows; do not pad with filler.

Return JSON only: { "summary": "your paragraph(s) here" }"""


def load_env_local() -> None:
    if not os.path.isfile(ENV_LOCAL):
        return
    with open(ENV_LOCAL, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def extract_full_pdf_text(path: str, max_chars: int = 90000) -> str:
    try:
        reader = PdfReader(path)
        chunks: list[str] = []
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
    summary = re.sub(r"\s+", " ", str(result.get("summary", ""))).strip()
    return summary


def build_prompt(doc: dict, text: str) -> str:
    label = CATEGORY_LABELS.get(doc.get("category", ""), "GST Circular")
    parts = [
        f"Circular No.: {doc.get('notification_no')}",
        f"Category: {label}",
        f"Year: {doc.get('year')}",
        f"Issued date: {doc.get('issued_date')}",
        f"Corrigendum: {'yes' if doc.get('is_corrigendum') else 'no'}",
        f"List title: {doc.get('summary_short') or doc.get('title') or ''}",
        "",
        "Full circular text:",
        text or "(No extractable text — use list title and circular number only.)",
    ]
    return "\n".join(parts)


def fallback_summary(doc: dict, text: str) -> str:
    built = build_circular_paragraph_summary(
        text,
        doc.get("notification_no") or "",
        bool(doc.get("is_corrigendum")),
        doc.get("category"),
        doc.get("summary_short") or doc.get("title"),
    )
    no = doc.get("notification_no") or "This circular"
    if len(built) < 100 and (not text or len(text) < 80):
        title = (doc.get("summary_short") or doc.get("title") or "").strip()
        if title and title != no:
            return (
                f"{no} concerns {title.rstrip('.')}. "
                f"The PDF is image-based or has limited extractable text; read the full circular for complete guidance."
            )
        return (
            f"{no} could not be fully auto-summarized because the PDF has little extractable text. "
            f"Please read the full circular document for the operative guidance."
        )
    return built


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

    circulars = [
        d
        for d in docs
        if d.get("doc_type") == "circular" and d.get("status") == "ready"
    ]
    if args.limit:
        circulars = circulars[: args.limit]

    updated = 0
    skipped = 0
    errors = 0

    for idx, doc in enumerate(circulars, 1):
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
            print(f"  [{idx}/{len(circulars)}] {doc.get('notification_no')} — OK ({len(summary)} chars)")

            if updated % 10 == 0:
                with open(DATA_JSON, "w", encoding="utf-8") as f:
                    json.dump(docs, f, indent=2, ensure_ascii=False)
                print(f"  ... checkpoint saved ({updated} updated)")

            time.sleep(0.4)
        except urllib.error.HTTPError as exc:
            errors += 1
            summary = fallback_summary(doc, text)
            for d in docs:
                if d.get("id") == doc_id:
                    d["summary"] = summary
                    break
            updated += 1
            print(
                f"  [{idx}] {doc.get('notification_no')} — API error, used local summary",
                file=sys.stderr,
            )
            time.sleep(2)
        except Exception as exc:
            errors += 1
            print(f"  [{idx}] {doc.get('notification_no')} — {exc}", file=sys.stderr)

    with open(DATA_JSON, "w", encoding="utf-8") as f:
        json.dump(docs, f, indent=2, ensure_ascii=False)

    print(
        f"\nDone: {updated} updated, {skipped} skipped, {errors} errors "
        f"(total circulars: {len(circulars)})"
    )


if __name__ == "__main__":
    main()