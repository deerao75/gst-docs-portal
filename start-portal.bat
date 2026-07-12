@echo off
cd /d "%~dp0"
echo Stopping old servers on port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul

call build-portal.bat
if errorlevel 1 (
  pause
  exit /b 1
)

echo Starting Acer GST Reference Portal at http://localhost:3001
echo Leave this window open while using the portal. Press Ctrl+C to stop.
echo.
call npm run start