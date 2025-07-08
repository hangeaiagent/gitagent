#!/bin/bash

# GitAgent SSH 终端部署系统 - 日志查看脚本
# 实时查看服务日志

echo "📝 GitAgent SSH 终端部署系统 - 日志查看"
echo "=========================================="

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录执行此脚本"
    exit 1
fi

# 创建日志目录
mkdir -p logs

# 显示日志选项
echo "请选择要查看的日志："
echo "1) SSH 代理服务器日志"
echo "2) 前端开发服务器日志"
echo "3) 所有日志 (实时)"
echo "4) 查看最近的错误日志"
echo "5) 清理日志文件"
echo ""

read -p "请输入选项 (1-5): " choice

case $choice in
    1)
        echo "📋 查看 SSH 代理服务器日志..."
        if [ -f "logs/ssh-proxy.log" ]; then
            echo "按 Ctrl+C 退出日志查看"
            echo "----------------------------------------"
            tail -f logs/ssh-proxy.log
        else
            echo "❌ SSH 代理服务器日志文件不存在"
        fi
        ;;
    2)
        echo "📋 查看前端开发服务器日志..."
        if [ -f "logs/frontend.log" ]; then
            echo "按 Ctrl+C 退出日志查看"
            echo "----------------------------------------"
            tail -f logs/frontend.log
        else
            echo "❌ 前端开发服务器日志文件不存在"
        fi
        ;;
    3)
        echo "📋 查看所有日志 (实时)..."
        echo "按 Ctrl+C 退出日志查看"
        echo "----------------------------------------"
        if [ -f "logs/ssh-proxy.log" ] && [ -f "logs/frontend.log" ]; then
            tail -f logs/ssh-proxy.log logs/frontend.log
        elif [ -f "logs/ssh-proxy.log" ]; then
            tail -f logs/ssh-proxy.log
        elif [ -f "logs/frontend.log" ]; then
            tail -f logs/frontend.log
        else
            echo "❌ 没有找到任何日志文件"
        fi
        ;;
    4)
        echo "📋 查看最近的错误日志..."
        echo "----------------------------------------"
        echo "SSH 代理服务器错误日志:"
        if [ -f "logs/ssh-proxy.log" ]; then
            grep -i "error\|exception\|fail" logs/ssh-proxy.log | tail -10
        else
            echo "  日志文件不存在"
        fi
        echo ""
        echo "前端开发服务器错误日志:"
        if [ -f "logs/frontend.log" ]; then
            grep -i "error\|exception\|fail" logs/frontend.log | tail -10
        else
            echo "  日志文件不存在"
        fi
        ;;
    5)
        echo "🧹 清理日志文件..."
        read -p "确定要清理所有日志文件吗？(y/N): " confirm
        if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
            rm -f logs/*.log
            rm -f logs/*.pid
            echo "✅ 日志文件已清理"
        else
            echo "❌ 取消清理操作"
        fi
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac 