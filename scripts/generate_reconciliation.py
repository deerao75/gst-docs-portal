"""Compare worksheet counts vs website and write reconciliation Excel."""
import json
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from notification_category import CATEGORY_LABELS, detect_category

WORKSHEET = Path(r"C:\Users\deepa\Downloads\Notifications work sheet.xlsx")
JSON_PATH = ROOT / "data" / "pdf_documents.json"
OUT_PATH = ROOT / "data" / "reconciliation_report.xlsx"
OUT_COPY = Path(r"C:\Users\deepa\Downloads\reconciliation_report.xlsx")

COLS = [
    "central_tax",
    "central_tax_rate",
    "integrated_tax",
    "integrated_tax_rate",
    "union_territory_tax",
    "union_territory_tax_rate",
    "compensation_cess",
    "compensation_cess_rate",
]
EXCEL_HEADERS = [
    "CENTRAL TAX",
    "CENTRAL TAX (RATE)",
    "INTEGRATED TAX",
    "INTEGRATED TAX (RATE)",
    "UNION TERRITORY TAX",
    "UNION TERRITORY TAX (RATE)",
    "COMPEN- SATION CESS",
    "COMPEN- SATION CESS (RATE)",
]


def load_excel_counts():
    raw = pd.read_excel(WORKSHEET, sheet_name="Sheet1", header=None)
    col_idx = {c: i + 1 for i, c in enumerate(COLS)}
    by_year = {}
    totals = Counter()
    for i in range(2, 12):
        year = raw.iloc[i, 0]
        if pd.isna(year):
            continue
        year = int(year)
        by_year[year] = {}
        for cat in COLS:
            val = raw.iloc[i, col_idx[cat]]
            val = 0 if pd.isna(val) else int(val)
            by_year[year][cat] = val
            totals[cat] += val
    grand = int(raw.iloc[15, 9]) if pd.notna(raw.iloc[15, 9]) else sum(totals.values())
    return by_year, totals, grand


def load_web_counts():
    notifs = [
        d
        for d in json.loads(JSON_PATH.read_text(encoding="utf-8"))
        if d.get("doc_type") == "notification"
    ]
    by_year = defaultdict(Counter)
    totals = Counter()
    for doc in notifs:
        year = doc.get("year")
        cat = doc.get("category")
        by_year[year][cat] += 1
        totals[cat] += 1
    return notifs, by_year, totals


def main():
    excel_by_year, excel_totals, excel_grand = load_excel_counts()
    notifs, web_by_year, web_totals = load_web_counts()

    years = sorted(set(excel_by_year) | set(web_by_year))

    rows = []
    for year in years:
        row = {"YEAR": year}
        year_excel = 0
        year_web = 0
        for cat, header in zip(COLS, EXCEL_HEADERS):
            ex = excel_by_year.get(year, {}).get(cat, 0)
            wb = web_by_year.get(year, {}).get(cat, 0)
            row[header] = ex
            row[f"WEB {header}"] = wb
            row[f"DIFF {header}"] = wb - ex
            year_excel += ex
            year_web += wb
        row["EXCEL YEAR TOTAL"] = year_excel
        row["WEB YEAR TOTAL"] = sum(web_by_year.get(year, Counter()).values())
        row["DIFF YEAR TOTAL"] = row["WEB YEAR TOTAL"] - year_excel
        rows.append(row)

    summary_df = pd.DataFrame(rows)

    cat_rows = []
    for cat, header in zip(COLS, EXCEL_HEADERS):
        cat_rows.append(
            {
                "Category": CATEGORY_LABELS[cat],
                "Category Key": cat,
                "Worksheet Total": excel_totals[cat],
                "Website Total": web_totals[cat],
                "Difference": web_totals[cat] - excel_totals[cat],
            }
        )
    cat_df = pd.DataFrame(cat_rows)
    cat_df.loc[len(cat_df)] = {
        "Category": "GRAND TOTAL",
        "Category Key": "",
        "Worksheet Total": excel_grand,
        "Website Total": len(notifs),
        "Difference": len(notifs) - excel_grand,
    }

    reclass_rows = []
    for doc in notifs:
        folder = os.path.basename(os.path.dirname(doc.get("file_path", "")))
        expected = detect_category(doc.get("file_name", ""), folder)
        if expected != doc.get("category"):
            reclass_rows.append(
                {
                    "Notification No": doc.get("notification_no"),
                    "Current Category": doc.get("category"),
                    "Expected Category": expected,
                    "File Name": doc.get("file_name"),
                    "Folder": folder,
                    "Year": doc.get("year"),
                }
            )
    issues_df = pd.DataFrame(reclass_rows)

    missing_notes = []
    for year in years:
        ex_total = sum(excel_by_year.get(year, {}).values())
        wb_total = sum(web_by_year.get(year, {}).values())
        if wb_total != ex_total:
            missing_notes.append(
                {
                    "Year": year,
                    "Worksheet Count": ex_total,
                    "Website PDF Count": wb_total,
                    "Gap (Web - Sheet)": wb_total - ex_total,
                    "Note": (
                        "Website has fewer PDFs on disk"
                        if wb_total < ex_total
                        else "Website has more PDFs than worksheet"
                    ),
                }
            )
    gaps_df = pd.DataFrame(missing_notes)

    all_docs = []
    for doc in sorted(notifs, key=lambda d: (-d.get("year", 0), d.get("category", ""), d.get("notification_no", ""))):
        all_docs.append(
            {
                "Year": doc.get("year"),
                "Category": CATEGORY_LABELS.get(doc.get("category"), doc.get("category")),
                "Category Key": doc.get("category"),
                "Notification No": doc.get("notification_no"),
                "Date": doc.get("issued_date"),
                "Corrigendum": doc.get("is_corrigendum"),
                "File Name": doc.get("file_name"),
            }
        )
    inventory_df = pd.DataFrame(all_docs)

    with pd.ExcelWriter(OUT_PATH, engine="openpyxl") as writer:
        summary_df.to_excel(writer, sheet_name="Year x Category", index=False)
        cat_df.to_excel(writer, sheet_name="Category Totals", index=False)
        gaps_df.to_excel(writer, sheet_name="Year Gaps", index=False)
        issues_df.to_excel(writer, sheet_name="Remaining Issues", index=False)
        inventory_df.to_excel(writer, sheet_name="Website Inventory", index=False)

    OUT_COPY.write_bytes(OUT_PATH.read_bytes())
    print(f"Wrote {OUT_PATH}")
    print(f"Copied to {OUT_COPY}")
    print(f"Website notifications: {len(notifs)}")
    print(f"Worksheet grand total: {excel_grand}")
    print(f"Remaining category issues: {len(reclass_rows)}")


if __name__ == "__main__":
    main()