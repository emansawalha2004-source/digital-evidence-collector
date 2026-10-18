@echo off
title EvidenceSystem Runner
cd /d %~dp0

echo ========================================
echo EvidenceSystem - Digital Evidence System
echo ========================================
echo.
echo 1) Make sure MongoDB is running locally.
echo 2) First time only: run INSTALL_WINDOWS.bat
echo.
start "Evidence Backend" cmd /k "cd backend && npm run dev"
start "Evidence Frontend" cmd /k "cd frontend && npm run dev"
echo.
echo Backend:  http://localhost:5000/api/health
echo Frontend: http://localhost:5173
echo.
pause
