GitAgent SSH 终端部署系统 - 本地启动指南
�� 前置条件检查
# 检查 Node.js 版本 (需要 v16+)
node --version

# 检查 npm 版本
npm --version
�� 安装依赖 (如果还没安装)
# 进入项目目录
cd C:\AI\gitagent

# 安装所有依赖
npm install
🎯 启动方式
方式一：一键启动 (推荐)
node demo-start.js
方式二：分别启动
# 1. 启动 SSH 代理服务器 (后台)
npm run ssh-proxy

# 2. 新开一个终端，启动前端开发服务器
npm run dev
方式三：并发启动
# 同时启动前端和SSH代理
npm run dev-with-proxy
🌐 访问地址
启动成功后，您可以通过以下地址访问：
前端应用: http://localhost:5173
SSH代理服务: http://localhost:3001
�� 验证启动状态
# 检查端口占用情况
netstat -ano | findstr :5173
netstat -ano | findstr :3001

# 检查进程状态
tasklist | findstr node
��️ 故障排除
如果遇到问题，可以尝试：
# 清理缓存
npm cache clean --force

# 删除 node_modules 重新安装
rmdir /s node_modules
npm install

# 检查端口冲突
netstat -ano | findstr :5173
netstat -ano | findstr :3001
�� 使用说明
启动系统后，打开浏览器访问 http://localhost:5173
选择部署模式：
传统多代理模式：使用原有的智能部署功能
SSH终端模式：使用新的SSH终端功能
SSH终端模式配置：
服务器地址：3.93.149.236
用户名：ec2-user
私钥文件：选择您的 .pem 文件
端口：22
�� 安全说明
SSH私钥仅在浏览器本地处理，不会上传到服务器
所有SSH通信通过本地代理服务器进行
会话结束后自动清理敏感数据
�� 技术支持
如果遇到问题，请检查：
Node.js版本是否为v16+
端口5173和3001是否被占用
防火墙是否阻止了相关端口
网络连接是否正常
现在您可以按照上述命令启动系统了！建议先使用 node demo-start.js 一键启动方式。