@echo off
title Ledgerly Expense Tracker Launcher
echo ========================================================
echo   Starting Ledgerly Expense Tracker...
echo   Local URL: http://localhost:3001
echo ========================================================
cd /d "%~dp0"
call npm.cmd run dev
pause
