import { DeploymentLog } from '../types/deployment';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  details?: string;
  agentName?: string;
  category?: string;
  metadata?: Record<string, any>;
  source: 'frontend' | 'backend' | 'ssh';
}

export interface LoggerConfig {
  enableConsole: boolean;
  enableRemote: boolean;
  enableStorage: boolean;
  maxLogEntries: number;
  logLevel: LogLevel;
  remoteEndpoint?: string;
}

export class LoggerService {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private listeners: ((log: LogEntry) => void)[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enableConsole: true,
      enableRemote: true,
      enableStorage: true,
      maxLogEntries: 1000,
      logLevel: LogLevel.INFO,
      ...config
    };
  }

  /**
   * 记录日志
   */
  log(
    level: LogLevel,
    message: string,
    details?: string,
    agentName?: string,
    category?: string,
    metadata?: Record<string, any>
  ): void {
    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      message,
      details,
      agentName,
      category,
      metadata,
      source: 'frontend'
    };

    this.addLogEntry(logEntry);
  }

  /**
   * SSH执行日志
   */
  logSSHExecution(
    command: string,
    result: {
      success: boolean;
      stdout: string;
      stderr: string;
      exitCode: number;
      executionTime: number;
    },
    host: string,
    username: string
  ): void {
    const level = result.success ? LogLevel.SUCCESS : LogLevel.ERROR;
    const message = result.success 
      ? `✅ SSH命令执行成功: ${command}`
      : `❌ SSH命令执行失败: ${command}`;

    const details = result.success
      ? `输出: ${result.stdout.slice(0, 200)}${result.stdout.length > 200 ? '...' : ''}`
      : `错误: ${result.stderr}`;

    this.addLogEntry({
      id: this.generateId(),
      timestamp: new Date(),
      level,
      message,
      details,
      agentName: 'SSHExecutor',
      category: 'ssh_execution',
      metadata: {
        command,
        host,
        username,
        exitCode: result.exitCode,
        executionTime: result.executionTime,
        stdout: result.stdout,
        stderr: result.stderr
      },
      source: 'ssh'
    });
  }

  /**
   * 连接日志
   */
  logConnection(
    type: 'connect' | 'disconnect' | 'error',
    host: string,
    username: string,
    port: number,
    details?: string
  ): void {
    const levelMap = {
      connect: LogLevel.SUCCESS,
      disconnect: LogLevel.INFO,
      error: LogLevel.ERROR
    };

    const messageMap = {
      connect: `🔗 SSH连接成功: ${username}@${host}:${port}`,
      disconnect: `🔌 SSH连接断开: ${username}@${host}:${port}`,
      error: `💥 SSH连接失败: ${username}@${host}:${port}`
    };

    this.addLogEntry({
      id: this.generateId(),
      timestamp: new Date(),
      level: levelMap[type],
      message: messageMap[type],
      details,
      agentName: 'ConnectionManager',
      category: 'connection',
      metadata: {
        host,
        username,
        port,
        type
      },
      source: 'backend'
    });
  }

  /**
   * 部署步骤日志
   */
  logDeploymentStep(
    stepName: string,
    status: 'start' | 'progress' | 'success' | 'error',
    details?: string,
    progress?: number
  ): void {
    const levelMap = {
      start: LogLevel.INFO,
      progress: LogLevel.INFO,
      success: LogLevel.SUCCESS,
      error: LogLevel.ERROR
    };

    const iconMap = {
      start: '🚀',
      progress: '⏳',
      success: '✅',
      error: '❌'
    };

    const message = `${iconMap[status]} ${stepName}`;

    this.addLogEntry({
      id: this.generateId(),
      timestamp: new Date(),
      level: levelMap[status],
      message,
      details,
      agentName: 'DeploymentManager',
      category: 'deployment',
      metadata: {
        stepName,
        status,
        progress
      },
      source: 'frontend'
    });
  }

  /**
   * 添加日志条目
   */
  private addLogEntry(logEntry: LogEntry): void {
    // 检查日志级别
    if (!this.shouldLog(logEntry.level)) {
      return;
    }

    // 添加到内存存储
    this.logs.push(logEntry);

    // 限制日志数量
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs.shift();
    }

    // 控制台输出
    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    // 本地存储
    if (this.config.enableStorage) {
      this.logToStorage(logEntry);
    }

    // 远程发送
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.logToRemote(logEntry);
    }

    // 通知监听器
    this.listeners.forEach(listener => listener(logEntry));
  }

  /**
   * 检查是否应该记录该级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    const levelOrder = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.SUCCESS,
      LogLevel.WARNING,
      LogLevel.ERROR,
      LogLevel.CRITICAL
    ];

    const currentLevelIndex = levelOrder.indexOf(this.config.logLevel);
    const logLevelIndex = levelOrder.indexOf(level);

    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * 控制台输出
   */
  private logToConsole(logEntry: LogEntry): void {
    const prefix = `[${logEntry.timestamp.toLocaleTimeString()}] [${logEntry.level.toUpperCase()}]`;
    const message = `${prefix} ${logEntry.message}`;

    switch (logEntry.level) {
      case LogLevel.DEBUG:
        console.debug(message, logEntry.details);
        break;
      case LogLevel.INFO:
        console.info(message, logEntry.details);
        break;
      case LogLevel.SUCCESS:
        console.log(`%c${message}`, 'color: green', logEntry.details);
        break;
      case LogLevel.WARNING:
        console.warn(message, logEntry.details);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(message, logEntry.details);
        break;
    }
  }

  /**
   * 本地存储
   */
  private logToStorage(logEntry: LogEntry): void {
    try {
      const storageKey = 'gitagent_logs';
      const storedLogs = localStorage.getItem(storageKey);
      const logs = storedLogs ? JSON.parse(storedLogs) : [];
      
      logs.push({
        ...logEntry,
        timestamp: logEntry.timestamp.toISOString()
      });

      // 限制存储数量
      if (logs.length > 500) {
        logs.splice(0, logs.length - 500);
      }

      localStorage.setItem(storageKey, JSON.stringify(logs));
    } catch (error) {
      console.error('日志存储失败:', error);
    }
  }

  /**
   * 远程发送
   */
  private async logToRemote(logEntry: LogEntry): Promise<void> {
    try {
      if (!this.config.remoteEndpoint) return;

      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...logEntry,
          timestamp: logEntry.timestamp.toISOString()
        })
      });
    } catch (error) {
      console.error('远程日志发送失败:', error);
    }
  }

  /**
   * 添加日志监听器
   */
  addListener(listener: (log: LogEntry) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除日志监听器
   */
  removeListener(listener: (log: LogEntry) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 获取所有日志
   */
  getAllLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 按类别获取日志
   */
  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * 按级别获取日志
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * 按时间范围获取日志
   */
  getLogsByTimeRange(start: Date, end: Date): LogEntry[] {
    return this.logs.filter(log => 
      log.timestamp >= start && log.timestamp <= end
    );
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('gitagent_logs');
  }

  /**
   * 导出日志
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 转换为DeploymentLog格式
   */
  toDeploymentLog(logEntry: LogEntry): DeploymentLog {
    return {
      id: logEntry.id,
      timestamp: logEntry.timestamp,
      level: logEntry.level as any,
      message: logEntry.message,
      details: logEntry.details,
      agentName: logEntry.agentName
    };
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 全局日志服务实例
export const logger = new LoggerService({
  enableConsole: true,
  enableRemote: true,
  enableStorage: true,
  maxLogEntries: 1000,
  logLevel: LogLevel.INFO,
  remoteEndpoint: 'http://localhost:3000/api/logs'
});

// 便捷方法
export const logInfo = (message: string, details?: string, agentName?: string) => 
  logger.log(LogLevel.INFO, message, details, agentName);

export const logSuccess = (message: string, details?: string, agentName?: string) => 
  logger.log(LogLevel.SUCCESS, message, details, agentName);

export const logWarning = (message: string, details?: string, agentName?: string) => 
  logger.log(LogLevel.WARNING, message, details, agentName);

export const logError = (message: string, details?: string, agentName?: string) => 
  logger.log(LogLevel.ERROR, message, details, agentName);

export const logSSH = (command: string, result: any, host: string, username: string) =>
  logger.logSSHExecution(command, result, host, username);

export const logConnection = (type: 'connect' | 'disconnect' | 'error', host: string, username: string, port: number, details?: string) =>
  logger.logConnection(type, host, username, port, details);

export const logDeployment = (stepName: string, status: 'start' | 'progress' | 'success' | 'error', details?: string, progress?: number) =>
  logger.logDeploymentStep(stepName, status, details, progress); 