import hashlib
import json
import os
import sqlite3
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "documents.db")
PDF_FOLDER = r"C:\Deepak\Acer Tax\CBIC_Notifications_All"

DOCUMENTS = [
    {
        "file_name": "01-2023-ct-eng.pdf",
        "doc_type": "notification",
        "notification_no": "01/2023-Central Tax",
        "title": "Delegation of powers to Additional Assistant Directors",
        "issued_date": "2023-01-04",
        "year": 2023,
        "summary_short": "Delegates specified GST administrative powers to Additional Assistant Directors in Intelligence, GST, and Audit.",
        "summary_bullets": """- Amends **Notification No. 14/2017-Central Tax** (dated 1 July 2017), which lists GST officers and the powers delegated to them.
- Inserts new **Sl. No. 8A** in the powers table, immediately after Sl. No. 8.
- Covers three officer roles: **Additional Assistant Director, GST Intelligence**; **Additional Assistant Director, GST**; and **Additional Assistant Director, Audit Superintendent**.
- Column (3) of the table specifies **which senior officers' powers** each of these officers may exercise.
- Issued under **section 3 read with section 5 of the CGST Act, 2017** and **section 3 of the IGST Act, 2017**.""",
        "summary": "Notification No. 01/2023-Central Tax expands the officer delegation framework under Notification No. 14/2017-Central Tax by adding Sl. No. 8A for Additional Assistant Directors in GST Intelligence, GST, and Audit Superintendent. The notification clarifies which higher officers' powers they may exercise and is issued under the CGST and IGST Acts. The change strengthens mid-level GST administration by giving these officers clear statutory authority in their respective functions.",
        "practical_effect": "Additional Assistant Directors in GST Intelligence, regular GST, and Audit can now **formally exercise delegated powers** of senior officers in defined matters. Cases may move faster at this level without always waiting for Joint Commissioner or higher authority. Taxpayers may receive notices, orders, or communications from these officers with full legal backing.",
    },
    {
        "file_name": "01-2025-ct-eng.pdf",
        "doc_type": "notification",
        "notification_no": "01/2025-Central Tax",
        "title": "Extension of GSTR-1 filing deadline — December 2024",
        "issued_date": "2025-01-10",
        "year": 2025,
        "summary_short": "Extends GSTR-1 filing deadline for December 2024 (monthly) and Oct–Dec 2024 (quarterly).",
        "summary_bullets": """- Amends **Notification No. 83/2020-Central Tax** (dated 10 November 2020) on GSTR-1 filing extensions.
- Inserts a new proviso after the fifth proviso in that notification.
- **Monthly filers** under **section 39(1)** of the CGST Act: GSTR-1 for **December 2024** extended to **13 January 2025**.
- **Quarterly filers** under the **proviso to section 39(1)**: GSTR-1 for **October–December 2024** extended to **15 January 2025**.
- Issued by the **Commissioner** under **section 37(1)** read with **section 168**, on GST Council recommendations.""",
        "summary": "Notification No. 01/2025-Central Tax extends the deadline for furnishing outward supply details in FORM GSTR-1 for the December 2024 tax period. Monthly taxpayers must file by 13 January 2025; quarterly taxpayers for October–December 2024 must file by 15 January 2025. The extension is made by amending Notification No. 83/2020-Central Tax and provides short-term compliance relief for the specified period.",
        "practical_effect": "Registered persons get **extra time to report outward supplies** in GSTR-1 without being treated as late filers for that period. Monthly taxpayers gain a few days beyond the normal due date; quarterly taxpayers filing for Oct–Dec 2024 can file until 15 January 2025. Recipients of those supplies also get slightly more time to receive accurate invoice data in their GSTR-2A/2B.",
    },
    {
        "file_name": "02-2024-ct-eng.pdf",
        "doc_type": "notification",
        "notification_no": "02/2024-Central Tax",
        "title": "Extension of GSTR-9 and GSTR-9C due dates — Tamil Nadu districts",
        "issued_date": "2024-01-05",
        "year": 2024,
        "summary_short": "Extends GSTR-9 and GSTR-9C due dates for FY 2022–23 for nine Tamil Nadu districts.",
        "summary_bullets": """- Notifies the **Central Goods and Services Tax (Amendment) Rules, 2024**, amending the **CGST Rules, 2017**.
- Effective from **31 December 2023**.
- Amends **Rule 80** by inserting sub-rules **(1B)** and **(3B)**.
- Applies to registered persons whose **principal place of business** is in: Chennai, Tiruvallur, Chengalpattu, Kancheepuram, Tirunelveli, Tenkasi, Kanyakumari, Thoothukudi, or Virudhunagar (Tamil Nadu).
- For **FY 2022–23**, both **FORM GSTR-9** (annual return) and **FORM GSTR-9C** (reconciliation statement) are due by **10 January 2024**.""",
        "summary": "Notification No. 02/2024-Central Tax introduces the CGST (Amendment) Rules, 2024 and amends Rule 80 to give registered persons in nine Tamil Nadu districts until 10 January 2024 to file FORM GSTR-9 and FORM GSTR-9C for financial year 2022–23. This is a district-specific extension and does not apply to taxpayers in other parts of the country.",
        "practical_effect": "Businesses in the nine specified Tamil Nadu districts **avoid late filing of GSTR-9 and GSTR-9C** for FY 2022–23 if they file by 10 January 2024. Taxpayers outside these districts are **not covered** and must follow the standard Rule 80 timelines. Affected businesses should complete annual reconciliation before the extended date to prevent penalties and compliance flags on the portal.",
    },
    {
        "file_name": "02-2025-ct-eng.pdf",
        "doc_type": "notification",
        "notification_no": "02/2025-Central Tax",
        "title": "Extension of GSTR-3B filing deadline — December 2024",
        "issued_date": "2025-01-10",
        "year": 2025,
        "summary_short": "Extends GSTR-3B due dates for December 2024 monthly filers and Oct–Dec 2024 quarterly filers.",
        "summary_bullets": """- Extends time to furnish **FORM GSTR-3B** through the GST common portal.
- Issued under **section 39(6)** read with **section 168** of the CGST Act.
- **Monthly filers** (section 39(1)): December 2024 return due by **22 January 2025**.
- **Quarterly filers** (proviso to section 39(1)) for **October–December 2024**:
  - **24 January 2025** — Chhattisgarh, MP, Gujarat, Maharashtra, Karnataka, Goa, Kerala, Tamil Nadu, Telangana, AP, and specified UTs.
  - **26 January 2025** — HP, Punjab, Uttarakhand, Haryana, Rajasthan, UP, Bihar, NE states, WB, Jharkhand, Odisha, and UTs (J&K, Ladakh, Chandigarh, Delhi).""",
        "summary": "Notification No. 02/2025-Central Tax extends GSTR-3B filing deadlines for December 2024. Monthly taxpayers may file by 22 January 2025. Quarterly taxpayers for October–December 2024 may file by 24 January 2025 (southern/western states and certain UTs) or 26 January 2025 (northern/eastern/north-eastern states and other UTs), based on the principal place of business. The staggered dates follow the usual state-wise GSTR-3B filing pattern.",
        "practical_effect": "Taxpayers get **more time to pay GST liability and claim input tax credit** via GSTR-3B for the relevant period without immediate late-filing consequences. Monthly filers have until 22 January 2025; quarterly filers have until 24 or 26 January 2025 depending on their state/UT. Cash flow and ITC planning should be aligned to these extended dates; **interest on delayed payment may still apply** even where the filing deadline is extended.",
    },
    {
        "file_name": "02_ENG.pdf",
        "doc_type": "notification",
        "notification_no": "02/2023-Central Tax",
        "title": "Late-fee waiver on belated GSTR-4 filings — composition taxpayers",
        "issued_date": "2023-03-31",
        "year": 2023,
        "summary_short": "Late-fee waiver on belated GSTR-4 filings by composition taxpayers for specified past periods.",
        "summary_bullets": """- Amends **Notification No. 73/2017-Central Tax** (dated 29 December 2017) on late fee waivers under **section 128** of the CGST Act.
- Inserts a new proviso after the sixth proviso.
- Covers **composition scheme taxpayers** who did not file **FORM GSTR-4** on time for:
  - quarters **July 2017 – March 2019**, or
  - financial years **2019–20, 2020–21, and 2021–22**.
- Belated return must be filed between **1 April 2023 and 30 June 2023**.
- Late fee under **section 47** is **capped at ₹250** (excess waived); **fully waived** if central tax payable in the return is **nil**.""",
        "summary": "Notification No. 02/2023-Central Tax offers late fee relief for composition scheme taxpayers who file belated FORM GSTR-4 for quarters from July 2017 to March 2019 or for financial years 2019–20 through 2021–22, provided filing is done between 1 April 2023 and 30 June 2023. Late fee is limited to ₹250 where tax is due, and fully waived where no central tax is payable. The notification helps taxpayers clear old GSTR-4 defaults at minimal cost within the specified period.",
        "practical_effect": "Composition taxpayers with **pending GSTR-4 filings** for old periods could **regularise compliance at low or zero late fee** by filing within the three-month window (1 April–30 June 2023). Maximum late fee was ₹250 per return where tax was payable; nil-tax returns attracted no late fee. Missing the window meant normal late fee rules applied. This was a **time-bound amnesty-style relief** to clear historical defaults.",
    },
]

ACTS = [
    {
        "slug": "cgst-act-2017",
        "title": "Central Goods and Services Tax Act, 2017",
        "year": 2017,
        "sections": [
            {"number": "1", "title": "Short title, extent and commencement", "content": "This Act may be called the Central Goods and Services Tax Act, 2017. It extends to the whole of India except the State of Jammu and Kashmir. Content will be added in full text format."},
            {"number": "2", "title": "Definitions", "content": "In this Act, unless the context otherwise requires, various terms including 'aggregate turnover', 'business', 'goods', 'services', and 'taxable person' are defined. Full section text to be imported."},
        ],
    },
    {
        "slug": "igst-act-2017",
        "title": "Integrated Goods and Services Tax Act, 2017",
        "year": 2017,
        "sections": [
            {"number": "1", "title": "Short title, extent and commencement", "content": "This Act may be called the Integrated Goods and Services Tax Act, 2017. Full section text to be imported."},
            {"number": "2", "title": "Definitions", "content": "Definitions for inter-state supply and related terms. Full section text to be imported."},
        ],
    },
]

RULES = [
    {
        "slug": "cgst-rules-2017",
        "title": "Central Goods and Services Tax Rules, 2017",
        "year": 2017,
        "sections": [
            {"number": "1", "title": "Short title and commencement", "content": "These rules may be called the Central Goods and Services Tax Rules, 2017. Full rule text to be imported."},
            {"number": "80", "title": "Annual return", "content": "Every registered person, other than an Input Service Distributor, a person paying tax under section 51 or section 52, a casual taxable person and a non-resident taxable person, shall furnish an annual return for every financial year electronically in FORM GSTR-9. Full rule text to be imported."},
        ],
    },
]


def file_hash(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.executescript("""
        DROP TABLE IF EXISTS pdf_documents;
        DROP TABLE IF EXISTS text_documents;
        DROP TABLE IF EXISTS text_sections;

        CREATE TABLE pdf_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_hash TEXT NOT NULL UNIQUE,
            doc_type TEXT NOT NULL,
            notification_no TEXT,
            title TEXT NOT NULL,
            issued_date TEXT,
            year INTEGER NOT NULL,
            summary_short TEXT,
            summary_bullets TEXT,
            summary TEXT,
            practical_effect TEXT,
            status TEXT DEFAULT 'ready',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE text_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            doc_category TEXT NOT NULL,
            title TEXT NOT NULL,
            year INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE text_sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            section_number TEXT NOT NULL,
            section_title TEXT NOT NULL,
            content TEXT NOT NULL,
            sort_order INTEGER NOT NULL,
            FOREIGN KEY (document_id) REFERENCES text_documents(id)
        );

        CREATE INDEX idx_pdf_type_year ON pdf_documents(doc_type, year);
        CREATE INDEX idx_text_category ON text_documents(doc_category);
    """)

    for doc in DOCUMENTS:
        path = os.path.join(PDF_FOLDER, doc["file_name"])
        fh = file_hash(path)
        cur.execute(
            """INSERT INTO pdf_documents
               (file_name, file_path, file_hash, doc_type, notification_no, title,
                issued_date, year, summary_short, summary_bullets, summary, practical_effect, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready')""",
            (
                doc["file_name"],
                path,
                fh,
                doc["doc_type"],
                doc["notification_no"],
                doc["title"],
                doc["issued_date"],
                doc["year"],
                doc["summary_short"],
                doc["summary_bullets"],
                doc["summary"],
                doc["practical_effect"],
            ),
        )

    for act in ACTS:
        cur.execute(
            "INSERT INTO text_documents (slug, doc_category, title, year) VALUES (?, 'act', ?, ?)",
            (act["slug"], act["title"], act["year"]),
        )
        doc_id = cur.lastrowid
        for i, section in enumerate(act["sections"]):
            cur.execute(
                """INSERT INTO text_sections (document_id, section_number, section_title, content, sort_order)
                   VALUES (?, ?, ?, ?, ?)""",
                (doc_id, section["number"], section["title"], section["content"], i + 1),
            )

    for rule in RULES:
        cur.execute(
            "INSERT INTO text_documents (slug, doc_category, title, year) VALUES (?, 'rule', ?, ?)",
            (rule["slug"], rule["title"], rule["year"]),
        )
        doc_id = cur.lastrowid
        for i, section in enumerate(rule["sections"]):
            cur.execute(
                """INSERT INTO text_sections (document_id, section_number, section_title, content, sort_order)
                   VALUES (?, ?, ?, ?, ?)""",
                (doc_id, section["number"], section["title"], section["content"], i + 1),
            )

    conn.commit()
    export_json(conn)
    conn.close()
    print(f"Database initialized at {DB_PATH}")


def export_json(conn):
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(data_dir, exist_ok=True)
    cur = conn.cursor()

    def rows(query, params=()):
        cur.execute(query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    pdf_docs = rows("SELECT * FROM pdf_documents ORDER BY year DESC, issued_date DESC, id ASC")
    text_docs = rows("SELECT * FROM text_documents ORDER BY doc_category, title ASC")
    text_sections = rows("SELECT * FROM text_sections ORDER BY document_id, sort_order ASC")

    with open(os.path.join(data_dir, "pdf_documents.json"), "w", encoding="utf-8") as f:
        json.dump(pdf_docs, f, indent=2, ensure_ascii=False)

    with open(os.path.join(data_dir, "text_documents.json"), "w", encoding="utf-8") as f:
        json.dump(text_docs, f, indent=2, ensure_ascii=False)

    with open(os.path.join(data_dir, "text_sections.json"), "w", encoding="utf-8") as f:
        json.dump(text_sections, f, indent=2, ensure_ascii=False)

    print(f"JSON exports written to {data_dir}")


if __name__ == "__main__":
    init_db()