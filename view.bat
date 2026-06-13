@echo off
title Rect Sprite Tool - Podglad
set "PATH=%USERPROFILE%\.cargo\bin;C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64;%PATH%"
echo =========================================================
echo  Uruchamianie okna podgladu aplikacji
echo =========================================================
echo.
echo Gdy to okno jest otwarte, mozesz edytowac pliki w src/app
echo a aplikacja Tauri bedzie sie automatycznie odswiezac.
echo.
npm run tauri dev
pause
