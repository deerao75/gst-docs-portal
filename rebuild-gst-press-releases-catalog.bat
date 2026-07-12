@echo off
setlocal
cd /d "%~dp0"
set PYTHONUNBUFFERED=1
py -3.11 -u scripts\rebuild_gst_press_releases_catalog.py
if errorlevel 1 exit /b 1
echo Catalog rebuilt successfully.
exit /b 0