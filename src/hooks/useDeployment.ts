import { useState, useCallback } from 'react';
import { DeploymentConfig, DeploymentStatus, DeploymentLog, UserPrompt, AgentAction } from '../types/deployment';
import { DeploymentService } from '../services/deploymentService';
import { EnhancedDeploymentService } from '../services/enhancedDeploymentService';

export const useDeployment = () => {
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>({
    stage: 'idle',
    progress: 0,
    logs: [],
    activeAgents: [],
  });

  const [errorAnalysis, setErrorAnalysis] = useState<unknown>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isAnalyzingError, setIsAnalyzingError] = useState(false);

  const addLog = useCallback((log: DeploymentLog) => {
    setDeploymentStatus(prev => ({
      ...prev,
      logs: [...prev.logs, log],
    }));
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setDeploymentStatus(prev => ({
      ...prev,
      progress,
    }));
  }, []);

  const updateAgents = useCallback((agents: AgentAction[]) => {
    setDeploymentStatus(prev => ({
      ...prev,
      activeAgents: agents,
    }));
  }, []);

  const showUserPrompt = useCallback((prompt: UserPrompt) => {
    setDeploymentStatus(prev => ({
      ...prev,
      stage: 'waiting-input',
      userPrompt: prompt,
    }));
  }, []);

  const handleError = useCallback((error: unknown, analysis?: unknown) => {
    setIsAnalyzingError(!analysis);
    setErrorAnalysis(analysis);
    setShowErrorModal(true);
    
    if (analysis) {
      addLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'error',
        message: `🧠 智能分析: ${analysis.problemSummary || '检测到部署问题'}`,
        details: analysis.userGuidance || '正在生成解决方案...',
      });
    }
  }, [addLog]);

  const handleUserResponse = useCallback((response: string) => {
    addLog({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'user-input',
      message: `👤 用户输入: ${response}`,
    });

    setDeploymentStatus(prev => ({
      ...prev,
      stage: 'analyzing', // 继续之前的阶段
      userPrompt: undefined,
    }));
  }, [addLog]);

  const startDeployment = useCallback(async (config: DeploymentConfig) => {
    if (!config.claudeApiKey) {
      addLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'error',
        message: '❌ 请先配置Claude API Key',
      });
      return;
    }

    setDeploymentStatus({
      stage: 'connecting',
      progress: 0,
      logs: [],
      activeAgents: [],
    });

    setShowErrorModal(false);
    setErrorAnalysis(null);

    try {
      const deploymentService = new DeploymentService(config.claudeApiKey);
      
      addLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'info',
        message: '🚀 多智能体部署系统启动',
        details: `目标: ${config.githubUrl}`,
      });

      const result = await deploymentService.executeDeployment(
        config,
        addLog,
        updateProgress,
        showUserPrompt,
        updateAgents,
        handleError
      );

      const realInfo = result.realDeploymentInfo;
      const projectName = realInfo?.projectName || 'unknown-project';
      const deploymentPath = realInfo?.deploymentPath || '/home/ubuntu/deployments/my-app';

      setDeploymentStatus(prev => ({
        ...prev,
        stage: 'completed',
        progress: 100,
        summary: {
          projectType: result.projectAnalysis?.projectType || 'Unknown',
          deploymentPath: deploymentPath,
          startCommand: result.projectAnalysis?.startCommand || 'npm start',
          accessUrl: `http://${config.serverConfig.host}:${result.deploymentStrategy?.port || 3000}`,
          installedPackages: result.projectAnalysis?.systemDependencies || [],
          deploymentTime: Date.now(),
          realDeploymentInfo: realInfo,
          deploymentCommands: result.deploymentCommands,
          deploymentGuide: result.deploymentGuide,
        },
      }));

      addLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'success',
        message: '🎉 部署分析完成！',
        details: `项目: ${projectName}, 路径: ${deploymentPath}`,
      });

    } catch (error) {
      addLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'error',
        message: '❌ 部署分析失败',
        details: error instanceof Error ? error.message : '未知错误',
      });
      
      setDeploymentStatus(prev => ({ 
        ...prev, 
        stage: 'failed', 
        progress: 0 
      }));
    }
  }, [addLog, updateProgress, updateAgents, showUserPrompt, handleError]);

  const resetDeployment = useCallback(() => {
    setDeploymentStatus({
      stage: 'idle',
      progress: 0,
      logs: [],
      activeAgents: [],
    });
    setShowErrorModal(false);
    setErrorAnalysis(null);
  }, []);

  const startRealDeployment = useCallback(async (config: DeploymentConfig) => {
    if (!config.claudeApiKey) {
      addLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'error',
        message: '❌ 请先配置Claude API Key',
      });
      return;
    }

    setDeploymentStatus({
      stage: 'connecting',
      progress: 0,
      logs: [],
      activeAgents: [],
    });

    setShowErrorModal(false);
    setErrorAnalysis(null);

    try {
      const enhancedService = new EnhancedDeploymentService(config.claudeApiKey);
      
      addLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'info',
        message: '🚀 启动真实部署流程',
        details: `目标: ${config.githubUrl}`,
      });

      const success = await enhancedService.executeRealDeployment(
        config,
        addLog,
        updateProgress,
        showUserPrompt,
        updateAgents,
        handleError
      );

      if (success) {
        const plan = enhancedService.getCurrentPlan();
        const health = enhancedService.getSystemHealth();
        
        setDeploymentStatus(prev => ({
          ...prev,
          stage: 'completed',
          progress: 100,
          summary: {
            projectType: 'Real Deployment',
            deploymentPath: plan?.steps.find(s => s.id === 'prep')?.commands[0] || '/unknown',
            startCommand: 'pm2 start',
            accessUrl: `http://${config.serverConfig.host}:3000`,
            installedPackages: ['nodejs', 'npm', 'pm2'],
            deploymentTime: Date.now(),
          },
        }));

        addLog({
          id: Date.now().toString(),
          timestamp: new Date(),
          level: 'success',
          message: '🎉 真实部署完成！',
          details: `服务已在 ${config.serverConfig.host} 上成功启动`,
        });
      } else {
        setDeploymentStatus(prev => ({ 
          ...prev, 
          stage: 'failed', 
          progress: 0 
        }));
      }

    } catch (error) {
      addLog({
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'error',
        message: '❌ 真实部署失败',
        details: error instanceof Error ? error.message : '未知错误',
      });
      
      setDeploymentStatus(prev => ({ 
        ...prev, 
        stage: 'failed', 
        progress: 0 
      }));
    }
  }, [addLog, updateProgress, updateAgents, showUserPrompt, handleError]);

  const retryDeployment = useCallback((config: DeploymentConfig) => {
    setShowErrorModal(false);
    startDeployment(config);
  }, [startDeployment]);

  return {
    deploymentStatus,
    errorAnalysis,
    showErrorModal,
    isAnalyzingError,
    startDeployment,
    startRealDeployment,
    resetDeployment,
    retryDeployment,
    handleUserResponse,
    setShowErrorModal,
  };
};