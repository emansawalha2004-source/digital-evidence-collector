@echo off
setlocal enabledelayedexpansion

title EvidenceSystem Launcher

echo ==================================================
echo EvidenceSystem - Start All Services
echo ==================================================
echo.

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

echo Project root:
echo %ROOT%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not added to PATH.
  echo Install Node.js first, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm is not installed or not added to PATH.
  pause
  exit /b 1
)

if not exist "%BACKEND%\package.json" (
  echo [ERROR] backend/package.json was not found.
  echo Expected path: %BACKEND%\package.json
  pause
  exit /b 1
)

if not exist "%FRONTEND%\package.json" (
  echo [ERROR] frontend/package.json was not found.
  echo Expected path: %FRONTEND%\package.json
  pause
  exit /b 1
)

echo [1/4] Checking backend dependencies...
if not exist "%BACKEND%\node_modules" (
  echo Installing backend dependencies...
  pushd "%BACKEND%"
  call npm install
  if errorlevel 1 (
    echo [ERROR] Backend npm install failed.
    pause
    exit /b 1
  )
  popd
) else (
  echo Backend node_modules found.
)

echo.
echo [2/4] Checking frontend dependencies...
if not exist "%FRONTEND%\node_modules" (
  echo Installing frontend dependencies...
  pushd "%FRONTEND%"
  call npm install
  if errorlevel 1 (
    echo [ERROR] Frontend npm install failed.
    pause
    exit /b 1
  )
  popd
) else (
  echo Frontend node_modules found.
)

echo.
echo [3/4] Checking env files...
if not exist "%BACKEND%\.env" (
  if exist "%BACKEND%\.env.example" (
    copy "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
    echo Created backend/.env from .env.example
  ) else (
    echo PORT=5000>"%BACKEND%\.env"
    echo MONGO_URI=mongodb://127.0.0.1:27017/evidence_system>>"%BACKEND%\.env"
    echo JWT_SECRET=change_me>>"%BACKEND%\.env"
    echo Created backend/.env
  )
) else (
  echo backend/.env found.
)

findstr /C:"SMTP_PASS=PUT_YOUR_GMAIL_APP_PASSWORD_HERE" "%BACKEND%\.env" >nul 2>nul
if not errorlevel 1 (
  echo [WARNING] Email OTP is enabled but SMTP_PASS is still placeholder.
  echo Edit backend\.env and put your Gmail App Password before testing OTP email.
)

echo.
echo Checking frontend env...
if not exist "%FRONTEND%\.env" (
  if exist "%FRONTEND%\.env.example" (
    copy "%FRONTEND%\.env.example" "%FRONTEND%\.env" >nul
    echo Created frontend/.env from .env.example
  ) else (
    echo VITE_API_BASE_URL=http://localhost:5000/api>"%FRONTEND%\.env"
    echo Created frontend/.env
  )
) else (
  echo frontend/.env found.
)

echo.
echo [4/4] Starting services...
echo.

start "EvidenceSystem Backend" cmd /k "cd /d "%BACKEND%" && echo Starting Backend... && npm run dev || npm start"
timeout /t 3 /nobreak >nul

start "EvidenceSystem Frontend" cmd /k "cd /d "%FRONTEND%" && echo Starting Frontend... && npm run dev"

echo ==================================================
echo Started.
echo.
echo Backend:
echo http://localhost:5000/api/health
echo.
echo Frontend:
echo http://localhost:5173
echo.
echo If backend fails, check MongoDB is running.
echo ==================================================
echo.

pause
endlocal