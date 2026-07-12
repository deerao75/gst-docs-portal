@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "LOG=%~dp0run_all_log.txt"
echo === Amendment pipeline started %date% %time% === > "%LOG%"

echo [1/3] Scanning notification PDFs for amendments...
py -3.11 scripts\extract_notification_changes.py >> "%LOG%" 2>&1
if errorlevel 1 (
  echo Step 1 failed. See %LOG%
  exit /b 1
)

echo [2/3] Applying legal status to pdf_documents.json...
py -3.11 scripts\extract_document_legal_status.py >> "%LOG%" 2>&1
if errorlevel 1 (
  echo Step 2 failed. See %LOG%
  exit /b 1
)

echo [3/3] Rebuilding portal...
call _cursor_clean_build.bat >> "%LOG%" 2>&1
if errorlevel 1 (
  echo Step 3 failed. See %LOG%
  exit /b 1
)

echo === Amendment pipeline completed %date% %time% === >> "%LOG%"
echo Done. Log: %LOG%
exit /b 0