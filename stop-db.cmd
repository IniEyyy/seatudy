@echo off
setlocal
set ROOT=%~dp0
set PGSQL=%ROOT%..\pgsql

if exist "%PGSQL%\bin\pg_ctl.exe" (
  "%PGSQL%\bin\pg_ctl.exe" -D "%PGSQL%\data" stop -m fast
) else (
  echo PostgreSQL portable tidak ditemukan.
)
