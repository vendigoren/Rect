@echo off
title Rect Sprite Tool - Kompilator EXE
set "PATH=%USERPROFILE%\.cargo\bin;C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64;%PATH%"
echo =========================================================
echo  Kompilowanie aplikacji do pliku .exe
echo =========================================================
echo.
echo Kompilacja moze potrwac chwile, prosze czekac...
echo.
call npm run tauri build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [BLAD] Kompilacja nie powiodla sie!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Kopiowanie gotowego pliku .exe do folderu glownego...
if exist "src-tauri\target\release\app.exe" (
    copy "src-tauri\target\release\app.exe" "rect-tool.exe" /Y
    echo.
    echo =========================================================
    echo  SUKCES! Gotowy plik znajdziesz w: rect-tool.exe
    echo =========================================================
) else (
    echo [BLAD] Nie znaleziono pliku exe w folderze release.
)
echo.
pause
