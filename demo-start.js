#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 GitAgent SSH 终端部署系统演示');
console.log('=====================================');
console.log('');

// 检查是否安装了必要的依赖
const checkDependencies = () => {
  console.log('📦 检查依赖包...');
  
  try {
    require('express');
    require('ws');
    require('ssh2');
    require('cors');
    console.log('✅ 后端依赖包已安装');
  } catch (error) {
    console.log('❌ 后端依赖包未安装，请运行: npm install express ws ssh2 cors');
    process.exit(1);
  }
};

// 启动 SSH 代理服务
const startSSHProxy = () => {
  console.log('🔧 启动 SSH 代理服务...');
  
  const sshProxy = spawn('node', [path.join(__dirname, 'src/services/sshProxy.js')], {
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });

  sshProxy.stdout.on('data', (data) => {
    console.log(`[SSH代理] ${data.toString().trim()}`);
  });

  sshProxy.stderr.on('data', (data) => {
    console.error(`[SSH代理错误] ${data.toString().trim()}`);
  });

  return sshProxy;
};

// 启动前端开发服务器
const startFrontend = () => {
  console.log('🌐 启动前端开发服务器...');
  
  const frontend = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });

  frontend.stdout.on('data', (data) => {
    console.log(`[前端] ${data.toString().trim()}`);
  });

  frontend.stderr.on('data', (data) => {
    console.error(`[前端错误] ${data.toString().trim()}`);
  });

  return frontend;
};

// 主函数
const main = async () => {
  checkDependencies();
  
  console.log('');
  console.log('🎯 启动服务...');
  console.log('');
  
  // 启动 SSH 代理服务
  const sshProxy = startSSHProxy();
  
  // 等待 SSH 代理服务启动
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 启动前端服务
  const frontend = startFrontend();
  
  console.log('');
  console.log('✨ 系统已启动！');
  console.log('');
  console.log('📱 访问地址:');
  console.log('   前端界面: http://localhost:5173');
  console.log('   SSH代理: ws://localhost:3000/ssh');
  console.log('');
  console.log('🔧 功能特性:');
  console.log('   • 传统智能体部署模式');
  console.log('   • SSH 终端部署模式');
  console.log('   • 私钥本地安全处理');
  console.log('   • 实时终端交互');
  console.log('   • 智能错误检测');
  console.log('');
  console.log('⚡ 快速开始:');
  console.log('   1. 打开 http://localhost:5173');
  console.log('   2. 选择部署模式');
  console.log('   3. 配置服务器信息');
  console.log('   4. 上传 SSH 私钥文件');
  console.log('   5. 开始部署！');
  console.log('');
  console.log('按 Ctrl+C 停止服务');
  console.log('');

  // 优雅关闭处理
  const cleanup = () => {
    console.log('\n🛑 正在关闭服务...');
    
    if (sshProxy && !sshProxy.killed) {
      sshProxy.kill('SIGINT');
    }
    
    if (frontend && !frontend.killed) {
      frontend.kill('SIGINT');
    }
    
    setTimeout(() => {
      console.log('✅ 服务已关闭');
      process.exit(0);
    }, 1000);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  // 监听进程退出
  sshProxy.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ SSH 代理服务异常退出，代码: ${code}`);
    }
  });
  
  frontend.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ 前端服务异常退出，代码: ${code}`);
    }
  });
};

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

// 启动
main().catch((error) => {
  console.error('❌ 启动失败:', error);
  process.exit(1);
}); 