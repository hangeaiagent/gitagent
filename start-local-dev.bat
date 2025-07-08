@echo off
echo 🚀 启动 GitAgent 本地开发环境...
echo.

echo 📦 检查依赖...
call npm install

echo.
echo 🔧 启动 SSH 代理服务器 (端口 3000)...
start "SSH Proxy Server" cmd /k "node src/services/sshProxyServer.cjs"

echo.
echo 🌐 启动前端开发服务器 (端口 5173)...
timeout /t 3 /nobreak >nul
start "Frontend Dev Server" cmd /k "npm run dev"

echo.
echo ✅ 服务启动完成！
echo.
echo 🔗 访问地址:
echo   - 前端应用: http://localhost:5173
echo   - SSH代理API: http://localhost:3000
echo.
echo 按任意键关闭此窗口...
pause >nul 