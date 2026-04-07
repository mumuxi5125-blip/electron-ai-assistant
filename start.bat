@echo off
echo Installing dependencies...
call npm install

echo.
echo Starting Electron AI Assistant...
echo.
echo If you see any errors, make sure you have Node.js installed.
echo Download Node.js from: https://nodejs.org/
echo.

call npm start

pause