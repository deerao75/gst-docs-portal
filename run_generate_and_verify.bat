@echo off
cd /d "C:\Deepak\Acer Tax\gst-docs-portal"
echo === GENERATE START %date% %time% === > generate_verify_log.txt
python scripts\generate_circular_summaries.py --force >> generate_verify_log.txt 2>&1
echo GENERATE_EXIT=%ERRORLEVEL% >> generate_verify_log.txt
echo === VERIFY START %date% %time% === >> generate_verify_log.txt
python -c "import json,re; d=json.load(open('data/pdf_documents.json',encoding='utf-8')); circ=[x for x in d if x['doc_type']=='circular']; bad=sum(1 for x in circ if x.get('summary') and re.search(r'Madam/Sir|Chief Commissioners', x['summary'], re.I)); print('total',len(circ),'with summary',sum(1 for x in circ if x.get('summary')),'bad',bad); c=next(x for x in circ if x['notification_no']=='127/2019-CGST Circular'); print('127 sample:', c['summary'][:350])" >> generate_verify_log.txt 2>&1
echo === DONE %date% %time% === >> generate_verify_log.txt