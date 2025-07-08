# GitAgent SSH 终端部署系统 - 部署脚本

本目录包含了 GitAgent SSH 终端部署系统的完整部署脚本，支持一键安装、启动、停止和管理服务。

## 📁 脚本文件说明

| 脚本文件 | 功能描述 | 使用场景 |
|---------|---------|---------|
| `check-env.sh` | 环境检查 | 检查 Node.js、npm 版本和依赖状态 |
| `install.sh` | 安装依赖 | 自动安装项目依赖和配置环境 |
| `start.sh` | 启动服务 | 一键启动前端和SSH代理服务 |
| `stop.sh` | 停止服务 | 优雅停止所有服务 |
| `restart.sh` | 重启服务 | 重启所有服务 |
| `status.sh` | 状态检查 | 查看服务运行状态和端口占用 |
| `logs.sh` | 日志管理 | 查看和管理日志文件 |
| `help.sh` | 帮助文档 | 显示所有可用命令和使用说明 |

## 🚀 快速开始

### 1. 环境检查
```bash
./deploy/sh/check-env.sh
```

### 2. 安装依赖
```bash
./deploy/sh/install.sh
```

### 3. 启动服务
```bash
./deploy/sh/start.sh
```

### 4. 访问应用
打开浏览器访问：http://localhost:5173

## 📋 日常使用命令

### 启动服务
```bash
./deploy/sh/start.sh
```

### 查看状态
```bash
./deploy/sh/status.sh
```

### 查看日志
```bash
./deploy/sh/logs.sh
```

### 停止服务
```bash
./deploy/sh/stop.sh
```

### 重启服务
```bash
./deploy/sh/restart.sh
```

## 🔧 系统要求

- **Node.js**: v16+ 
- **npm**: v8+
- **端口**: 5173 (前端) 和 3001 (SSH代理) 可用
- **操作系统**: Linux/macOS/Windows (WSL)

## 📁 目录结构

```
deploy/sh/
├── check-env.sh    # 环境检查脚本
├── install.sh      # 安装脚本
├── start.sh        # 启动脚本
├── stop.sh         # 停止脚本
├── restart.sh      # 重启脚本
├── status.sh       # 状态检查脚本
├── logs.sh         # 日志管理脚本
├── help.sh         # 帮助文档脚本
└── README.md       # 说明文档
```

## 🌐 服务地址

- **前端应用**: http://localhost:5173
- **SSH代理服务**: http://localhost:3001

## 📝 日志文件

启动服务后，会在 `logs/` 目录下生成以下文件：

- `ssh-proxy.log` - SSH代理服务器日志
- `frontend.log` - 前端开发服务器日志
- `ssh-proxy.pid` - SSH代理服务器进程ID
- `frontend.pid` - 前端开发服务器进程ID

## 🔍 故障排除

### 1. 端口被占用
```bash
# 停止服务
./deploy/sh/stop.sh

# 或手动释放端口
netstat -tuln | grep :5173
netstat -tuln | grep :3001
```

### 2. 依赖问题
```bash
# 重新安装依赖
./deploy/sh/install.sh
```

### 3. 权限问题
```bash
# Linux/macOS 设置执行权限
chmod +x deploy/sh/*.sh
```

### 4. 查看错误日志
```bash
# 查看详细错误信息
./deploy/sh/logs.sh
```

## 🔐 安全说明

- SSH私钥仅在浏览器本地处理，不会上传到服务器
- 所有SSH通信通过本地代理服务器进行
- 会话结束后自动清理敏感数据

## 📞 技术支持

如果遇到问题，请检查：

1. Node.js版本是否为v16+
2. 端口5173和3001是否被占用
3. 防火墙是否阻止了相关端口
4. 网络连接是否正常
5. 查看日志文件获取详细错误信息

## 🎯 使用示例

### 首次部署
```bash
# 1. 环境检查
./deploy/sh/check-env.sh

# 2. 安装依赖
./deploy/sh/install.sh

# 3. 启动服务
./deploy/sh/start.sh

# 4. 访问应用
# 打开浏览器访问 http://localhost:5173
```

### 日常使用
```bash
# 启动服务
./deploy/sh/start.sh

# 查看状态
./deploy/sh/status.sh

# 查看日志
./deploy/sh/logs.sh

# 停止服务
./deploy/sh/stop.sh
```

## 📚 更多帮助

运行以下命令查看完整的帮助文档：

```bash
./deploy/sh/help.sh
```

---

**注意**: 在Windows系统上，建议使用WSL (Windows Subsystem for Linux) 来运行这些bash脚本，或者使用Git Bash等兼容的终端环境。 