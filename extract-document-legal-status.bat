@echo off
cd /d "%~dp0"
if not exist "data\notification_changes.json" (
  echo notification_changes.json not found. Run extract-notification-changes.bat first.
  pause
  exit /b 1
)
echo Applying legal status from notification_changes.json...
py -3.11 scripts\extract_document_legal_status.py
if errorlevel 1 (
  echo Legal status update failed.
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
echo Done. Run start-only.bat to view changes.
pause