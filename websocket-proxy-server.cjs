const WebSocket = require('ws');
const net = require('net');
const express = require('express');
const cors = require('cors');

const app = express();
const HTTP_PORT = 3001;
const WS_PORT = 3002;

// 中间件
app.use(cors());
app.use(express.json());

// WebSocket服务器用于SSH连接代理
const wss = new WebSocket.Server({ port: WS_PORT });

console.log(`WebSocket代理服务器已启动，监听端口 ${WS_PORT}`);

// WebSocket连接处理
wss.on('connection', (ws, req) => {
  console.log('新的WebSocket连接已建立');
  
  let tcpSocket = null;
  let isConnected = false;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'connect') {
        // 建立到SSH服务器的TCP连接
        const { host, port = 22 } = data;
        
        tcpSocket = net.createConnection({ host, port }, () => {
          console.log(`已连接到SSH服务器 ${host}:${port}`);
          isConnected = true;
          ws.send(JSON.stringify({ type: 'connected' }));
        });

        tcpSocket.on('data', (data) => {
          // 将SSH服务器的数据转发到浏览器
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
              type: 'data', 
              data: Array.from(data) // 转换为数组以便JSON序列化
            }));
          }
        });

        tcpSocket.on('error', (error) => {
          console.error('TCP连接错误:', error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', error: error.message }));
          }
        });

        tcpSocket.on('close', () => {
          console.log('TCP连接已关闭');
          isConnected = false;
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'disconnected' }));
          }
        });

      } else if (data.type === 'data' && tcpSocket && isConnected) {
        // 将浏览器的数据转发到SSH服务器
        const buffer = Buffer.from(data.data);
        tcpSocket.write(buffer);
      }
      
    } catch (error) {
      console.error('消息处理错误:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket连接已关闭');
    if (tcpSocket) {
      tcpSocket.destroy();
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
    if (tcpSocket) {
      tcpSocket.destroy();
    }
  });
});

// HTTP服务器用于健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      http: HTTP_PORT,
      websocket: WS_PORT
    }
  });
});

app.listen(HTTP_PORT, () => {
  console.log(`HTTP健康检查服务器已启动，监听端口 ${HTTP_PORT}`);
  console.log(`健康检查: http://localhost:${HTTP_PORT}/health`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  wss.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  wss.close();
  process.exit(0);
});