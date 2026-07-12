@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo Stopping old servers on port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul

set "NEED_BUILD=0"
if not exist ".next\BUILD_ID" set "NEED_BUILD=1"
if not exist ".next\routes-manifest.json" set "NEED_BUILD=1"
if not exist ".next\server\pages-manifest.json" set "NEED_BUILD=1"

rem Rebuild when source is newer than the last production build
if exist "src\app\page.tsx" if exist ".next\BUILD_ID" (
  for %%F in ("src\app\page.tsx") do set "PAGE_TS=%%~tF"
  for %%F in (".next\BUILD_ID") do set "BUILD_TS=%%~tF"
  if "!PAGE_TS!" gtr "!BUILD_TS!" set "NEED_BUILD=1"
)
if exist "src\app\team\page.tsx" if exist ".next\BUILD_ID" (
  for %%F in ("src\app\team\page.tsx") do set "TEAM_TS=%%~tF"
  for %%F in (".next\BUILD_ID") do set "BUILD_TS=%%~tF"
  if "!TEAM_TS!" gtr "!BUILD_TS!" set "NEED_BUILD=1"
)

if "!NEED_BUILD!"=="1" (
  echo.
  echo Building portal ^(source changed or build missing^)...
  call build-portal.bat
  if errorlevel 1 (
    echo.
    echo Build failed. See errors above.
    pause
    exit /b 1
  )
)

echo.
echo Starting Acer GST Reference Portal at http://localhost:3001
echo Leave this window open while using the portal. Press Ctrl+C to stop.
echo.
call npm run start
set "ERR=!errorlevel!"
if not "!ERR!"=="0" (
  echo.
  echo Server failed to start ^(exit code !ERR!^).
  echo Run build-portal.bat once, then start-only.bat again.
  pause
  exit /b !ERR!
)