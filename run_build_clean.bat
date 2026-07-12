@echo off
cd /d "%~dp0"
if exist .next rmdir /s /q .next
if exist .build.lock del /f /q .build.lock
call npm run build > _agent_build.log 2>&1
echo EXIT_CODE=%ERRORLEVEL%>> _agent_build.log
exit /b %ERRORLEVEL%