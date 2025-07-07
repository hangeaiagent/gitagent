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
  result?: any;
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