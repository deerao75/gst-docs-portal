"""Shared notification category detection for ingest and reclassify."""
import re

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


def _is_rate_notification(name: str) -> bool:
    n = name.lower()
    return bool(
        "(rate)" in n
        or re.search(r"\(\s*r\s*\)", n)
        or re.search(r"ct\s*\(\s*r\s*\)", n)
        or re.search(r"ct\s*\(r\)", n)
        or re.search(r"_ct\s*\(\s*r\s*\)", n)
        or re.search(r"igst\s*\(\s*r\s*\)", n)
        or re.search(r"igst\s*\(r\)", n)
        or re.search(r"ut\s*\(\s*r\s*\)", n)
        or re.search(r"union territory tax\s*\(rate\)", n)
        or re.search(r"union terriroty tax\s*\(rate\)", n)
    )


def detect_category(name: str, folder: str = "") -> str:
    """Classify from filename and parent folder."""
    n = name.lower()
    f = folder.lower()
    is_rate = _is_rate_notification(name)
    is_corrig = "corrigendum" in n

    is_cc = bool(re.search(r"\bcc\b", n)) or "compensation cess" in n or "cc and cc" in f
    is_igst = "igst" in n or "integrated tax" in n
    is_ut = (
        "union territory tax" in n
        or "union terriroty tax" in n
        or "union territory" in n
        or "union terriroty" in n
        or (bool(re.search(r"\but\b", n)) and not is_igst)
    )
    is_ct = bool(re.search(r"\bct\b", n)) or "_ct" in n or "central tax" in n

    in_ut_folder = "ut and ut" in f
    in_ct_folder = "ct & igst" in f or "ct and igst" in f
    in_cc_folder = "cc and cc" in f

    if is_cc:
        return "compensation_cess_rate" if is_rate else "compensation_cess"
    if is_igst:
        return "integrated_tax_rate" if is_rate else "integrated_tax"
    if is_ut:
        return "union_territory_tax_rate" if is_rate else "union_territory_tax"
    if is_ct:
        return "central_tax_rate" if is_rate else "central_tax"

    if in_ut_folder:
        if is_corrig:
            return "union_territory_tax_rate"
        return "union_territory_tax_rate" if is_rate else "union_territory_tax"
    if in_cc_folder:
        return "compensation_cess_rate" if is_rate else "compensation_cess"
    if in_ct_folder:
        return "central_tax_rate" if is_rate else "central_tax"

    return "central_tax_rate" if is_rate else "central_tax"


def notification_no_for_category(old_no: str, category: str) -> str:
    label = CATEGORY_LABELS[category]
    m = re.match(r"(\d+)/(\d{4})-", old_no or "")
    if m:
        return f"{m.group(1)}/{m.group(2)}-{label}"
    m2 = re.match(r"-/(\d{4})-", old_no or "")
    if m2:
        return f"-/{m2.group(1)}-{label}"
    return old_no