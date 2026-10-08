@echo off
rem Starts the Core5Campus backend (port 4000) and website (port 3006) in two windows.
rem Double-click this file after restarting the computer. Close the two windows to stop them.
cd /d "%~dp0"
start "Core5Campus API (port 4000)" cmd /k "cd backend && npm run dev"
start "Core5Campus website (port 3006)" cmd /k "cd frontend && npm run dev"
timeout /t 6 /nobreak >nul
start "" http://localhost:3006
