@echo off
chcp 65001 >nul
echo 🚀 GitAgent SSH 终端部署系统 - 安装脚本 (Windows)
echo ================================================

REM 检查是否在项目根目录
if not exist "package.json" (
    echo ❌ 请在项目根目录执行此脚本
    pause
    exit /b 1
)

REM 检查 Node.js 版本
echo 📋 检查 Node.js 版本...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js 版本: %NODE_VERSION%

REM 提取版本号进行比较 (简化版本)
echo %NODE_VERSION% | findstr "v1[6-9]" >nul
if %errorlevel% neq 0 (
    echo %NODE_VERSION% | findstr "v[2-9][0-9]" >nul
    if %errorlevel% neq 0 (
        echo ❌ Node.js 版本过低，需要 v16+ 版本
        pause
        exit /b 1
    )
)

echo ✅ Node.js 版本检查通过

REM 清理旧的 node_modules
if exist "node_modules" (
    echo 🧹 清理旧的依赖...
    rmdir /s /q node_modules
)

if exist "package-lock.json" (
    echo 🧹 清理 package-lock.json...
    del package-lock.json
)

REM 清理 npm 缓存
echo 🧹 清理 npm 缓存...
npm cache clean --force

REM 安装依赖
echo 📦 安装前端依赖...
npm install

if %errorlevel% neq 0 (
    echo ❌ 前端依赖安装失败
    pause
    exit /b 1
)

echo ✅ 前端依赖安装成功

REM 检查关键依赖
echo 🔍 验证关键依赖...
if exist "node_modules\@xterm" (
    echo ✅ xterm.js 依赖已安装
) else (
    echo ❌ xterm.js 依赖安装失败
    pause
    exit /b 1
)

if exist "node_modules\express" (
    echo ✅ Express 依赖已安装
) else (
    echo ❌ Express 依赖安装失败
    pause
    exit /b 1
)

if exist "node_modules\ssh2" (
    echo ✅ SSH2 依赖已安装
) else (
    echo ❌ SSH2 依赖安装失败
    pause
    exit /b 1
)

REM 创建必要的目录
echo 📁 创建必要目录...
if not exist "logs" mkdir logs
if not exist "deploy\config" mkdir deploy\config

echo.
echo 🎉 安装完成！
echo 📝 现在可以运行以下命令启动系统：
echo    deploy\sh\start.bat
echo.
echo 📋 或者运行环境检查：
echo    deploy\sh\check-env.bat
echo.
pause 