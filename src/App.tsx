import React, { useState, useEffect } from 'react';
import { Bot, Github, Server, Zap, RefreshCw } from 'lucide-react';
import FileUpload from './components/FileUpload';
import DeploymentProgress from './components/DeploymentProgress';
import DeploymentLogs from './components/DeploymentLogs';
import DeploymentSummary from './components/DeploymentSummary';
import ClaudeConfig from './components/ClaudeConfig';
import AgentStatus from './components/AgentStatus';
import UserPromptModal from './components/UserPromptModal';
import ErrorAnalysisModal from './components/ErrorAnalysisModal';
import { useDeployment } from './hooks/useDeployment';
import { DeploymentConfig, ServerConfig } from './types/deployment';

function App() {
  const [githubUrl, setGithubUrl] = useState('');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [serverConfig, setServerConfig] = useState<ServerConfig>({
    host: '',
    port: 22,
    username: '',
    sshKey: null,
  });
  
  const { 
    deploymentStatus, 
    errorAnalysis,
    showErrorModal,
    isAnalyzingError,
    startDeployment, 
    resetDeployment, 
    retryDeployment,
    handleUserResponse,
    setShowErrorModal
  } = useDeployment();

  // 从localStorage加载API Key
  useEffect(() => {
    const savedApiKey = localStorage.getItem('claude-api-key');
    if (savedApiKey) {
      setClaudeApiKey(savedApiKey);
    }
  }, []);

  // 保存API Key到localStorage
  const handleApiKeyChange = (key: string) => {
    setClaudeApiKey(key);
    if (key) {
      localStorage.setItem('claude-api-key', key);
    } else {
      localStorage.removeItem('claude-api-key');
    }
  };

  const handleDeploy = async () => {
    if (!githubUrl || !serverConfig.host || !serverConfig.username || !serverConfig.sshKey) {
      alert('请填写所有必要信息');
      return;
    }

    if (!claudeApiKey) {
      alert('请先配置Claude API Key');
      return;
    }

    const config: DeploymentConfig = {
      githubUrl,
      serverConfig,
      claudeApiKey,
    };

    await startDeployment(config);
  };

  const handleRetryDeployment = () => {
    const config: DeploymentConfig = {
      githubUrl,
      serverConfig,
      claudeApiKey,
    };
    retryDeployment(config);
  };

  const isDeploying = deploymentStatus.stage !== 'idle' && 
                     deploymentStatus.stage !== 'completed' && 
                     deploymentStatus.stage !== 'failed';

  const isWaitingInput = deploymentStatus.stage === 'waiting-input';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-white">
                <Bot className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                多智能体自动部署系统
              </h1>
            </div>
            <p className="text-gray-600">
              基于Claude AI的智能部署系统，自动分析项目、规划执行、处理异常，实现全自动化部署
            </p>
          </div>

          {/* Claude API Configuration */}
          <ClaudeConfig
            apiKey={claudeApiKey}
            onApiKeyChange={handleApiKeyChange}
            isConfigured={!!claudeApiKey}
          />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Panel - Configuration */}
            <div className="xl:col-span-1 space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                  <Github className="w-5 h-5 mr-2" />
                  部署配置
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GitHub 项目链接
                    </label>
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/username/repository"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isDeploying}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        服务器地址
                      </label>
                      <input
                        type="text"
                        value={serverConfig.host}
                        onChange={(e) => setServerConfig(prev => ({ ...prev, host: e.target.value }))}
                        placeholder="44.203.197.203"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isDeploying}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SSH 端口
                      </label>
                      <input
                        type="number"
                        value={serverConfig.port}
                        onChange={(e) => setServerConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 22 }))}
                        placeholder="22"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isDeploying}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      用户名
                    </label>
                    <input
                      type="text"
                      value={serverConfig.username}
                      onChange={(e) => setServerConfig(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="ec2-user"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isDeploying}
                    />
                  </div>
                  
                  <FileUpload
                    onFileSelect={(file) => setServerConfig(prev => ({ ...prev, sshKey: file }))}
                    selectedFile={serverConfig.sshKey}
                    accept=".pem,.key,.ppk"
                    label="SSH 私钥文件"
                  />
                </div>
                
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={handleDeploy}
                    disabled={isDeploying || !claudeApiKey}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                      isDeploying || !claudeApiKey
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isDeploying ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>智能体执行中...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        <span>启动多智能体部署</span>
                      </>
                    )}
                  </button>
                  
                  {(deploymentStatus.stage === 'completed' || deploymentStatus.stage === 'failed') && (
                    <button
                      onClick={resetDeployment}
                      className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
                    >
                      <RefreshCw className="w-5 h-5" />
                      <span>重置</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Progress Section */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <DeploymentProgress
                  stage={deploymentStatus.stage}
                  progress={deploymentStatus.progress}
                />
              </div>
            </div>

            {/* Middle Panel - Agent Status */}
            <div className="xl:col-span-1 space-y-6">
              <AgentStatus
                agents={deploymentStatus.activeAgents}
                currentAgent={deploymentStatus.currentAgent}
              />
            </div>

            {/* Right Panel - Logs and Results */}
            <div className="xl:col-span-1 space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <DeploymentLogs
                  logs={deploymentStatus.logs}
                  isActive={isDeploying}
                />
              </div>
              
              {deploymentStatus.summary && (
                <DeploymentSummary summary={deploymentStatus.summary} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Prompt Modal */}
      {isWaitingInput && deploymentStatus.userPrompt && (
        <UserPromptModal
          prompt={deploymentStatus.userPrompt}
          onResponse={handleUserResponse}
          onCancel={() => {
            setDeploymentStatus(prev => ({
              ...prev,
              stage: 'failed',
              userPrompt: undefined,
            }));
          }}
        />
      )}

      {/* Error Analysis Modal */}
      <ErrorAnalysisModal
        isOpen={showErrorModal}
        error={deploymentStatus.logs.filter(log => log.level === 'error').pop()?.message || '未知错误'}
        context={{
          githubUrl,
          serverConfig,
          activeAgents: deploymentStatus.activeAgents
        }}
        analysis={errorAnalysis}
        isAnalyzing={isAnalyzingError}
        onClose={() => setShowErrorModal(false)}
        onRetry={handleRetryDeployment}
        onUserInput={(input) => {
          handleUserResponse(input);
          setShowErrorModal(false);
        }}
        onConfigChange={() => {
          setShowErrorModal(false);
          // 可以在这里添加跳转到配置区域的逻辑
        }}
      />
    </div>
  );
}

export default App;