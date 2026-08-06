@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo EasyWheelAE After Effects Extension Installer
echo ====================================================

set "SRC_DIR=%~dp0.."
set "TARGET_DIR=%APPDATA%\Adobe\CEP\extensions\EasyWheelAE"

echo Source Directory: %SRC_DIR%
echo Target Directory: %TARGET_DIR%

:: 1. Create target extension directory if not exists
if not exist "%TARGET_DIR%" (
    echo Creating target directories...
    mkdir "%TARGET_DIR%"
)

:: 2. Copy extension components
echo Copying extension files...
robocopy "%SRC_DIR%\CSXS" "%TARGET_DIR%\CSXS" /E /IS /IT /NJH /NJS >nul
robocopy "%SRC_DIR%\client" "%TARGET_DIR%\client" /E /IS /IT /NJH /NJS >nul
robocopy "%SRC_DIR%\icons" "%TARGET_DIR%\icons" /E /IS /IT /NJH /NJS >nul
robocopy "%SRC_DIR%\jsx" "%TARGET_DIR%\jsx" /E /IS /IT /NJH /NJS >nul
if exist "%SRC_DIR%\.debug" (
    copy "%SRC_DIR%\.debug" "%TARGET_DIR%\.debug" >nul
)


:: 3. Enable PlayerDebugMode
call "%~dp0enable_debug.bat"

echo ====================================================
echo SUCCESS: EasyWheelAE installed successfully!
echo ====================================================
echo Please restart Adobe After Effects.
echo Access the extension in After Effects via:
echo   Window - Extensions (Legacy) - EasyWheelAE
echo ====================================================
pause
