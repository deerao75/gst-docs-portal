@echo off
cd /d "%~dp0"
echo Generating order Show Summary text...
py -3.11 scripts\generate_order_summaries.py %*
if errorlevel 1 (
  echo Summary generation failed.
  pause
  exit /b 1
)
echo Done.
pause