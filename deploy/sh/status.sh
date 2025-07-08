#!/bin/bash

# GitAgent SSH 终端部署系统 - 状态检查脚本
# 检查服务运行状态和端口占用

echo "📊 GitAgent SSH 终端部署系统 - 状态检查"
echo "=========================================="

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录执行此脚本"
    exit 1
fi

# 创建日志目录
mkdir -p logs

echo "🔍 检查服务运行状态..."
echo ""

# 检查 SSH 代理服务器
if [ -f "logs/ssh-proxy.pid" ]; then
    SSH_PID=$(cat logs/ssh-proxy.pid)
    if ps -p $SSH_PID > /dev/null 2>&1; then
        SSH_CMD=$(ps -p $SSH_PID -o cmd= 2>/dev/null)
        SSH_MEM=$(ps -p $SSH_PID -o rss= 2>/dev/null)
        SSH_TIME=$(ps -p $SSH_PID -o etime= 2>/dev/null)
        
        echo "✅ SSH 代理服务器"
        echo "   PID: $SSH_PID"
        echo "   内存: ${SSH_MEM}KB"
        echo "   运行时间: $SSH_TIME"
        echo "   命令: $SSH_CMD"
    else
        echo "❌ SSH 代理服务器 (PID: $SSH_PID) 未运行"
        rm -f logs/ssh-proxy.pid
    fi
else
    echo "ℹ️  SSH 代理服务器未启动"
fi

echo ""

# 检查前端开发服务器
if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        FRONTEND_CMD=$(ps -p $FRONTEND_PID -o cmd= 2>/dev/null)
        FRONTEND_MEM=$(ps -p $FRONTEND_PID -o rss= 2>/dev/null)
        FRONTEND_TIME=$(ps -p $FRONTEND_PID -o etime= 2>/dev/null)
        
        echo "✅ 前端开发服务器"
        echo "   PID: $FRONTEND_PID"
        echo "   内存: ${FRONTEND_MEM}KB"
        echo "   运行时间: $FRONTEND_TIME"
        echo "   命令: $FRONTEND_CMD"
    else
        echo "❌ 前端开发服务器 (PID: $FRONTEND_PID) 未运行"
        rm -f logs/frontend.pid
    fi
else
    echo "ℹ️  前端开发服务器未启动"
fi

echo ""
echo "🔍 检查端口占用情况..."

# 检查端口占用
if command -v netstat &> /dev/null; then
    echo "端口 5173 (前端):"
    PORT_5173_INFO=$(netstat -tuln 2>/dev/null | grep :5173)
    if [ ! -z "$PORT_5173_INFO" ]; then
        echo "   ✅ 正在监听"
        echo "   $PORT_5173_INFO"
    else
        echo "   ❌ 未监听"
    fi
    
    echo ""
    echo "端口 3001 (SSH代理):"
    PORT_3001_INFO=$(netstat -tuln 2>/dev/null | grep :3001)
    if [ ! -z "$PORT_3001_INFO" ]; then
        echo "   ✅ 正在监听"
        echo "   $PORT_3001_INFO"
    else
        echo "   ❌ 未监听"
    fi
else
    echo "⚠️  无法检查端口占用情况 (netstat 不可用)"
fi

echo ""
echo "📝 日志文件状态:"

# 检查日志文件
if [ -f "logs/ssh-proxy.log" ]; then
    SSH_LOG_SIZE=$(du -h logs/ssh-proxy.log | cut -f1)
    SSH_LOG_LINES=$(wc -l < logs/ssh-proxy.log)
    echo "   SSH代理日志: $SSH_LOG_SIZE ($SSH_LOG_LINES 行)"
else
    echo "   SSH代理日志: 不存在"
fi

if [ -f "logs/frontend.log" ]; then
    FRONTEND_LOG_SIZE=$(du -h logs/frontend.log | cut -f1)
    FRONTEND_LOG_LINES=$(wc -l < logs/frontend.log)
    echo "   前端服务日志: $FRONTEND_LOG_SIZE ($FRONTEND_LOG_LINES 行)"
else
    echo "   前端服务日志: 不存在"
fi

echo ""
echo "🌐 访问地址:"
echo "   前端应用: http://localhost:5173"
echo "   SSH代理服务: http://localhost:3001"

echo ""
echo "📋 可用命令:"
echo "   启动服务: ./deploy/sh/start.sh"
echo "   停止服务: ./deploy/sh/stop.sh"
echo "   重启服务: ./deploy/sh/restart.sh"
echo "   环境检查: ./deploy/sh/check-env.sh" 