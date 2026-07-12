"""Scan downloaded Finance Act PDFs for GST-related chapter markers."""
from __future__ import annotations

import os
import re

import fitz

SRC = os.path.join(os.path.dirname(__file__), "..", "data", "finance_acts_source")

GST_HDR = re.compile(
    r"(?:PART|CHAPTER)\s+[IVXLC\d]+\s*\n\s*AMENDMENTS?\s+TO\s+THE\s+"
    r"(?:CENTRAL|INTEGRATED|UNION TERRITORY|GOODS AND SERVICES TAX)",
    re.M,
)


def main() -> None:
    for fn in sorted(os.listdir(SRC)):
        if not fn.endswith(".pdf"):
            continue
        path = os.path.join(SRC, fn)
        doc = fitz.open(path)
        full = "".join(doc.load_page(i).get_text() for i in range(doc.page_count))
        hits = [m.group(0).replace("\n", " ") for m in GST_HDR.finditer(full)]
        if hits:
            print(f"{fn} pages={doc.page_count} hits={len(hits)}")
            for text in hits:
                print(f"  {text[:140]}")


if __name__ == "__main__":
    main()