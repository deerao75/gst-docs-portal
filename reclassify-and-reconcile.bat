@echo off
cd /d "%~dp0"
echo Reclassifying notification categories...
python scripts\reclassify_notifications.py
if errorlevel 1 (
  echo Reclassify failed.
  pause
  exit /b 1
)
echo.
echo Generating reconciliation report...
python scripts\generate_reconciliation.py
if errorlevel 1 (
  echo Reconciliation failed.
  pause
  exit /b 1
)
echo.
echo Building portal...
call build-portal.bat
if errorlevel 1 (
  pause
  exit /b 1
)
echo.
echo Starting portal at http://localhost:3001
call start-only.bat