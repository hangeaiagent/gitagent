#!/bin/bash

# GitAgent SSH 终端部署系统 - 重启脚本
# 重启所有服务

echo "🔄 GitAgent SSH 终端部署系统 - 重启脚本"
echo "=========================================="

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录执行此脚本"
    exit 1
fi

echo "🛑 停止现有服务..."
./deploy/sh/stop.sh

echo ""
echo "⏳ 等待服务完全停止..."
sleep 3

echo ""
echo "🚀 重新启动服务..."
./deploy/sh/start.sh

echo ""
echo "🎉 重启完成！" 