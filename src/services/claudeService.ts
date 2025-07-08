interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  system?: string;
}

export class ClaudeService {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeProject(githubUrl: string, serverInfo: any): Promise<any> {
    const systemPrompt = `你是一个专业的DevOps智能体，负责分析GitHub项目并制定部署策略。
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
    - environmentRequirements: 环境要求`;

    const userMessage = `请分析这个GitHub项目: ${githubUrl}
    目标服务器信息: ${JSON.stringify(serverInfo)}
    
    请提供详细的部署分析和策略。`;

    return this.sendRequest(systemPrompt, userMessage);
  }

  async generateDeploymentCommands(projectAnalysis: any, currentStep: string): Promise<any> {
    const systemPrompt = `你是一个Linux系统管理智能体，负责生成具体的部署命令。
    基于项目分析结果，生成安全可靠的Shell命令序列。
    
    请以JSON格式返回：
    - commands: 命令数组
    - description: 步骤描述
    - expectedOutput: 预期输出
    - errorHandling: 错误处理策略`;

    const userMessage = `项目分析: ${JSON.stringify(projectAnalysis)}
    当前步骤: ${currentStep}
    
    请生成对应的部署命令。`;

    return this.sendRequest(systemPrompt, userMessage);
  }

  async analyzeError(error: string, context: any, retryCount: number): Promise<any> {
    const systemPrompt = `你是一个错误诊断和修复智能体。
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
    - estimatedFixTime: 预计修复时间（分钟）`;

    const userMessage = `错误信息: ${error}
    上下文: ${JSON.stringify(context)}
    重试次数: ${retryCount}/5
    
    请分析错误并提供详细的解决方案和用户指导。`;

    return this.sendRequest(systemPrompt, userMessage);
  }

  async analyzeDeploymentIssue(
    errorDetails: any,
    deploymentConfig: any,
    systemState: any
  ): Promise<any> {
    const systemPrompt = `你是一个部署问题诊断专家，负责分析复杂的部署问题并提供智能建议。
    
    请以JSON格式返回：
    - problemSummary: 问题总结
    - possibleCauses: 可能原因数组
    - recommendedActions: 推荐操作数组
    - configurationSuggestions: 配置建议
    - userInterventionNeeded: 是否需要用户干预
    - riskAssessment: 风险评估
    - nextSteps: 下一步操作建议`;

    const userMessage = `部署问题详情: ${JSON.stringify(errorDetails)}
    部署配置: ${JSON.stringify(deploymentConfig)}
    系统状态: ${JSON.stringify(systemState)}
    
    请提供智能诊断和建议。`;

    return this.sendRequest(systemPrompt, userMessage);
  }

  async optimizeDeployment(deploymentResult: any): Promise<any> {
    const systemPrompt = `你是一个部署优化智能体，负责优化部署配置和性能。
    
    请以JSON格式返回：
    - optimizations: 优化建议数组
    - performanceImprovements: 性能改进建议
    - securityRecommendations: 安全建议
    - monitoringSetup: 监控配置建议`;

    const userMessage = `部署结果: ${JSON.stringify(deploymentResult)}
    
    请提供优化建议。`;

    return this.sendRequest(systemPrompt, userMessage);
  }

  private async sendRequest(systemPrompt: string, userMessage: string): Promise<any> {
    try {
      const request: ClaudeRequest = {
        model: 'claude-sonnet-4-20250514', // 更新为最新的Claude Sonnet 4模型
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ],
        system: systemPrompt
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true' // 添加必需的CORS头
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // 尝试解析JSON响应
      try {
        return JSON.parse(data.content[0].text);
      } catch {
        return { rawResponse: data.content[0].text };
      }
    } catch (error) {
      console.error('Claude API request failed:', error);
      throw error;
    }
  }
}