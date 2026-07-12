"""Rule-based GST order list detail and paragraph summary from PDF text."""
from __future__ import annotations

import re

from order_category import CATEGORY_LABELS
from summarize_notification import clean_text

LIST_DETAIL_MAX_LEN = 95

BOILERPLATE_RE = re.compile(
    r"^(?:Page\s+\d+\s+of\s+\d+\s*)?"
    r"(?:Order\s+No\.?\s*[\d/\-A-Za-z]+\s*)?"
    r"(?:F\.?\s*No\.?\s*[\w./\-]+\s*)?"
    r"(?:Government of India\s*)?"
    r"(?:Ministry of Finance\s*)?"
    r"(?:Department of Revenue\s*)?"
    r"(?:Central Board of Indirect Taxes(?:\s*&\s*Customs|\s+and\s+Customs)?\s*)?",
    re.I,
)


def normalize_order_phrase(text: str) -> str:
    text = re.sub(r"FORM\s+GST\s+TR\s*AN\s*[-\s]*\s*1", "FORM GST TRAN-1", text, flags=re.I)
    text = re.sub(r"FORM\s+GST\s+TR\s*AN\s*[-\s]*\s*2", "FORM GST TRAN-2", text, flags=re.I)
    text = re.sub(r"FORM\s+GST\s+CMP\s*[-\s]*\s*0?3", "FORM GST CMP-03", text, flags=re.I)
    text = re.sub(r"FORM\s+GST\s+REG\s*[-\s]*\s*26", "FORM GST REG-26", text, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _condense_gist(text: str) -> str:
    text = normalize_order_phrase(clean_text(text))
    text = re.split(
        r"\s+In\s+exercise\s+of\b|\s+Kind\s+reference\b|\s+Kind\s+attention\b|"
        r"\s+References\s+have\s+been\b",
        text,
        maxsplit=1,
        flags=re.I,
    )[0]
    text = re.sub(r"[-–—]\s*reg\.?\s*$", "", text, flags=re.I).strip()
    text = re.sub(r"\s+regarding\.?\s*$", "", text, flags=re.I).strip()
    replacements = [
        (r"^Extension of time limit for\s+", "Extends deadline for "),
        (r"^Extension of date for\s+", "Extends date for "),
        (r"^Authorisation under\s+", "Authorises under "),
        (r"^Constitution of\s+", "Constitutes "),
        (r"^Assignment of\s+", "Assigns "),
    ]
    for pat, repl in replacements:
        text = re.sub(pat, repl, text, flags=re.I)
    return text.strip(" .,-–—'\"")


def _trim_list_detail(text: str, max_len: int = LIST_DETAIL_MAX_LEN) -> str:
    text = _condense_gist(text)
    if len(text) > max_len:
        cut = text[: max_len - 3].rsplit(" ", 1)[0]
        return cut + "..."
    return text


def extract_subject(text: str, full: bool = False) -> str:
    if not text:
        return ""
    m = re.search(
        r"Subject\s*:\s*(.+?)(?:In\s+exer\s*cise|In\s+excise|2\.\s|Kind referen|$)",
        text,
        re.I,
    )
    if m:
        subject = clean_text(m.group(1))
        subject = re.sub(r"[-–—]\s*reg\.?$", "", subject, flags=re.I).strip()
        subject = re.sub(r"\s*[-–—]\s*regarding\.?$", "", subject, flags=re.I).strip()
        subject = normalize_order_phrase(subject.rstrip("."))
        return subject if full else _trim_list_detail(subject)
    return ""


def extract_order_number(text: str) -> tuple[int | None, int | None]:
    """Return (number, year) from PDF text if present."""
    if not text:
        return None, None
    patterns = [
        r"Order\s+No\.?\s*0*(\d+)\s*/\s*(\d{4})",
        r"Order\s+No\.?\s*0*(\d+)\s*[-–]\s*(\d{4})",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.I)
        if m:
            return int(m.group(1)), int(m.group(2))
    return None, None


def build_order_list_detail(text: str, order_no: str) -> str:
    subject = extract_subject(text)
    if subject:
        return subject
    if text:
        patterns = [
            r"(Extension of (?:time limit|date)[^.]{10,160}?)(?:\s+In\s+exer|$|\.)",
            r"(Authorisation under[^.]{10,160}\.)",
            r"(Constitution of [^.]{10,160}\.)",
            r"(Incidence of GST on[^.]{10,160}\.)",
            r"(Assignment of [^.]{10,160}\.)",
            r"In exercise of[^.]{0,40}the (?:Board|Commissioner)[^.]{10,120}\.",
        ]
        for pat in patterns:
            m = re.search(pat, text, re.I)
            if m:
                return _trim_list_detail(clean_text(m.group(1)))
        if re.search(r"assigns the case", text, re.I):
            return "Assigns investigation cases to specified Central Tax officers"
    return _trim_list_detail(f"GST order {order_no}")


def _clean_for_paragraph(text: str) -> str:
    text = BOILERPLATE_RE.sub("", clean_text(text))
    text = re.sub(r"Page\s+\d+\s+of\s+\d+", " ", text, flags=re.I)
    text = re.sub(
        r"Chief Commissioners?.*?Madam\s*/\s*Sir,?\s*",
        " ",
        text,
        flags=re.I | re.S,
    )
    return re.sub(r"\s+", " ", text).strip()


def extract_numbered_points(text: str, max_points: int = 4) -> list[str]:
    cleaned = _clean_for_paragraph(text)
    start = re.search(r"\b2\.\s+", cleaned)
    if not start:
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
        if len(point) >= 25:
            points.append(point)
        if len(points) >= max_points:
            break
    return points


def _first_sentences(text: str, max_sentences: int = 3, max_chars: int = 520) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return ""
    skip = re.compile(
        r"Madam\s*/\s*Sir|Subject\s*:|Kind reference|Kind attention|Yours faithfully",
        re.I,
    )
    parts = re.split(r"(?<=[.!?])\s+", text)
    out: list[str] = []
    total = 0
    for part in parts:
        part = part.strip()
        if not part or len(part) < 20 or skip.search(part):
            continue
        out.append(part if part.endswith((".", "!", "?")) else part + ".")
        total += len(part)
        if len(out) >= max_sentences or total >= max_chars:
            break
    return " ".join(out)


def build_order_paragraph_summary(
    text: str,
    order_no: str,
    category: str | None = None,
    list_title: str | None = None,
) -> str:
    """One or two paragraphs for Show Summary modal."""
    label = CATEGORY_LABELS.get(category or "", "GST Order")
    no_part = order_no.split("-")[0].strip() if order_no else ""
    opener = f"{label} No. {no_part}" if no_part else label

    subject = extract_subject(text, full=True)
    topic = subject or (list_title or "").strip()
    lead = (
        f"{opener} deals with {topic.rstrip('.')}."
        if topic
        else f"{opener} issues GST administrative directions."
    )

    points = extract_numbered_points(text)
    body = ""
    if points:
        body = _first_sentences(points[0], 3, 480)
    elif text.strip():
        cleaned = _clean_for_paragraph(text)
        after_exercise = re.split(r"In\s+exercise\s+of\b", cleaned, flags=re.I)
        tail = after_exercise[-1] if len(after_exercise) > 1 else cleaned
        tail = re.sub(r"^.*?\b2\.\s+", "", tail, count=1)
        body = _first_sentences(tail, 3, 480)

    para1 = re.sub(r"\s+", " ", f"{lead} {body}".strip())

    para2_parts: list[str] = []
    if len(points) > 1:
        for point in points[1:3]:
            chunk = _first_sentences(point, 2, 380)
            if chunk:
                para2_parts.append(chunk)

    if para2_parts and len(para1) >= 80:
        return f"{para1}\n\n{' '.join(para2_parts)}"
    if len(para1) >= 60:
        return para1
    return f"{lead} Refer to the full order for operative details and extended deadlines."