@echo off
cd /d "%~dp0"
echo Generating notification Show Summary text (writes to pdf_documents.json)...
python scripts\generate_notification_summaries.py %*
if errorlevel 1 pause