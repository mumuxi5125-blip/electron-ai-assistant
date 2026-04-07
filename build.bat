@echo off
echo Installing dependencies...
call npm install

echo.
echo Building Electron AI Assistant...
echo.

call npm run build

echo.
echo Build complete!
echo Check the 'dist' folder for the installer.
echo.

pause