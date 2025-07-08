import { IterativeDeploymentController } from './iterativeDeploymentController';
import { RealExecutionEngine, SSHConfig } from './realExecutionEngine';
import { ClaudeService } from './claudeService';
import { 
  DeploymentConfig, 
  DeploymentLog, 
  AgentAction, 
  UserPrompt,
  DeploymentPlan,
  SystemHealth
} from '../types/deployment';

export class EnhancedDeploymentService {
  private deploymentController?: IterativeDeploymentController;
  private claudeService: ClaudeService;
  private agents: AgentAction[] = [];

  constructor(claudeApiKey: string) {
    this.claudeService = new ClaudeService(claudeApiKey);
  }

  /**
   * 执行真实的部署流程
   */
  async executeRealDeployment(
    config: DeploymentConfig,
    onLog: (log: DeploymentLog) => void,
    onProgress: (progress: number) => void,
    onUserPrompt: (prompt: UserPrompt) => void,
    onAgentUpdate: (agents: AgentAction[]) => void,
    onError?: (error: unknown, analysis?: unknown) => void
  ): Promise<boolean> {
    try {
      // 初始化智能体
      this.agents = [];
      this.createInitialAgents();
      onAgentUpdate([...this.agents]);

      // 准备SSH配置
      const sshConfig = await this.prepareSshConfig(config, onLog);
      if (!sshConfig) {
        throw new Error('SSH配置准备失败');
      }

      // 创建部署控制器
      this.deploymentController = new IterativeDeploymentController(
        sshConfig,
        config.claudeApiKey || '',
        onLog,
        onProgress
      );

      // 更新智能体状态
      this.updateAgentStatus('ConnectionAgent', 'running');
      onAgentUpdate([...this.agents]);

      onLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'info',
        message: '🚀 启动真实部署流程',
        details: `目标服务器: ${config.serverConfig.host}:${config.serverConfig.port}`,
        agentName: 'DeploymentManager'
      });

      // 执行部署
      const success = await this.deploymentController.startDeployment(config);

      if (success) {
        this.updateAgentStatus('ConnectionAgent', 'completed');
        this.updateAgentStatus('ExecutionAgent', 'completed');
        this.updateAgentStatus('ValidationAgent', 'completed');
        
        onLog({
          id: Date.now().toString(),
          timestamp: new Date(),
          level: 'success',
          message: '🎉 部署成功完成！',
          details: '所有步骤已成功执行',
          agentName: 'DeploymentManager'
        });
      } else {
        this.updateAgentStatus('ExecutionAgent', 'failed');
        
        onLog({
          id: Date.now().toString(),
          timestamp: new Date(),
          level: 'error',
          message: '💥 部署失败',
          details: '请查看详细日志了解失败原因',
          agentName: 'DeploymentManager'
        });
      }

      onAgentUpdate([...this.agents]);
      onProgress(100);

      return success;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      onLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'error',
        message: '💥 部署流程异常',
        details: errorMessage,
        agentName: 'DeploymentManager'
      });

      this.updateAgentStatus('ExecutionAgent', 'failed');
      onAgentUpdate([...this.agents]);

      if (onError) {
        onError(error, { type: 'deployment_error', message: errorMessage });
      }

      return false;
    }
  }

  /**
   * 准备SSH配置
   */
  private async prepareSshConfig(
    config: DeploymentConfig,
    onLog: (log: DeploymentLog) => void
  ): Promise<SSHConfig | null> {
    onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: '🔐 准备SSH连接配置',
      agentName: 'SSHConfigurer'
    });

    try {
      let keyPath: string | undefined;

      if (config.serverConfig.sshKey) {
        // 处理SSH密钥文件
        keyPath = await this.processSshKey(config.serverConfig.sshKey, onLog);
      }

      const sshConfig: SSHConfig = {
        host: config.serverConfig.host,
        port: config.serverConfig.port,
        username: config.serverConfig.username,
        keyPath
      };

      onLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'success',
        message: '✅ SSH配置准备完成',
        details: `连接目标: ${sshConfig.username}@${sshConfig.host}:${sshConfig.port}`,
        agentName: 'SSHConfigurer'
      });

      return sshConfig;
    } catch (error) {
      onLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'error',
        message: '❌ SSH配置准备失败',
        details: error instanceof Error ? error.message : '未知错误',
        agentName: 'SSHConfigurer'
      });
      return null;
    }
  }

  /**
   * 处理SSH密钥文件
   */
  private async processSshKey(
    sshKeyFile: File,
    onLog: (log: DeploymentLog) => void
  ): Promise<string> {
    onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: '🔑 处理SSH密钥文件',
      details: `文件名: ${sshKeyFile.name}, 大小: ${sshKeyFile.size} bytes`,
      agentName: 'KeyProcessor'
    });

    try {
      // 读取文件内容
      const keyContent = await sshKeyFile.text();
      
      // 验证密钥格式
      if (!keyContent.includes('-----BEGIN') || !keyContent.includes('-----END')) {
        throw new Error('无效的SSH密钥格式');
      }

      // 通过API将密钥保存到服务器临时位置
      const response = await fetch('/api/ssh/save-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyContent,
          filename: sshKeyFile.name
        })
      });

      if (!response.ok) {
        throw new Error(`密钥保存失败: ${response.statusText}`);
      }

      const result = await response.json();
      const tempKeyPath = result.keyPath;

      onLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'success',
        message: '✅ SSH密钥文件处理完成',
        details: `临时路径: ${tempKeyPath}`,
        agentName: 'KeyProcessor'
      });

      return tempKeyPath;
    } catch (error) {
      onLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'error',
        message: '❌ SSH密钥处理失败',
        details: error instanceof Error ? error.message : '未知错误',
        agentName: 'KeyProcessor'
      });
      throw error;
    }
  }

  /**
   * 创建初始智能体
   */
  private createInitialAgents(): void {
    this.agents = [
      {
        id: 'connection-agent',
        agentName: 'ConnectionAgent',
        action: '建立服务器连接',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3
      },
      {
        id: 'execution-agent',
        agentName: 'ExecutionAgent',
        action: '执行部署命令',
        status: 'pending',
        retryCount: 0,
        maxRetries: 5
      },
      {
        id: 'validation-agent',
        agentName: 'ValidationAgent',
        action: '验证部署结果',
        status: 'pending',
        retryCount: 0,
        maxRetries: 2
      },
      {
        id: 'monitoring-agent',
        agentName: 'MonitoringAgent',
        action: '监控系统状态',
        status: 'pending',
        retryCount: 0,
        maxRetries: 1
      }
    ];
  }

  /**
   * 更新智能体状态
   */
  private updateAgentStatus(
    agentName: string,
    status: AgentAction['status'],
    result?: unknown,
    error?: string
  ): void {
    const agent = this.agents.find(a => a.agentName === agentName);
    if (agent) {
      agent.status = status;
      if (result !== undefined) {
        agent.result = result;
      }
      if (error) {
        agent.error = error;
      }
    }
  }

  /**
   * 获取当前部署计划
   */
  getCurrentPlan(): DeploymentPlan | undefined {
    return this.deploymentController?.getCurrentPlan();
  }

  /**
   * 获取系统健康状态
   */
  getSystemHealth(): SystemHealth | null {
    return this.deploymentController?.getSystemHealth() || null;
  }

  /**
   * 获取智能体状态
   */
  getAgents(): AgentAction[] {
    return [...this.agents];
  }

  /**
   * 停止部署流程
   */
  stopDeployment(): void {
    this.deploymentController?.cleanup();
    this.agents.forEach(agent => {
      if (agent.status === 'running') {
        agent.status = 'failed';
        agent.error = '用户手动停止';
      }
    });
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.deploymentController?.cleanup();
    this.agents = [];
  }

  /**
   * 获取部署历史
   */
  getDeploymentHistory(): unknown[] {
    // 这里可以实现部署历史记录功能
    return [];
  }

  /**
   * 导出部署报告
   */
  exportDeploymentReport(): unknown {
    const plan = this.getCurrentPlan();
    const health = this.getSystemHealth();
    const agents = this.getAgents();

    return {
      timestamp: new Date(),
      plan,
      systemHealth: health,
      agents,
      success: agents.every(a => a.status === 'completed'),
      summary: {
        totalSteps: plan?.totalSteps || 0,
        completedSteps: plan?.completedSteps || 0,
        executionTime: plan?.actualTime || 0
      }
    };
  }
} 