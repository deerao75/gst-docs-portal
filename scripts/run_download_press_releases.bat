@echo off
cd /d "%~dp0.."
python scripts\scrape_gst_press_releases.py > data\scrape_pr_out.txt 2>&1
python scripts\download_gst_press_releases.py > data\download_pr_out.txt 2>&1
echo done >> data\download_pr_out.txt