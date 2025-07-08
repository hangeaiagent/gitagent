#!/bin/bash

# GitAgent SSH 终端部署系统 - 停止脚本
# 优雅停止所有服务

echo "🛑 GitAgent SSH 终端部署系统 - 停止脚本"
echo "=========================================="

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录执行此脚本"
    exit 1
fi

# 创建日志目录
mkdir -p logs

# 停止 SSH 代理服务器
if [ -f "logs/ssh-proxy.pid" ]; then
    SSH_PID=$(cat logs/ssh-proxy.pid)
    if ps -p $SSH_PID > /dev/null 2>&1; then
        echo "🛑 停止 SSH 代理服务器 (PID: $SSH_PID)..."
        kill -TERM $SSH_PID
        
        # 等待进程结束
        for i in {1..10}; do
            if ! ps -p $SSH_PID > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done
        
        # 如果进程仍然存在，强制杀死
        if ps -p $SSH_PID > /dev/null 2>&1; then
            echo "⚠️  SSH 代理服务器未响应，强制停止..."
            kill -9 $SSH_PID
        fi
        
        echo "✅ SSH 代理服务器已停止"
    else
        echo "ℹ️  SSH 代理服务器未运行"
    fi
    rm -f logs/ssh-proxy.pid
else
    echo "ℹ️  未找到 SSH 代理服务器 PID 文件"
fi

# 停止前端开发服务器
if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "🛑 停止前端开发服务器 (PID: $FRONTEND_PID)..."
        kill -TERM $FRONTEND_PID
        
        # 等待进程结束
        for i in {1..10}; do
            if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done
        
        # 如果进程仍然存在，强制杀死
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo "⚠️  前端开发服务器未响应，强制停止..."
            kill -9 $FRONTEND_PID
        fi
        
        echo "✅ 前端开发服务器已停止"
    else
        echo "ℹ️  前端开发服务器未运行"
    fi
    rm -f logs/frontend.pid
else
    echo "ℹ️  未找到前端开发服务器 PID 文件"
fi

# 强制清理端口占用
echo "🔍 强制清理端口占用..."
fuser -k 5173/tcp 2>/dev/null
fuser -k 3000/tcp 2>/dev/null

# 检查端口占用情况
if command -v netstat &> /dev/null; then
    PORT_5173=$(netstat -tuln 2>/dev/null | grep :5173 | wc -l)
    PORT_3000=$(netstat -tuln 2>/dev/null | grep :3000 | wc -l)
    
    if [ "$PORT_5173" -eq 0 ]; then
        echo "✅ 端口 5173 已释放"
    else
        echo "⚠️  端口 5173 仍被占用"
    fi
    
    if [ "$PORT_3000" -eq 0 ]; then
        echo "✅ 端口 3000 已释放"
    else
        echo "⚠️  端口 3000 仍被占用"
    fi
fi

# 清理相关进程
echo "🧹 清理相关进程..."
pkill -f "sshProxyServer.cjs" 2>/dev/null
pkill -f "vite" 2>/dev/null

echo ""
echo "🎉 GitAgent 系统已停止！"
echo "📝 如需重新启动，请运行："
echo "   ./deploy/sh/start.sh" 