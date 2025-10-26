@echo off
setlocal

set "BASE_DIR=%~dp0"
set "BACKEND_DIR=%BASE_DIR%RuoYi-Vue-fast"
set "BACKEND_JAR=%BACKEND_DIR%\target\ruoyi.jar"

if not exist "%BACKEND_JAR%" (
    echo Backend jar not found: %BACKEND_JAR%
    echo Build the backend with "mvn clean package" before running this script.
    goto wait
)

where java >nul 2>nul
if errorlevel 1 (
    echo Java runtime not found in PATH.
    goto wait
)

call :resolve_frontend_runner
if "%FRONTEND_RUNNER%"=="" (
    echo Neither yarn nor npm is available in PATH.
    goto wait
)

echo Starting backend service...
start "RuoYi Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && java -jar ""%BACKEND_JAR%"""

echo Starting frontend dev server...
start "RuoYi Frontend" cmd /k "cd /d ""%BASE_DIR%"" && %FRONTEND_RUNNER%"

echo Launch commands dispatched. Press any key to close this window.
goto wait

:resolve_frontend_runner
where yarn >nul 2>nul
if errorlevel 1 goto check_npm
set "FRONTEND_RUNNER=yarn dev"
goto :eof

:check_npm
where npm >nul 2>nul
if errorlevel 1 goto :eof
set "FRONTEND_RUNNER=npm run dev"
goto :eof

:wait
pause >nul
endlocal
exit /b 0
