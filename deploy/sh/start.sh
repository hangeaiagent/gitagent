#!/bin/bash

# GitAgent SSH 终端部署系统 - 启动脚本
# 一键启动前端和SSH代理服务

echo "🚀 GitAgent SSH 终端部署系统 - 启动脚本"
echo "=========================================="

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录执行此脚本"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "❌ 依赖未安装，请先运行安装脚本："
    echo "   ./deploy/sh/install.sh"
    exit 1
fi

# 检查端口占用
echo "🔍 检查端口占用情况..."
if command -v netstat &> /dev/null; then
    PORT_5173=$(netstat -tuln 2>/dev/null | grep :5173 | wc -l)
    PORT_3000=$(netstat -tuln 2>/dev/null | grep :3000 | wc -l)
    
    if [ "$PORT_5173" -gt 0 ]; then
        echo "⚠️  端口 5173 已被占用，正在尝试关闭..."
        fuser -k 5173/tcp 2>/dev/null
        sleep 2
    fi
    
    if [ "$PORT_3000" -gt 0 ]; then
        echo "⚠️  端口 3000 已被占用，正在尝试关闭..."
        fuser -k 3000/tcp 2>/dev/null
        sleep 2
    fi
fi

# 创建日志目录
mkdir -p logs

# 启动 SSH 代理服务器
echo "🔧 启动 SSH 代理服务器 (端口 3000)..."
nohup node src/services/sshProxyServer.cjs > logs/ssh-proxy.log 2>&1 &
SSH_PID=$!
echo "✅ SSH 代理服务器已启动 (PID: $SSH_PID)"

# 等待 SSH 代理启动
sleep 3

# 检查 SSH 代理是否启动成功
if ps -p $SSH_PID > /dev/null; then
    echo "✅ SSH 代理服务器运行正常"
else
    echo "❌ SSH 代理服务器启动失败，请检查日志：logs/ssh-proxy.log"
    exit 1
fi

# 启动前端开发服务器 (允许外部访问)
echo "🌐 启动前端开发服务器 (端口 5173)..."
nohup npm run dev -- --host 0.0.0.0 > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ 前端开发服务器已启动 (PID: $FRONTEND_PID)"

# 等待前端启动
sleep 5

# 检查前端是否启动成功
if ps -p $FRONTEND_PID > /dev/null; then
    echo "✅ 前端开发服务器运行正常"
else
    echo "❌ 前端开发服务器启动失败，请检查日志：logs/frontend.log"
    exit 1
fi

# 保存进程ID到文件
echo $SSH_PID > logs/ssh-proxy.pid
echo $FRONTEND_PID > logs/frontend.pid

echo ""
echo "🎉 GitAgent 系统启动成功！"
echo "=========================="
echo "📱 前端应用: http://localhost:5173"
echo "🔧 SSH代理服务: http://localhost:3000"
echo "🌐 外部访问: http://$(curl -s ifconfig.me):5173"
echo ""
echo "📋 进程信息："
echo "   SSH代理 PID: $SSH_PID"
echo "   前端服务 PID: $FRONTEND_PID"
echo ""
echo "📝 日志文件："
echo "   SSH代理: logs/ssh-proxy.log"
echo "   前端服务: logs/frontend.log"
echo ""
echo "🛑 停止服务请运行："
echo "   ./deploy/sh/stop.sh"
echo ""
echo "📊 查看状态请运行："
echo "   ./deploy/sh/status.sh" 