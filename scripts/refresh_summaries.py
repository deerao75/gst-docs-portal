"""
Refresh titles and summaries for all notifications in pdf_documents.json.
Run: python scripts/refresh_summaries.py
"""
import json
import logging
import os
import re
import sys
import warnings

warnings.filterwarnings("ignore")
logging.getLogger("pypdf").setLevel(logging.ERROR)
logging.getLogger("PyPDF2").setLevel(logging.ERROR)

sys.path.insert(0, os.path.dirname(__file__))

from catalog_lock import acquire, release
from ingest_notifications import extract_pdf_text, parse_notification_meta
from summarize_notification import build_summaries, build_title, is_corrigendum_file

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_JSON = os.path.join(ROOT, "data", "pdf_documents.json")

def _save_records(records: list[dict]) -> None:
    tmp = OUT_JSON + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
    os.replace(tmp, OUT_JSON)


HAND_CRAFTED = {
    "01/2023-Central Tax": {
        "title": "Delegation of powers to Additional Assistant Directors",
        "summary_short": "Notifies delegation of GST powers to Additional Assistant Directors in Intelligence, GST, and Audit.",
        "summary_bullets": "- Amends Notification No. 14/2017-Central Tax (dated 1 July 2017), which lists GST officers and the powers delegated to them.\n- Inserts new Sl. No. 8A in the powers table, immediately after Sl. No. 8.\n- Covers three officer roles: Additional Assistant Director, GST Intelligence; Additional Assistant Director, GST; and Additional Assistant Director, Audit Superintendent.\n- Column (3) of the table specifies which senior officers' powers each of these officers may exercise.\n- Issued under section 3 read with section 5 of the CGST Act, 2017 and section 3 of the IGST Act, 2017.",
        "summary": "Notification No. 01/2023-Central Tax expands the officer delegation framework under Notification No. 14/2017-Central Tax by adding Sl. No. 8A for Additional Assistant Directors in GST Intelligence, GST, and Audit Superintendent. The notification clarifies which higher officers' powers they may exercise and is issued under the CGST and IGST Acts. The change strengthens mid-level GST administration by giving these officers clear statutory authority in their respective functions.",
        "practical_effect": "Additional Assistant Directors in GST Intelligence, regular GST, and Audit can now formally exercise delegated powers of senior officers in defined matters. Cases may move faster at this level without always waiting for Joint Commissioner or higher authority. Taxpayers may receive notices, orders, or communications from these officers with full legal backing.",
    },
    "01/2025-Central Tax": {
        "title": "Extension of GSTR-1 filing deadline — December 2024",
        "summary_short": "Notifies extension of GSTR-1 due date for Dec 2024 monthly and Oct–Dec 2024 quarterly filers.",
        "summary_bullets": "- Amends Notification No. 83/2020-Central Tax (dated 10 November 2020) on GSTR-1 filing extensions.\n- Inserts a new proviso after the fifth proviso in that notification.\n- Monthly filers under section 39(1) of the CGST Act: GSTR-1 for December 2024 extended to 13 January 2025.\n- Quarterly filers under the proviso to section 39(1): GSTR-1 for October–December 2024 extended to 15 January 2025.\n- Issued by the Commissioner under section 37(1) read with section 168, on GST Council recommendations.",
        "summary": "Notification No. 01/2025-Central Tax extends the deadline for furnishing outward supply details in FORM GSTR-1 for the December 2024 tax period. Monthly taxpayers must file by 13 January 2025; quarterly taxpayers for October–December 2024 must file by 15 January 2025. The extension is made by amending Notification No. 83/2020-Central Tax and provides short-term compliance relief for the specified period.",
        "practical_effect": "Registered persons get extra time to report outward supplies in GSTR-1 without being treated as late filers for that period. Monthly taxpayers gain a few days beyond the normal due date; quarterly taxpayers filing for Oct–Dec 2024 can file until 15 January 2025. Recipients of those supplies also get slightly more time to receive accurate invoice data in their GSTR-2A/2B.",
    },
    "02/2024-Central Tax": {
        "title": "Extension of GSTR-9 and GSTR-9C due dates — Tamil Nadu districts",
        "summary_short": "Notifies extension of GSTR-9 and GSTR-9C due dates for FY 2022–23 in nine Tamil Nadu districts.",
        "summary_bullets": "- Notifies the Central Goods and Services Tax (Amendment) Rules, 2024, amending the CGST Rules, 2017.\n- Effective from 31 December 2023.\n- Amends Rule 80 by inserting sub-rules (1B) and (3B).\n- Applies to registered persons whose principal place of business is in: Chennai, Tiruvallur, Chengalpattu, Kancheepuram, Tirunelveli, Tenkasi, Kanyakumari, Thoothukudi, or Virudhunagar (Tamil Nadu).\n- For FY 2022–23, both FORM GSTR-9 (annual return) and FORM GSTR-9C (reconciliation statement) are due by 10 January 2024.",
        "summary": "Notification No. 02/2024-Central Tax introduces the CGST (Amendment) Rules, 2024 and amends Rule 80 to give registered persons in nine Tamil Nadu districts until 10 January 2024 to file FORM GSTR-9 and FORM GSTR-9C for financial year 2022–23. This is a district-specific extension and does not apply to taxpayers in other parts of the country.",
        "practical_effect": "Businesses in the nine specified Tamil Nadu districts avoid late filing of GSTR-9 and GSTR-9C for FY 2022–23 if they file by 10 January 2024. Taxpayers outside these districts are not covered and must follow the standard Rule 80 timelines. Affected businesses should complete annual reconciliation before the extended date to prevent penalties and compliance flags on the portal.",
    },
    "02/2025-Central Tax": {
        "title": "Extension of GSTR-3B filing deadline — December 2024",
        "summary_short": "Notifies extension of GSTR-3B due dates for Dec 2024 monthly and Oct–Dec 2024 quarterly filers.",
        "summary_bullets": "- Extends time to furnish FORM GSTR-3B through the GST common portal.\n- Issued under section 39(6) read with section 168 of the CGST Act.\n- Monthly filers (section 39(1)): December 2024 return due by 22 January 2025.\n- Quarterly filers (proviso to section 39(1)) for October–December 2024:\n- 24 January 2025 — Chhattisgarh, MP, Gujarat, Maharashtra, Karnataka, Goa, Kerala, Tamil Nadu, Telangana, AP, and specified UTs.\n- 26 January 2025 — HP, Punjab, Uttarakhand, Haryana, Rajasthan, UP, Bihar, NE states, WB, Jharkhand, Odisha, and UTs (J&K, Ladakh, Chandigarh, Delhi).",
        "summary": "Notification No. 02/2025-Central Tax extends GSTR-3B filing deadlines for December 2024. Monthly taxpayers may file by 22 January 2025. Quarterly taxpayers for October–December 2024 may file by 24 January 2025 (southern/western states and certain UTs) or 26 January 2025 (northern/eastern/north-eastern states and other UTs), based on the principal place of business. The staggered dates follow the usual state-wise GSTR-3B filing pattern.",
        "practical_effect": "Taxpayers get more time to pay GST liability and claim input tax credit via GSTR-3B for the relevant period without immediate late-filing consequences. Monthly filers have until 22 January 2025; quarterly filers have until 24 or 26 January 2025 depending on their state/UT. Cash flow and ITC planning should be aligned to these extended dates; interest on delayed payment may still apply even where the filing deadline is extended.",
    },
    "02/2023-Central Tax": {
        "title": "Late-fee waiver on belated GSTR-4 filings — composition taxpayers",
        "summary_short": "Notifies late-fee waiver on belated GSTR-4 filings by composition taxpayers for specified periods.",
        "summary_bullets": "- Amends Notification No. 73/2017-Central Tax (dated 29 December 2017) on late fee waivers under section 128 of the CGST Act.\n- Inserts a new proviso after the sixth proviso.\n- Covers composition scheme taxpayers who did not file FORM GSTR-4 on time for:\n- quarters July 2017 – March 2019, or\n- financial years 2019–20, 2020–21, and 2021–22.\n- Belated return must be filed between 1 April 2023 and 30 June 2023.\n- Late fee under section 47 is capped at ₹250 (excess waived); fully waived if central tax payable in the return is nil.",
        "summary": "Notification No. 02/2023-Central Tax offers late fee relief for composition scheme taxpayers who file belated FORM GSTR-4 for quarters from July 2017 to March 2019 or for financial years 2019–20 through 2021–22, provided filing is done between 1 April 2023 and 30 June 2023. Late fee is limited to ₹250 where tax is due, and fully waived where no central tax is payable. The notification helps taxpayers clear old GSTR-4 defaults at minimal cost within the specified period.",
        "practical_effect": "Composition taxpayers with pending GSTR-4 filings for old periods could regularise compliance at low or zero late fee by filing within the three-month window (1 April–30 June 2023). Maximum late fee was ₹250 per return where tax was payable; nil-tax returns attracted no late fee. Missing the window meant normal late fee rules applied. This was a time-bound amnesty-style relief to clear historical defaults.",
    },
}


def main():
    if not acquire("refresh_summaries"):
        sys.exit(1)
    try:
        _run_refresh()
    finally:
        release()


def _run_refresh():
    with open(OUT_JSON, encoding="utf-8") as f:
        records = json.load(f)

    updated = 0
    errors = 0

    for idx, rec in enumerate(records, 1):
        if rec.get("doc_type") != "notification":
            continue
        try:
            path = rec["file_path"]
            if not os.path.isabs(path):
                path = os.path.normpath(os.path.join(ROOT, path))
            if not os.path.exists(path):
                raise FileNotFoundError(path)

            fname = rec["file_name"]
            folder = os.path.basename(os.path.dirname(path))
            size = os.path.getsize(path)
            max_pages = 14 if size > 350000 else 10 if size > 150000 else 8
            text = extract_pdf_text(path, max_pages=max_pages)
            notification_no, title, issued, year, category, is_corrigendum = (
                parse_notification_meta(fname, folder, text)
            )
            summary_short, summary_bullets, summary, practical = build_summaries(
                text,
                notification_no,
                title,
                category,
                fname,
                is_corrigendum,
            )

            override = HAND_CRAFTED.get(notification_no)
            if override and not is_corrigendum:
                title = override.get("title", title)
                summary_short = override.get("summary_short", summary_short)
                summary_bullets = override.get("summary_bullets", summary_bullets)
                summary = override.get("summary", summary)
                practical = override.get("practical_effect", practical)

            rec.update(
                {
                    "notification_no": notification_no,
                    "title": title,
                    "issued_date": issued,
                    "year": year,
                    "category": category,
                    "is_corrigendum": is_corrigendum,
                    "summary_short": summary_short,
                    "summary_bullets": summary_bullets,
                    "summary": summary,
                    "practical_effect": practical,
                }
            )
            updated += 1
        except Exception as exc:
            errors += 1
            print(f"Error on {rec.get('file_name')}: {exc}", file=sys.stderr)

        if idx % 100 == 0:
            print(f"Processed {idx}/{len(records)}")
            _save_records(records)

    _save_records(records)

    print(f"Updated {updated} notifications ({errors} errors)")


if __name__ == "__main__":
    main()