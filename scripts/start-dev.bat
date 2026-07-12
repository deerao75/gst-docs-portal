@echo off
cd /d "%~dp0.."
start "" /B npm run dev:hot > dev-server.log 2>&1