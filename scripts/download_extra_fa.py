import os
import urllib.request

out = os.path.join(os.path.dirname(__file__), "..", "data", "finance_acts_source")
urls = [
    ("fa2024_cf.pdf", "https://d23z1tp9il9etb.cloudfront.net/download/pdf24/THE-FINANCE-ACT-2024.pdf"),
    ("egazette_fa2024.pdf", "https://egazette.gov.in/WriteReadData/2024/175141.pdf"),
]
for name, url in urls:
    dest = os.path.join(out, name)
    try:
        urllib.request.urlretrieve(url, dest)
        print(f"OK {name} {os.path.getsize(dest)}")
    except Exception as exc:
        print(f"FAIL {name} {exc}")