@echo off
chcp 65001 >nul
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

where node >nul 2>nul
if errorlevel 1 goto :no_node

where git >nul 2>nul
if errorlevel 1 goto :no_git

set "REPO_DIR="
set "PUBLISH_SCRIPT="

if exist "%SCRIPT_DIR%\scripts\publish.mjs" goto :found_here
if exist "%SCRIPT_DIR%\asosh-timer\scripts\publish.mjs" goto :found_sub
if exist "%USERPROFILE%\Desktop\asosh-timer\scripts\publish.mjs" goto :found_desk
if exist "%USERPROFILE%\OneDrive\Desktop\asosh-timer\scripts\publish.mjs" goto :found_od
if exist "%SCRIPT_DIR%\publish.mjs" goto :found_flat
goto :no_script

:found_here
set "REPO_DIR=%SCRIPT_DIR%"
set "PUBLISH_SCRIPT=%SCRIPT_DIR%\scripts\publish.mjs"
goto :run

:found_sub
set "REPO_DIR=%SCRIPT_DIR%\asosh-timer"
set "PUBLISH_SCRIPT=%SCRIPT_DIR%\asosh-timer\scripts\publish.mjs"
goto :run

:found_desk
set "REPO_DIR=%USERPROFILE%\Desktop\asosh-timer"
set "PUBLISH_SCRIPT=%USERPROFILE%\Desktop\asosh-timer\scripts\publish.mjs"
goto :run

:found_od
set "REPO_DIR=%USERPROFILE%\OneDrive\Desktop\asosh-timer"
set "PUBLISH_SCRIPT=%USERPROFILE%\OneDrive\Desktop\asosh-timer\scripts\publish.mjs"
goto :run

:found_flat
set "PUBLISH_SCRIPT=%SCRIPT_DIR%\publish.mjs"
if exist "%SCRIPT_DIR%\package.json" set "REPO_DIR=%SCRIPT_DIR%"
if "%REPO_DIR%"=="" if exist "%SCRIPT_DIR%\asosh-timer\package.json" set "REPO_DIR=%SCRIPT_DIR%\asosh-timer"
if "%REPO_DIR%"=="" if exist "%USERPROFILE%\Desktop\asosh-timer\package.json" set "REPO_DIR=%USERPROFILE%\Desktop\asosh-timer"
if "%REPO_DIR%"=="" if exist "%USERPROFILE%\OneDrive\Desktop\asosh-timer\package.json" set "REPO_DIR=%USERPROFILE%\OneDrive\Desktop\asosh-timer"
if "%REPO_DIR%"=="" goto :no_repo
goto :run

:run
cd /d "%REPO_DIR%"
node "%PUBLISH_SCRIPT%" --cwd "%REPO_DIR%"
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if "%EXIT_CODE%"=="0" goto :done_ok
echo [ERROR] Exit code %EXIT_CODE%. Press any key to close...
pause >nul
exit /b %EXIT_CODE%

:done_ok
echo Press any key to close...
pause >nul
exit /b 0

:no_node
echo [ERROR] Node.js 20+ not found. Install Node.js from https://nodejs.org
pause
exit /b 1

:no_git
echo [ERROR] Git for Windows not found. Install Git from https://git-scm.com
pause
exit /b 1

:no_script
echo [ERROR] File scripts\publish.mjs not found. Copy it into asosh-timer\scripts\publish.mjs
pause
exit /b 1

:no_repo
echo [ERROR] Folder asosh-timer (with package.json) not found.
pause
exit /b 1