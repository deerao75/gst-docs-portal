@echo off
cd /d "%~dp0"
echo Scanning all notification PDFs for amendment relationships...
py -3.11 scripts\extract_notification_changes.py
if errorlevel 1 (
  echo Extraction failed.
  pause
  exit /b 1
)
echo.
echo Done. Run extract-document-legal-status.bat to update pdf_documents.json.
pause