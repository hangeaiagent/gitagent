# 2025年7月9日 - API授权与CORS问题排查总结

## 核心问题
前端应用在调用Claude API时，持续遇到 `401 Unauthorized` 错误和CORS（跨域资源共享）策略阻止的问题。

## 问题演变与排查过程

### 1. 初始错误：`401 Unauthorized - invalid x-api-key`

- **现象**: 浏览器控制台报错，提示API请求因`invalid x-api-key`而未获授权。
- **分析**: 初步判断为API密钥未正确传递给Claude服务器。

### 2. 第一次尝试（错误方向）：修改为直接调用API

- **操作**: 将前端 `claudeService.ts` 中的API地址从相对路径 `/anthropic-api/v1/messages` 修改为绝对路径 `https://api.anthropic.com/v1/messages`。
- **结果**: 导致了新的问题——**CORS错误**。浏览器出于安全策略，阻止了从 `http://44.203.197.203` 到 `https://api.anthropic.com` 的跨域 `fetch` 请求。

### 3. 第二次尝试：恢复代理并修复CORS

- **思路**: 认识到必须通过后端代理来绕过浏览器CORS限制。
- **操作**:
    1. 将 `claudeService.ts` 恢复为使用相对路径 `/anthropic-api/v1/messages`。
    2. 修改服务器上的Nginx配置 (`nginx_productmind.conf`)，为 `/anthropic-api/` 路径添加CORS头部支持，特别是处理浏览器的 `OPTIONS` 预检请求。
- **结果**: CORS问题解决，但 `401 Unauthorized` 错误再次出现。这表明请求虽然通过了CORS检查，但代理服务器未能将关键的认证信息正确转发。

### 4. 第三次尝试（最终解决方案）：修复Nginx头部转发

- **根本原因分析**: Nginx默认不会转发包含下划线（`_`）的HTTP头部，例如前端发送的 `x-api-key`。这是为了防止CGI应用中的变量名冲突。
- **最终操作**:
    - 在Nginx配置的 `/anthropic-api/` location块中，**明确设置**要传递给后端（Claude API）的头部：
      ```nginx
      location /anthropic-api/ {
          # ... 其他配置 ...
          
          # 明确传递必要的头部给Claude API
          proxy_set_header x-api-key $http_x_api_key;
          proxy_set_header anthropic-version $http_anthropic_version;
          proxy_set_header Content-Type 'application/json';

          # ... 其他配置 ...
      }
      ```
- **结果**: `401 Unauthorized` 错误彻底解决。Nginx现在能够正确地将API密钥等认证信息从前端请求中提取出来，并附加到对Claude API的代理请求中。

## 辅助问题
- **构建失败**: 在排查过程中，服务器上的Vite构建多次失败。
- **原因**: 服务器上的 `realExecutionEngine.ts` 文件版本过旧，包含了与浏览器不兼容的Node.js模块（如 `child_process`）。
- **解决**: 通过 `scp` 命令将本地最新的、已移除Node.js依赖的文件版本上传并覆盖了服务器上的旧文件，解决了构建问题。

## 最终结论
问题的根源在于Nginx代理未能正确传递自定义的HTTP认证头部。通过修改Nginx配置，强制转发 `x-api-key` 和 `anthropic-version` 头部，成功解决了API的`401`授权问题。整个过程也凸显了处理CORS和代理配置时细节的重要性。 