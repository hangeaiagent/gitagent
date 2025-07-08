#!/bin/bash

# GitAgent SSH 终端部署系统 - 环境检查脚本
# 检查 Node.js、npm 版本和依赖状态

echo "🔍 GitAgent 环境检查脚本"
echo "=========================="

# 检查 Node.js 版本
echo "📋 检查 Node.js 版本..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js 版本: $NODE_VERSION"
    
    # 提取版本号进行比较
    NODE_MAJOR=$(echo $NODE_VERSION | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge 16 ]; then
        echo "✅ Node.js 版本检查通过 (需要 v16+)"
    else
        echo "❌ Node.js 版本过低，需要 v16+ 版本"
        exit 1
    fi
else
    echo "❌ Node.js 未安装"
    exit 1
fi

# 检查 npm 版本
echo "📋 检查 npm 版本..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm 版本: $NPM_VERSION"
else
    echo "❌ npm 未安装"
    exit 1
fi

# 检查项目目录
echo "📋 检查项目结构..."
if [ -f "package.json" ]; then
    echo "✅ package.json 存在"
else
    echo "❌ package.json 不存在，请确保在项目根目录执行"
    exit 1
fi

if [ -d "src" ]; then
    echo "✅ src 目录存在"
else
    echo "❌ src 目录不存在"
    exit 1
fi

# 检查依赖安装状态
echo "📋 检查依赖安装状态..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules 目录存在"
    
    # 检查关键依赖
    if [ -d "node_modules/@xterm" ]; then
        echo "✅ xterm.js 依赖已安装"
    else
        echo "⚠️  xterm.js 依赖未安装，请运行 npm install"
    fi
    
    if [ -d "node_modules/express" ]; then
        echo "✅ Express 依赖已安装"
    else
        echo "⚠️  Express 依赖未安装，请运行 npm install"
    fi
else
    echo "❌ node_modules 目录不存在，请运行 npm install"
    exit 1
fi

# 检查端口占用
echo "📋 检查端口占用情况..."
if command -v netstat &> /dev/null; then
    PORT_5173=$(netstat -tuln 2>/dev/null | grep :5173 | wc -l)
    PORT_3001=$(netstat -tuln 2>/dev/null | grep :3001 | wc -l)
    
    if [ "$PORT_5173" -eq 0 ]; then
        echo "✅ 端口 5173 可用"
    else
        echo "⚠️  端口 5173 已被占用"
    fi
    
    if [ "$PORT_3001" -eq 0 ]; then
        echo "✅ 端口 3001 可用"
    else
        echo "⚠️  端口 3001 已被占用"
    fi
else
    echo "⚠️  无法检查端口占用情况 (netstat 不可用)"
fi

echo ""
echo "🎉 环境检查完成！"
echo "📝 如果所有检查都通过，可以运行以下命令启动系统："
echo "   ./deploy/sh/start.sh" 