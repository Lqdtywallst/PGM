@echo off
echo ========================================
echo Iniciando Backend con PM2
echo ========================================
echo.

REM Iniciar el backend con PM2
pm2 start backend-example.js --name "prestige-backend"

REM Guardar la configuración para que se inicie al arrancar el sistema
pm2 save
pm2 startup

echo.
echo ========================================
echo Backend iniciado correctamente!
echo ========================================
echo.
echo Para ver el estado: pm2 status
echo Para ver los logs: pm2 logs prestige-backend
echo Para detener: pm2 stop prestige-backend
echo Para reiniciar: pm2 restart prestige-backend
echo.
pause

