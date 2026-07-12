@echo off
cd /d "%~dp0"
echo Ingesting circular PDFs from All Circulars...
python scripts\ingest_circulars.py
if errorlevel 1 (
  echo Ingestion failed.
  pause
  exit /b 1
)
echo Done.
pause