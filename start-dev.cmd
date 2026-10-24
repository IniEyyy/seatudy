@echo off
setlocal
set ROOT=%~dp0

call "%ROOT%start-db.cmd"
if errorlevel 1 exit /b 1

pushd "%ROOT%server"
call npm run db:migrate
if errorlevel 1 (
  popd
  exit /b 1
)
popd

start "Seatudy API" /D "%ROOT%server" cmd /k npm start
start "Seatudy Web" /D "%ROOT%react-app" cmd /k npm run dev

timeout /t 5 >nul
start "" http://localhost:5173
