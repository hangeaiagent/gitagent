@echo off
chcp 65001 >nul
echo 🚀 GitAgent SSH 终端部署系统 - 启动脚本 (Windows)
echo ================================================

REM 检查是否在项目根目录
if not exist "package.json" (
    echo ❌ 请在项目根目录执行此脚本
    pause
    exit /b 1
)

REM 检查依赖是否安装
if not exist "node_modules" (
    echo ❌ 依赖未安装，请先运行安装脚本：
    echo    deploy\sh\install.bat
    pause
    exit /b 1
)

REM 创建日志目录
if not exist "logs" mkdir logs

echo 🔍 检查端口占用情况...

REM 检查端口5173
netstat -ano | findstr :5173 >nul
if %errorlevel% equ 0 (
    echo ⚠️  端口 5173 已被占用，正在尝试关闭...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

REM 检查端口3001
netstat -ano | findstr :3001 >nul
if %errorlevel% equ 0 (
    echo ⚠️  端口 3001 已被占用，正在尝试关闭...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

echo 🔧 启动 SSH 代理服务器...
start /b node src/services/sshProxyServer.js > logs/ssh-proxy.log 2>&1

REM 等待 SSH 代理启动
timeout /t 3 /nobreak >nul

echo 🌐 启动前端开发服务器...
start /b npm run dev > logs/frontend.log 2>&1

REM 等待前端启动
timeout /t 5 /nobreak >nul

echo.
echo 🎉 GitAgent 系统启动成功！
echo ==========================
echo 📱 前端应用: http://localhost:5173
echo 🔧 SSH代理服务: http://localhost:3001
echo.
echo 📝 日志文件：
echo    SSH代理: logs/ssh-proxy.log
echo    前端服务: logs/frontend.log
echo.
echo 🛑 停止服务请运行：
echo    deploy\sh\stop.bat
echo.
echo 📊 查看状态请运行：
echo    deploy\sh\status.bat
echo.
pause 