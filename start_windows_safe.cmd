@echo off
setlocal

REM Digital Evidence Management System - Windows Quick Start Script
REM Put this file beside the backend and frontend folders, then run it from CMD.

echo ======================================
echo   Digital Evidence Management System
echo   Windows Quick Start
echo ======================================
echo.

REM Check Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Install Node.js 20 or newer.
    pause
    exit /b 1
)

for /f "tokens=1 delims=." %%A in ('node -v') do set NODE_MAJOR=%%A
set NODE_MAJOR=%NODE_MAJOR:v=%

if %NODE_MAJOR% LSS 18 (
    echo WARNING: Your Node.js major version is %NODE_MAJOR%. Node.js 20+ is recommended.
)

REM Check MongoDB tools / running server
set MONGO_OK=0

where mongod >nul 2>nul
if not errorlevel 1 set MONGO_OK=1

where mongosh >nul 2>nul
if not errorlevel 1 (
    mongosh --eval "db.adminCommand('ping')" >nul 2>nul
    if not errorlevel 1 set MONGO_OK=1
)

if "%MONGO_OK%"=="0" (
    echo WARNING: MongoDB was not detected. Make sure MongoDB is installed and running before seeding.
)

REM Resolve script directory
set "SCRIPT_DIR=%~dp0"

REM Validate project folders
if not exist "%SCRIPT_DIR%backend" (
    echo ERROR: backend folder was not found here:
    echo %SCRIPT_DIR%
    pause
    exit /b 1
)

if not exist "%SCRIPT_DIR%frontend" (
    echo ERROR: frontend folder was not found here:
    echo %SCRIPT_DIR%
    pause
    exit /b 1
)

echo Installing backend dependencies...
cd /d "%SCRIPT_DIR%backend"
call npm install
if errorlevel 1 (
    echo ERROR: Backend npm install failed.
    pause
    exit /b 1
)

echo.
echo Installing frontend dependencies...
cd /d "%SCRIPT_DIR%frontend"
call npm install
if errorlevel 1 (
    echo ERROR: Frontend npm install failed.
    pause
    exit /b 1
)

echo.
echo Seeding database...
cd /d "%SCRIPT_DIR%backend"
call npm run seed
if errorlevel 1 (
    echo ERROR: Database seed failed.
    echo Check MongoDB and backend .env, especially MONGO_URI.
    pause
    exit /b 1
)

echo.
echo Installation completed successfully.
echo.
echo To run the project, open two CMD windows:
echo.
echo CMD 1 - Backend:
echo cd /d "%SCRIPT_DIR%backend"
echo npm run dev
echo.
echo CMD 2 - Frontend:
echo cd /d "%SCRIPT_DIR%frontend"
echo npm run dev
echo.
echo Project URLs:
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5000/api
echo.
echo Test accounts:
echo Admin:        admin@evidence.local / Admin@123456
echo Investigator: investigator@evidence.local / Investigator@123456
echo Viewer:       viewer@evidence.local / Viewer@123456
echo Auditor:      auditor@evidence.local / Auditor@123456
echo.
pause
endlocal
