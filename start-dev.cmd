@echo off
setlocal
set ROOT=%~dp0

call "%ROOT%start-db.cmd"
if errorlevel 1 exit /b 1

start "Seatudy API" /D "%ROOT%server" cmd /k npm start
start "Seatudy Web" /D "%ROOT%react-app" cmd /k npm run dev

timeout /t 5 >nul
start "" http://localhost:5173
