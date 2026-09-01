@echo off
setlocal
set "PROJECT_DIR=%~dp0"

netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul
if errorlevel 1 powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/d /c npm start' -WorkingDirectory '%PROJECT_DIR%backend' -WindowStyle Normal"

netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul
if errorlevel 1 powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/d /c npm run dev' -WorkingDirectory '%PROJECT_DIR%frontend' -WindowStyle Normal"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(30); do { try { $response=Invoke-WebRequest -Uri 'http://localhost:5173/' -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { Start-Process 'http://localhost:5173/'; exit 0 } } catch {} ; Start-Sleep -Seconds 1 } while ((Get-Date) -lt $deadline); exit 1"

endlocal
