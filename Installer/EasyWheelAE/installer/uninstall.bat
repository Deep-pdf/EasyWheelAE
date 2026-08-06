@echo off
echo ====================================================
echo EasyWheelAE After Effects Extension Uninstaller
echo ====================================================

set "TARGET_DIR=%APPDATA%\Adobe\CEP\extensions\EasyWheelAE"

if exist "%TARGET_DIR%" (
    echo Removing extension from %TARGET_DIR%...
    rmdir /s /q "%TARGET_DIR%"
    echo EasyWheelAE Extension uninstalled successfully.
) else (
    echo Extension not found in %TARGET_DIR%. Nothing to uninstall.
)

echo ====================================================
pause
