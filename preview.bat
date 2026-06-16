@echo off
title Rect Preview
set "PATH=%USERPROFILE%\.cargo\bin;C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64;%PATH%"
echo Starting application preview. 
echo.
echo When this window is open, you can edit files in src/app.
echo and the Tauri application will automatically reload.
echo.
npm run tauri dev
pause
