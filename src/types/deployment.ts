export interface ServerConfig {
  host: string;
  port: number;
  username: string;
  sshKey: File | null;
}

export interface DeploymentConfig {
  githubUrl: string;
  serverConfig: ServerConfig;
  claudeApiKey?: string;
}

export interface DeploymentLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error' | 'agent' | 'user-input';
  message: string;
  details?: string;
  agentName?: string;
}

export interface UserPrompt {
  id: string;
  message: string;
  options?: string[];
  inputType: 'text' | 'select' | 'confirm';
  required: boolean;
}

export interface AgentAction {
  id: string;
  agentName: string;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retry';
  retryCount: number;
  maxRetries: number;
  result?: unknown;
  error?: string;
}

export interface DeploymentStatus {
  stage: 'idle' | 'connecting' | 'analyzing' | 'downloading' | 'installing' | 'testing' | 'completed' | 'failed' | 'waiting-input';
  progress: number;
  logs: DeploymentLog[];
  currentAgent?: string;
  activeAgents: AgentAction[];
  userPrompt?: UserPrompt;
  summary?: {
    projectType: string;
    deploymentPath: string;
    startCommand: string;
    accessUrl?: string;
    installedPackages: string[];
    deploymentTime: number;
  };
}

export interface ClaudeResponse {
  analysis?: string;
  commands?: string[];
  nextSteps?: string[];
  requiresUserInput?: boolean;
  userPrompt?: UserPrompt;
  error?: string;
}

// 新增：真实执行引擎相关类型
export interface CommandExecution {
  id: string;
  command: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'retrying';
  retries: number;
  maxRetries: number;
  result?: CommandResult;
  error?: string;
  executionTime?: number;
}

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  command: string;
}

export interface ExecutionResult {
  success: boolean;
  totalCommands: number;
  successCount: number;
  failedCount: number;
  executionTime: number;
  results: CommandResult[];
  summary: string;
}

export interface ErrorPattern {
  pattern: RegExp;
  description: string;
  autoFixable: boolean;
  fixStrategy?: string;
}

export interface DeploymentStep {
  id: string;
  name: string;
  description: string;
  commands: string[];
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: ExecutionResult;
  autoRetry: boolean;
  critical: boolean;
}

export interface DeploymentPlan {
  id: string;
  name: string;
  description: string;
  steps: DeploymentStep[];
  totalSteps: number;
  completedSteps: number;
  currentStep?: string;
  estimatedTime: number;
  actualTime?: number;
}

export interface SystemHealth {
  cpu: number;
  memory: number;
  disk: number;
  network: boolean;
  services: ServiceStatus[];
  timestamp: Date;
}

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  pid?: number;
  port?: number;
  uptime?: number;
  memory?: number;
  cpu?: number;
}