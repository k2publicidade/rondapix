@echo off
echo ==============================
echo  Ronda Pix - Dev Environment
echo ==============================
echo.

REM Compilar a API primeiro
echo [0/2] Compilando API...
cd /d "%~dp0apps\api"
call node_modules\.bin\tsc -p tsconfig.json
if errorlevel 1 (
  echo ERRO: Falha na compilação da API
  pause
  exit /b 1
)
echo Compilação OK!
echo.

REM Iniciar API NestJS na porta 3001
echo [1/2] Iniciando API (porta 3001)...
start "Ronda API" cmd /k "cd /d \"%~dp0apps\api\" && node dist\main.js"

timeout /t 3 /nobreak >nul

REM Iniciar Frontend Next.js na porta 3000
echo [2/2] Iniciando Web (porta 3000)...
start "Ronda Web" cmd /k "cd /d \"%~dp0apps\web\" && node_modules\.bin\next dev --port 3000"

echo.
echo Servidores iniciando...
echo   API:     http://localhost:3001
echo   Swagger: http://localhost:3001/docs
echo   Web:     http://localhost:3000
echo.
echo Usuarios de teste:
echo   admin@ronda.local  / Admin@123  (saldo: 10000)
echo   joao@ronda.local   / Senha@123  (saldo: 5000)
echo   maria@ronda.local  / Senha@123  (saldo: 3000)
echo   pedro@ronda.local  / Senha@123  (saldo: 2000)
echo.
echo Pressione qualquer tecla para fechar esta janela.
pause >nul
