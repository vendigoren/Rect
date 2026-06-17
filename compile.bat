@echo off
title Rect Compiler
set "PATH=%USERPROFILE%\.cargo\bin;C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64;%PATH%"
echo  Compiling Application to .exe
echo.
echo Compilation may take a moment, please wait.
echo.
call npm run tauri build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Compilation failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Copying compiled .exe file to root directory...
if exist "src-tauri\target\release\app.exe" (
    copy "src-tauri\target\release\app.exe" "Rect.exe" /Y
    echo.
    echo  Success, executable is ready.
) else (
    echo [ERROR] Executable not found in release folder.
)
echo.
pause