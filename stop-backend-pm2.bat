@echo off
echo ========================================
echo Stopping backend PM2
echo ========================================
echo.

pm2 stop prestige-backend
pm2 delete prestige-backend

echo.
echo Backend stopped successfully!
echo.
pause






