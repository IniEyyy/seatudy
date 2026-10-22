@echo off
setlocal
set ROOT=%~dp0

for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":5000 .*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":5173 .*LISTENING"') do taskkill /PID %%a /F >nul 2>&1

call "%ROOT%stop-db.cmd"
echo Seatudy dihentikan.
