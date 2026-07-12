@echo off
cd /d "%~dp0"
echo Refreshing notification titles and summaries from PDFs...
python scripts\refresh_summaries.py 2>refresh-warnings.txt
if errorlevel 1 (
  echo Refresh failed.
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