@echo off
cd /d "%~dp0.."
start "" /B npm run start > dev-server.log 2>&1