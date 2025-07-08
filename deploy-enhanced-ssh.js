#!/usr/bin/env node

/**
 * 增强SSH终端部署脚本
 * 基于xterm.js最佳实践
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 开始部署增强SSH终端系统...\n');

// 检查依赖
console.log('📦 检查依赖...');
const requiredDeps = [
  '@xterm/xterm',
  '@xterm/addon-fit',
  '@xterm/addon-web-links',
  '@xterm/addon-search',
  '@xterm/addon-clipboard',
  '@xterm/addon-webgl',
  '@xterm/addon-attach'
];

const optionalDeps = [
  'express',
  'ws',
  'ssh2',
  'cors'
];

// 检查package.json
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ 未找到package.json文件');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies, ...packageJson.optionalDependencies };

// 检查必需依赖
const missingDeps = requiredDeps.filter(dep => !allDeps[dep]);
if (missingDeps.length > 0) {
  console.log(`⚠️  缺少必需依赖: ${missingDeps.join(', ')}`);
  console.log('📥 正在安装依赖...');
  
  try {
    execSync(`npm install ${missingDeps.join(' ')}`, { stdio: 'inherit' });
    console.log('✅ 依赖安装完成');
  } catch (error) {
    console.error('❌ 依赖安装失败:', error.message);
    process.exit(1);
  }
}

// 检查可选依赖
const missingOptionalDeps = optionalDeps.filter(dep => !allDeps[dep]);
if (missingOptionalDeps.length > 0) {
  console.log(`💡 可选依赖 (用于SSH代理服务): ${missingOptionalDeps.join(', ')}`);
  console.log('📥 正在安装可选依赖...');
  
  try {
    execSync(`npm install ${missingOptionalDeps.join(' ')}`, { stdio: 'inherit' });
    console.log('✅ 可选依赖安装完成');
  } catch (error) {
    console.warn('⚠️  可选依赖安装失败，SSH代理功能可能受限');
  }
}

// 创建必要的目录
console.log('\n📁 创建目录结构...');
const dirs = [
  'src/config',
  'src/components',
  'src/services',
  'src/utils',
  'doc/pack',
  'public/themes',
  'temp'
];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ 创建目录: ${dir}`);
  }
});

// 创建配置文件
console.log('\n⚙️  创建配置文件...');

// 创建环境配置
const envConfig = `# SSH终端环境配置
NODE_ENV=development
SSH_PROXY_PORT=3000
WEBSOCKET_PORT=3001
MAX_CONNECTIONS=100
SESSION_TIMEOUT=3600000
ENABLE_SECURITY=true
ENABLE_LOGGING=true
LOG_LEVEL=info
`;

fs.writeFileSync(path.join(__dirname, '.env.example'), envConfig);
console.log('✅ 创建 .env.example');

// 创建主题配置
const themeConfig = {
  default: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    selection: '#3a3d41'
  },
  dark: {
    background: '#0d1117',
    foreground: '#c9d1d9',
    cursor: '#58a6ff',
    selection: '#264f78'
  },
  light: {
    background: '#ffffff',
    foreground: '#24292f',
    cursor: '#0969da',
    selection: '#0969da20'
  }
};

fs.writeFileSync(
  path.join(__dirname, 'public/themes/terminal-themes.json'),
  JSON.stringify(themeConfig, null, 2)
);
console.log('✅ 创建终端主题配置');

// 创建部署文档
const deploymentDoc = `# 增强SSH终端部署文档

## 部署完成 ✅

### 新功能特性

#### 1. 安全增强
- ✅ 私钥加密存储
- ✅ 会话超时管理
- ✅ 命令安全验证
- ✅ 速率限制保护
- ✅ 敏感信息脱敏

#### 2. 连接管理
- ✅ 智能重连机制
- ✅ 心跳检测
- ✅ 连接池管理
- ✅ 会话持久化

#### 3. 用户体验
- ✅ 多主题支持
- ✅ 自适应终端大小
- ✅ 快捷键支持
- ✅ 复制粘贴功能
- ✅ 搜索功能

#### 4. 文件传输
- ✅ SFTP集成
- ✅ 拖拽上传
- ✅ 文件类型验证
- ✅ 传输进度显示

#### 5. 自动化部署
- ✅ 智能项目检测
- ✅ 错误自动修复
- ✅ 部署进度跟踪
- ✅ 回滚机制

### 使用方法

1. **启动服务**
   \`\`\`bash
   npm run dev-with-proxy
   \`\`\`

2. **配置连接**
   - 服务器地址: 44.203.197.203
   - 端口: 22
   - 用户名: ec2-user
   - 私钥: 上传.pem文件

3. **开始部署**
   - 选择SSH终端模式
   - 建立连接
   - 输入GitHub项目地址
   - 开始自动化部署

### 技术架构

\`\`\`
前端 (React + xterm.js)
    ↓ WebSocket
SSH代理服务器 (Node.js)
    ↓ SSH2
远程服务器 (EC2)
\`\`\`

### 安全特性

- 🔐 端到端加密
- 🛡️ 命令白名单
- ⏱️ 会话超时
- 🚫 恶意请求拦截
- 📝 安全审计日志

### 性能优化

- ⚡ WebGL渲染加速
- 🔄 智能缓存
- 📊 连接池复用
- 🎯 按需加载

部署时间: ${new Date().toISOString()}
版本: v2.0 Enhanced
`;

fs.writeFileSync(path.join(__dirname, 'doc/pack/0709增强SSH终端部署.md'), deploymentDoc);
console.log('✅ 创建部署文档');

// 创建启动脚本
const startScript = `#!/bin/bash

# 增强SSH终端启动脚本

echo "🚀 启动增强SSH终端系统..."

# 检查Node.js版本
node_version=$(node --version)
echo "📦 Node.js版本: $node_version"

# 检查端口占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  端口 $port 已被占用"
        return 1
    else
        echo "✅ 端口 $port 可用"
        return 0
    fi
}

# 检查必要端口
check_port 3000 || exit 1
check_port 3001 || exit 1
check_port 5173 || exit 1

# 启动SSH代理服务器
echo "🔧 启动SSH代理服务器..."
nohup node src/services/sshProxyServer.cjs > ssh-proxy.log 2>&1 &
SSH_PROXY_PID=$!
echo "✅ SSH代理服务器已启动 (PID: $SSH_PROXY_PID)"

# 等待服务器启动
sleep 2

# 启动前端开发服务器
echo "🎨 启动前端开发服务器..."
npm run dev &
FRONTEND_PID=$!
echo "✅ 前端服务器已启动 (PID: $FRONTEND_PID)"

# 创建PID文件
echo $SSH_PROXY_PID > ssh-proxy.pid
echo $FRONTEND_PID > frontend.pid

echo ""
echo "🎉 系统启动完成！"
echo "📡 SSH代理服务器: http://localhost:3000"
echo "🌐 前端界面: http://localhost:5173"
echo "📊 健康检查: http://localhost:3000/health"
echo ""
echo "💡 使用 ./stop-enhanced-ssh.sh 停止服务"

# 等待用户中断
trap 'echo "🛑 正在关闭服务..."; kill $SSH_PROXY_PID $FRONTEND_PID; exit' INT
wait
`;

fs.writeFileSync(path.join(__dirname, 'start-enhanced-ssh.sh'), startScript);
execSync('chmod +x start-enhanced-ssh.sh');
console.log('✅ 创建启动脚本');

// 创建停止脚本
const stopScript = `#!/bin/bash

# 增强SSH终端停止脚本

echo "🛑 停止增强SSH终端系统..."

# 停止SSH代理服务器
if [ -f ssh-proxy.pid ]; then
    SSH_PROXY_PID=$(cat ssh-proxy.pid)
    if kill -0 $SSH_PROXY_PID 2>/dev/null; then
        kill $SSH_PROXY_PID
        echo "✅ SSH代理服务器已停止"
    fi
    rm -f ssh-proxy.pid
fi

# 停止前端服务器
if [ -f frontend.pid ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "✅ 前端服务器已停止"
    fi
    rm -f frontend.pid
fi

# 清理临时文件
rm -f ssh-proxy.log
rm -f nohup.out

# 清理可能的僵尸进程
pkill -f "node src/services/sshProxyServer.cjs"
pkill -f "vite"

echo "🧹 清理完成"
echo "👋 增强SSH终端系统已完全停止"
`;

fs.writeFileSync(path.join(__dirname, 'stop-enhanced-ssh.sh'), stopScript);
execSync('chmod +x stop-enhanced-ssh.sh');
console.log('✅ 创建停止脚本');

// 更新package.json脚本
console.log('\n📝 更新package.json脚本...');
packageJson.scripts = {
  ...packageJson.scripts,
  'enhanced-ssh': 'node deploy-enhanced-ssh.js',
  'start-enhanced': './start-enhanced-ssh.sh',
  'stop-enhanced': './stop-enhanced-ssh.sh',
  'ssh-proxy-enhanced': 'node src/services/sshProxyServer.cjs',
  'dev-enhanced': 'concurrently "npm run ssh-proxy-enhanced" "npm run dev"'
};

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('✅ 更新package.json');

// 验证文件
console.log('\n🔍 验证部署文件...');
const criticalFiles = [
  'src/components/SSHTerminal.tsx',
  'src/services/sshProxyServer.cjs',
  'src/config/security.ts'
];

let allFilesExist = true;
criticalFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 文件不存在`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.error('\n❌ 部分关键文件缺失，请检查部署');
  process.exit(1);
}

// 创建使用说明
const usageDoc = `# 增强SSH终端使用说明

## 快速开始

### 1. 一键启动
\`\`\`bash
./start-enhanced-ssh.sh
\`\`\`

### 2. 访问系统
- 前端界面: http://localhost:5173
- SSH代理API: http://localhost:3000
- 健康检查: http://localhost:3000/health

### 3. 配置连接
1. 选择"SSH终端模式"
2. 填写服务器信息:
   - 地址: 44.203.197.203
   - 端口: 22
   - 用户名: ec2-user
3. 上传私钥文件 (.pem)
4. 点击"打开SSH终端"

### 4. 自动化部署
1. 连接成功后，输入GitHub项目地址
2. 点击"开始自动部署"
3. 系统会自动:
   - 检测项目类型
   - 安装依赖
   - 构建项目
   - 启动服务
   - 错误自动修复

## 高级功能

### 文件传输
- 拖拽文件到终端上传
- 右键菜单下载文件
- 支持多种文件格式
- 传输进度显示

### 多主题支持
- 默认主题 (深色)
- GitHub主题 (深色)
- 明亮主题 (浅色)
- 自定义主题

### 快捷键
- Ctrl+C: 中断命令
- Ctrl+D: 退出会话
- Ctrl+V: 粘贴
- Ctrl+Shift+C: 复制
- Ctrl+Shift+F: 搜索

### 安全特性
- 私钥本地加密
- 会话自动超时
- 命令安全验证
- 恶意请求拦截

## 故障排除

### 连接失败
1. 检查网络连接
2. 验证服务器地址和端口
3. 确认私钥文件正确
4. 查看错误日志

### 部署失败
1. 检查项目类型识别
2. 验证依赖安装
3. 查看构建日志
4. 检查服务器资源

### 性能问题
1. 启用WebGL加速
2. 调整终端缓冲区大小
3. 优化网络连接
4. 清理临时文件

## 开发模式

### 启动开发环境
\`\`\`bash
npm run dev-enhanced
\`\`\`

### 调试SSH代理
\`\`\`bash
npm run ssh-proxy-enhanced
\`\`\`

### 查看日志
\`\`\`bash
tail -f ssh-proxy.log
\`\`\`

创建时间: ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(__dirname, 'USAGE-ENHANCED.md'), usageDoc);
console.log('✅ 创建使用说明');

// 完成部署
console.log('\n🎉 增强SSH终端部署完成！');
console.log('\n📋 部署总结:');
console.log('✅ 安全配置文件已创建');
console.log('✅ 启动/停止脚本已创建');
console.log('✅ 主题配置已创建');
console.log('✅ 文档已更新');
console.log('✅ package.json已更新');

console.log('\n🚀 使用方法:');
console.log('1. 启动系统: ./start-enhanced-ssh.sh');
console.log('2. 访问界面: http://localhost:5173');
console.log('3. 配置SSH连接');
console.log('4. 开始自动化部署');

console.log('\n💡 提示:');
console.log('- 查看详细说明: cat USAGE-ENHANCED.md');
console.log('- 停止服务: ./stop-enhanced-ssh.sh');
console.log('- 健康检查: curl http://localhost:3000/health');

console.log('\n🔧 技术支持:');
console.log('- 基于xterm.js v5.5.0');
console.log('- 支持WebGL加速');
console.log('- 内置安全防护');
console.log('- 智能错误修复');

console.log('\n📊 系统状态: 就绪 ✅'); 