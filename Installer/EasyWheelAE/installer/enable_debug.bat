@echo off
echo Enabling Adobe CEP PlayerDebugMode and Verbose Logging...

:: Loop through CSXS versions 5 to 22 to cover all legacy and modern Creative Cloud installations
for /L %%i in (5,1,22) do (
    reg add "HKCU\Software\Adobe\CSXS.%%i" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
    reg add "HKCU\Software\Adobe\CSXS.%%i" /v LogLevel /t REG_SZ /d 6 /f >nul 2>&1
)

echo CEP PlayerDebugMode=1 and LogLevel=6 set successfully for CSXS versions 5 through 22.
