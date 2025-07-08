const express = require('express');
const WebSocket = require('ws');
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

class SSHProxyServer {
  constructor(port = 3000) {
    this.port = port;
    this.app = express();
    this.server = null;
    this.wss = null;
    this.connections = new Map();
    
    this.setupExpress();
    this.setupWebSocket();
  }

  setupExpress() {
    // 启用 CORS
    this.app.use(cors({
      origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
      credentials: true
    }));

    this.app.use(express.json());
    this.app.use(express.static('public'));

    // 健康检查端点
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        connections: this.connections.size,
        timestamp: new Date().toISOString()
      });
    });

    // 获取连接状态
    this.app.get('/connections', (req, res) => {
      const connectionList = Array.from(this.connections.entries()).map(([id, conn]) => ({
        id,
        host: conn.config?.host,
        username: conn.config?.username,
        connected: conn.sshClient?.connected || false,
        createdAt: conn.createdAt
      }));
      
      res.json({ connections: connectionList });
    });
  }

  setupWebSocket() {
    this.server = require('http').createServer(this.app);
    this.wss = new WebSocket.Server({ 
      server: this.server,
      path: '/ssh',
      perMessageDeflate: false
    });

    this.wss.on('connection', (ws, req) => {
      const connectionId = this.generateConnectionId();
      console.log(`新的 WebSocket 连接: ${connectionId}`);

      const connection = {
        id: connectionId,
        ws,
        sshClient: null,
        stream: null,
        config: null,
        createdAt: new Date().toISOString(),
        lastActivity: Date.now()
      };

      this.connections.set(connectionId, connection);

      // 发送连接确认
      ws.send(JSON.stringify({
        type: 'websocket_connected',
        connectionId
      }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(connectionId, data);
        } catch (error) {
          console.error('解析消息失败:', error);
          this.sendError(ws, '消息格式错误');
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket 连接关闭: ${connectionId}`);
        this.cleanupConnection(connectionId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket 错误 ${connectionId}:`, error);
        this.cleanupConnection(connectionId);
      });

      // 心跳检测
      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(heartbeat);
        }
      }, 30000);

      ws.on('pong', () => {
        connection.lastActivity = Date.now();
      });
    });
  }

  handleMessage(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      console.error('连接不存在:', connectionId);
      return;
    }

    connection.lastActivity = Date.now();

    switch (data.type) {
      case 'connect':
        this.handleSSHConnect(connection, data.config);
        break;
      
      case 'input':
        this.handleInput(connection, data.data);
        break;
      
      case 'execute_command':
        this.handleExecuteCommand(connection, data.command, data.commandId);
        break;
      
      case 'disconnect':
        this.handleDisconnect(connection);
        break;
      
      case 'ping':
        this.sendMessage(connection.ws, { type: 'pong' });
        break;
      
      default:
        console.warn('未知消息类型:', data.type);
    }
  }

  async handleSSHConnect(connection, config) {
    try {
      console.log(`开始 SSH 连接到 ${config.username}@${config.host}:${config.port}`);
      
      connection.config = config;
      connection.sshClient = new Client();

      const connectOptions = {
        host: config.host,
        port: config.port || 22,
        username: config.username,
        readyTimeout: 20000,
        keepaliveInterval: 30000
      };

      // 处理认证方式
      if (config.privateKey) {
        // 私钥认证
        connectOptions.privateKey = this.processPrivateKey(config.privateKey);
      } else if (config.password) {
        // 密码认证
        connectOptions.password = config.password;
      } else {
        throw new Error('需要提供私钥或密码');
      }

      connection.sshClient.on('ready', () => {
        console.log(`SSH 连接成功: ${config.username}@${config.host}`);
        
        connection.sshClient.shell((err, stream) => {
          if (err) {
            console.error('创建 shell 失败:', err);
            this.sendError(connection.ws, `创建 shell 失败: ${err.message}`);
            return;
          }

          connection.stream = stream;

          // 监听 shell 输出
          stream.on('data', (data) => {
            this.sendMessage(connection.ws, {
              type: 'data',
              content: data.toString()
            });
          });

          stream.on('close', () => {
            console.log('SSH shell 关闭');
            this.sendMessage(connection.ws, {
              type: 'disconnected',
              message: 'SSH shell 已关闭'
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
            message: 'SSH 连接成功'
          });
        });
      });

      connection.sshClient.on('error', (err) => {
        console.error('SSH 连接错误:', err);
        this.sendError(connection.ws, `SSH 连接失败: ${err.message}`);
      });

      connection.sshClient.on('close', () => {
        console.log('SSH 连接关闭');
        this.sendMessage(connection.ws, {
          type: 'disconnected',
          message: 'SSH 连接已关闭'
        });
      });

      // 开始连接
      connection.sshClient.connect(connectOptions);

    } catch (error) {
      console.error('SSH 连接设置失败:', error);
      this.sendError(connection.ws, `连接失败: ${error.message}`);
    }
  }

  handleInput(connection, data) {
    if (connection.stream) {
      connection.stream.write(data);
    }
  }

  async handleExecuteCommand(connection, command, commandId) {
    if (!connection.sshClient) {
      this.sendError(connection.ws, 'SSH 连接未建立');
      return;
    }

    try {
      connection.sshClient.exec(command, (err, stream) => {
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
        }, 60000); // 60秒超时
      });
    } catch (error) {
      this.sendMessage(connection.ws, {
        type: 'command_error',
        commandId,
        message: error.message
      });
    }
  }

  handleDisconnect(connection) {
    if (connection.sshClient) {
      connection.sshClient.end();
    }
  }

  processPrivateKey(privateKeyContent) {
    try {
      // 确保私钥格式正确
      let key = privateKeyContent.trim();
      
      // 如果不是以 -----BEGIN 开头，尝试添加头部
      if (!key.startsWith('-----BEGIN')) {
        key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
      }
      
      // 确保换行符正确
      key = key.replace(/\\n/g, '\n');
      
      return key;
    } catch (error) {
      console.error('处理私钥失败:', error);
      throw new Error('私钥格式错误');
    }
  }

  sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws, message) {
    this.sendMessage(ws, {
      type: 'error',
      message
    });
  }

  cleanupConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      if (connection.sshClient) {
        connection.sshClient.end();
      }
      this.connections.delete(connectionId);
    }
  }

  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 清理超时连接
  startCleanupTimer() {
    setInterval(() => {
      const now = Date.now();
      const timeout = 30 * 60 * 1000; // 30分钟超时

      for (const [id, connection] of this.connections.entries()) {
        if (now - connection.lastActivity > timeout) {
          console.log(`清理超时连接: ${id}`);
          this.cleanupConnection(id);
        }
      }
    }, 5 * 60 * 1000); // 每5分钟检查一次
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, (err) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`🚀 SSH 代理服务器启动成功`);
        console.log(`📡 HTTP 服务器: http://localhost:${this.port}`);
        console.log(`🔌 WebSocket 服务器: ws://localhost:${this.port}/ssh`);
        console.log(`💾 活跃连接数: ${this.connections.size}`);

        this.startCleanupTimer();
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      // 关闭所有连接
      for (const [id, connection] of this.connections.entries()) {
        this.cleanupConnection(id);
      }

      if (this.wss) {
        this.wss.close();
      }

      if (this.server) {
        this.server.close(() => {
          console.log('SSH 代理服务器已关闭');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const server = new SSHProxyServer(3000);
  
  server.start().catch((error) => {
    console.error('启动服务器失败:', error);
    process.exit(1);
  });

  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log('\n收到 SIGINT 信号，正在关闭服务器...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n收到 SIGTERM 信号，正在关闭服务器...');
    await server.stop();
    process.exit(0);
  });
}

module.exports = SSHProxyServer; 