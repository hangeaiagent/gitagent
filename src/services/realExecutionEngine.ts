import { DeploymentLog, ExecutionResult, CommandExecution } from '../types/deployment';
import { logSSH } from './loggerService';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  password?: string;
  keyPath?: string;
}

export interface ExecutionOptions {
  timeout?: number;
  retries?: number;
  workingDirectory?: string;
  environment?: Record<string, string>;
  sudo?: boolean;
}

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  command: string;
}

export class RealExecutionEngine {
  private sshConfig: SSHConfig;
  private onLog: (log: DeploymentLog) => void;
  private executionHistory: CommandExecution[] = [];

  constructor(sshConfig: SSHConfig, onLog: (log: DeploymentLog) => void) {
    this.sshConfig = sshConfig;
    this.onLog = onLog;
  }

  /**
   * 执行单个命令
   */
  async executeCommand(
    command: string, 
    options: ExecutionOptions = {}
  ): Promise<CommandResult> {
    const startTime = Date.now();
    const execution: CommandExecution = {
      id: Date.now().toString(),
      command,
      startTime: new Date(),
      status: 'running',
      retries: 0,
      maxRetries: options.retries || 3
    };

    this.executionHistory.push(execution);
    
    this.onLog({
      id: execution.id,
      timestamp: new Date(),
      level: 'info',
      message: `🔧 执行命令: ${command}`,
      details: `工作目录: ${options.workingDirectory || 'default'}`,
      agentName: 'ExecutionEngine'
    });

    try {
      const result = await this.executeSSHCommand(command, options);
      
      execution.status = result.success ? 'completed' : 'failed';
      execution.endTime = new Date();
      execution.result = result;
      execution.executionTime = Date.now() - startTime;

      if (result.success) {
        this.onLog({
          id: execution.id,
          timestamp: new Date(),
          level: 'success',
          message: `✅ 命令执行成功: ${command}`,
          details: result.stdout ? `输出: ${result.stdout.slice(0, 200)}...` : '无输出',
          agentName: 'ExecutionEngine'
        });
      } else {
        this.onLog({
          id: execution.id,
          timestamp: new Date(),
          level: 'error',
          message: `❌ 命令执行失败: ${command}`,
          details: `错误: ${result.stderr}`,
          agentName: 'ExecutionEngine'
        });
      }

      return result;
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error instanceof Error ? error.message : '未知错误';
      execution.executionTime = Date.now() - startTime;

      this.onLog({
        id: execution.id,
        timestamp: new Date(),
        level: 'error',
        message: `💥 命令执行异常: ${command}`,
        details: execution.error,
        agentName: 'ExecutionEngine'
      });

      return {
        success: false,
        stdout: '',
        stderr: execution.error,
        exitCode: -1,
        executionTime: execution.executionTime,
        command
      };
    }
  }

  /**
   * 批量执行命令序列
   */
  async executeCommandSequence(
    commands: string[],
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const results: CommandResult[] = [];
    let totalSuccess = 0;
    let totalFailed = 0;
    const startTime = Date.now();

    this.onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: `🚀 开始批量执行 ${commands.length} 个命令`,
      agentName: 'ExecutionEngine'
    });

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const result = await this.executeCommand(command, options);
      results.push(result);

      if (result.success) {
        totalSuccess++;
      } else {
        totalFailed++;
        
        // 尝试自动修复
        const fixResult = await this.attemptAutoFix(command, result, options);
        if (fixResult.success) {
          results[results.length - 1] = fixResult;
          totalSuccess++;
          totalFailed--;
        } else {
          // 如果修复失败，询问是否继续
          const shouldContinue = await this.handleExecutionFailure(command, result, i, commands.length);
          if (!shouldContinue) {
            break;
          }
        }
      }
    }

    const totalTime = Date.now() - startTime;
    const executionResult: ExecutionResult = {
      success: totalFailed === 0,
      totalCommands: commands.length,
      successCount: totalSuccess,
      failedCount: totalFailed,
      executionTime: totalTime,
      results,
      summary: `执行完成: ${totalSuccess}/${commands.length} 成功`
    };

    this.onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: executionResult.success ? 'success' : 'warning',
      message: `📊 批量执行完成: ${executionResult.summary}`,
      details: `总耗时: ${(totalTime / 1000).toFixed(2)}s`,
      agentName: 'ExecutionEngine'
    });

    return executionResult;
  }

  /**
   * 通过SSH执行命令 (使用SSH代理服务器)
   */
  private async executeSSHCommand(
    command: string,
    options: ExecutionOptions = {}
  ): Promise<CommandResult> {
    const timeout = options.timeout || 30000;
    const workingDir = options.workingDirectory || '~';
    const sudoPrefix = options.sudo ? 'sudo ' : '';
    
    const startTime = Date.now();

    try {
      // 构建要执行的远程命令
      let remoteCommand = `cd ${workingDir}`;
      
      if (options.environment) {
        const envVars = Object.entries(options.environment)
          .map(([key, value]) => `export ${key}="${value}"`)
          .join(' && ');
        remoteCommand += ` && ${envVars}`;
      }
      
      remoteCommand += ` && ${sudoPrefix}${command}`;

      // 通过SSH代理服务器执行命令
      const response = await fetch('http://localhost:3000/api/ssh/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            host: this.sshConfig.host,
            port: this.sshConfig.port,
            username: this.sshConfig.username,
            sshKey: this.sshConfig.privateKey,
            keyPath: this.sshConfig.keyPath
          },
          command: remoteCommand,
          timeout
        }),
        signal: AbortSignal.timeout(timeout)
      });

      if (!response.ok) {
        throw new Error(`SSH API请求失败: ${response.statusText}`);
      }

      const result = await response.json();
      const executionTime = Date.now() - startTime;

      // 记录SSH执行日志
      logSSH(command, {
        success: result.success,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode || (result.success ? 0 : 1),
        executionTime
      }, this.sshConfig.host, this.sshConfig.username);

      return {
        success: result.success,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode || (result.success ? 0 : 1),
        executionTime,
        command
      };
    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      // 记录SSH执行失败日志
      logSSH(command, {
        success: false,
        stdout: '',
        stderr: errorMessage,
        exitCode: -1,
        executionTime
      }, this.sshConfig.host, this.sshConfig.username);
      
      return {
        success: false,
        stdout: '',
        stderr: errorMessage,
        exitCode: -1,
        executionTime,
        command
      };
    }
  }

  /**
   * 尝试自动修复命令执行失败
   */
  private async attemptAutoFix(
    command: string,
    result: CommandResult,
    options: ExecutionOptions
  ): Promise<CommandResult> {
    this.onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: `🔧 尝试自动修复命令: ${command}`,
      details: `错误信息: ${result.stderr}`,
      agentName: 'AutoFixer'
    });

    // 常见错误的自动修复策略
    const fixStrategies = [
      {
        pattern: /permission denied|Operation not permitted/i,
        fix: () => this.executeCommand(`sudo ${command}`, options)
      },
      {
        pattern: /command not found/i,
        fix: () => this.fixCommandNotFound(command, options)
      },
      {
        pattern: /No such file or directory/i,
        fix: () => this.fixFileNotFound(command, options)
      },
      {
        pattern: /port.*already in use/i,
        fix: () => this.fixPortInUse(command, options)
      },
      {
        pattern: /package.*not found/i,
        fix: () => this.fixPackageNotFound(command, options)
      }
    ];

    for (const strategy of fixStrategies) {
      if (strategy.pattern.test(result.stderr)) {
        try {
          const fixResult = await strategy.fix();
          if (fixResult.success) {
            this.onLog({
              id: Date.now().toString(),
              timestamp: new Date(),
              level: 'success',
              message: `✅ 自动修复成功: ${command}`,
              agentName: 'AutoFixer'
            });
            return fixResult;
          }
        } catch (error) {
          this.onLog({
            id: Date.now().toString(),
            timestamp: new Date(),
            level: 'warning',
            message: `⚠️ 自动修复失败: ${command}`,
            details: error instanceof Error ? error.message : '未知错误',
            agentName: 'AutoFixer'
          });
        }
      }
    }

    return result; // 无法修复，返回原始结果
  }

  /**
   * 修复命令未找到错误
   */
  private async fixCommandNotFound(command: string, options: ExecutionOptions): Promise<CommandResult> {
    const cmd = command.split(' ')[0];
    
    // 常见命令的安装映射
    const installMap: Record<string, string> = {
      'node': 'curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs',
      'npm': 'sudo apt-get install -y npm',
      'git': 'sudo apt-get install -y git',
      'curl': 'sudo apt-get install -y curl',
      'wget': 'sudo apt-get install -y wget',
      'python3': 'sudo apt-get install -y python3',
      'pip3': 'sudo apt-get install -y python3-pip',
      'docker': 'curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh',
      'pm2': 'sudo npm install -g pm2'
    };

    if (installMap[cmd]) {
      // 先安装依赖
      await this.executeCommand('sudo apt-get update', options);
      const installResult = await this.executeCommand(installMap[cmd], options);
      
      if (installResult.success) {
        // 重新执行原命令
        return await this.executeCommand(command, options);
      }
    }

    return {
      success: false,
      stdout: '',
      stderr: `无法自动安装命令: ${cmd}`,
      exitCode: -1,
      executionTime: 0,
      command
    };
  }

  /**
   * 修复文件未找到错误
   */
  private async fixFileNotFound(command: string, options: ExecutionOptions): Promise<CommandResult> {
    // 尝试创建必要的目录
    const pathMatch = command.match(/([\/\w\-\.]+)/g);
    if (pathMatch) {
      for (const path of pathMatch) {
        if (path.includes('/') && !path.includes(' ')) {
          const dirPath = path.substring(0, path.lastIndexOf('/'));
          if (dirPath) {
            await this.executeCommand(`mkdir -p ${dirPath}`, options);
          }
        }
      }
    }

    // 重新执行原命令
    return await this.executeCommand(command, options);
  }

  /**
   * 修复端口占用错误
   */
  private async fixPortInUse(command: string, options: ExecutionOptions): Promise<CommandResult> {
    const portMatch = command.match(/:(\d+)/);
    if (portMatch) {
      const port = portMatch[1];
      await this.executeCommand(`sudo fuser -k ${port}/tcp`, options);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待端口释放
    }

    return await this.executeCommand(command, options);
  }

  /**
   * 修复包未找到错误
   */
  private async fixPackageNotFound(command: string, options: ExecutionOptions): Promise<CommandResult> {
    // 更新包管理器
    await this.executeCommand('sudo apt-get update', options);
    
    // 重新执行原命令
    return await this.executeCommand(command, options);
  }

  /**
   * 处理执行失败
   */
  private async handleExecutionFailure(
    command: string,
    result: CommandResult,
    currentIndex: number,
    totalCommands: number
  ): Promise<boolean> {
    this.onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'error',
      message: `❌ 命令执行失败且无法自动修复: ${command}`,
      details: `进度: ${currentIndex + 1}/${totalCommands}`,
      agentName: 'ExecutionEngine'
    });

    // 这里可以添加用户交互逻辑
    // 目前默认继续执行
    return true;
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(): CommandExecution[] {
    return this.executionHistory;
  }

  /**
   * 清除执行历史
   */
  clearExecutionHistory(): void {
    this.executionHistory = [];
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.executeCommand('echo "health check"', { timeout: 5000 });
      return result.success;
    } catch (error) {
      return false;
    }
  }
} 