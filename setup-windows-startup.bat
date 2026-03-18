@echo off
echo ========================================
echo Configure Auto-Start on Windows
echo ========================================
echo.
echo This script will configure the backend to start automatically
echo.
echo IMPORTANT: Run this as Administrator
echo.
pause

REM Get current path
set SCRIPT_DIR=%~dp0
set NODE_PATH=where node
set PM2_PATH=where pm2

echo Configuring scheduled task...
echo.

REM Create script that starts PM2
echo @echo off > "%SCRIPT_DIR%start-pm2-backend.bat"
echo cd /d "%SCRIPT_DIR%" >> "%SCRIPT_DIR%start-pm2-backend.bat"
echo pm2 resurrect >> "%SCRIPT_DIR%start-pm2-backend.bat"

echo.
echo ========================================
echo Option 1: Create startup shortcut
echo ========================================
echo.
echo Copy the file 'start-pm2-backend.bat' to:
echo %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
echo.
echo Or run manually:
echo.
echo   pm2 resurrect
echo.
echo ========================================
echo Option 2: Use Task Scheduler (Recommended)
echo ========================================
echo.
echo Run this command as Administrator:
echo.
echo schtasks /create /tn "Prestige Backend PM2" /tr "cmd /c cd /d %SCRIPT_DIR% ^&^& pm2 resurrect" /sc onlogon /rl highest /f
echo.
pause






