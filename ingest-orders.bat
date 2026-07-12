@echo off
cd /d "%~dp0"
echo Ingesting order PDFs...
py -3.11 scripts\ingest_orders.py
if errorlevel 1 (
  echo Ingestion failed.
  pause
  exit /b 1
)
echo.
echo Rebuilding portal...
call build-portal.bat
if errorlevel 1 (
  pause
  exit /b 1
)
echo Done. Restart with start-portal.bat
pause