"""Rule-based GST notification summarization focused on substantive effect."""
from __future__ import annotations

import re
from typing import List, Optional, Set, Tuple

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


def clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text.replace("*", "")


def is_corrigendum_file(filename: str) -> bool:
    return bool(re.search(r"corrig", filename, re.I))


def strip_boilerplate(text: str) -> str:
    text = clean_text(text)
    text = re.sub(r"\[TO BE PUBLISHED[^\]]*\]", "", text, flags=re.I)
    for marker in (
        "In exercise of the powers",
        "In exercise of the power",
        "In the notification number",
        "In the said notification",
        "NOTIFICATION No.",
        "Notification No.",
    ):
        idx = text.find(marker)
        if idx >= 0:
            text = text[idx:]
            break
    text = re.sub(r"\[F\.?\s*No\..*$", "", text, flags=re.I)
    text = re.sub(r"\([^)]*Secretary[^)]*\).*$", "", text, flags=re.I)
    text = re.sub(r"Note:.*$", "", text, flags=re.I)
    return clean_text(text)


def extract_forms(text: str) -> List[str]:
    found = re.findall(r"FORM\s+GSTR[-\s]?(\d+[A-Z]?)", text, re.I)
    return list(dict.fromkeys(f"GSTR-{f.upper()}" for f in found))


def extract_amended_ref(text: str) -> Optional[str]:
    patterns = [
        r"notification.*?(?:No\.?\s*)?(\d+)\s*/\s*(\d{4})\s*[-–]\s*([^,]+)",
        r"Notification\s+No\.?\s*(\d+)\s*/\s*(\d{4})\s*[-–]\s*([^,]+)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.I)
        if m:
            label = clean_text(m.group(3))
            return f"{int(m.group(1)):02d}/{m.group(2)}-{label}"
    return None


def extract_quoted_clauses(text: str) -> List[str]:
    clauses: List[str] = []
    patterns = [
        r'namely[:-]\s*[“"]?(Provided[^”"]+)[”"]?',
        r'[“"](Provided[^”"]+)[”"]',
        r'[“"](In the said[^”"]+)[”"]',
    ]
    for pat in patterns:
        for m in re.finditer(pat, text, re.I):
            clause = clean_text(m.group(1))
            if len(clause) > 30:
                clauses.append(clause)
    return list(dict.fromkeys(clauses))


def extract_substitution(text: str) -> Optional[str]:
    m = re.search(
        r'for the words?\s+[“"]([^”"]+)[”"],\s*(?:the\s+)?(.+?shall be substituted)',
        text,
        re.I,
    )
    if m:
        old = clean_text(m.group(1))
        new = clean_text(m.group(2))
        return f"Replaces {old} with {new}."
    return None


def normalize_date_phrase(phrase: str) -> str:
    phrase = clean_text(phrase)
    ordinals = {
        "first": "1",
        "second": "2",
        "third": "3",
        "fourth": "4",
        "fifth": "5",
        "sixth": "6",
        "seventh": "7",
        "eighth": "8",
        "ninth": "9",
        "tenth": "10",
        "eleventh": "11",
        "twelfth": "12",
        "thirteenth": "13",
        "fourteenth": "14",
        "fifteenth": "15",
        "twenty": "20",
        "twenty second": "22",
        "twenty-second": "22",
        "twenty fourth": "24",
        "twenty-fourth": "24",
        "twenty sixth": "26",
        "twenty-sixth": "26",
    }
    m = re.search(
        r"(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\s+day of\s+(\w+),?\s*(\d{4})",
        phrase,
        re.I,
    )
    if m:
        return f"{m.group(1)} {m.group(2)} {m.group(3)}"
    m2 = re.search(
        r"(?:the\s+)?([a-z-]+)\s+day of\s+(\w+),?\s*(\d{4})",
        phrase,
        re.I,
    )
    if m2:
        day = ordinals.get(m2.group(1).lower(), m2.group(1))
        return f"{day} {m2.group(2)} {m2.group(3)}"
    return phrase


def extract_extension_dates(text: str) -> List[str]:
    dates = []
    patterns = [
        r"extended till the ([^.;\"]+)",
        r"extended to the ([^.;\"]+)",
        r"shall be extended till the ([^.;\"]+)",
        r"due by the ([^.;\"]+)",
    ]
    for pat in patterns:
        for m in re.finditer(pat, text, re.I):
            phrase = normalize_date_phrase(m.group(1))
            if 8 < len(phrase) < 90:
                dates.append(phrase)
    return list(dict.fromkeys(dates))[:4]


def extract_tax_period(text: str) -> Optional[str]:
    patterns = [
        r"tax period\s+([A-Za-z]+,?\s*\d{4})",
        r"for\s+(December,?\s*\d{4}|October to December,?\s*\d{4})",
        r"financial year\s+(\d{4}[-–]\d{2,4})",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.I)
        if m:
            return clean_text(m.group(1))
    return None


def extract_table_samples(text: str) -> List[str]:
    entries = re.findall(
        r"\d+\s+\d{2,4}\s+([A-Za-z][A-Za-z0-9\s,./()-]{4,70}?)\s+(?:\d+\.?\d*\s*%|Nil)",
        text,
    )
    cleaned = [clean_text(e) for e in entries if len(clean_text(e)) > 4]
    if cleaned:
        return cleaned[:4]
    rows = re.findall(
        r"(?:Description of Goods|Description of Services)\s+(.{15,100})",
        text,
        re.I,
    )
    return [clean_text(r) for r in rows[:3]]


DETAIL_MAX_LEN = 140


def truncate_detail(text: str, max_len: int = DETAIL_MAX_LEN) -> str:
    text = clean_text(text).rstrip(".")
    if len(text) <= max_len:
        return text
    cut = text[: max_len - 3].rsplit(" ", 1)[0]
    return cut + "..."


def as_notifies(phrase: str) -> str:
    """Every list-detail line must begin with 'Notifies'."""
    phrase = truncate_detail(clean_text(phrase).rstrip("."))
    if not phrase:
        return "Notifies regulatory changes."
    if re.match(r"^notifies\b", phrase, re.I):
        return phrase[0].upper() + phrase[1:] + "."
    lower = phrase.lower()
    conversions = (
        (r"^corrigendum\s+", "correction of "),
        (r"^amends\s+notification\s+no\.?\s*", "amendment to "),
        (r"^amends\s+", "amendment to "),
        (r"^extends?\s+(the\s+)?", "extension of "),
        (r"^provides?\s+", ""),
        (r"^delegates?\s+", "delegation of "),
        (r"^exempts?\s+", "exemption of "),
        (r"^replaces?\s+", "substitution — "),
        (r"^waives?\s+", "waiver of "),
    )
    for pat, repl in conversions:
        if re.match(pat, lower):
            phrase = re.sub(pat, repl, phrase, count=1, flags=re.I)
            break
    phrase = phrase[0].lower() + phrase[1:] if phrase else phrase
    return f"Notifies {phrase}."


def describe_amendment_target(body: str, amended: Optional[str]) -> str:
    t = body.lower()
    ref = amended or "an earlier notification"
    if re.search(r"these rules may be called", body, re.I):
        m = re.search(r"these rules may be called the ([^.]{8,90})", body, re.I)
        if m:
            return as_notifies(f"the {clean_text(m.group(1))}")
    if "proviso" in t and re.search(r"insert|after the", t):
        return as_notifies(f"insertion of a new proviso amending Notification No. {ref}")
    if "table" in t and re.search(r"substitut|insert|omit|delete", t):
        return as_notifies(f"changes to the Table in Notification No. {ref}")
    if "rule" in t and re.search(r"amend|substitut|insert", t):
        return as_notifies(f"amendment to CGST/IGST Rules via Notification No. {ref}")
    forms = extract_forms(body)
    dates = extract_extension_dates(body)
    if re.search(r"extend|extended", t):
        form = forms[0] if forms else "GST return"
        if dates:
            return as_notifies(
                f"extension of {form} due date to {dates[0]} via Notification No. {ref}"
            )
        return as_notifies(f"extension of {form} filing deadline via Notification No. {ref}")
    if "late fee" in t or "late-fee" in t:
        return as_notifies(f"late-fee relief under Notification No. {ref}")
    if "withdraw" in t or "rescind" in t:
        return as_notifies(f"withdrawal of Notification No. {ref}")
    return as_notifies(f"amendment to Notification No. {ref}")


def gist_from_keywords(body: str, label: str) -> str:
    t = body.lower()
    if re.search(r"these rules may be called", body, re.I):
        m = re.search(r"these rules may be called the ([^.]{8,90})", body, re.I)
        if m:
            return as_notifies(f"the {clean_text(m.group(1))}")
    if "appointed as" in t or "hereby appoint" in t:
        return as_notifies("appointment of GST officers or authorities")
    if "supersession" in t or "stand superseded" in t:
        return as_notifies("supersession of an earlier notification")
    if "seeks to" in t or "in order to" in t:
        return as_notifies(f"regulatory changes under {label}")
    return as_notifies(f"regulatory changes under {label}")


def describe_operative_effect(body: str, category: str, is_corrigendum: bool) -> str:
    """Short list-detail gist — always begins with 'Notifies'."""
    t = body.lower()
    label = CATEGORY_LABELS.get(category, category)
    forms = extract_forms(body)
    period = extract_tax_period(body)
    dates = extract_extension_dates(body)
    amended = extract_amended_ref(body)
    clauses = extract_quoted_clauses(body)
    substitution = extract_substitution(body)

    if is_corrigendum:
        fixes = re.findall(
            r'for\s+[“"]([^”"]+)[”"],\s*read\s+[“"]([^”"]+)[”"]',
            body,
            re.I,
        )
        parent = amended or "the parent notification"
        if fixes:
            old, new = fixes[0][0][:40], fixes[0][1][:40]
            return as_notifies(
                f"correction in Notification No. {parent} "
                f"({old} → {new})"
            )
        return as_notifies(
            f"correction of clerical or numbering errors in Notification No. {parent}"
        )

    if substitution:
        sub_m = re.search(
            r"Replaces?\s+(.+?)\s+with\s+(.+?)\.",
            substitution,
            re.I,
        )
        if sub_m and amended:
            old = truncate_detail(sub_m.group(1), 35)
            new = truncate_detail(sub_m.group(2), 35)
            return as_notifies(
                f"substitution in Notification No. {amended} ({old} → {new})"
            )
        if amended:
            return as_notifies(f"text substitution in Notification No. {amended}")
        return as_notifies("text substitution in the notification")

    if clauses:
        clause = clauses[0]
        cl = clause.lower()
        if "time limit" in cl and forms:
            form = forms[0]
            monthly_m = re.search(
                r"December,?\s*2024.*?extended till the ([^,]+(?:,\s*\d{4})?)",
                clause,
                re.I,
            )
            quarterly_m = re.search(
                r"October to December,?\s*2024.*?extended till the ([^.;\"]+)",
                clause,
                re.I,
            )
            if monthly_m and quarterly_m:
                monthly_date = normalize_date_phrase(monthly_m.group(1))
                quarterly_date = normalize_date_phrase(quarterly_m.group(1))
                return as_notifies(
                    f"extension of {form} due date to {monthly_date} (monthly) "
                    f"and {quarterly_date} (quarterly)"
                )
            if dates:
                return as_notifies(
                    f"extension of {form} due date to {dates[0]}"
                    + (f" for {period}" if period else "")
                )
            return as_notifies(
                f"extension of {form} filing deadline"
                + (f" for {period}" if period else "")
            )
        if "late fee" in cl:
            return as_notifies(
                "waiver or cap on late fee for belated GST returns in the notified window"
            )

    if re.search(r"these rules may be called", body, re.I):
        m = re.search(r"these rules may be called the ([^.]{8,90})", body, re.I)
        if m:
            return as_notifies(f"the {clean_text(m.group(1))}")

    if "hereby exempts" in t or "exempts the goods" in t or "exempts the services" in t:
        samples = extract_table_samples(body)
        if samples:
            return as_notifies(
                f"exemption or concessional rate on {truncate_detail(samples[0], 70)}"
            )
        return as_notifies(f"exemption or concessional rate on specified goods or services")

    if "rate" in category and ("table" in t or "schedule" in t):
        samples = extract_table_samples(body)
        if samples:
            return as_notifies(
                f"GST rate on {truncate_detail(samples[0], 70)} and other Table entries"
            )
        return as_notifies("GST rates on specified goods or services")

    if forms and ("extend" in t or "extended" in t):
        date_part = f" to {dates[0]}" if dates else ""
        period_part = f" for {period}" if period else ""
        return as_notifies(
            f"extension of {', '.join(forms[:2])} filing deadline{date_part}{period_part}"
        )

    if "late fee" in t or "late-fee" in t:
        form = forms[0] if forms else "GST return"
        return as_notifies(f"late-fee relief on belated {form} filings")

    if "delegat" in t and "powers" in t:
        return as_notifies("delegation of GST administrative powers to specified officers")

    if "composition" in t:
        return as_notifies("changes to the composition scheme for small taxpayers")

    if "registration" in t and ("cancel" in t or "suspension" in t):
        return as_notifies("conditions for cancellation or suspension of GST registration")

    if "registration" in t:
        return as_notifies("procedural or eligibility changes for GST registration")

    if "refund" in t:
        return as_notifies("refund procedure, conditions, or timelines")

    if "e-way" in t or "e way" in t:
        return as_notifies("changes to e-way bill requirements or procedures")

    if amended and re.search(r"amendment|amends|in the said notification", t):
        return describe_amendment_target(body, amended)

    return gist_from_keywords(body, label)


def build_title(
    text: str,
    notification_no: str,
    category: str,
    filename: str,
    is_corrigendum: bool,
) -> str:
    body = strip_boilerplate(text)
    details = describe_operative_effect(body, category, is_corrigendum)
    if is_corrigendum:
        return details.split(".")[0] + "."
    if len(details) <= 120:
        return details
    return details[:117] + "..."


def extract_substantive_sentences(body: str) -> List[str]:
    skip = re.compile(
        r"exercise of the powers|government of india|ministry of finance|"
        r"g\.s\.r|f\.?\s*no\.|under secretary|note:",
        re.I,
    )
    sentences = []
    for s in re.split(r"(?<=[.!?])\s+", body):
        s = clean_text(s)
        if 45 < len(s) < 420 and not skip.search(s):
            sentences.append(s)
    return sentences


def humanize_clause(clause: str) -> str:
    c = clean_text(clause)
    if len(c) > 240:
        return c[:237] + "..."
    return c[0].upper() + c[1:] if c else c


def build_detailed_bullets(
    body: str,
    category: str,
    is_corrigendum: bool,
    effect: str,
    forms: List[str],
    period: Optional[str],
    dates: List[str],
    amended: Optional[str],
    clauses: List[str],
    substitution: Optional[str],
) -> List[str]:
    bullets: List[str] = []
    label = CATEGORY_LABELS.get(category, category)

    if is_corrigendum:
        bullets.append(effect)
        if amended:
            bullets.append(
                f"This corrigendum relates to Notification No. {amended} published under {label}."
            )
        fixes = re.findall(
            r'for\s+[“"]([^”"]+)[”"],\s*read\s+[“"]([^”"]+)[”"]',
            body,
            re.I,
        )
        for old, new in fixes[:6]:
            bullets.append(f"In the published notification, {old} should be read as {new}.")
        if len(fixes) > 6:
            bullets.append(f"The corrigendum contains {len(fixes)} text or numbering corrections in total.")
        bullets.append(
            "The corrected text should be read together with the parent notification for compliance."
        )
        return bullets

    bullets.append(effect)

    if amended:
        bullets.append(
            f"The notification amends an earlier CBIC notification (Notification No. {amended}) "
            f"and changes the compliance position for affected taxpayers."
        )

    for clause in clauses[:3]:
        bullets.append(humanize_clause(clause))

    if substitution and substitution not in bullets:
        bullets.append(substitution)

    if forms:
        bullets.append(
            f"The compliance impact centres on {', '.join(forms[:4])} and related GST portal filings."
        )

    if period:
        bullets.append(f"The change applies to tax period {period}.")

    for d in dates[:3]:
        bullets.append(f"Revised or extended due date: {d}.")

    if re.search(r"come into force|shall come into force", body, re.I):
        m = re.search(
            r"come into force\s+(?:from\s+)?([^.]{10,80})",
            body,
            re.I,
        )
        if m:
            bullets.append(f"Effective date: {clean_text(m.group(1))}.")

    if "late fee" in body.lower():
        cap = re.search(r"(?:capped at|limited to)\s+(?:Rs\.?|₹)?\s*(\d+)", body, re.I)
        if cap:
            bullets.append(
                f"Late fee is capped at ₹{cap.group(1)} per return where central tax is payable."
            )
        if re.search(r"tax payable is nil|central tax payable in the said return is nil", body, re.I):
            bullets.append("Late fee is fully waived where no central tax is payable in the return.")
        window = re.search(
            r"between\s+(\d{1,2}\s+\w+\s+\d{4})\s+and\s+(\d{1,2}\s+\w+\s+\d{4})",
            body,
            re.I,
        )
        if window:
            bullets.append(
                f"Belated filing window: {window.group(1)} to {window.group(2)}."
            )

    samples = extract_table_samples(body)
    if samples:
        if len(samples) == 1:
            bullets.append(f"Covers goods or services including {samples[0]}.")
        else:
            listed = ", ".join(samples[:4])
            bullets.append(f"Notified entries include {listed}, among others in the Table.")

    districts = re.search(
        r"principal place of business.*?in[:\s]+(.{20,200}?)(?:\.|For)",
        body,
        re.I,
    )
    if districts:
        bullets.append(
            f"Geographic scope: applies to taxpayers with principal place of business in "
            f"{clean_text(districts.group(1))[:120]}."
        )

    substantive = extract_substantive_sentences(body)
    keywords = re.compile(
        r"extend|exempt|waive|substitut|insert|notify|rate|return|portal|fee|amend",
        re.I,
    )
    for s in substantive:
        if keywords.search(s) and s not in bullets and len(bullets) < 12:
            if len(s) <= 220:
                bullets.append(s)
            else:
                bullets.append(s[:217] + "...")

    return list(dict.fromkeys(bullets))[:12]


def build_detailed_summary(
    notification_no: str,
    label: str,
    effect: str,
    bullets: List[str],
    body: str,
) -> str:
    parts = [
        f"Notification No. {notification_no} under {label} {effect[0].lower() + effect[1:] if effect else 'updates GST law.'}"
    ]
    substantive = extract_substantive_sentences(body)
    for s in substantive[:4]:
        if s not in parts and len(" ".join(parts)) < 900:
            parts.append(s)
    if len(parts) < 3 and len(bullets) > 2:
        parts.extend(bullets[1:4])
    text = " ".join(parts)
    return clean_text(text) if len(text) <= 1200 else clean_text(text[:1197] + "...")


def build_detailed_practical(
    body: str,
    category: str,
    forms: List[str],
    period: Optional[str],
    dates: List[str],
    effect: str,
) -> str:
    t = body.lower()
    chunks: List[str] = []

    if forms and ("extend" in t or "extended" in t):
        chunks.append(
            f"Registered persons should file {', '.join(forms[:2])} within the extended due dates "
            f"notified for {period or 'the relevant tax period'} to avoid late-filing flags on the GST portal."
        )
        if dates:
            chunks.append(
                f"Key deadline to diarise: {dates[0]}. Invoice reporting, GSTR-2A/2B matching, "
                f"and outward supply records should be aligned to this timeline."
            )
        chunks.append(
            "Interest on delayed tax payment may still apply even when the filing date is extended, "
            "so cash-flow and liability payment should be planned separately from the filing extension."
        )
    elif "late fee" in t:
        chunks.append(
            "Taxpayers with pending belated returns should file within the notified window to secure "
            "the reduced or nil late-fee benefit."
        )
        chunks.append(
            "After the window closes, normal late-fee and penalty provisions apply. "
            "Composition taxpayers and regular taxpayers should verify eligibility before filing."
        )
    elif "exempt" in t or "rate" in category:
        chunks.append(
            "Billing teams, ERP tax configuration, and contract pricing should be updated to reflect "
            "the rates and exemptions in the notification Table."
        )
        chunks.append(
            "Procurement and sales should verify HSN/SAC codes against the notified entries before "
            "invoicing, as incorrect classification can lead to tax disputes."
        )
    elif "delegat" in t:
        chunks.append(
            "Notices, orders, or communications from the officers covered by this delegation should be "
            "treated as valid exercise of statutory power within the delegated scope."
        )
    else:
        chunks.append(
            f"In practice, this notification means: {effect}"
        )
        chunks.append(
            "Compliance teams should read the full notification, identify affected registrations and tax "
            "periods, and update checklists, portal filings, and client advisories accordingly."
        )

    return " ".join(chunks)


def build_summaries(
    text: str,
    notification_no: str,
    title: str,
    category: str,
    filename: str,
    is_corrigendum: bool,
) -> Tuple[str, str, str, str]:
    label = CATEGORY_LABELS.get(category, category)
    body = strip_boilerplate(text)

    if not body:
        short = title or f"GST notification {notification_no} under {label}."
        return short, f"- {short}", short, short

    effect = describe_operative_effect(body, category, is_corrigendum)
    forms = extract_forms(body)
    period = extract_tax_period(body)
    dates = extract_extension_dates(body)
    amended = extract_amended_ref(body)
    clauses = extract_quoted_clauses(body)
    substitution = extract_substitution(body)

    summary_short = effect if len(effect) <= DETAIL_MAX_LEN + 2 else truncate_detail(effect) + "."

    bullets = build_detailed_bullets(
        body,
        category,
        is_corrigendum,
        effect,
        forms,
        period,
        dates,
        amended,
        clauses,
        substitution,
    )
    summary_bullets = "\n".join(f"- {b}" for b in bullets)
    summary = build_detailed_summary(notification_no, label, effect, bullets, body)
    practical = build_detailed_practical(body, category, forms, period, dates, effect)

    return summary_short, summary_bullets, summary, practical