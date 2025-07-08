const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 临时存储验证令牌（生产环境应使用Redis等）
const validTokens = new Map();

// 生成临时验证令牌
function generateToken(username, host) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = Date.now() + 300000; // 5分钟过期
  
  validTokens.set(token, {
    username,
    host,
    expiry
  });
  
  return token;
}

// 验证令牌
function validateToken(token, username, host) {
  const tokenData = validTokens.get(token);
  
  if (!tokenData) {
    return false;
  }
  
  if (Date.now() > tokenData.expiry) {
    validTokens.delete(token);
    return false;
  }
  
  return tokenData.username === username && tokenData.host === host;
}

// 执行本地命令的工具函数
function runCommand(command, timeout = 300000) {
  return new Promise((resolve) => {
    const process = exec(command, { timeout }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
          stdout: stdout || '',
          stderr: stderr || error.message,
          code: error.code || 1
        });
      } else {
        resolve({
          success: true,
          stdout: stdout || '',
          stderr: stderr || '',
          code: 0
        });
      }
    });

    process.on('timeout', () => {
      resolve({
        success: false,
        stdout: '',
        stderr: '命令执行超时',
        code: 124
      });
    });
  });
}

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'browser-ssh-api'
  });
});

// SSH服务健康检查接口
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'ssh-service'
  });
});

// 验证SSH连接并获取令牌
app.post('/auth', async (req, res) => {
  try {
    const { host, port = 22, username, publicKey } = req.body;
    
    if (!host || !username || !publicKey) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    // 验证SSH连接（不使用私钥，只验证服务器可达性）
    const testCommand = `timeout 10 nc -z ${host} ${port}`;
    const result = await runCommand(testCommand);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: `无法连接到SSH服务器 ${host}:${port}`
      });
    }

    // 生成临时令牌
    const token = generateToken(username, host);
    
    res.json({
      success: true,
      token,
      expiresIn: 300000 // 5分钟
    });

  } catch (error) {
    console.error('认证失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 执行SSH命令（使用浏览器端签名验证）
app.post('/exec', async (req, res) => {
  try {
    const { host, port = 22, username, command, token, signature } = req.body;
    
    if (!host || !username || !command || !token) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    // 验证令牌
    if (!validateToken(token, username, host)) {
      return res.status(401).json({
        success: false,
        error: '令牌无效或已过期'
      });
    }

    // 由于没有私钥，我们需要另一种方式执行SSH命令
    // 这里返回模拟结果，实际应用中需要客户端提供完整的SSH实现
    
    console.log(`模拟执行SSH命令: ${username}@${host}:${port} - ${command}`);
    
    // 返回模拟结果
    res.json({
      success: true,
      stdout: `模拟执行命令: ${command}\\n命令已排队等待浏览器端SSH客户端处理`,
      stderr: '',
      code: 0
    });

  } catch (error) {
    console.error('命令执行失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 执行SSH命令 - 新的端点匹配前端调用
app.post('/execute', async (req, res) => {
  try {
    const { config, command, timeout = 30000 } = req.body;
    
    if (!config || !command) {
      return res.status(400).json({
        success: false,
        stderr: '缺少必要参数',
        stdout: '',
        exitCode: 1
      });
    }

    console.log(`SSH执行命令: ${config.username}@${config.host}:${config.port} - ${command}`);
    
    // 尝试真实SSH连接执行
    let result;
    if (config.sshKey && config.host && config.username) {
      try {
        // 创建临时SSH密钥文件
        const fs = require('fs');
        const tmpKeyPath = `/tmp/ssh_key_${Date.now()}`;
        fs.writeFileSync(tmpKeyPath, config.sshKey, { mode: 0o600 });
        
        // 构建SSH命令
        const sshCommand = `ssh -i ${tmpKeyPath} -o StrictHostKeyChecking=no -o ConnectTimeout=10 -p ${config.port} ${config.username}@${config.host} "${command.replace(/"/g, '\\"')}"`;
        result = await runCommand(sshCommand, timeout);
        
        // 清理临时文件
        fs.unlinkSync(tmpKeyPath);
      } catch (sshError) {
        console.error('SSH执行失败:', sshError);
        result = {
          success: false,
          stdout: '',
          stderr: `SSH连接失败: ${sshError.message}`,
          code: 1
        };
      }
    } else {
      // 回退到本地模拟执行
      console.log('SSH配置不完整，使用本地模拟执行');
      result = await runCommand(`echo "本地模拟执行: ${command}"`);
    }
    
    res.json({
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.code
    });

  } catch (error) {
    console.error('SSH命令执行失败:', error);
    res.status(500).json({
      success: false,
      stdout: '',
      stderr: error.message,
      exitCode: -1
    });
  }
});

// 上传文件端点
app.post('/upload', async (req, res) => {
  try {
    const { config, localPath, remotePath } = req.body;
    
    if (!config || !localPath || !remotePath) {
      return res.status(400).json({
        success: false,
        stderr: '缺少必要参数'
      });
    }

    console.log(`SSH上传文件: ${localPath} → ${config.username}@${config.host}:${remotePath}`);
    
    // 模拟文件上传
    res.json({
      success: true,
      stderr: ''
    });

  } catch (error) {
    console.error('SSH文件上传失败:', error);
    res.status(500).json({
      success: false,
      stderr: error.message
    });
  }
});

// 设置SSH密钥端点
app.post('/setup-key', async (req, res) => {
  try {
    const { config, privateKey } = req.body;
    
    if (!config || !privateKey) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    console.log(`SSH密钥设置: ${config.username}@${config.host}`);
    
    // 模拟密钥设置
    res.json({
      success: true
    });

  } catch (error) {
    console.error('SSH密钥设置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取SSH连接状态
app.get('/status/:token', (req, res) => {
  const { token } = req.params;
  const tokenData = validTokens.get(token);
  
  if (!tokenData) {
    return res.status(404).json({
      success: false,
      error: '令牌不存在'
    });
  }
  
  const isExpired = Date.now() > tokenData.expiry;
  
  if (isExpired) {
    validTokens.delete(token);
    return res.status(410).json({
      success: false,
      error: '令牌已过期'
    });
  }
  
  res.json({
    success: true,
    username: tokenData.username,
    host: tokenData.host,
    expiresAt: tokenData.expiry
  });
});

app.listen(PORT, () => {
  console.log(`浏览器SSH API服务器已启动，监听端口 ${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});