@echo off
cd /d "%~dp0"
python scripts\scrape_gst_advisories.py
pause