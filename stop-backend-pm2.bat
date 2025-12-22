@echo off
echo ========================================
echo Deteniendo Backend PM2
echo ========================================
echo.

pm2 stop prestige-backend
pm2 delete prestige-backend

echo.
echo Backend detenido correctamente!
echo.
pause

