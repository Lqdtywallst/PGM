@echo off
echo ========================================
echo Configurar Inicio Automatico en Windows
echo ========================================
echo.
echo Este script configurara el backend para iniciarse automaticamente
echo.
echo IMPORTANTE: Debes ejecutar esto como Administrador
echo.
pause

REM Obtener la ruta actual
set SCRIPT_DIR=%~dp0
set NODE_PATH=where node
set PM2_PATH=where pm2

echo Configurando tarea programada...
echo.

REM Crear script que inicia PM2
echo @echo off > "%SCRIPT_DIR%start-pm2-backend.bat"
echo cd /d "%SCRIPT_DIR%" >> "%SCRIPT_DIR%start-pm2-backend.bat"
echo pm2 resurrect >> "%SCRIPT_DIR%start-pm2-backend.bat"

echo.
echo ========================================
echo Opcion 1: Crear acceso directo en inicio
echo ========================================
echo.
echo Copia el archivo 'start-pm2-backend.bat' a:
echo %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
echo.
echo O ejecuta manualmente:
echo.
echo   pm2 resurrect
echo.
echo ========================================
echo Opcion 2: Usar Task Scheduler (Recomendado)
echo ========================================
echo.
echo Ejecuta este comando como Administrador:
echo.
echo schtasks /create /tn "Prestige Backend PM2" /tr "cmd /c cd /d %SCRIPT_DIR% ^&^& pm2 resurrect" /sc onlogon /rl highest /f
echo.
pause






