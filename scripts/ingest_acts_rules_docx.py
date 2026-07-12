"""
Parse GST_Acts_and_Rules.docx and export text_documents.json + text_sections.json.
Run: python scripts/ingest_acts_rules_docx.py
"""
from __future__ import annotations

import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOCX_PATH = os.path.join(ROOT, "GST_Acts_and_Rules.docx")
DATA_DIR = os.path.join(ROOT, "data")
OUT_DOCS = os.path.join(DATA_DIR, "text_documents.json")
OUT_SECTIONS = os.path.join(DATA_DIR, "text_sections.json")

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

DOC_MARKER = re.compile(r"^([AB])(\d+)\.\s+(.+)$")
SECTION_HDR = re.compile(r"^(?:Section|Rule)\s+(\d+[A-Za-z]?)\s+(.+)$", re.I)
YEAR_RE = re.compile(r"\b(20\d{2}|2016)\b")

SKIP_LINE = re.compile(
    r"^(?:Portal ID:|Issue date:|Last amended|Active:|Amended flag:|"
    r"Full document path:|Category:|Introduction$|Source & extraction notes|"
    r"Source portal:|JSON metadata|Section body text|These endpoints|"
    r"This document is generated|Generated:|Disclaimer:|Contents$|"
    r"Part [AB] —|Goods and Services Tax$|Acts and Rules$|Compiled from)",
    re.I,
)


def read_docx_paragraphs(path: str) -> list[str]:
    with zipfile.ZipFile(path) as zf:
        xml = zf.read("word/document.xml")
    root = ET.fromstring(xml)
    paras: list[str] = []
    for para in root.iter(f"{W_NS}p"):
        parts = []
        for node in para.iter(f"{W_NS}t"):
            if node.text:
                parts.append(node.text)
        line = "".join(parts).strip()
        if line:
            paras.append(line)
    return paras


def slugify(title: str) -> str:
    slug = title.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug[:96] or "document"


def parse_year(title: str, fallback: int = 2017) -> int:
    years = [int(y) for y in YEAR_RE.findall(title)]
    return max(years) if years else fallback


def section_sort_key(number: str) -> tuple:
    m = re.match(r"(\d+)([A-Za-z]?)", number)
    if not m:
        return (9999, "", number)
    return (int(m.group(1)), m.group(2).lower(), number)


def is_noise_line(line: str) -> bool:
    if SKIP_LINE.search(line):
        return True
    if line.startswith("* Section") or line.startswith("* Rule"):
        return False
    if re.match(r"^(?:Section|Rule)\s+\d", line, re.I) and "." in line[:20]:
        return False
    return False


def find_body_start(lines: list[str]) -> int:
    for i, line in enumerate(lines):
        if SECTION_HDR.match(line):
            return i
    return 0


def trim_body_end(lines: list[str]) -> list[str]:
    out: list[str] = []
    for line in lines:
        if line.startswith("Source & extraction notes"):
            break
        if line.startswith("Generated:"):
            break
        out.append(line)
    return out


def parse_sections(lines: list[str], kind: str) -> list[dict]:
    """kind is 'section' or 'rule' for labelling."""
    lines = trim_body_end(lines)
    start = find_body_start(lines)
    lines = lines[start:]

    sections: list[dict] = []
    current: dict | None = None
    buf: list[str] = []

    def flush() -> None:
        nonlocal current, buf
        if not current:
            return
        content = "\n".join(buf).strip()
        current["content"] = content
        sections.append(current)
        current = None
        buf = []

    for line in lines:
        m = SECTION_HDR.match(line)
        if m:
            flush()
            current = {
                "section_number": m.group(1),
                "section_title": m.group(2).strip().rstrip(".-"),
                "content": "",
            }
            continue
        if current is None:
            continue
        if is_noise_line(line):
            continue
        buf.append(line)

    flush()
    return sections


def parse_documents(paras: list[str]) -> tuple[list[dict], list[dict]]:
    start_idx = 0
    for i, line in enumerate(paras):
        if line.strip() == "Part A — GST Acts":
            start_idx = i
            break

    markers: list[tuple[int, str, str, str]] = []
    for i in range(start_idx, len(paras)):
        m = DOC_MARKER.match(paras[i])
        if not m:
            continue
        kind_code, _num, title = m.group(1), m.group(2), m.group(3).strip()
        category = "act" if kind_code == "A" else "rule"
        markers.append((i, category, title, kind_code + m.group(2)))

    documents: list[dict] = []
    all_sections: list[dict] = []
    used_slugs: set[str] = set()

    for idx, (start, category, title, _code) in enumerate(markers):
        end = markers[idx + 1][0] if idx + 1 < len(markers) else len(paras)
        body_lines = paras[start + 1 : end]
        body_lines = [ln for ln in body_lines if not DOC_MARKER.match(ln)]

        slug_base = slugify(title)
        slug = slug_base
        n = 2
        while slug in used_slugs:
            slug = f"{slug_base}-{n}"
            n += 1
        used_slugs.add(slug)

        doc = {
            "slug": slug,
            "doc_category": category,
            "title": title,
            "year": parse_year(title),
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        documents.append(doc)

        raw_sections = parse_sections(body_lines, "section" if category == "act" else "rule")
        raw_sections.sort(key=lambda s: section_sort_key(s["section_number"]))

        for order, sec in enumerate(raw_sections, 1):
            all_sections.append(
                {
                    "document_slug": slug,
                    "section_number": sec["section_number"],
                    "section_title": sec["section_title"],
                    "content": sec["content"],
                    "sort_order": order,
                }
            )

    return documents, all_sections


def main() -> None:
    if not os.path.isfile(DOCX_PATH):
        print(f"Missing file: {DOCX_PATH}", file=sys.stderr)
        sys.exit(1)

    paras = read_docx_paragraphs(DOCX_PATH)
    documents, sections = parse_documents(paras)

    for i, doc in enumerate(documents, 1):
        doc["id"] = i

    slug_to_id = {d["slug"]: d["id"] for d in documents}
    for i, sec in enumerate(sections, 1):
        sec["id"] = i
        sec["document_id"] = slug_to_id[sec.pop("document_slug")]

    acts = [d for d in documents if d["doc_category"] == "act"]
    rules = [d for d in documents if d["doc_category"] == "rule"]

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUT_DOCS, "w", encoding="utf-8") as f:
        json.dump(documents, f, indent=2, ensure_ascii=False)
    with open(OUT_SECTIONS, "w", encoding="utf-8") as f:
        json.dump(sections, f, indent=2, ensure_ascii=False)

    print(f"Parsed {len(paras)} paragraphs from docx")
    print(f"Wrote {len(acts)} acts, {len(rules)} rules")
    print(f"Wrote {len(sections)} sections to {DATA_DIR}")
    for doc in documents:
        count = sum(1 for s in sections if s["document_id"] == doc["id"])
        print(f"  [{doc['doc_category']}] {doc['slug']}: {count} sections")


if __name__ == "__main__":
    main()