import { ClaudeService } from './claudeService';
import { DeploymentConfig, AgentAction, DeploymentLog, UserPrompt } from '../types/deployment';

export class DeploymentService {
  private claudeService: ClaudeService;
  private sshConnection: any = null;

  constructor(claudeApiKey: string) {
    this.claudeService = new ClaudeService(claudeApiKey);
  }

  async executeDeployment(
    config: DeploymentConfig,
    onLog: (log: DeploymentLog) => void,
    onProgress: (progress: number) => void,
    onUserPrompt: (prompt: UserPrompt) => void,
    onAgentUpdate: (agents: AgentAction[]) => void,
    onError?: (error: any, analysis?: any) => void
  ): Promise<any> {
    const agents: AgentAction[] = [];
    let currentProgress = 0;

    try {
      // 智能体1: 项目分析智能体
      const analysisAgent = this.createAgent('ProjectAnalyzer', '分析GitHub项目');
      agents.push(analysisAgent);
      onAgentUpdate([...agents]);

      onLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'agent',
        message: '🤖 项目分析智能体启动',
        agentName: 'ProjectAnalyzer'
      });

      analysisAgent.status = 'running';
      onAgentUpdate([...agents]);

      // 真实的项目分析
      let projectAnalysis;
      try {
        projectAnalysis = await this.claudeService.analyzeProject(
          config.githubUrl,
          config.serverConfig
        );
        
        onLog({
          id: Date.now().toString(),
          timestamp: new Date(),
          level: 'info',
          message: '🧠 Claude正在分析项目结构...',
          details: `分析仓库: ${config.githubUrl}`,
          agentName: 'ProjectAnalyzer'
        });

      } catch (error) {
        // 如果Claude分析失败，提供基础分析
        onLog({
          id: Date.now().toString(),
          timestamp: new Date(),
          level: 'warning',
          message: '⚠️ Claude分析失败，使用基础项目检测',
          details: error instanceof Error ? error.message : '未知错误',
          agentName: 'ProjectAnalyzer'
        });

        // 基于URL进行基础项目类型推断
        projectAnalysis = this.getBasicProjectAnalysis(config.githubUrl);
      }

      analysisAgent.status = 'completed';
      analysisAgent.result = projectAnalysis;
      onAgentUpdate([...agents]);

      onLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'success',
        message: `✅ 项目分析完成: ${projectAnalysis.projectType || '未知项目类型'}`,
        details: `技术栈: ${projectAnalysis.techStack?.join(', ') || '待检测'}`,
        agentName: 'ProjectAnalyzer'
      });

      currentProgress = 20;
      onProgress(currentProgress);

      // 智能体2: 服务器连接智能体
      const connectionAgent = this.createAgent('ServerConnector', '连接远程服务器');
      agents.push(connectionAgent);
      onAgentUpdate([...agents]);

      connectionAgent.status = 'running';
      onAgentUpdate([...agents]);

      // 提示用户这是模拟环境
      onLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'warning',
        message: '⚠️ 注意：当前为演示模式',
        details: '实际部署需要真实的SSH连接和服务器权限',
        agentName: 'ServerConnector'
      });

      // 模拟连接检查
      await this.simulateServerConnection(config.serverConfig, onLog);
      
      connectionAgent.status = 'completed';
      onAgentUpdate([...agents]);

      currentProgress = 35;
      onProgress(currentProgress);

      // 智能体3: 部署策略智能体
      const strategyAgent = this.createAgent('DeploymentStrategy', '制定部署策略');
      agents.push(strategyAgent);
      onAgentUpdate([...agents]);

      strategyAgent.status = 'running';
      onAgentUpdate([...agents]);

      // 生成真实的部署策略
      const deploymentStrategy = await this.generateDeploymentStrategy(
        projectAnalysis, 
        config, 
        onLog
      );

      strategyAgent.status = 'completed';
      strategyAgent.result = deploymentStrategy;
      onAgentUpdate([...agents]);

      currentProgress = 55;
      onProgress(currentProgress);

      // 智能体4: 命令生成智能体
      const commandAgent = this.createAgent('CommandGenerator', '生成部署命令');
      agents.push(commandAgent);
      onAgentUpdate([...agents]);

      commandAgent.status = 'running';
      onAgentUpdate([...agents]);

      const deploymentCommands = await this.generateDeploymentCommands(
        projectAnalysis,
        deploymentStrategy,
        onLog
      );

      commandAgent.status = 'completed';
      commandAgent.result = deploymentCommands;
      onAgentUpdate([...agents]);

      currentProgress = 75;
      onProgress(currentProgress);

      // 智能体5: 部署验证智能体
      const validationAgent = this.createAgent('DeploymentValidator', '验证部署配置');
      agents.push(validationAgent);
      onAgentUpdate([...agents]);

      validationAgent.status = 'running';
      onAgentUpdate([...agents]);

      const validationResult = await this.validateDeployment(
        deploymentCommands,
        config,
        onLog
      );

      validationAgent.status = 'completed';
      validationAgent.result = validationResult;
      onAgentUpdate([...agents]);

      currentProgress = 90;
      onProgress(currentProgress);

      // 智能体6: 部署指导智能体
      const guidanceAgent = this.createAgent('DeploymentGuide', '生成部署指导');
      agents.push(guidanceAgent);
      onAgentUpdate([...agents]);

      guidanceAgent.status = 'running';
      onAgentUpdate([...agents]);

      const deploymentGuide = await this.generateDeploymentGuide(
        deploymentCommands,
        validationResult,
        onLog
      );

      guidanceAgent.status = 'completed';
      guidanceAgent.result = deploymentGuide;
      onAgentUpdate([...agents]);

      onLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'success',
        message: '🎉 部署分析完成！',
        details: '已生成完整的部署策略和命令'
      });

      currentProgress = 100;
      onProgress(currentProgress);

      // 返回真实的部署信息
      const projectName = this.extractProjectName(config.githubUrl);
      const deploymentPath = `/home/${config.serverConfig.username}/deployments/${projectName}`;

      return {
        projectAnalysis,
        deploymentStrategy,
        deploymentCommands,
        validationResult,
        deploymentGuide,
        realDeploymentInfo: {
          projectName,
          deploymentPath,
          serverInfo: `${config.serverConfig.username}@${config.serverConfig.host}:${config.serverConfig.port}`,
          estimatedTime: this.estimateDeploymentTime(projectAnalysis),
          requiredActions: deploymentCommands.manualSteps || []
        }
      };

    } catch (error) {
      onLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'error',
        message: '❌ 部署分析过程中发生错误',
        details: error instanceof Error ? error.message : '未知错误'
      });

      // 使用Claude进行错误分析
      if (onError) {
        try {
          const errorAnalysis = await this.claudeService.analyzeDeploymentIssue(
            {
              error: error instanceof Error ? error.message : '未知错误',
              stack: error instanceof Error ? error.stack : undefined,
              timestamp: new Date().toISOString()
            },
            config,
            {
              agents: agents.map(a => ({ name: a.agentName, status: a.status })),
              progress: currentProgress
            }
          );
          onError(error, errorAnalysis);
        } catch (analysisError) {
          onError(error, null);
        }
      }

      throw error;
    }
  }

  private createAgent(name: string, description: string): AgentAction {
    return {
      id: Date.now().toString() + Math.random(),
      agentName: name,
      action: description,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3
    };
  }

  private getBasicProjectAnalysis(githubUrl: string): any {
    const projectName = this.extractProjectName(githubUrl);
    
    // 基于项目名称和URL推断项目类型
    let projectType = 'Unknown';
    let techStack = ['git'];
    let systemDependencies = ['git'];

    if (projectName.includes('react') || projectName.includes('next')) {
      projectType = 'React/Next.js Application';
      techStack = ['React', 'Node.js', 'npm'];
      systemDependencies = ['nodejs', 'npm', 'git'];
    } else if (projectName.includes('vue')) {
      projectType = 'Vue.js Application';
      techStack = ['Vue.js', 'Node.js', 'npm'];
      systemDependencies = ['nodejs', 'npm', 'git'];
    } else if (projectName.includes('angular')) {
      projectType = 'Angular Application';
      techStack = ['Angular', 'Node.js', 'npm'];
      systemDependencies = ['nodejs', 'npm', 'git'];
    } else if (projectName.includes('django') || projectName.includes('flask')) {
      projectType = 'Python Web Application';
      techStack = ['Python', 'pip'];
      systemDependencies = ['python3', 'pip', 'git'];
    } else if (projectName.includes('spring') || projectName.includes('java')) {
      projectType = 'Java Application';
      techStack = ['Java', 'Maven/Gradle'];
      systemDependencies = ['openjdk', 'maven', 'git'];
    } else {
      projectType = 'Web Application';
      techStack = ['Node.js', 'npm'];
      systemDependencies = ['nodejs', 'npm', 'git'];
    }

    return {
      projectType,
      techStack,
      systemDependencies,
      deploymentSteps: [
        '克隆代码仓库',
        '安装系统依赖',
        '安装项目依赖',
        '构建项目',
        '配置服务',
        '启动应用'
      ],
      potentialIssues: [
        '端口冲突',
        '依赖版本不兼容',
        '权限问题',
        '防火墙配置'
      ],
      environmentRequirements: {
        os: 'Linux (Ubuntu/CentOS)',
        memory: '2GB+',
        disk: '10GB+',
        network: '互联网连接'
      }
    };
  }

  private extractProjectName(githubUrl: string): string {
    try {
      const url = new URL(githubUrl);
      const pathParts = url.pathname.split('/').filter(part => part);
      return pathParts[pathParts.length - 1] || 'unknown-project';
    } catch {
      return 'unknown-project';
    }
  }

  private async simulateServerConnection(serverConfig: any, onLog: (log: DeploymentLog) => void): Promise<void> {
    onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: `🔗 检查服务器连接 ${serverConfig.host}:${serverConfig.port}`,
      details: `用户: ${serverConfig.username}`,
      agentName: 'ServerConnector'
    });

    await new Promise(resolve => setTimeout(resolve, 1500));
    
    onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: '✅ 服务器连接配置验证完成',
      details: '注意：实际部署时需要验证SSH密钥和网络连接',
      agentName: 'ServerConnector'
    });
  }

  private async generateDeploymentStrategy(
    projectAnalysis: any, 
    config: DeploymentConfig, 
    onLog: (log: DeploymentLog) => void
  ): Promise<any> {
    onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: '📋 制定部署策略...',
      agentName: 'DeploymentStrategy'
    });

    const projectName = this.extractProjectName(config.githubUrl);
    const deploymentPath = `/home/${config.serverConfig.username}/deployments/${projectName}`;

    const strategy = {
      deploymentPath,
      backupPath: `/home/${config.serverConfig.username}/backups/${projectName}`,
      logPath: `/home/${config.serverConfig.username}/logs/${projectName}`,
      serviceName: `${projectName}-service`,
      port: this.suggestPort(projectAnalysis.projectType),
      environment: 'production',
      rollbackStrategy: 'backup-restore',
      healthCheckUrl: `http://localhost:${this.suggestPort(projectAnalysis.projectType)}/health`,
      dependencies: projectAnalysis.systemDependencies || []
    };

    onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'success',
      message: '✅ 部署策略制定完成',
      details: `部署路径: ${deploymentPath}`,
      agentName: 'DeploymentStrategy'
    });

    return strategy;
  }

  private async generateDeploymentCommands(
    projectAnalysis: any,
    strategy: any,
    onLog: (log: DeploymentLog) => void
  ): Promise<any> {
    onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: '⚙️ 生成部署命令...',
      agentName: 'CommandGenerator'
    });

    const commands = {
      preparation: [
        `sudo mkdir -p ${strategy.deploymentPath}`,
        `sudo mkdir -p ${strategy.backupPath}`,
        `sudo mkdir -p ${strategy.logPath}`,
        `sudo chown -R ${strategy.deploymentPath.split('/')[2]}:${strategy.deploymentPath.split('/')[2]} ${strategy.deploymentPath}`
      ],
      systemDependencies: this.generateSystemDependencyCommands(projectAnalysis.systemDependencies),
      codeDeployment: [
        `cd ${strategy.deploymentPath}`,
        `git clone ${projectAnalysis.githubUrl || 'GITHUB_URL'} .`,
        `git checkout main || git checkout master`
      ],
      projectSetup: this.generateProjectSetupCommands(projectAnalysis.projectType),
      serviceConfiguration: this.generateServiceCommands(strategy),
      verification: [
        `curl -f ${strategy.healthCheckUrl} || echo "Health check failed"`,
        `systemctl status ${strategy.serviceName}`,
        `journalctl -u ${strategy.serviceName} --no-pager -n 20`
      ],
      manualSteps: [
        '1. 验证SSH密钥权限: chmod 600 /path/to/your/key.pem',
        '2. 确保服务器防火墙允许相应端口',
        '3. 检查域名DNS配置（如果使用域名）',
        '4. 配置SSL证书（生产环境推荐）'
      ]
    };

    onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'success',
      message: '✅ 部署命令生成完成',
      details: `共生成 ${Object.values(commands).flat().length} 条命令`,
      agentName: 'CommandGenerator'
    });

    return commands;
  }

  private generateSystemDependencyCommands(dependencies: string[]): string[] {
    const commands = ['sudo apt update'];
    
    dependencies.forEach(dep => {
      switch (dep) {
        case 'nodejs':
          commands.push(
            'curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -',
            'sudo apt-get install -y nodejs'
          );
          break;
        case 'npm':
          commands.push('sudo apt-get install -y npm');
          break;
        case 'python3':
          commands.push('sudo apt-get install -y python3 python3-pip');
          break;
        case 'openjdk':
          commands.push('sudo apt-get install -y openjdk-11-jdk');
          break;
        case 'git':
          commands.push('sudo apt-get install -y git');
          break;
        default:
          commands.push(`sudo apt-get install -y ${dep}`);
      }
    });

    return commands;
  }

  private generateProjectSetupCommands(projectType: string): string[] {
    switch (projectType) {
      case 'React/Next.js Application':
        return [
          'npm install',
          'npm run build',
          'npm install -g pm2'
        ];
      case 'Vue.js Application':
        return [
          'npm install',
          'npm run build',
          'npm install -g pm2'
        ];
      case 'Python Web Application':
        return [
          'pip3 install -r requirements.txt',
          'python3 manage.py migrate || echo "No Django migrations"'
        ];
      case 'Java Application':
        return [
          'mvn clean install || gradle build'
        ];
      default:
        return [
          'npm install || pip3 install -r requirements.txt || echo "No package manager detected"'
        ];
    }
  }

  private generateServiceCommands(strategy: any): string[] {
    return [
      `sudo tee /etc/systemd/system/${strategy.serviceName}.service > /dev/null <<EOF
[Unit]
Description=${strategy.serviceName}
After=network.target

[Service]
Type=simple
User=${strategy.deploymentPath.split('/')[2]}
WorkingDirectory=${strategy.deploymentPath}
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=${strategy.port}

[Install]
WantedBy=multi-user.target
EOF`,
      `sudo systemctl daemon-reload`,
      `sudo systemctl enable ${strategy.serviceName}`,
      `sudo systemctl start ${strategy.serviceName}`
    ];
  }

  private async validateDeployment(
    commands: any,
    config: DeploymentConfig,
    onLog: (log: DeploymentLog) => void
  ): Promise<any> {
    onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: '🔍 验证部署配置...',
      agentName: 'DeploymentValidator'
    });

    const validation = {
      configurationValid: true,
      warnings: [],
      recommendations: [],
      securityChecks: []
    };

    // 检查SSH密钥
    if (!config.serverConfig.sshKey) {
      validation.warnings.push('未提供SSH密钥文件');
    }

    // 检查服务器配置
    if (!config.serverConfig.host || !config.serverConfig.username) {
      validation.configurationValid = false;
      validation.warnings.push('服务器配置不完整');
    }

    // 安全建议
    validation.securityChecks = [
      '确保SSH密钥权限为600',
      '建议使用非root用户进行部署',
      '配置防火墙规则',
      '启用fail2ban防护'
    ];

    validation.recommendations = [
      '使用环境变量管理敏感配置',
      '设置日志轮转',
      '配置监控和告警',
      '定期备份数据'
    ];

    onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: validation.configurationValid ? 'success' : 'warning',
      message: validation.configurationValid ? '✅ 配置验证通过' : '⚠️ 配置存在问题',
      details: validation.warnings.join(', ') || '配置检查完成',
      agentName: 'DeploymentValidator'
    });

    return validation;
  }

  private async generateDeploymentGuide(
    commands: any,
    validation: any,
    onLog: (log: DeploymentLog) => void
  ): Promise<any> {
    onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: '📖 生成部署指导文档...',
      agentName: 'DeploymentGuide'
    });

    const guide = {
      overview: '本指导将帮助您完成应用的部署过程',
      prerequisites: [
        '确保有服务器SSH访问权限',
        '验证服务器满足最低系统要求',
        '准备好GitHub仓库访问权限'
      ],
      steps: [
        {
          title: '1. 准备服务器环境',
          commands: commands.preparation,
          description: '创建必要的目录结构'
        },
        {
          title: '2. 安装系统依赖',
          commands: commands.systemDependencies,
          description: '安装运行应用所需的系统软件'
        },
        {
          title: '3. 部署应用代码',
          commands: commands.codeDeployment,
          description: '从GitHub克隆代码到服务器'
        },
        {
          title: '4. 配置应用环境',
          commands: commands.projectSetup,
          description: '安装依赖并构建应用'
        },
        {
          title: '5. 配置系统服务',
          commands: commands.serviceConfiguration,
          description: '创建systemd服务并启动'
        },
        {
          title: '6. 验证部署结果',
          commands: commands.verification,
          description: '检查应用是否正常运行'
        }
      ],
      troubleshooting: {
        commonIssues: [
          {
            issue: '端口被占用',
            solution: '使用 sudo netstat -tlnp | grep :PORT 检查端口使用情况'
          },
          {
            issue: '权限不足',
            solution: '检查文件和目录权限，确保用户有适当的访问权限'
          },
          {
            issue: '依赖安装失败',
            solution: '检查网络连接和包管理器配置'
          }
        ]
      },
      nextSteps: [
        '配置域名和SSL证书',
        '设置监控和日志收集',
        '配置自动备份',
        '优化性能配置'
      ]
    };

    onLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'success',
      message: '✅ 部署指导文档生成完成',
      agentName: 'DeploymentGuide'
    });

    return guide;
  }

  private suggestPort(projectType: string): number {
    switch (projectType) {
      case 'React/Next.js Application':
        return 3000;
      case 'Vue.js Application':
        return 8080;
      case 'Python Web Application':
        return 8000;
      case 'Java Application':
        return 8080;
      default:
        return 3000;
    }
  }

  private estimateDeploymentTime(projectAnalysis: any): string {
    const baseTime = 10; // 基础时间10分钟
    const dependencyTime = (projectAnalysis.systemDependencies?.length || 0) * 2;
    const totalMinutes = baseTime + dependencyTime;
    
    return `${totalMinutes}-${totalMinutes + 10} 分钟`;
  }
}