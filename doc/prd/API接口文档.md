# GitAgent API 接口文档

## 概述

GitAgent 系统主要依赖 Claude API 进行智能分析和决策，同时包含内部服务接口用于部署流程管理。本文档详细描述了所有 API 接口的规范和使用方法。

## Claude API 接口

### 基础配置

**服务地址**: `/anthropic-api/v1/messages`  
**认证方式**: API Key  
**模型版本**: `claude-sonnet-4-20250514`  
**最大令牌**: 4000

### 请求头配置

```typescript
const headers = {
  'Content-Type': 'application/json',
  'x-api-key': apiKey,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true'
};
```

### 1. 项目分析接口

**方法**: `analyzeProject(githubUrl: string, serverInfo: any)`

#### 请求参数
```typescript
interface AnalyzeProjectRequest {
  githubUrl: string;        // GitHub 项目链接
  serverInfo: {             // 服务器信息
    host: string;
    port: number;
    username: string;
  };
}
```

#### 系统提示词
```
你是一个专业的DevOps智能体，负责分析GitHub项目并制定部署策略。
你需要：
1. 分析项目类型和技术栈
2. 确定所需的系统依赖
3. 制定部署步骤
4. 预测可能的问题和解决方案

请以JSON格式返回分析结果，包含：
- projectType: 项目类型
- techStack: 技术栈数组
- systemDependencies: 系统依赖数组
- deploymentSteps: 部署步骤数组
- potentialIssues: 潜在问题数组
- environmentRequirements: 环境要求
```

#### 响应格式
```typescript
interface ProjectAnalysis {
  projectType: string;           // 项目类型 (React, Vue, Node.js, Python等)
  techStack: string[];           // 技术栈列表
  systemDependencies: string[];  // 系统依赖
  deploymentSteps: string[];     // 部署步骤
  potentialIssues: string[];     // 潜在问题
  environmentRequirements: {     // 环境要求
    nodeVersion?: string;
    pythonVersion?: string;
    memory?: string;
    disk?: string;
  };
}
```

#### 示例响应
```json
{
  "projectType": "React",
  "techStack": ["React", "TypeScript", "Vite", "Tailwind CSS"],
  "systemDependencies": ["Node.js", "npm"],
  "deploymentSteps": [
    "克隆代码仓库",
    "安装依赖",
    "构建项目",
    "配置服务器",
    "启动应用"
  ],
  "potentialIssues": [
    "Node.js版本兼容性",
    "端口冲突",
    "权限问题"
  ],
  "environmentRequirements": {
    "nodeVersion": ">=18.0.0",
    "memory": ">=512MB"
  }
}
```

### 2. 部署命令生成接口

**方法**: `generateDeploymentCommands(projectAnalysis: any, currentStep: string)`

#### 请求参数
```typescript
interface GenerateCommandsRequest {
  projectAnalysis: ProjectAnalysis;  // 项目分析结果
  currentStep: string;               // 当前步骤
}
```

#### 系统提示词
```
你是一个Linux系统管理智能体，负责生成具体的部署命令。
基于项目分析结果，生成安全可靠的Shell命令序列。

请以JSON格式返回：
- commands: 命令数组
- description: 步骤描述
- expectedOutput: 预期输出
- errorHandling: 错误处理策略
```

#### 响应格式
```typescript
interface DeploymentCommands {
  commands: string[];           // 命令序列
  description: string;          // 步骤描述
  expectedOutput: string;       // 预期输出
  errorHandling: {              // 错误处理
    retryCount: number;
    fallbackCommands: string[];
    userGuidance: string;
  };
}
```

#### 示例响应
```json
{
  "commands": [
    "cd /home/ec2-user",
    "git clone https://github.com/user/project.git",
    "cd project",
    "npm install",
    "npm run build"
  ],
  "description": "克隆项目并安装依赖",
  "expectedOutput": "项目构建成功",
  "errorHandling": {
    "retryCount": 3,
    "fallbackCommands": [
      "npm cache clean --force",
      "rm -rf node_modules",
      "npm install"
    ],
    "userGuidance": "如果安装失败，请检查网络连接和Node.js版本"
  }
}
```

### 3. 错误分析接口

**方法**: `analyzeError(error: string, context: any, retryCount: number)`

#### 请求参数
```typescript
interface AnalyzeErrorRequest {
  error: string;              // 错误信息
  context: {                  // 上下文信息
    stage: string;
    commands: string[];
    serverInfo: any;
  };
  retryCount: number;         // 重试次数
}
```

#### 系统提示词
```
你是一个错误诊断和修复智能体。
分析部署过程中的错误，提供解决方案和用户指导。

请以JSON格式返回：
- errorType: 错误类型分类
- rootCause: 根本原因分析
- severity: 严重程度 (low/medium/high/critical)
- solution: 自动解决方案
- userGuidance: 用户指导说明
- alternativeCommands: 替代命令数组
- requiresUserInput: 是否需要用户输入
- userPrompt: 用户提示信息（如果需要）
- preventionTips: 预防建议
- estimatedFixTime: 预计修复时间（分钟）
```

#### 响应格式
```typescript
interface ErrorAnalysis {
  errorType: string;          // 错误类型
  rootCause: string;          // 根本原因
  severity: 'low' | 'medium' | 'high' | 'critical';
  solution: string;           // 解决方案
  userGuidance: string;       // 用户指导
  alternativeCommands: string[]; // 替代命令
  requiresUserInput: boolean; // 是否需要用户输入
  userPrompt?: UserPrompt;    // 用户提示
  preventionTips: string[];   // 预防建议
  estimatedFixTime: number;   // 预计修复时间（分钟）
}
```

#### 示例响应
```json
{
  "errorType": "PermissionError",
  "rootCause": "SSH密钥权限设置不正确",
  "severity": "high",
  "solution": "修改SSH密钥文件权限为600",
  "userGuidance": "请运行命令: chmod 600 /path/to/key.pem",
  "alternativeCommands": [
    "chmod 600 ~/.ssh/id_rsa",
    "ssh-add ~/.ssh/id_rsa"
  ],
  "requiresUserInput": true,
  "userPrompt": {
    "id": "permission-fix",
    "message": "需要修复SSH密钥权限，是否继续？",
    "inputType": "confirm",
    "required": true
  },
  "preventionTips": [
    "确保SSH密钥权限为600",
    "定期更新SSH密钥",
    "使用强密码保护密钥"
  ],
  "estimatedFixTime": 5
}
```

### 4. 部署问题诊断接口

**方法**: `analyzeDeploymentIssue(errorDetails: any, deploymentConfig: any, systemState: any)`

#### 请求参数
```typescript
interface AnalyzeIssueRequest {
  errorDetails: any;          // 错误详情
  deploymentConfig: DeploymentConfig; // 部署配置
  systemState: {              // 系统状态
    memory: string;
    disk: string;
    processes: string[];
  };
}
```

#### 系统提示词
```
你是一个部署问题诊断专家，负责分析复杂的部署问题并提供智能建议。

请以JSON格式返回：
- problemSummary: 问题总结
- possibleCauses: 可能原因数组
- recommendedActions: 推荐操作数组
- configurationSuggestions: 配置建议
- userInterventionNeeded: 是否需要用户干预
- riskAssessment: 风险评估
- nextSteps: 下一步操作建议
```

#### 响应格式
```typescript
interface IssueAnalysis {
  problemSummary: string;     // 问题总结
  possibleCauses: string[];   // 可能原因
  recommendedActions: string[]; // 推荐操作
  configurationSuggestions: {  // 配置建议
    serverConfig?: any;
    deploymentConfig?: any;
  };
  userInterventionNeeded: boolean; // 是否需要用户干预
  riskAssessment: {           // 风险评估
    level: 'low' | 'medium' | 'high';
    impact: string;
    mitigation: string;
  };
  nextSteps: string[];        // 下一步操作
}
```

### 5. 部署优化接口

**方法**: `optimizeDeployment(deploymentResult: any)`

#### 请求参数
```typescript
interface OptimizeRequest {
  deploymentResult: {         // 部署结果
    success: boolean;
    performance: any;
    configuration: any;
  };
}
```

#### 系统提示词
```
你是一个部署优化智能体，负责优化部署配置和性能。

请以JSON格式返回：
- optimizations: 优化建议数组
- performanceImprovements: 性能改进建议
- securityRecommendations: 安全建议
- monitoringSetup: 监控配置建议
```

#### 响应格式
```typescript
interface OptimizationResult {
  optimizations: string[];    // 优化建议
  performanceImprovements: {  // 性能改进
    suggestions: string[];
    expectedGains: string[];
  };
  securityRecommendations: string[]; // 安全建议
  monitoringSetup: {          // 监控配置
    metrics: string[];
    alerts: string[];
    tools: string[];
  };
}
```

## 内部服务接口

### DeploymentService 接口

#### 1. 执行部署

**方法**: `executeDeployment(config: DeploymentConfig, callbacks: DeploymentCallbacks)`

```typescript
interface DeploymentCallbacks {
  onLog: (log: DeploymentLog) => void;
  onProgress: (progress: number) => void;
  onUserPrompt: (prompt: UserPrompt) => void;
  onAgentUpdate: (agents: AgentAction[]) => void;
  onError?: (error: any, analysis?: any) => void;
}
```

#### 2. 创建智能体

**方法**: `createAgent(name: string, description: string): AgentAction`

```typescript
interface AgentAction {
  id: string;
  agentName: string;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retry';
  retryCount: number;
  maxRetries: number;
  result?: any;
  error?: string;
}
```

### 错误处理接口

#### 1. 错误重试机制

```typescript
interface RetryConfig {
  maxRetries: number;         // 最大重试次数
  retryDelay: number;         // 重试延迟（毫秒）
  backoffMultiplier: number;  // 退避倍数
}
```

#### 2. 错误恢复策略

```typescript
interface RecoveryStrategy {
  type: 'automatic' | 'manual' | 'hybrid';
  actions: string[];
  rollbackCommands?: string[];
  userConfirmation?: boolean;
}
```

## 数据模型

### 核心类型定义

```typescript
// 服务器配置
interface ServerConfig {
  host: string;
  port: number;
  username: string;
  sshKey: File | null;
}

// 部署配置
interface DeploymentConfig {
  githubUrl: string;
  serverConfig: ServerConfig;
  claudeApiKey?: string;
}

// 部署状态
interface DeploymentStatus {
  stage: 'idle' | 'connecting' | 'analyzing' | 'downloading' | 
         'installing' | 'testing' | 'completed' | 'failed' | 'waiting-input';
  progress: number;
  logs: DeploymentLog[];
  currentAgent?: string;
  activeAgents: AgentAction[];
  userPrompt?: UserPrompt;
  summary?: DeploymentSummary;
}

// 部署日志
interface DeploymentLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error' | 'agent' | 'user-input';
  message: string;
  details?: string;
  agentName?: string;
}

// 用户提示
interface UserPrompt {
  id: string;
  message: string;
  options?: string[];
  inputType: 'text' | 'select' | 'confirm';
  required: boolean;
}
```

## 错误码定义

### HTTP 状态码

- `200`: 成功
- `400`: 请求参数错误
- `401`: 认证失败
- `403`: 权限不足
- `404`: 资源不存在
- `429`: 请求频率限制
- `500`: 服务器内部错误
- `502`: 网关错误
- `503`: 服务不可用

### 业务错误码

```typescript
enum ErrorCode {
  // 配置错误
  INVALID_GITHUB_URL = 'E001',
  INVALID_SERVER_CONFIG = 'E002',
  MISSING_API_KEY = 'E003',
  INVALID_SSH_KEY = 'E004',
  
  // 连接错误
  SSH_CONNECTION_FAILED = 'E101',
  SERVER_UNREACHABLE = 'E102',
  AUTHENTICATION_FAILED = 'E103',
  
  // 部署错误
  PROJECT_ANALYSIS_FAILED = 'E201',
  DEPLOYMENT_FAILED = 'E202',
  COMMAND_EXECUTION_FAILED = 'E203',
  
  // AI 服务错误
  CLAUDE_API_ERROR = 'E301',
  ANALYSIS_TIMEOUT = 'E302',
  INVALID_RESPONSE = 'E303',
  
  // 系统错误
  UNKNOWN_ERROR = 'E999',
  NETWORK_ERROR = 'E998',
  TIMEOUT_ERROR = 'E997'
}
```

## 安全规范

### 1. 认证和授权

- 使用 API Key 进行身份验证
- 密钥存储在本地，不传输到服务器
- 支持密钥轮换和过期管理

### 2. 数据安全

- 敏感信息加密传输
- SSH 密钥安全处理
- 日志脱敏处理

### 3. 请求限制

- 频率限制：每分钟最多 60 次请求
- 并发限制：最多 10 个并发部署
- 超时设置：请求超时 30 秒

## 监控和日志

### 1. 请求日志

```typescript
interface RequestLog {
  timestamp: Date;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  userAgent: string;
  ipAddress: string;
}
```

### 2. 性能指标

- 响应时间统计
- 成功率监控
- 错误率统计
- 资源使用情况

### 3. 告警机制

- 错误率超过阈值告警
- 响应时间异常告警
- 服务不可用告警

## 版本控制

### API 版本策略

- 主版本号：不兼容的 API 变更
- 次版本号：向后兼容的功能性新增
- 修订号：向后兼容的问题修正

### 当前版本

- API 版本：v1.0.0
- 支持的最低客户端版本：v1.0.0
- 弃用计划：无

---

*API 文档版本：1.0*  
*更新时间：2024年7月8日*  
*维护者：GitAgent 开发团队* 