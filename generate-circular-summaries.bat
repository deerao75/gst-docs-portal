@echo off
cd /d "%~dp0"
echo Generating circular summaries (reads each PDF, writes to pdf_documents.json)...
python scripts\generate_circular_summaries.py %*
if errorlevel 1 pause