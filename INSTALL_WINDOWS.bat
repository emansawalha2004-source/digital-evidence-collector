@echo off
title EvidenceSystem Install
cd /d %~dp0
echo Installing backend packages...
cd backend
call npm install
cd ..
echo Installing frontend packages...
cd frontend
call npm install
cd ..
echo.
echo Done. Now run RUN_WINDOWS.bat
echo Optional seed data: cd backend && npm run seed
pause
