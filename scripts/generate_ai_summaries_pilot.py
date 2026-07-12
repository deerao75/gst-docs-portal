"""
Temporary pilot: AI summaries for 2025 Central Tax notifications.
Run: python scripts/generate_ai_summaries_pilot.py

Requires OPENAI_API_KEY in environment or .env.local
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from ingest_notifications import extract_pdf_text

DATA_JSON = os.path.join(ROOT, "data", "pdf_documents.json")
OUT_JSON = os.path.join(ROOT, "data", "ai_summaries_pilot.json")
ENV_LOCAL = os.path.join(ROOT, ".env.local")


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


def pilot_docs(docs: list[dict]) -> list[dict]:
    return [
        d
        for d in docs
        if d.get("doc_type") == "notification"
        and d.get("category") == "central_tax"
        and d.get("year") == 2025
        and d.get("status") == "ready"
    ]


SYSTEM_PROMPT = """You are a senior Indian GST consultant drafting client-ready summaries.

Return JSON only with these keys:

1) key_points — array of 4-8 concise bullets. One fact per bullet (forms, dates, sections, amended notification, covered persons).

2) summary — ONE detailed paragraph of 8-12 sentences (minimum 150 words). Must weave together EVERY key_point with full context: issuing authority, G.S.R. number if present, notification being amended, statutory sections cited, exact forms and tax periods, old vs new deadlines, monthly vs quarterly distinction, and effective dates. Do not omit any key_point. Write in flowing prose, not bullets.

3) practical_application — 5-7 sentences of concrete compliance guidance for practitioners:
   - Start with WHO is affected (e.g. monthly GSTR-1 filers for December 2024).
   - State WHAT to file (exact form name) and BY WHEN (exact calendar date).
   - If notification splits by state/UT, list which states get which date.
   - Mention tax period(s) and any amended parent notification number.
   - End with specific consequence from the notification (late fee, interest, loss of relief) if stated; otherwise state portal late-filing flag risk.
   BANNED phrases: "stay updated", "communicate to clients", "ensure compliance", "reflect these changes", "timely action is crucial", "read the full notification" without adding concrete steps.

Use only facts from the supplied text. Indian GST terminology."""


def call_openai(prompt: str, api_key: str, model: str) -> dict:
    payload = {
        "model": model,
        "temperature": 0.15,
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
    with urllib.request.urlopen(req, timeout=120) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    content = body["choices"][0]["message"]["content"]
    return json.loads(content)


def build_prompt(doc: dict, text: str) -> str:
    return (
        f"Notification No.: {doc.get('notification_no')}\n"
        f"Category: Central Tax\n"
        f"Year: 2025\n"
        f"Issued date: {doc.get('issued_date')}\n\n"
        "Draft key_points first, then write summary covering all of them in detail, "
        "then write practical_application with form names, dates, and filer categories "
        "from this notification only.\n\n"
        f"Notification text:\n{text[:14000]}"
    )


def main() -> None:
    force = "--force" in sys.argv
    load_env_local()
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY not set. Add it to .env.local")

    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    with open(DATA_JSON, encoding="utf-8") as f:
        docs = json.load(f)

    targets = pilot_docs(docs)
    existing: dict = {}
    if os.path.isfile(OUT_JSON):
        with open(OUT_JSON, encoding="utf-8") as f:
            existing = json.load(f).get("summaries", {})

    summaries = {} if force else dict(existing)
    print(
        f"Generating AI summaries for {len(targets)} notifications"
        f"{' (force regenerate)' if force else ''}..."
    )

    for doc in targets:
        doc_id = str(doc["id"])
        if not force and doc_id in summaries:
            print(f"  skip {doc_id} {doc.get('notification_no')} (cached)")
            continue

        path = doc.get("file_path")
        if not path or not os.path.isfile(path):
            print(f"  missing file for {doc_id}")
            continue

        text = extract_pdf_text(path, max_pages=10)
        if len(text) < 80:
            print(f"  insufficient text for {doc_id}")
            continue

        prompt = build_prompt(doc, text)
        try:
            result = call_openai(prompt, api_key, model)
        except urllib.error.HTTPError as e:
            print(f"  API error for {doc_id}: {e.read().decode()[:200]}")
            break

        summaries[doc_id] = {
            "document_id": doc["id"],
            "notification_no": doc.get("notification_no"),
            "summary": clean(result.get("summary", "")),
            "key_points": [
                clean(p) for p in result.get("key_points", []) if clean(p)
            ],
            "practical_application": clean(result.get("practical_application", "")),
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "model": model,
        }
        print(f"  done {doc_id} {doc.get('notification_no')}")

    output = {
        "enabled": True,
        "scope": "notification/central_tax/2025",
        "summaries": summaries,
    }
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"Wrote {len(summaries)} summaries to {OUT_JSON}")


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


if __name__ == "__main__":
    main()