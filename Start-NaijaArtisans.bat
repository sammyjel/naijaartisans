@echo off
title NaijaArtisans
cd /d "%~dp0"

echo ============================================
echo    Starting NaijaArtisans...
echo ============================================
echo.

REM First-time setup: install dependencies if missing
if not exist "node_modules" (
    echo Installing dependencies for the first time, please wait...
    call npm install
)

REM First-time setup: create the database if missing
if not exist "prisma\dev.db" (
    echo Setting up the database...
    call npm run setup
)

echo.
echo Opening http://localhost:3000 in your browser...
echo (Keep this window open while you use the app. Close it to stop.)
echo.

REM Open the browser after a short delay, then start the server
start "" /b cmd /c "timeout /t 4 >nul && start http://localhost:3000"

call npm run dev

pause
