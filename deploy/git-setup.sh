#!/bin/bash

# GitAgent GitHub 仓库设置和代码提交脚本
# 使用方法: ./deploy/git-setup.sh

set -e

echo "🚀 开始设置 GitAgent GitHub 仓库..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查Git是否安装
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git 未安装，请先安装 Git${NC}"
    exit 1
fi

# 检查是否在Git仓库中
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo -e "${YELLOW}📁 初始化 Git 仓库...${NC}"
    git init
fi

# 设置Git用户信息（如果未设置）
if [ -z "$(git config user.name)" ]; then
    echo -e "${YELLOW}👤 设置 Git 用户信息...${NC}"
    read -p "请输入您的 Git 用户名: " git_username
    read -p "请输入您的 Git 邮箱: " git_email
    git config user.name "$git_username"
    git config user.email "$git_email"
fi

# 添加所有文件到暂存区
echo -e "${BLUE}📦 添加文件到暂存区...${NC}"
git add .

# 检查是否有文件需要提交
if git diff --cached --quiet; then
    echo -e "${YELLOW}⚠️  没有文件需要提交${NC}"
    exit 0
fi

# 创建初始提交
echo -e "${BLUE}💾 创建初始提交...${NC}"
git commit -m "🎉 初始提交: GitAgent SSH终端部署系统

✨ 功能特性:
- SSH终端连接和管理
- 实时部署监控
- 智能错误分析
- 多服务器支持
- 现代化Web界面

🔧 技术栈:
- React + TypeScript
- Vite构建工具
- Tailwind CSS
- Node.js后端
- WebSocket实时通信

📦 包含文件:
- 前端React组件
- 后端服务脚本
- 部署管理脚本
- 配置文件
- 文档说明"

echo -e "${GREEN}✅ 初始提交完成！${NC}"

# 询问是否要推送到GitHub
echo -e "${YELLOW}🤔 是否要推送到 GitHub 仓库？${NC}"
read -p "请输入 GitHub 仓库 URL (例如: https://github.com/username/gitagent.git): " repo_url

if [ -n "$repo_url" ]; then
    echo -e "${BLUE}🔗 添加远程仓库...${NC}"
    git remote add origin "$repo_url"
    
    echo -e "${BLUE}📤 推送到 GitHub...${NC}"
    git branch -M main
    git push -u origin main
    
    echo -e "${GREEN}🎉 代码已成功推送到 GitHub！${NC}"
    echo -e "${BLUE}📋 仓库地址: $repo_url${NC}"
else
    echo -e "${YELLOW}⚠️  跳过推送到 GitHub${NC}"
    echo -e "${BLUE}💡 稍后可以使用以下命令推送:${NC}"
    echo "git remote add origin <repository-url>"
    echo "git push -u origin main"
fi

echo -e "${GREEN}✨ GitAgent 仓库设置完成！${NC}" 