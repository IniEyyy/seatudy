@echo off
setlocal
set ROOT=%~dp0
set PGSQL=%ROOT%..\pgsql

if not exist "%PGSQL%\bin\pg_ctl.exe" (
  echo PostgreSQL portable tidak ditemukan di %PGSQL%
  pause
  exit /b 1
)

"%PGSQL%\bin\pg_ctl.exe" -D "%PGSQL%\data" status >nul 2>&1
if errorlevel 1 (
  echo Starting PostgreSQL...
  "%PGSQL%\bin\pg_ctl.exe" -D "%PGSQL%\data" -l "%PGSQL%\pg.log" -o "-p 5432 -c listen_addresses=localhost" start
) else (
  echo PostgreSQL sudah berjalan.
)
