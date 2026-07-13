"""Extract one-line summaries from GST circular PDF text."""
from __future__ import annotations

import re

from circular_category import CATEGORY_LABELS
from summarize_notification import clean_text

BOILERPLATE_RE = re.compile(
    r"^(?:Page\s+\d+\s+of\s+\d+\s*)?"
    r"(?:Circular\s+No\.?\s*[\d/\-A-Za-z]+\s*)?"
    r"(?:F\.?\s*No\.?\s*[\w./\-]+\s*)?"
    r"(?:Government of India\s*)?"
    r"(?:Ministry of Finance\s*)?"
    r"(?:Department of Revenue\s*)?"
    r"(?:Central Board of Indirect Taxes(?:\s*&\s*Customs|\s+and\s+Customs)?\s*)?"
    r"(?:GST Policy Wing\s*)?",
    re.I,
)

BOILERPLATE_MARKERS = re.compile(
    r"Page\s+\d+\s+of|Government of India|Ministry of Finance|"
    r"Department of Revenue|Central Board of Indirect Taxes|F\.\s*No\.",
    re.I,
)

LIST_DETAIL_MAX_LEN = 95


def _condense_gist(text: str) -> str:
    """Short list-column line: what the circular is about, without bureaucratic filler."""
    text = re.sub(r"\s+", " ", clean_text(text)).strip(" .,-–—'\"")
    text = re.split(
        r"\s+[-–—]\s*(?:reg\.?|Reg\.?)\b|\s+In exercise of\b|\s+The issue relating\b|"
        r"\s+References have been\b|\s+Representations have been\b|\s+It has been brought\b|"
        r"\s+In terms of\b|\s+Kindly\b|\s+Kind attention\b",
        text,
        maxsplit=1,
        flags=re.I,
    )[0]
    text = re.sub(r"\s*[-–—]\s*reg\.?\s*$", "", text, flags=re.I)
    text = re.sub(r"\s*[-–—]\s*regarding\.?\s*$", "", text, flags=re.I)
    text = re.sub(r"\s+regarding\.?\s*$", "", text, flags=re.I)

    replacements = [
        (r"^Clarification regarding\s+", "Clarification on "),
        (r"^Clarification on issue of\s+", "Clarification on "),
        (r"^Guidelines?\s+(?:for|on)\s+", "Guidelines on "),
        (r"^Instructions?\s+(?:for|on)\s+", "Instructions on "),
        (r"^Withdrawal of circular\s+No\.?\s*", "Withdraws Circular No. "),
        (r"^Extension of\s+", "Extends "),
        (r"^Implementation of\s+", "Implementation of "),
        (r"^Scope of\s+", "Scope of "),
        (r"^Proper officer under\s+", "Proper officer under "),
        (r"^Assigning proper officer under\s+", "Assigns officers under "),
        (r"^Reviewing authority,\s*", "Review of "),
    ]
    for pat, repl in replacements:
        text = re.sub(pat, repl, text, flags=re.I)

    text = re.sub(r"^Circular\s+", "", text, flags=re.I)
    return text.strip(" .,-–—'\"")


def _trim_summary(text: str, max_len: int = LIST_DETAIL_MAX_LEN) -> str:
    text = _condense_gist(text)
    if len(text) > max_len:
        cut = text[: max_len - 3].rsplit(" ", 1)[0]
        return cut + "..."
    return text


def _is_usable_summary(text: str) -> bool:
    if not text or len(text) < 12:
        return False
    if BOILERPLATE_MARKERS.search(text):
        return False
    if re.match(r"^Circular\s+No\.", text, re.I) and "under GST" in text:
        return False
    return True


def extract_subject(text: str) -> str | None:
    if not text:
        return None

    patterns = [
        r"Subject\s*:\s*(.+?)(?:\s+References\b|\s+Madam/Sir\b|\s+Sir,\s|\s+Dear\s|\s+\d+\.\s|\s+Page\s+\d+\s+of)",
        r"Subject\s*[-–]\s*(.+?)(?:\s+References\b|\s+Madam/Sir\b|\s+Sir,\s|\s+\d+\.\s|\s+Page\s+\d+\s+of)",
        r"Sub\.?\s*:\s*(.+?)(?:\s+References\b|\s+Madam/Sir\b|\s+Sir,\s|\s+\d+\.\s)",
        r"SUBJECT\s*:\s*(.+?)(?:\s+REFERENCES\b|\s+\d+\.\s)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.I | re.S)
        if m:
            subject = clean_text(m.group(1))
            subject = BOILERPLATE_RE.sub("", subject).strip()
            subject = _trim_summary(subject)
            if _is_usable_summary(subject):
                return subject

    return None


def extract_topic_sentence(text: str) -> str | None:
    if not text:
        return None

    cleaned = BOILERPLATE_RE.sub("", clean_text(text))

    patterns = [
        r"(?:Withdrawal|Amendment|Extension|Clarification|Guidelines?|Instructions?|"
        r"Procedure|Implementation|Levy|Exemption|Refund|Registration|Filing)"
        r"[^.]{8,200}\.",
        r"(?:regarding|relating to|in respect of)\s+[^.]{12,180}\.",
    ]
    for pat in patterns:
        m = re.search(pat, cleaned, re.I)
        if m:
            candidate = _trim_summary(m.group(0))
            if _is_usable_summary(candidate):
                return candidate

    after_sir = re.search(
        r"Sir,\s*(?:Subject\s*:\s*)?(.{20,220}?)(?:\s+\d+\.\s|\s+Page\s+\d+)",
        cleaned,
        re.I | re.S,
    )
    if after_sir:
        candidate = _trim_summary(after_sir.group(1))
        if _is_usable_summary(candidate):
            return candidate

    return None


def extract_corrigendum_summary(text: str, circular_no: str) -> str:
    fixes = re.findall(
        r"for\s+[“\"']([^”\"']+)[”\"'],\s*read\s+[“\"']([^”\"']+)[”\"']",
        text,
        re.I,
    )
    if fixes:
        a, b = fixes[0]
        return _trim_summary(f'Corrigendum: "{a}" → "{b}".')

    m = re.search(
        r"corrigendum\s+to\s+circular\s+no\.?\s*([\d/]+(?:/\d{4})?)",
        text,
        re.I,
    )
    if m:
        return f"Corrigendum to Circular No. {m.group(1).rstrip('-')}."

    parent = re.search(r"(\d+)\s*/\s*(\d{4})", circular_no)
    if parent:
        return f"Corrigendum to Circular No. {parent.group(1)}/{parent.group(2)}."

    return f"Corrigendum to Circular No. {circular_no}"


def fallback_summary(circular_no: str, category: str | None) -> str:
    label = CATEGORY_LABELS.get(category or "", "GST Circular")
    m = re.match(r"(\d+)/(\d{4})", circular_no)
    if m:
        return f"{label} No. {int(m.group(1))}/{m.group(2)}"
    return f"{label} ({circular_no})"


def _clean_for_paragraph(text: str) -> str:
    text = BOILERPLATE_RE.sub("", clean_text(text))
    text = re.sub(r"Page\s+\d+\s+of\s+\d+", " ", text, flags=re.I)
    text = re.sub(
        r"Chief Commissioners?.*?Madam\s*/\s*Sir,?\s*",
        " ",
        text,
        flags=re.I | re.S,
    )
    text = re.sub(
        r"The Principal Director Generals?.*?Madam\s*/\s*Sir,?\s*",
        " ",
        text,
        flags=re.I | re.S,
    )
    text = re.sub(r"Kind attention is invited to.*?(?=\d+\.\s+)", " ", text, flags=re.I | re.S)
    return re.sub(r"\s+", " ", text).strip()


def _strip_subject_suffix(subject: str) -> str:
    subject = re.sub(r"\s*[-–—]\s*reg\.?\s*$", "", subject, flags=re.I)
    return subject.strip(" .,-–—")


def extract_full_subject(text: str) -> str | None:
    if not text:
        return None
    patterns = [
        r"Subject\s*:\s*(.+?)(?:\s+References\b|\s+Madam/Sir\b|\s+Sir,\s|\s+Dear\s|\s+\d+\.\s|\s+Page\s+\d+\s+of)",
        r"Subject\s*[-–]\s*(.+?)(?:\s+References\b|\s+Madam/Sir\b|\s+Sir,\s|\s+\d+\.\s)",
        r"Sub\.?\s*:\s*(.+?)(?:\s+References\b|\s+Madam/Sir\b|\s+Sir,\s|\s+\d+\.\s)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.I | re.S)
        if m:
            subject = BOILERPLATE_RE.sub("", clean_text(m.group(1))).strip()
            subject = re.sub(r"\s+", " ", subject)
            if len(subject) >= 15 and not BOILERPLATE_MARKERS.search(subject):
                return _strip_subject_suffix(subject[:420])
    return None


def extract_numbered_points(text: str, max_points: int = 5) -> list[str]:
    cleaned = _clean_for_paragraph(text)
    start = re.search(r"\b1\.\s+", cleaned)
    if not start:
        return []
    body = cleaned[start.start() :]
    points: list[str] = []
    for m in re.finditer(
        r"(?<!\d)(\d{1,2})\.\s+(.+?)(?=\s\d{1,2}\.\s+|\sYours\s+faithfully|\sPage\s+\d+\s+of|$)",
        body,
        re.I | re.S,
    ):
        point = re.sub(r"\s+", " ", m.group(2)).strip()
        if len(point) >= 30 and not BOILERPLATE_MARKERS.search(point[:80]):
            points.append(point)
        if len(points) >= max_points:
            break
    return points


def _first_sentences(text: str, max_sentences: int = 3, max_chars: int = 520) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return ""
    skip = re.compile(
        r"Chief Commissioners?|Madam\s*/\s*Sir|Subject\s*:|Kind attention|"
        r"Director General|Field Formations|Yours faithfully",
        re.I,
    )
    parts = re.split(r"(?<=[.!?])\s+", text)
    out: list[str] = []
    total = 0
    for part in parts:
        part = part.strip()
        if not part or len(part) < 20:
            continue
        if skip.search(part) or BOILERPLATE_MARKERS.search(part):
            continue
        if re.match(r"^Circular\s+No\.", part, re.I):
            continue
        out.append(part if part.endswith((".", "!", "?")) else part + ".")
        total += len(part)
        if len(out) >= max_sentences or total >= max_chars:
            break
    return " ".join(out)


def build_circular_paragraph_summary(
    text: str,
    circular_no: str,
    is_corrigendum: bool,
    category: str | None = None,
    list_title: str | None = None,
) -> str:
    """One or two paragraphs for Show Summary modal."""
    label = CATEGORY_LABELS.get(category or "", "GST Circular")

    if is_corrigendum:
        fixes = re.findall(
            r"for\s+[“\"']([^”\"']+)[”\"'],\s*read\s+[“\"']([^”\"']+)[”\"']",
            text or "",
            re.I,
        )
        parent = re.search(
            r"corrigendum\s+to\s+circular\s+no\.?\s*([\d/\-]+(?:/\d{4})?)",
            text or "",
            re.I,
        )
        parent_no = parent.group(1).rstrip("-") if parent else circular_no
        if fixes:
            a, b = fixes[0]
            return (
                f"This corrigendum to Circular No. {parent_no} corrects the parent circular. "
                f'The text "{a}" is to be read as "{b}". '
                f"Readers should apply the corrected wording when relying on the parent circular."
            )
        return (
            f"This is a corrigendum to Circular No. {parent_no}. "
            f"It corrects errors or omissions in the earlier circular; the full corrigendum text should be read alongside the parent circular."
        )

    subject = extract_full_subject(text)
    points = extract_numbered_points(text)
    title = (list_title or "").strip()

    from summary_style import subject_to_prose_lead

    topic = _strip_subject_suffix(subject or title or "")
    lead = subject_to_prose_lead(topic) if topic else "Provides GST guidance."

    para1_body = ""
    if points:
        para1_body = _first_sentences(points[0], 3, 480)
    elif text.strip():
        cleaned = _clean_for_paragraph(text)
        after_refs = re.split(
            r"References have been received(?:\s+in\s+the\s+field)?\b",
            cleaned,
            flags=re.I,
        )
        tail = after_refs[-1] if len(after_refs) > 1 else cleaned
        tail = re.sub(r"^.*?\b1\.\s+", "", tail, count=1)
        para1_body = _first_sentences(tail, 3, 480)

    bad_body = re.compile(
        r"Madam\s*/\s*Sir|Chief Commissioners?|Subject\s*:|Director General",
        re.I,
    )
    if para1_body and bad_body.search(para1_body):
        para1_body = _first_sentences(points[1], 2, 400) if len(points) > 1 else ""

    if not para1_body and re.search(r"withdrawal of circular", topic or "", re.I):
        m = re.search(
            r"circular\s+no\.?\s*([\d/\-]+(?:/\d{4})?)[^\d]*?dated\s+([\d]{1,2}\w{0,3}\s+\w+\s*,?\s*\d{4})",
            text or "",
            re.I,
        )
        if m:
            para1_body = (
                f"It withdraws Circular No. {m.group(1).strip()} dated {m.group(2).strip()}, "
                f"so the guidance in that earlier circular ceases to apply."
            )

    para1 = f"{lead} {para1_body}".strip()
    para1 = re.sub(r"\s+", " ", para1)

    para2_parts: list[str] = []
    if len(points) > 1:
        for point in points[1:3]:
            chunk = _first_sentences(point, 2, 380)
            if chunk:
                para2_parts.append(chunk)
    elif points and len(points[0]) > 700:
        remainder = points[0][500:]
        extra = _first_sentences(remainder, 2, 400)
        if extra:
            para2_parts.append(extra)

    if para2_parts:
        para2 = " ".join(para2_parts)
        if len(para1) >= 80:
            return f"{para1}\n\n{para2}"
        return para2

    if len(para1) >= 60:
        return para1
    if topic:
        return f"{lead} See Circular No. {circular_no} for the detailed guidance and references."
    return f"{lead} See Circular No. {circular_no} for operative details."


def build_circular_summary(
    text: str,
    circular_no: str,
    is_corrigendum: bool,
    category: str | None = None,
) -> str:
    if is_corrigendum:
        return extract_corrigendum_summary(text, circular_no)

    for extractor in (extract_subject, extract_topic_sentence):
        result = extractor(text)
        if result:
            return result

    if text.strip():
        cleaned = BOILERPLATE_RE.sub("", clean_text(text))
        first = re.split(r"\.\s+", cleaned)[0]
        if first and len(first) > 20:
            candidate = _trim_summary(first + ".")
            if _is_usable_summary(candidate):
                return candidate

    return fallback_summary(circular_no, category)