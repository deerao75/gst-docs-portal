"""
Generate AI summaries for GST notifications.
Run: python scripts/generate_ai_summaries.py
     python scripts/generate_ai_summaries.py --force
     python scripts/generate_ai_summaries.py --limit 50

Requires OPENAI_API_KEY in .env.local
"""
from __future__ import annotations

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

from ingest_notifications import extract_pdf_text

DATA_JSON = os.path.join(ROOT, "data", "pdf_documents.json")
OUT_JSON = os.path.join(ROOT, "data", "ai_summaries.json")
ENV_LOCAL = os.path.join(ROOT, ".env.local")

CATEGORY_LABELS = {
    "central_tax": "Central Tax",
    "central_tax_rate": "Central Tax (Rate)",
    "integrated_tax": "Integrated Tax",
    "integrated_tax_rate": "Integrated Tax (Rate)",
    "union_territory_tax": "Union Territory Tax",
    "union_territory_tax_rate": "Union Territory Tax (Rate)",
    "compensation_cess": "Compensation Cess",
    "compensation_cess_rate": "Compensation Cess (Rate)",
}

BANNED_GENERIC = re.compile(
    r"stay updated|ensure compliance|timely action|read the (full )?notification|"
    r"communicate to clients|reflect these changes|compliance teams should|"
    r"may result in late fees? or interest|portal flagging late filings?|"
    r"avoid penalties|penalties?.*interest|interest.*penalt",
    re.I,
)

SYSTEM_PROMPT = """You are an Indian GST expert writing for business owners and clients (plain English, not legalese).

Return JSON only with:
- key_points: 4-8 bullets. Each bullet = one specific fact from THIS notification (form names, exact dates, tax periods, table entries, rule/section numbers, districts/states if any). If it amends an earlier notification, state WHAT is changed (e.g. "extends GSTR-1 due date from X to Y", "inserts proviso after fifth proviso in Notif. 83/2020") using the parent notification context supplied.
- summary: ONE paragraph, 8-12 sentences, minimum 150 words, plain language a client can understand. Explain what exactly changed and who is affected. Cover every key_point. No bullet list.

STRICTLY FORBIDDEN in both fields:
- Generic warnings about compliance, penalties, late fees, interest, or "file on time"
- Vague phrases: "taxpayers should ensure", "practitioners should communicate", "stay updated"
- Repeating the same idea in different words

When parent notification text is provided, identify the specific clause/table/proviso being amended and describe the before/after change.

Use only facts from the supplied texts. Indian GST terms are fine but explain where helpful."""


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


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def notification_docs(docs: list[dict]) -> list[dict]:
    return [
        d
        for d in docs
        if d.get("doc_type") == "notification" and d.get("status") == "ready"
    ]


def build_notification_index(docs: list[dict]) -> dict[str, dict]:
    index: dict[str, dict] = {}
    for doc in docs:
        no = doc.get("notification_no")
        if no:
            index[no.lower()] = doc
            index[re.sub(r"\s+", " ", no.lower())] = doc
    return index


def extract_amendment_refs(text: str) -> list[str]:
    refs: list[str] = []
    patterns = [
        r"Notification\s+No\.?\s*(\d+)\s*/\s*(\d{4})\s*[-–]?\s*([A-Za-z ()]+?)(?=[,.\s]|$)",
        r"notification\s+number\s+(\d+)\s*/\s*(\d{4})\s*[-–]?\s*([A-Za-z ()]+)",
    ]
    for pat in patterns:
        for m in re.finditer(pat, text, re.I):
            num, year, label = m.group(1), m.group(2), clean(m.group(3))
            label = re.sub(r"\s+", " ", label)
            refs.append(f"{int(num):02d}/{year}-{label}")
    return list(dict.fromkeys(refs))


def lookup_parent_context(
    refs: list[str], index: dict[str, dict], current_id: int
) -> str:
    blocks: list[str] = []
    for ref in refs[:3]:
        parent = index.get(ref.lower())
        if not parent or parent.get("id") == current_id:
            continue
        path = parent.get("file_path")
        if not path or not os.path.isfile(path):
            continue
        excerpt = extract_pdf_text(path, max_pages=6)[:6000]
        if not excerpt:
            continue
        blocks.append(
            f"--- Parent notification {parent.get('notification_no')} (issued {parent.get('issued_date')}) ---\n"
            f"{excerpt}"
        )
    return "\n\n".join(blocks)


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
    with urllib.request.urlopen(req, timeout=180) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    return json.loads(body["choices"][0]["message"]["content"])


def sanitize_result(result: dict) -> dict:
    key_points = [
        clean(p)
        for p in result.get("key_points", [])
        if clean(p) and not BANNED_GENERIC.search(clean(p))
    ]
    summary = clean(result.get("summary", ""))
    if BANNED_GENERIC.search(summary):
        summary = BANNED_GENERIC.sub("", summary)
        summary = clean(summary)
    return {"key_points": key_points, "summary": summary}


def build_prompt(doc: dict, text: str, parent_context: str) -> str:
    label = CATEGORY_LABELS.get(doc.get("category", ""), doc.get("category"))
    parts = [
        f"Notification No.: {doc.get('notification_no')}",
        f"Category: {label}",
        f"Year: {doc.get('year')}",
        f"Issued date: {doc.get('issued_date')}",
        "",
        "Write key_points first, then a client-friendly summary covering all key_points.",
        "",
    ]
    if parent_context:
        parts.extend(
            [
                "PARENT NOTIFICATION(S) BEING AMENDED (use to identify what aspect changes):",
                parent_context,
                "",
            ]
        )
    parts.extend(["NOTIFICATION TEXT:", text[:14000]])
    return "\n".join(parts)


def save_output(summaries: dict) -> None:
    output = {
        "enabled": True,
        "scope": "all_notifications",
        "summaries": summaries,
    }
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)


def parse_limit() -> int | None:
    for arg in sys.argv:
        if arg.startswith("--limit"):
            if "=" in arg:
                return int(arg.split("=", 1)[1])
    if "--limit" in sys.argv:
        idx = sys.argv.index("--limit")
        if idx + 1 < len(sys.argv):
            return int(sys.argv[idx + 1])
    return None


def main() -> None:
    force = "--force" in sys.argv
    limit = parse_limit()
    load_env_local()
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY not set. Add it to .env.local")

    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    with open(DATA_JSON, encoding="utf-8") as f:
        all_docs = json.load(f)

    targets = notification_docs(all_docs)
    if limit:
        targets = targets[:limit]

    index = build_notification_index(all_docs)
    existing: dict = {}
    if os.path.isfile(OUT_JSON) and not force:
        with open(OUT_JSON, encoding="utf-8") as f:
            existing = json.load(f).get("summaries", {})
    elif os.path.isfile(os.path.join(ROOT, "data", "ai_summaries_pilot.json")) and not force:
        with open(os.path.join(ROOT, "data", "ai_summaries_pilot.json"), encoding="utf-8") as f:
            existing = json.load(f).get("summaries", {})

    summaries = {} if force else dict(existing)
    total = len(targets)
    print(f"Generating AI summaries for {total} notifications...")

    for i, doc in enumerate(targets, 1):
        doc_id = str(doc["id"])
        if not force and doc_id in summaries and summaries[doc_id].get("summary"):
            print(f"  [{i}/{total}] skip {doc_id} {doc.get('notification_no')}")
            continue

        path = doc.get("file_path")
        if not path or not os.path.isfile(path):
            print(f"  [{i}/{total}] missing file {doc_id}")
            continue

        text = extract_pdf_text(path, max_pages=10)
        if len(text) < 80:
            print(f"  [{i}/{total}] insufficient text {doc_id}")
            continue

        refs = extract_amendment_refs(text)
        parent_context = lookup_parent_context(refs, index, doc["id"])
        prompt = build_prompt(doc, text, parent_context)

        try:
            result = sanitize_result(call_openai(prompt, api_key, model))
        except urllib.error.HTTPError as e:
            print(f"  API error: {e.read().decode()[:300]}")
            save_output(summaries)
            raise SystemExit(1) from e
        except Exception as e:
            print(f"  error {doc_id}: {e}")
            save_output(summaries)
            raise

        summaries[doc_id] = {
            "document_id": doc["id"],
            "notification_no": doc.get("notification_no"),
            "summary": result["summary"],
            "key_points": result["key_points"],
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "model": model,
            "amended_refs": refs,
        }
        save_output(summaries)
        print(f"  [{i}/{total}] done {doc_id} {doc.get('notification_no')}")
        time.sleep(0.3)

    print(f"Wrote {len(summaries)} summaries to {OUT_JSON}")


if __name__ == "__main__":
    main()