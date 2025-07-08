#!/bin/bash

# GitAgent SSH 终端部署系统 - 安装脚本
# 自动安装依赖和配置环境

echo "🚀 GitAgent SSH 终端部署系统 - 安装脚本"
echo "=========================================="

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录执行此脚本"
    exit 1
fi

# 检查 Node.js 版本
echo "📋 检查 Node.js 版本..."
NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo $NODE_VERSION | sed 's/v//' | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 16 ]; then
    echo "❌ Node.js 版本过低，需要 v16+ 版本"
    echo "当前版本: $NODE_VERSION"
    exit 1
fi

echo "✅ Node.js 版本检查通过: $NODE_VERSION"

# 清理旧的 node_modules
if [ -d "node_modules" ]; then
    echo "🧹 清理旧的依赖..."
    rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
    echo "🧹 清理 package-lock.json..."
    rm -f package-lock.json
fi

# 清理 npm 缓存
echo "🧹 清理 npm 缓存..."
npm cache clean --force

# 安装依赖
echo "📦 安装前端依赖..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ 前端依赖安装成功"
else
    echo "❌ 前端依赖安装失败"
    exit 1
fi

# 检查关键依赖
echo "🔍 验证关键依赖..."
if [ -d "node_modules/@xterm" ]; then
    echo "✅ xterm.js 依赖已安装"
else
    echo "❌ xterm.js 依赖安装失败"
    exit 1
fi

if [ -d "node_modules/express" ]; then
    echo "✅ Express 依赖已安装"
else
    echo "❌ Express 依赖安装失败"
    exit 1
fi

if [ -d "node_modules/ssh2" ]; then
    echo "✅ SSH2 依赖已安装"
else
    echo "❌ SSH2 依赖安装失败"
    exit 1
fi

# 创建必要的目录
echo "📁 创建必要目录..."
mkdir -p logs
mkdir -p deploy/config

# 设置脚本权限
echo "🔐 设置脚本权限..."
chmod +x deploy/sh/*.sh

echo ""
echo "🎉 安装完成！"
echo "📝 现在可以运行以下命令启动系统："
echo "   ./deploy/sh/start.sh"
echo ""
echo "📋 或者运行环境检查："
echo "   ./deploy/sh/check-env.sh" 