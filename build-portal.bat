@echo off
cd /d "%~dp0"
echo Building Acer GST Reference Portal...
call npm run build
exit /b %ERRORLEVEL%