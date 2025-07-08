const express = require('express');
const WebSocket = require('ws');
const { Client } = require('ssh2');
const cors = require('cors');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server, path: '/ssh' });

// 启用 CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());

// 存储连接
const connections = new Map();

// WebSocket 连接处理
wss.on('connection', (ws) => {
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`新的 WebSocket 连接: ${connectionId}`);

  const connection = {
    id: connectionId,
    ws,
    sshClient: null,
    stream: null
  };

  connections.set(connectionId, connection);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      handleMessage(connection, data);
    } catch (error) {
      console.error('解析消息失败:', error);
      ws.send(JSON.stringify({ type: 'error', message: '消息格式错误' }));
    }
  });

  ws.on('close', () => {
    console.log(`WebSocket 连接关闭: ${connectionId}`);
    if (connection.sshClient) {
      connection.sshClient.end();
    }
    connections.delete(connectionId);
  });
});

function handleMessage(connection, data) {
  switch (data.type) {
    case 'connect':
      connectSSH(connection, data.config);
      break;
    case 'input':
      if (connection.stream) {
        connection.stream.write(data.data);
      }
      break;
    case 'execute_command':
      executeCommand(connection, data.command, data.commandId);
      break;
  }
}

function connectSSH(connection, config) {
  connection.sshClient = new Client();

  connection.sshClient.on('ready', () => {
    console.log(`SSH 连接成功: ${config.username}@${config.host}`);
    
    connection.sshClient.shell((err, stream) => {
      if (err) {
        connection.ws.send(JSON.stringify({
          type: 'error',
          message: `创建 shell 失败: ${err.message}`
        }));
        return;
      }

      connection.stream = stream;

      stream.on('data', (data) => {
        connection.ws.send(JSON.stringify({
          type: 'data',
          content: data.toString()
        }));
      });

      stream.on('close', () => {
        connection.ws.send(JSON.stringify({
          type: 'disconnected'
        }));
      });

      connection.ws.send(JSON.stringify({
        type: 'connected'
      }));
    });
  });

  connection.sshClient.on('error', (err) => {
    console.error('SSH 连接错误:', err);
    connection.ws.send(JSON.stringify({
      type: 'error',
      message: `SSH 连接失败: ${err.message}`
    }));
  });

  // 连接配置
  const connectOptions = {
    host: config.host,
    port: config.port || 22,
    username: config.username,
    readyTimeout: 20000
  };

  if (config.privateKey) {
    connectOptions.privateKey = config.privateKey;
  }

  connection.sshClient.connect(connectOptions);
}

function executeCommand(connection, command, commandId) {
  if (!connection.sshClient) {
    connection.ws.send(JSON.stringify({
      type: 'command_error',
      commandId,
      message: 'SSH 连接未建立'
    }));
    return;
  }

  connection.sshClient.exec(command, (err, stream) => {
    if (err) {
      connection.ws.send(JSON.stringify({
        type: 'command_error',
        commandId,
        message: err.message
      }));
      return;
    }

    let output = '';

    stream.on('data', (data) => {
      const content = data.toString();
      output += content;
      connection.ws.send(JSON.stringify({
        type: 'command_output',
        commandId,
        content
      }));
    });

    stream.on('close', (code) => {
      connection.ws.send(JSON.stringify({
        type: 'command_complete',
        commandId,
        exitCode: code,
        output
      }));
    });
  });
}

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 SSH 代理服务器启动在端口 ${PORT}`);
  console.log(`📡 WebSocket 地址: ws://localhost:${PORT}/ssh`);
});

module.exports = { app, server, wss }; 