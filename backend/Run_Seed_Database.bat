@echo off
setlocal EnableExtensions EnableDelayedExpansion
title EvidenceSystem - Seed Database

echo ========================================
echo EvidenceSystem - Seed Database
echo ========================================
echo.

REM This script works if placed inside either:
REM 1) EvidenceSystem folder, where backend folder exists
REM 2) backend folder directly

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR="

REM Case 1: script is in project root: EvidenceSystem\backend\package.json
if exist "%SCRIPT_DIR%backend\package.json" (
    set "BACKEND_DIR=%SCRIPT_DIR%backend"
)

REM Case 2: script is inside backend folder
if not defined BACKEND_DIR if exist "%SCRIPT_DIR%package.json" (
    for %%I in ("%SCRIPT_DIR%.") do set "CURRENT_FOLDER=%%~nxI"
    if /I "!CURRENT_FOLDER!"=="backend" (
        set "BACKEND_DIR=%SCRIPT_DIR%"
    )
)

REM Case 3: user runs it from project root even if script is elsewhere
if not defined BACKEND_DIR if exist "%CD%\backend\package.json" (
    set "BACKEND_DIR=%CD%\backend"
)

REM Case 4: user runs it from backend folder even if script is elsewhere
if not defined BACKEND_DIR if exist "%CD%\package.json" (
    for %%I in ("%CD%") do set "CURRENT_FOLDER=%%~nxI"
    if /I "!CURRENT_FOLDER!"=="backend" (
        set "BACKEND_DIR=%CD%"
    )
)

if not defined BACKEND_DIR (
    echo ERROR: Backend folder was not found.
    echo.
    echo Put this file in one of these locations:
    echo 1. EvidenceSystem folder
    echo 2. EvidenceSystem\backend folder
    echo.
    pause
    exit /b 1
)

echo Backend path:
echo %BACKEND_DIR%
echo.

cd /d "%BACKEND_DIR%"

if not exist package.json (
    echo ERROR: package.json not found inside backend folder.
    echo Current path: %CD%
    echo.
    pause
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not added to PATH.
    echo Install Node.js, then run this script again.
    echo.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo ERROR: npm is not installed or not added to PATH.
    echo Install Node.js, then run this script again.
    echo.
    pause
    exit /b 1
)

if not exist node_modules (
    echo node_modules not found. Running npm install first...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
    echo.
)

echo Running database seed...
echo.
call npm run seed

if errorlevel 1 (
    echo.
    echo ERROR: Seed failed.
    echo Check that MongoDB is running and backend .env contains MONGO_URI.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Seed completed successfully.
echo ========================================
echo.
pause
exit /b 0
