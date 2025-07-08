const express = require('express');
const WebSocket = require('ws');
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

/**
 * 增强的SSH代理服务器
 * 基于xterm.js最佳实践实现
 */
class EnhancedSSHProxyServer {
  constructor(port = 3000) {
    this.port = port;
    this.app = express();
    this.server = null;
    this.wss = null;
    this.connections = new Map();
    this.sessions = new Map();
    this.heartbeatInterval = null;
    this.rateLimitMap = new Map();
    
    this.setupExpress();
    this.setupWebSocket();
    this.startHeartbeat();
  }

  setupExpress() {
    // 启用 CORS
    this.app.use(cors({
      origin: [
        'http://localhost:5173', 
        'http://localhost:3000', 
        'http://127.0.0.1:5173',
        'http://localhost:8888',
        'http://localhost:8889'
      ],
      credentials: true
    }));

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.static('public'));

    // 请求日志中间件
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
      next();
    });

    // 速率限制中间件
    this.app.use((req, res, next) => {
      const clientIp = req.ip;
      const now = Date.now();
      const windowMs = 60000; // 1分钟
      const maxRequests = 100; // 每分钟最多100个请求

      if (!this.rateLimitMap.has(clientIp)) {
        this.rateLimitMap.set(clientIp, { count: 1, resetTime: now + windowMs });
        return next();
      }

      const clientData = this.rateLimitMap.get(clientIp);
      if (now > clientData.resetTime) {
        clientData.count = 1;
        clientData.resetTime = now + windowMs;
        return next();
      }

      if (clientData.count >= maxRequests) {
        return res.status(429).json({
          success: false,
          error: '请求过于频繁，请稍后再试'
        });
      }

      clientData.count++;
      next();
    });

    // 健康检查端点
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        connections: this.connections.size,
        sessions: this.sessions.size,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // 获取连接状态
    this.app.get('/connections', (req, res) => {
      const connectionList = Array.from(this.connections.entries()).map(([id, conn]) => ({
        id,
        host: conn.config?.host,
        username: conn.config?.username,
        connected: conn.sshClient?.connected || false,
        createdAt: conn.createdAt,
        lastActivity: conn.lastActivity
      }));
      
      res.json({ connections: connectionList });
    });

    // SSH密钥保存API - 增强安全性
    this.app.post('/api/ssh/save-key', async (req, res) => {
      try {
        const { keyContent, filename, passphrase } = req.body;
        
        if (!keyContent || !filename) {
          return res.status(400).json({
            success: false,
            error: '缺少必要参数'
          });
        }

        // 验证密钥格式
        if (!this.validateSSHKey(keyContent)) {
          return res.status(400).json({
            success: false,
            error: '无效的SSH密钥格式'
          });
        }

        // 生成安全的临时文件名
        const keyId = crypto.randomBytes(16).toString('hex');
        const tempDir = this.getTempDir();
        const keyPath = path.join(tempDir, `ssh_key_${keyId}`);
        
        // 加密存储（如果提供了密码）
        let keyToStore = keyContent;
        if (passphrase) {
          keyToStore = this.encryptKey(keyContent, passphrase);
        }
        
        // 写入密钥文件
        fs.writeFileSync(keyPath, keyToStore, { mode: 0o600 });
        
        // 设置自动清理
        setTimeout(() => {
          this.cleanupKeyFile(keyPath);
        }, 3600000); // 1小时后自动清理
        
        console.log(`[070902] SSH密钥已安全保存: ${keyId}`);
        
        res.json({
          success: true,
          keyId,
          keyPath,
          message: 'SSH密钥已安全保存',
          expiresIn: 3600
        });

      } catch (error) {
        console.error('[070902] SSH密钥保存失败:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // SSH密钥清理API
    this.app.delete('/api/ssh/cleanup-key', async (req, res) => {
      try {
        const { keyPath, keyId } = req.body;
        
        if (!keyPath && !keyId) {
          return res.status(400).json({
            success: false,
            error: '缺少密钥路径或ID'
          });
        }

        const pathToClean = keyPath || path.join(this.getTempDir(), `ssh_key_${keyId}`);
        this.cleanupKeyFile(pathToClean);
        
        res.json({
          success: true,
          message: 'SSH密钥已清理'
        });

      } catch (error) {
        console.error('[070902] SSH密钥清理失败:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // SSH命令执行API - 增强版
    this.app.post('/api/ssh/execute', async (req, res) => {
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

        console.log(`[070902] SSH执行命令: ${config.username}@${config.host}:${config.port} - ${command}`);
        
        // 验证命令安全性
        if (!this.validateCommand(command)) {
          return res.status(400).json({
            success: false,
            stderr: '命令包含不安全的内容',
            stdout: '',
            exitCode: 1
          });
        }

        const result = await this.executeSSHCommand(config, command, timeout);
        
        res.json({
          success: result.success,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          executionTime: result.executionTime
        });

      } catch (error) {
        console.error('[070902] SSH命令执行失败:', error);
        res.status(500).json({
          success: false,
          stdout: '',
          stderr: error.message,
          exitCode: -1
        });
      }
    });

    // 日志收集API - 增强版
    this.app.post('/api/logs', (req, res) => {
      try {
        const logEntry = req.body;
        const timestamp = new Date().toISOString();
        
        console.log(`[${timestamp}] [${logEntry.level?.toUpperCase() || 'INFO'}] ${logEntry.message}`);
        
        if (logEntry.details) {
          console.log(`  详情: ${logEntry.details}`);
        }
        
        if (logEntry.metadata) {
          console.log(`  元数据:`, JSON.stringify(logEntry.metadata, null, 2));
        }
        
        res.json({ success: true, timestamp });
      } catch (error) {
        console.error('[070902] 日志处理失败:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 获取日志API
    this.app.get('/api/logs', (req, res) => {
      try {
        const { category, level, limit = 100 } = req.query;
        
        // 这里应该从持久化存储中获取日志
        const logs = [
          {
            id: 'log_1',
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'SSH代理服务器启动',
            source: 'backend',
            category: 'system'
          }
        ];
        
        res.json({ 
          success: true, 
          logs: logs.slice(0, parseInt(limit)),
          total: logs.length
        });
      } catch (error) {
        console.error('[070902] 获取日志失败:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 文件上传API (SFTP)
    this.app.post('/api/sftp/upload', async (req, res) => {
      try {
        const { sessionId, filename, remotePath, data } = req.body;
        
        if (!sessionId || !filename || !remotePath || !data) {
          return res.status(400).json({
            success: false,
            error: '缺少必要参数'
          });
        }

        const session = this.sessions.get(sessionId);
        if (!session) {
          return res.status(400).json({
            success: false,
            error: '会话不存在'
          });
        }

        const result = await this.uploadFile(session, filename, remotePath, data);
        res.json(result);

      } catch (error) {
        console.error('[070902] 文件上传失败:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 文件下载API (SFTP)
    this.app.post('/api/sftp/download', async (req, res) => {
      try {
        const { sessionId, remotePath } = req.body;
        
        if (!sessionId || !remotePath) {
          return res.status(400).json({
            success: false,
            error: '缺少必要参数'
          });
        }

        const session = this.sessions.get(sessionId);
        if (!session) {
          return res.status(400).json({
            success: false,
            error: '会话不存在'
          });
        }

        const result = await this.downloadFile(session, remotePath);
        res.json(result);

      } catch (error) {
        console.error('[070902] 文件下载失败:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }

  setupWebSocket() {
    this.wss = new WebSocket.Server({ 
      port: this.port + 1,
      path: '/ssh',
      verifyClient: (info) => {
        // 验证客户端
        const origin = info.origin;
        const allowedOrigins = [
          'http://localhost:5173',
          'http://localhost:3000',
          'http://127.0.0.1:5173',
          'http://localhost:8888',
          'http://localhost:8889'
        ];
        
        return allowedOrigins.includes(origin);
      }
    });

    this.wss.on('connection', (ws, req) => {
      const connectionId = this.generateConnectionId();
      const clientIp = req.socket.remoteAddress;
      
      console.log(`[070902] 新的WebSocket连接: ${connectionId} from ${clientIp}`);

      const connection = {
        id: connectionId,
        ws,
        sshClient: null,
        stream: null,
        config: null,
        createdAt: new Date(),
        lastActivity: new Date(),
        clientIp
      };

      this.connections.set(connectionId, connection);

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleWebSocketMessage(connection, data);
        } catch (error) {
          console.error('[070902] WebSocket消息处理失败:', error);
          this.sendError(ws, error.message);
        }
      });

      ws.on('close', () => {
        console.log(`[070902] WebSocket连接关闭: ${connectionId}`);
        this.cleanupConnection(connectionId);
      });

      ws.on('error', (error) => {
        console.error(`[070902] WebSocket错误 (${connectionId}):`, error);
        this.cleanupConnection(connectionId);
      });

      // 发送连接确认
      this.sendMessage(ws, {
        type: 'connection_established',
        connectionId,
        timestamp: new Date().toISOString()
      });
    });

    console.log(`[070902] WebSocket服务器启动在端口 ${this.port + 1}`);
  }

  async handleWebSocketMessage(connection, data) {
    connection.lastActivity = new Date();

    switch (data.type) {
      case 'connect':
        await this.handleSSHConnect(connection, data.config, data.sessionId);
        break;
      case 'input':
        this.handleInput(connection, data.data);
        break;
      case 'resize':
        this.handleResize(connection, data.cols, data.rows);
        break;
      case 'execute_command':
        await this.handleExecuteCommand(connection, data.command, data.commandId, data.timeout);
        break;
      case 'interrupt':
        this.handleInterrupt(connection);
        break;
      case 'eof':
        this.handleEOF(connection);
        break;
      case 'heartbeat':
        this.handleHeartbeat(connection, data.timestamp);
        break;
      case 'upload_file':
        await this.handleFileUpload(connection, data);
        break;
      case 'download_file':
        await this.handleFileDownload(connection, data);
        break;
      case 'disconnect':
        this.handleDisconnect(connection);
        break;
      default:
        console.warn(`[070902] 未知消息类型: ${data.type}`);
    }
  }

  async handleSSHConnect(connection, config, sessionId) {
    try {
      console.log(`[070902] 建立SSH连接: ${config.username}@${config.host}:${config.port}`);
      
      connection.config = config;
      connection.sshClient = new Client();

      // 创建会话
      if (sessionId) {
        this.sessions.set(sessionId, {
          connectionId: connection.id,
          sshClient: connection.sshClient,
          config,
          createdAt: new Date()
        });
      }

      connection.sshClient.on('ready', () => {
        console.log(`[070902] SSH连接成功: ${config.username}@${config.host}`);
        
        connection.sshClient.shell({
          term: 'xterm-256color',
          cols: 80,
          rows: 24
        }, (err, stream) => {
          if (err) {
            console.error('[070902] 创建shell失败:', err);
            this.sendError(connection.ws, `创建shell失败: ${err.message}`);
            return;
          }

          connection.stream = stream;

          // 监听shell输出
          stream.on('data', (data) => {
            this.sendMessage(connection.ws, {
              type: 'data',
              content: data.toString()
            });
          });

          stream.on('close', () => {
            console.log('[070902] SSH shell关闭');
            this.sendMessage(connection.ws, {
              type: 'disconnected',
              message: 'SSH shell已关闭'
            });
          });

          stream.stderr.on('data', (data) => {
            this.sendMessage(connection.ws, {
              type: 'data',
              content: data.toString()
            });
          });

          this.sendMessage(connection.ws, {
            type: 'connected',
            message: 'SSH连接成功',
            sessionId
          });
        });
      });

      connection.sshClient.on('error', (err) => {
        console.error('[070902] SSH连接错误:', err);
        this.sendError(connection.ws, `SSH连接失败: ${err.message}`);
      });

      connection.sshClient.on('close', () => {
        console.log('[070902] SSH连接关闭');
        this.sendMessage(connection.ws, {
          type: 'disconnected',
          message: 'SSH连接已关闭'
        });
      });

      // 准备连接选项
      const connectOptions = {
        host: config.host,
        port: config.port || 22,
        username: config.username,
        readyTimeout: 20000,
        keepaliveInterval: 30000,
        keepaliveCountMax: 3
      };

      // 处理私钥
      if (config.privateKey) {
        connectOptions.privateKey = config.privateKey;
        if (config.passphrase) {
          connectOptions.passphrase = config.passphrase;
        }
      }

      // 开始连接
      connection.sshClient.connect(connectOptions);

    } catch (error) {
      console.error('[070902] SSH连接设置失败:', error);
      this.sendError(connection.ws, `连接失败: ${error.message}`);
    }
  }

  handleInput(connection, data) {
    if (connection.stream) {
      connection.stream.write(data);
    }
  }

  handleResize(connection, cols, rows) {
    if (connection.stream) {
      connection.stream.setWindow(rows, cols);
    }
  }

  async handleExecuteCommand(connection, command, commandId, timeout = 30000) {
    if (!connection.sshClient) {
      this.sendError(connection.ws, 'SSH连接未建立');
      return;
    }

    try {
      connection.sshClient.exec(command, { pty: true }, (err, stream) => {
        if (err) {
          this.sendMessage(connection.ws, {
            type: 'command_error',
            commandId,
            message: err.message
          });
          return;
        }

        let output = '';

        stream.on('data', (data) => {
          const content = data.toString();
          output += content;
          this.sendMessage(connection.ws, {
            type: 'command_output',
            commandId,
            content
          });
        });

        stream.stderr.on('data', (data) => {
          const content = data.toString();
          output += content;
          this.sendMessage(connection.ws, {
            type: 'command_output',
            commandId,
            content
          });
        });

        stream.on('close', (code, signal) => {
          this.sendMessage(connection.ws, {
            type: 'command_complete',
            commandId,
            exitCode: code,
            signal,
            output
          });
        });

        // 设置超时
        setTimeout(() => {
          if (!stream.destroyed) {
            stream.destroy();
            this.sendMessage(connection.ws, {
              type: 'command_error',
              commandId,
              message: '命令执行超时'
            });
          }
        }, timeout);
      });
    } catch (error) {
      this.sendMessage(connection.ws, {
        type: 'command_error',
        commandId,
        message: error.message
      });
    }
  }

  handleInterrupt(connection) {
    if (connection.stream) {
      connection.stream.write('\x03'); // Ctrl+C
    }
  }

  handleEOF(connection) {
    if (connection.stream) {
      connection.stream.end();
    }
  }

  handleHeartbeat(connection, timestamp) {
    this.sendMessage(connection.ws, {
      type: 'heartbeat',
      timestamp,
      serverTime: Date.now()
    });
  }

  async handleFileUpload(connection, data) {
    try {
      const { filename, remotePath, data: fileData, size } = data;
      
      if (!connection.sshClient) {
        throw new Error('SSH连接未建立');
      }

      // 解码base64数据
      const buffer = Buffer.from(fileData, 'base64');
      
      connection.sshClient.sftp((err, sftp) => {
        if (err) {
          this.sendError(connection.ws, `SFTP初始化失败: ${err.message}`);
          return;
        }

        const writeStream = sftp.createWriteStream(remotePath);
        
        writeStream.on('error', (error) => {
          this.sendError(connection.ws, `文件上传失败: ${error.message}`);
        });

        writeStream.on('finish', () => {
          this.sendMessage(connection.ws, {
            type: 'upload_complete',
            filename,
            remotePath,
            size
          });
        });

        writeStream.write(buffer);
        writeStream.end();
      });

    } catch (error) {
      this.sendError(connection.ws, `文件上传失败: ${error.message}`);
    }
  }

  async handleFileDownload(connection, data) {
    try {
      const { remotePath, downloadId } = data;
      
      if (!connection.sshClient) {
        throw new Error('SSH连接未建立');
      }

      connection.sshClient.sftp((err, sftp) => {
        if (err) {
          this.sendMessage(connection.ws, {
            type: 'download_error',
            downloadId,
            message: `SFTP初始化失败: ${err.message}`
          });
          return;
        }

        const readStream = sftp.createReadStream(remotePath);
        let buffer = Buffer.alloc(0);

        readStream.on('data', (chunk) => {
          buffer = Buffer.concat([buffer, chunk]);
        });

        readStream.on('end', () => {
          const base64Data = buffer.toString('base64');
          this.sendMessage(connection.ws, {
            type: 'file_data',
            downloadId,
            data: base64Data,
            size: buffer.length
          });
        });

        readStream.on('error', (error) => {
          this.sendMessage(connection.ws, {
            type: 'download_error',
            downloadId,
            message: `文件下载失败: ${error.message}`
          });
        });
      });

    } catch (error) {
      this.sendMessage(connection.ws, {
        type: 'download_error',
        downloadId: data.downloadId,
        message: `文件下载失败: ${error.message}`
      });
    }
  }

  handleDisconnect(connection) {
    this.cleanupConnection(connection.id);
  }

  // 工具方法
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws, message) {
    this.sendMessage(ws, {
      type: 'error',
      message,
      timestamp: new Date().toISOString()
    });
  }

  validateSSHKey(keyContent) {
    return keyContent.includes('-----BEGIN') && keyContent.includes('-----END');
  }

  validateCommand(command) {
    // 基本的命令安全检查
    const dangerousPatterns = [
      /rm\s+-rf\s+\/(?!home|tmp|var\/tmp)/,
      /:\(\)\{.*\}\;:/,
      /\|\|\s*curl.*\|\s*sh/,
      /wget.*\|\s*sh/
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(command));
  }

  encryptKey(keyContent, passphrase) {
    const cipher = crypto.createCipher('aes-256-cbc', passphrase);
    let encrypted = cipher.update(keyContent, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decryptKey(encryptedKey, passphrase) {
    const decipher = crypto.createDecipher('aes-256-cbc', passphrase);
    let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  getTempDir() {
    const os = require('os');
    return os.tmpdir();
  }

  cleanupKeyFile(keyPath) {
    try {
      if (fs.existsSync(keyPath)) {
        fs.unlinkSync(keyPath);
        console.log(`[070902] SSH密钥文件已清理: ${keyPath}`);
      }
    } catch (error) {
      console.error(`[070902] 清理密钥文件失败: ${error.message}`);
    }
  }

  cleanupConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      if (connection.stream) {
        connection.stream.end();
      }
      if (connection.sshClient) {
        connection.sshClient.end();
      }
      this.connections.delete(connectionId);
      
      // 清理相关会话
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.connectionId === connectionId) {
          this.sessions.delete(sessionId);
        }
      }
    }
  }

  async executeSSHCommand(config, command, timeout) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      try {
        let tmpKeyPath = config.keyPath;
        
        // 创建临时密钥文件
        if (config.sshKey && !tmpKeyPath) {
          tmpKeyPath = path.join(this.getTempDir(), `ssh_key_${Date.now()}`);
          fs.writeFileSync(tmpKeyPath, config.sshKey, { mode: 0o600 });
        }
        
        // 构建SSH命令
        const sshCommand = `ssh -i ${tmpKeyPath} -o StrictHostKeyChecking=no -o ConnectTimeout=10 -p ${config.port} ${config.username}@${config.host} "${command.replace(/"/g, '\\"')}"`;
        
        // 执行SSH命令
        const { exec } = require('child_process');
        const process = exec(sshCommand, { timeout }, (error, stdout, stderr) => {
          const executionTime = Date.now() - startTime;
          
          if (error) {
            resolve({
              success: false,
              stdout: stdout || '',
              stderr: stderr || error.message,
              exitCode: error.code || 1,
              executionTime
            });
          } else {
            resolve({
              success: true,
              stdout: stdout || '',
              stderr: stderr || '',
              exitCode: 0,
              executionTime
            });
          }
          
          // 清理临时文件
          if (config.sshKey && !config.keyPath && fs.existsSync(tmpKeyPath)) {
            this.cleanupKeyFile(tmpKeyPath);
          }
        });

        process.on('timeout', () => {
          resolve({
            success: false,
            stdout: '',
            stderr: '命令执行超时',
            exitCode: 124,
            executionTime: timeout
          });
        });
        
      } catch (error) {
        resolve({
          success: false,
          stdout: '',
          stderr: `SSH连接失败: ${error.message}`,
          exitCode: 1,
          executionTime: Date.now() - startTime
        });
      }
    });
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeoutMs = 300000; // 5分钟超时
      
      // 检查连接超时
      for (const [connectionId, connection] of this.connections.entries()) {
        if (now - connection.lastActivity.getTime() > timeoutMs) {
          console.log(`[070902] 连接超时，清理连接: ${connectionId}`);
          this.cleanupConnection(connectionId);
        }
      }
      
      // 清理过期会话
      for (const [sessionId, session] of this.sessions.entries()) {
        if (now - session.createdAt.getTime() > timeoutMs) {
          console.log(`[070902] 会话超时，清理会话: ${sessionId}`);
          this.sessions.delete(sessionId);
        }
      }
    }, 60000); // 每分钟检查一次
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`[070902] 🚀 SSH代理服务器启动成功`);
      console.log(`[070902] 📡 HTTP服务器: http://localhost:${this.port}`);
      console.log(`[070902] 🔌 WebSocket服务器: ws://localhost:${this.port + 1}/ssh`);
      console.log(`[070902] 💾 活跃连接数: ${this.connections.size}`);
    });

    // 优雅关闭
    process.on('SIGTERM', () => {
      console.log('[070902] 收到SIGTERM信号，正在关闭服务器...');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      console.log('[070902] 收到SIGINT信号，正在关闭服务器...');
      this.shutdown();
    });
  }

  shutdown() {
    console.log('[070902] 正在关闭SSH代理服务器...');
    
    // 清理所有连接
    for (const connectionId of this.connections.keys()) {
      this.cleanupConnection(connectionId);
    }
    
    // 清理心跳
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // 关闭WebSocket服务器
      if (this.wss) {
        this.wss.close();
      }

    // 关闭HTTP服务器
      if (this.server) {
        this.server.close(() => {
        console.log('[070902] SSH代理服务器已关闭');
        process.exit(0);
      });
    }
  }
}

// 启动服务器
const server = new EnhancedSSHProxyServer(3000);
server.start(); 