"""Unified Show Summary style: openings, grammar, and prose conversion."""
from __future__ import annotations

import re

from summarize_notification import clean_text

# Patterns that mark low-quality / ingest boilerplate summaries
GENERIC_EFFECT_RE = re.compile(
    r"notifies\s+regulatory\s+changes\s+under\b|"
    r"^Notification\s+No\.\s+.+\s+under\s+.+\s+notifies\b|"
    r"^under\s+Central\s+Tax\s+notifies\b",
    re.I,
)

BOILERPLATE_OPENERS = [
    re.compile(
        r"^Notification\s+No\.\s*[^.]+\s+under\s+[^.]+\s+(?:notifies|updates)\s+",
        re.I,
    ),
    re.compile(
        r"^(?:CGST|IGST|UTGST|GST|Compensation\s+Cess)\s+Circular\s+No\.\s*\S+\s+deals\s+with\s+",
        re.I,
    ),
    re.compile(
        r"^(?:Central|Integrated|Union\s+Territory)\s+Tax\s+No\.\s*\S+\s+deals\s+with\s+",
        re.I,
    ),
    re.compile(r"^GST\s+Order\s+No\.\s*\S+\s+deals\s+with\s+", re.I),
]


def fix_pdf_word_spacing(text: str) -> str:
    """Repair PDF runs like 'Clarificationsregardingapplicability'."""
    text = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", text)
    text = re.sub(r"(?<=[a-z])(?=\d)", " ", text)
    text = re.sub(r"(?<=\d)(?=[A-Za-z])", " ", text)
    return text


def clean_grammar(text: str) -> str:
    text = fix_pdf_word_spacing(clean_text(text))
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r"\s+\.", ".", text)
    text = re.sub(r"\s+;", ";", text)
    text = re.sub(r"\.\s*\.", ".", text)
    text = re.sub(r",\s*,", ",", text)
    return text.strip()


def notifies_to_prose(effect: str) -> str:
    """Turn list-detail 'Notifies …' into an active-voice summary lead."""
    phrase = clean_text(effect).rstrip(".")
    if re.match(r"^notifies\b", phrase, re.I):
        phrase = re.sub(r"^notifies\s+", "", phrase, flags=re.I)

    if not phrase:
        return "Updates GST law and compliance requirements."

    rules: list[tuple[str, str]] = [
        (r"^extension of (.+)$", r"Extends \1."),
        (r"^amendment to (.+)$", r"Amends \1."),
        (r"^correction of (.+)$", r"Corrects \1."),
        (r"^correction in (.+)$", r"Corrects \1."),
        (r"^exemption of (.+)$", r"Exempts \1 from tax."),
        (r"^exemption or concessional rate on (.+)$", r"Exempts or applies a concessional rate on \1."),
        (r"^waiver of (.+)$", r"Waives \1."),
        (r"^delegation of (.+)$", r"Delegates \1."),
        (r"^substitution\b", r"Substitutes notified text"),
        (r"^late-fee relief on (.+)$", r"Provides late-fee relief on \1."),
        (r"^changes to (.+)$", r"Changes \1."),
        (r"^the (.+)$", r"Notifies \1."),
        (r"^regulatory changes under (.+)$", r"Updates regulatory provisions under \1."),
    ]
    lower = phrase.lower()
    for pat, repl in rules:
        m = re.match(pat, lower, re.I)
        if m:
            if m.lastindex:
                out = re.sub(pat, repl, phrase, flags=re.I)
            else:
                out = repl
            return out[0].upper() + out[1:] if out else out

    return phrase[0].upper() + phrase[1:] + "."


def subject_to_prose_lead(subject: str) -> str:
    """Turn circular/order subject line into a summary opening sentence."""
    phrase = clean_text(subject).rstrip(".")
    if not phrase:
        return "Provides GST guidance."

    rules: list[tuple[str, str]] = [
        (r"^Clarification regarding\s+", "Clarifies "),
        (r"^Clarification on\s+", "Clarifies "),
        (r"^Guidelines?\s+(?:for|on)\s+", "Provides guidelines on "),
        (r"^Instructions?\s+(?:for|on)\s+", "Provides instructions on "),
        (r"^Extension of\s+", "Extends "),
        (r"^Extension in\s+", "Extends "),
        (r"^Withdrawal of\s+", "Withdraws "),
        (r"^Implementation of\s+", "Sets out implementation of "),
        (r"^Procedure for\s+", "Sets out the procedure for "),
        (r"^Proper officer under\s+", "Designates the proper officer under "),
        (r"^Assigning proper officer under\s+", "Assigns officers under "),
    ]
    for pat, repl in rules:
        if re.match(pat, phrase, re.I):
            phrase = re.sub(pat, repl, phrase, count=1, flags=re.I)
            break

    if not phrase.endswith((".", "!", "?")):
        phrase += "."
    return phrase[0].upper() + phrase[1:]


def strip_boilerplate_opener(summary: str) -> str:
    text = clean_grammar(summary)
    for pat in BOILERPLATE_OPENERS:
        text = pat.sub("", text)
    return text.strip()


def is_generic_effect(effect: str) -> bool:
    return bool(GENERIC_EFFECT_RE.search(effect or ""))


def merge_paragraphs(parts: list[str], min_words: int = 60) -> str:
    cleaned: list[str] = []
    seen: set[str] = set()
    for part in parts:
        p = clean_grammar(part)
        if not p or len(p) < 20:
            continue
        key = p.lower()[:80]
        if key in seen:
            continue
        seen.add(key)
        if not p.endswith((".", "!", "?")):
            p += "."
        cleaned.append(p)

    if not cleaned:
        return ""

    text = cleaned[0]
    if len(text.split()) < min_words and len(cleaned) > 1:
        text = f"{cleaned[0]}\n\n{cleaned[1]}"
        if len(cleaned) > 2 and len(text.split()) < min_words:
            text = f"{text} {cleaned[2]}"
    elif len(cleaned) > 1 and len(cleaned[0].split()) >= 80:
        text = f"{cleaned[0]}\n\n{cleaned[1]}"

    return clean_grammar(text.replace("\n\n ", "\n\n"))