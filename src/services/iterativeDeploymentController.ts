import { RealExecutionEngine, SSHConfig, ExecutionOptions } from './realExecutionEngine';
import { ClaudeService } from './claudeService';
import { 
  DeploymentConfig, 
  DeploymentLog, 
  DeploymentPlan, 
  DeploymentStep, 
  ExecutionResult,
  SystemHealth,
  ServiceStatus,
  ErrorPattern
} from '../types/deployment';

export class IterativeDeploymentController {
  private executionEngine: RealExecutionEngine;
  private claudeService: ClaudeService;
  private onLog: (log: DeploymentLog) => void;
  private onProgress: (progress: number) => void;
  private currentPlan?: DeploymentPlan;
  private systemHealth: SystemHealth | null = null;

  constructor(
    sshConfig: SSHConfig,
    claudeApiKey: string,
    onLog: (log: DeploymentLog) => void,
    onProgress: (progress: number) => void
  ) {
    this.executionEngine = new RealExecutionEngine(sshConfig, onLog);
    this.claudeService = new ClaudeService(claudeApiKey);
    this.onLog = onLog;
    this.onProgress = onProgress;
  }

  /**
   * 开始迭代部署流程
   */
  async startDeployment(config: DeploymentConfig): Promise<boolean> {
    try {
      this.onLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'info',
        message: '🚀 启动迭代部署流程',
        details: `目标: ${config.githubUrl}`,
        agentName: 'DeploymentController'
      });

      // 1. 系统健康检查
      await this.performSystemHealthCheck();

      // 2. 生成部署计划
      this.currentPlan = await this.generateDeploymentPlan(config);

      // 3. 执行部署计划
      const success = await this.executePlan(this.currentPlan);

      // 4. 最终验证
      if (success) {
        await this.performFinalValidation(config);
      }

      return success;
    } catch (error) {
      this.onLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'error',
        message: '💥 部署流程异常终止',
        details: error instanceof Error ? error.message : '未知错误',
        agentName: 'DeploymentController'
      });
      return false;
    }
  }

  /**
   * 系统健康检查
   */
  private async performSystemHealthCheck(): Promise<void> {
    this.onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: '🔍 执行系统健康检查',
      agentName: 'HealthChecker'
    });

    // 检查连接性
    const connectionResult = await this.executionEngine.healthCheck();
    if (!connectionResult) {
      throw new Error('无法连接到服务器');
    }

    // 检查系统资源
    const systemInfo = await this.getSystemInfo();
    this.systemHealth = systemInfo;

    this.onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'success',
      message: '✅ 系统健康检查完成',
      details: `CPU: ${systemInfo.cpu}%, 内存: ${systemInfo.memory}%, 磁盘: ${systemInfo.disk}%`,
      agentName: 'HealthChecker'
    });
  }

  /**
   * 生成部署计划
   */
  private async generateDeploymentPlan(config: DeploymentConfig): Promise<DeploymentPlan> {
    this.onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: '📋 生成部署计划',
      agentName: 'PlanGenerator'
    });

    const projectName = this.extractProjectName(config.githubUrl);
    const deploymentPath = `/home/${config.serverConfig.username}/deployments/${projectName}`;

    const steps: DeploymentStep[] = [
      {
        id: 'prep',
        name: '环境准备',
        description: '创建目录结构和设置权限',
        commands: [
          `mkdir -p ${deploymentPath}`,
          `mkdir -p ${deploymentPath}/logs`,
          `mkdir -p ${deploymentPath}/backups`,
          `cd ${deploymentPath}`
        ],
        dependencies: [],
        status: 'pending',
        autoRetry: true,
        critical: true
      },
      {
        id: 'deps',
        name: '系统依赖',
        description: '安装必要的系统依赖',
        commands: [
          'sudo apt-get update',
          'sudo apt-get install -y git curl wget',
          'curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -',
          'sudo apt-get install -y nodejs npm'
        ],
        dependencies: ['prep'],
        status: 'pending',
        autoRetry: true,
        critical: true
      },
      {
        id: 'clone',
        name: '代码克隆',
        description: '从GitHub克隆项目代码',
        commands: [
          `cd ${deploymentPath}`,
          `git clone ${config.githubUrl} .`,
          'git checkout main || git checkout master'
        ],
        dependencies: ['deps'],
        status: 'pending',
        autoRetry: true,
        critical: true
      },
      {
        id: 'install',
        name: '项目依赖',
        description: '安装项目依赖包',
        commands: [
          `cd ${deploymentPath}`,
          'npm install --production'
        ],
        dependencies: ['clone'],
        status: 'pending',
        autoRetry: true,
        critical: true
      },
      {
        id: 'build',
        name: '项目构建',
        description: '构建项目代码',
        commands: [
          `cd ${deploymentPath}`,
          'npm run build || echo "No build script found"'
        ],
        dependencies: ['install'],
        status: 'pending',
        autoRetry: false,
        critical: false
      },
      {
        id: 'service',
        name: '服务配置',
        description: '配置系统服务',
        commands: [
          'sudo npm install -g pm2',
          `cd ${deploymentPath}`,
          'pm2 start ecosystem.config.js || pm2 start npm --name "app" -- start'
        ],
        dependencies: ['build'],
        status: 'pending',
        autoRetry: true,
        critical: true
      },
      {
        id: 'verify',
        name: '服务验证',
        description: '验证服务运行状态',
        commands: [
          'pm2 status',
          'pm2 logs --lines 10'
        ],
        dependencies: ['service'],
        status: 'pending',
        autoRetry: false,
        critical: false
      }
    ];

    const plan: DeploymentPlan = {
      id: Date.now().toString(),
      name: `${projectName} 部署计划`,
      description: `自动化部署 ${projectName} 到生产环境`,
      steps,
      totalSteps: steps.length,
      completedSteps: 0,
      estimatedTime: 300000 // 5分钟
    };

    this.onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'success',
      message: '✅ 部署计划生成完成',
      details: `共 ${steps.length} 个步骤`,
      agentName: 'PlanGenerator'
    });

    return plan;
  }

  /**
   * 执行部署计划
   */
  private async executePlan(plan: DeploymentPlan): Promise<boolean> {
    this.onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: '🎯 开始执行部署计划',
      details: `${plan.name}`,
      agentName: 'PlanExecutor'
    });

    const startTime = Date.now();
    let success = true;

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const progress = (i / plan.steps.length) * 100;
      
      this.onProgress(progress);
      plan.currentStep = step.id;

      // 检查依赖
      if (!this.checkStepDependencies(step, plan)) {
        this.onLog({
          id: Date.now().toString(),
          timestamp: new Date(),
          level: 'warning',
          message: `⚠️ 跳过步骤: ${step.name}`,
          details: '依赖步骤未完成',
          agentName: 'PlanExecutor'
        });
        step.status = 'skipped';
        continue;
      }

      // 执行步骤
      const stepSuccess = await this.executeStep(step);
      
      if (stepSuccess) {
        step.status = 'completed';
        plan.completedSteps++;
        
        this.onLog({
          id: Date.now().toString(),
          timestamp: new Date(),
          level: 'success',
          message: `✅ 步骤完成: ${step.name}`,
          agentName: 'PlanExecutor'
        });
      } else {
        step.status = 'failed';
        
        if (step.critical) {
          this.onLog({
            id: Date.now().toString(),
            timestamp: new Date(),
            level: 'error',
            message: `❌ 关键步骤失败: ${step.name}`,
            details: '部署流程终止',
            agentName: 'PlanExecutor'
          });
          success = false;
          break;
        } else {
          this.onLog({
            id: Date.now().toString(),
            timestamp: new Date(),
            level: 'warning',
            message: `⚠️ 非关键步骤失败: ${step.name}`,
            details: '继续执行后续步骤',
            agentName: 'PlanExecutor'
          });
        }
      }
    }

    plan.actualTime = Date.now() - startTime;
    this.onProgress(100);

    this.onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: success ? 'success' : 'error',
      message: success ? '🎉 部署计划执行完成' : '💥 部署计划执行失败',
      details: `完成步骤: ${plan.completedSteps}/${plan.totalSteps}`,
      agentName: 'PlanExecutor'
    });

    return success;
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(step: DeploymentStep): Promise<boolean> {
    this.onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: `🔧 执行步骤: ${step.name}`,
      details: step.description,
      agentName: 'StepExecutor'
    });

    step.status = 'running';
    
    let retryCount = 0;
    const maxRetries = step.autoRetry ? 3 : 1;

    while (retryCount < maxRetries) {
      try {
        const result = await this.executionEngine.executeCommandSequence(
          step.commands,
          {
            timeout: 60000,
            retries: 1,
            workingDirectory: '~'
          }
        );

        step.result = result;

        if (result.success) {
          return true;
        } else {
          retryCount++;
          
          if (retryCount < maxRetries) {
            this.onLog({
              id: Date.now().toString(),
              timestamp: new Date(),
              level: 'warning',
              message: `🔄 步骤重试: ${step.name} (${retryCount}/${maxRetries})`,
              agentName: 'StepExecutor'
            });
            
            // 等待一段时间再重试
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      } catch (error) {
        retryCount++;
        
        if (retryCount >= maxRetries) {
          this.onLog({
            id: Date.now().toString(),
            timestamp: new Date(),
            level: 'error',
            message: `❌ 步骤执行异常: ${step.name}`,
            details: error instanceof Error ? error.message : '未知错误',
            agentName: 'StepExecutor'
          });
          return false;
        }
      }
    }

    return false;
  }

  /**
   * 检查步骤依赖
   */
  private checkStepDependencies(step: DeploymentStep, plan: DeploymentPlan): boolean {
    for (const depId of step.dependencies) {
      const depStep = plan.steps.find(s => s.id === depId);
      if (!depStep || depStep.status !== 'completed') {
        return false;
      }
    }
    return true;
  }

  /**
   * 获取系统信息
   */
  private async getSystemInfo(): Promise<SystemHealth> {
    const commands = [
      'df -h / | tail -1 | awk \'{print $5}\'',
      'free | grep Mem | awk \'{printf "%.0f", $3/$2 * 100.0}\'',
      'top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | cut -d\'%\' -f1'
    ];

    const results = await Promise.all(
      commands.map(cmd => this.executionEngine.executeCommand(cmd))
    );

    return {
      cpu: parseFloat(results[2]?.stdout || '0'),
      memory: parseFloat(results[1]?.stdout || '0'),
      disk: parseFloat(results[0]?.stdout?.replace('%', '') || '0'),
      network: true, // 简化处理
      services: [],
      timestamp: new Date()
    };
  }

  /**
   * 最终验证
   */
  private async performFinalValidation(config: DeploymentConfig): Promise<void> {
    this.onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: '🔍 执行最终验证',
      agentName: 'FinalValidator'
    });

    // 检查服务状态
    const serviceCheck = await this.executionEngine.executeCommand('pm2 status');
    
    if (serviceCheck.success) {
      this.onLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'success',
        message: '✅ 服务状态验证通过',
        details: serviceCheck.stdout,
        agentName: 'FinalValidator'
      });
    } else {
      this.onLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'warning',
        message: '⚠️ 服务状态验证失败',
        details: serviceCheck.stderr,
        agentName: 'FinalValidator'
      });
    }
  }

  /**
   * 提取项目名称
   */
  private extractProjectName(githubUrl: string): string {
    const match = githubUrl.match(/github\.com\/[^\/]+\/([^\/]+)/);
    return match ? match[1].replace('.git', '') : 'unknown-project';
  }

  /**
   * 获取当前部署计划
   */
  getCurrentPlan(): DeploymentPlan | undefined {
    return this.currentPlan;
  }

  /**
   * 获取系统健康状态
   */
  getSystemHealth(): SystemHealth | null {
    return this.systemHealth;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.executionEngine.clearExecutionHistory();
    this.currentPlan = undefined;
    this.systemHealth = null;
  }
} 