#!/bin/bash

# GitAgent 部署脚本测试工具
# 用于验证start.sh和stop.sh脚本的功能

echo "🧪 GitAgent 部署脚本测试工具"
echo "============================="

# 检查脚本权限
echo "🔍 检查脚本权限..."
if [ ! -x "deploy/sh/start.sh" ]; then
    echo "⚠️  start.sh 没有执行权限，正在添加..."
    chmod +x deploy/sh/start.sh
fi

if [ ! -x "deploy/sh/stop.sh" ]; then
    echo "⚠️  stop.sh 没有执行权限，正在添加..."
    chmod +x deploy/sh/stop.sh
fi

if [ ! -x "deploy/sh/status.sh" ]; then
    echo "⚠️  status.sh 没有执行权限，正在添加..."
    chmod +x deploy/sh/status.sh
fi

echo "✅ 脚本权限检查完成"

# 检查必要文件
echo ""
echo "📁 检查必要文件..."
if [ ! -f "src/services/sshProxyServer.cjs" ]; then
    echo "❌ SSH代理服务器文件不存在: src/services/sshProxyServer.cjs"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json 文件不存在"
    exit 1
fi

echo "✅ 必要文件检查完成"

# 检查端口配置
echo ""
echo "🔧 检查端口配置..."
if grep -q "3000" deploy/sh/start.sh; then
    echo "✅ start.sh 使用正确的端口 3000"
else
    echo "❌ start.sh 端口配置错误"
fi

if grep -q "3000" deploy/sh/stop.sh; then
    echo "✅ stop.sh 使用正确的端口 3000"
else
    echo "❌ stop.sh 端口配置错误"
fi

if grep -q "3000" deploy/sh/status.sh; then
    echo "✅ status.sh 使用正确的端口 3000"
else
    echo "❌ status.sh 端口配置错误"
fi

# 检查外部访问配置
echo ""
echo "🌐 检查外部访问配置..."
if grep -q "host 0.0.0.0" deploy/sh/start.sh; then
    echo "✅ start.sh 配置了外部访问支持"
else
    echo "❌ start.sh 缺少外部访问配置"
fi

echo ""
echo "🎉 测试完成！"
echo ""
echo "📋 可用命令:"
echo "   启动服务: ./deploy/sh/start.sh"
echo "   停止服务: ./deploy/sh/stop.sh"
echo "   查看状态: ./deploy/sh/status.sh"
echo "   重启服务: ./deploy/sh/restart.sh" 