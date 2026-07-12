@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
set PYTHONUNBUFFERED=1
set LOG=%~dp0_rebuild_full_catalog.log

echo === Full catalog rebuild started %date% %time% === > "%LOG%"

echo [1/3] Notifications (summary_short with Notifies format)... >> "%LOG%"
py -3.11 -u scripts\ingest_notifications.py >> "%LOG%" 2>&1
if errorlevel 1 (
  echo Step 1 FAILED. See %LOG%
  exit /b 1
)

echo [2/3] Circulars... >> "%LOG%"
py -3.11 -u scripts\ingest_circulars.py >> "%LOG%" 2>&1
if errorlevel 1 (
  echo Step 2 FAILED. See %LOG%
  exit /b 1
)

echo [3/3] Orders... >> "%LOG%"
py -3.11 -u scripts\ingest_orders.py >> "%LOG%" 2>&1
if errorlevel 1 (
  echo Step 3 FAILED. See %LOG%
  exit /b 1
)

echo === Rebuild completed %date% %time% === >> "%LOG%"
py -3.11 -c "import json;d=json.load(open('data/pdf_documents.json',encoding='utf-8'));ns=[x for x in d if x.get('doc_type')=='notification'];nv=sum(1 for x in ns if (x.get('summary_short') or '').strip().lower().startswith('notifies'));print(f'total={len(d)} notifications={len(ns)} notifies_detail={nv}')" >> "%LOG%" 2>&1
echo Done. Log: %LOG%
exit /b 0