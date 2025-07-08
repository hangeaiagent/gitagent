@echo off
chcp 65001 >nul
echo 🛑 GitAgent SSH 终端部署系统 - 停止脚本 (Windows)
echo ================================================

REM 检查是否在项目根目录
if not exist "package.json" (
    echo ❌ 请在项目根目录执行此脚本
    pause
    exit /b 1
)

REM 创建日志目录
if not exist "logs" mkdir logs

echo 🛑 停止 SSH 代理服务器...
taskkill /f /im node.exe /fi "windowtitle eq *sshProxyServer*" >nul 2>&1
taskkill /f /im node.exe /fi "commandline eq *sshProxyServer*" >nul 2>&1

echo 🛑 停止前端开发服务器...
taskkill /f /im node.exe /fi "windowtitle eq *vite*" >nul 2>&1
taskkill /f /im node.exe /fi "commandline eq *vite*" >nul 2>&1

REM 检查端口占用情况
echo 🔍 检查端口占用情况...

netstat -ano | findstr :5173 >nul
if %errorlevel% equ 0 (
    echo ⚠️  端口 5173 仍被占用
) else (
    echo ✅ 端口 5173 已释放
)

netstat -ano | findstr :3001 >nul
if %errorlevel% equ 0 (
    echo ⚠️  端口 3001 仍被占用
) else (
    echo ✅ 端口 3001 已释放
)

echo.
echo 🎉 GitAgent 系统已停止！
echo 📝 如需重新启动，请运行：
echo    deploy\sh\start.bat
echo.
pause 