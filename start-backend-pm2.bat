@echo off
echo ========================================
echo Starting backend with PM2
echo ========================================
echo.

REM Start the backend with PM2
pm2 start backend-example.js --name "prestige-backend"

REM Save the configuration to start on boot
pm2 save
pm2 startup

echo.
echo ========================================
echo Backend started successfully!
echo ========================================
echo.
echo To see status: pm2 status
echo To view logs: pm2 logs prestige-backend
echo To stop: pm2 stop prestige-backend
echo To restart: pm2 restart prestige-backend
echo.
pause






