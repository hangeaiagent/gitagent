#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 GitAgent SSH 终端部署系统 - 安装脚本');
console.log('==========================================');
console.log('');

// 检查 Node.js 版本
const checkNodeVersion = () => {
  const version = process.version;
  const majorVersion = parseInt(version.slice(1).split('.')[0]);
  
  console.log(`📋 Node.js 版本: ${version}`);
  
  if (majorVersion < 16) {
    console.log('❌ 需要 Node.js 16 或更高版本');
    process.exit(1);
  }
  
  console.log('✅ Node.js 版本检查通过');
};

// 安装前端依赖
const installFrontendDeps = () => {
  return new Promise((resolve, reject) => {
    console.log('📦 安装前端依赖...');
    
    const npm = spawn('npm', ['install'], {
      stdio: 'inherit',
      shell: true
    });
    
    npm.on('close', (code) => {
      if (code === 0) {
        console.log('✅ 前端依赖安装完成');
        resolve();
      } else {
        console.log('❌ 前端依赖安装失败');
        reject(new Error(`npm install failed with code ${code}`));
      }
    });
  });
};

// 安装后端依赖
const installBackendDeps = () => {
  return new Promise((resolve, reject) => {
    console.log('🔧 安装后端依赖...');
    
    const packages = ['express', 'ws', 'ssh2', 'cors'];
    const npm = spawn('npm', ['install', ...packages], {
      stdio: 'inherit',
      shell: true
    });
    
    npm.on('close', (code) => {
      if (code === 0) {
        console.log('✅ 后端依赖安装完成');
        resolve();
      } else {
        console.log('❌ 后端依赖安装失败');
        reject(new Error(`npm install backend deps failed with code ${code}`));
      }
    });
  });
};

// 创建启动脚本
const createStartScript = () => {
  console.log('📝 创建启动脚本...');
  
  const startScript = `#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动 GitAgent SSH 终端部署系统...');

// 启动 SSH 代理服务
const sshProxy = spawn('node', [path.join(__dirname, 'src/services/sshProxy.js')], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

// 等待 SSH 代理服务启动
setTimeout(() => {
  // 启动前端服务
  const frontend = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
  });
  
  // 优雅关闭
  const cleanup = () => {
    console.log('\\n正在关闭服务...');
    sshProxy.kill('SIGINT');
    frontend.kill('SIGINT');
    process.exit(0);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
}, 2000);
`;

  fs.writeFileSync('start.js', startScript);
  console.log('✅ 启动脚本创建完成');
};

// 检查项目结构
const checkProjectStructure = () => {
  console.log('🔍 检查项目结构...');
  
  const requiredFiles = [
    'package.json',
    'src/App.tsx',
    'src/services/sshProxy.js'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.log(`❌ 缺少文件: ${file}`);
      return false;
    }
  }
  
  console.log('✅ 项目结构检查通过');
  return true;
};

// 显示完成信息
const showCompletionInfo = () => {
  console.log('');
  console.log('🎉 安装完成！');
  console.log('');
  console.log('🚀 启动方式:');
  console.log('');
  console.log('方式1 (推荐):');
  console.log('  node demo-start.js');
  console.log('');
  console.log('方式2:');
  console.log('  npm run dev-with-proxy');
  console.log('');
  console.log('方式3 (分别启动):');
  console.log('  # 终端1');
  console.log('  npm run ssh-proxy');
  console.log('  # 终端2');
  console.log('  npm run dev');
  console.log('');
  console.log('📱 访问地址: http://localhost:5173');
  console.log('');
  console.log('🔧 功能特性:');
  console.log('  • 传统智能体部署模式');
  console.log('  • SSH 终端部署模式');
  console.log('  • 私钥本地安全处理');
  console.log('  • 实时终端交互');
  console.log('  • 智能错误检测');
  console.log('');
  console.log('📚 更多信息请查看 README.md');
  console.log('');
};

// 主安装流程
const main = async () => {
  try {
    checkNodeVersion();
    
    if (!checkProjectStructure()) {
      console.log('❌ 项目结构不完整，请检查文件');
      process.exit(1);
    }
    
    await installFrontendDeps();
    await installBackendDeps();
    
    createStartScript();
    
    showCompletionInfo();
    
  } catch (error) {
    console.error('❌ 安装失败:', error.message);
    process.exit(1);
  }
};

// 启动安装
main(); 