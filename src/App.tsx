import React, { useState, useEffect } from 'react';
import { Bot, Github, Zap, RefreshCw, Terminal as TerminalIcon } from 'lucide-react';
import FileUpload from './components/FileUpload';
import DeploymentProgress from './components/DeploymentProgress';
import DeploymentLogs from './components/DeploymentLogs';
import DeploymentSummary from './components/DeploymentSummary';
import ClaudeConfig from './components/ClaudeConfig';
import AgentStatus from './components/AgentStatus';
import UserPromptModal from './components/UserPromptModal';
import ErrorAnalysisModal, { ErrorAnalysis } from './components/ErrorAnalysisModal';
import SSHTerminal from './components/SSHTerminal';
import LogViewer from './components/LogViewer';
import { useDeployment } from './hooks/useDeployment';
import { DeploymentConfig, ServerConfig } from './types/deployment';
import type { SSHConfig } from './components/SSHTerminal';

function App() {
  const [githubUrl, setGithubUrl] = useState('https://github.com/hangeaiagent/scira');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [serverConfig, setServerConfig] = useState<ServerConfig>({
    host: '44.203.197.203',
    port: 22,
    username: 'ec2-user',
    sshKey: null,
  });
  
  // SSH 终端相关状态
  const [showSSHTerminal, setShowSSHTerminal] = useState(false);
  const [sshConnected, setSSHConnected] = useState(false);
  const [sshConfig, setSSHConfig] = useState<SSHConfig | undefined>();
  const [deploymentMode, setDeploymentMode] = useState<'traditional' | 'real' | 'ssh'>('real');
  
  const { 
    deploymentStatus, 
    errorAnalysis,
    showErrorModal,
    isAnalyzingError,
    startDeployment, 
    startRealDeployment,
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

  // 传统部署方式（模拟）
  const handleTraditionalDeploy = async () => {
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

  // 真实部署方式
  const handleRealDeploy = async () => {
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

    // 使用真实执行引擎
    await startRealDeployment(config);
  };

  // SSH 终端部署方式
  const handleSSHDeploy = async () => {
    if (!githubUrl || !serverConfig.host || !serverConfig.username || !serverConfig.sshKey) {
      alert('请填写所有必要信息');
      return;
    }

    // 读取私钥文件内容
    const privateKeyContent = await serverConfig.sshKey.text();
    
    const config: SSHConfig = {
      host: serverConfig.host,
      port: serverConfig.port,
      username: serverConfig.username,
      privateKey: privateKeyContent
    };

    setSSHConfig(config);
    setShowSSHTerminal(true);
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

  // SSH 连接状态处理
  const handleSSHConnect = (connected: boolean) => {
    setSSHConnected(connected);
    if (connected) {
      console.log('SSH 连接成功');
    }
  };

  const handleSSHError = (error: string) => {
    console.error('SSH 错误:', error);
    alert(`SSH 连接错误: ${error}`);
  };

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
              基于Claude AI的智能部署系统，支持传统部署和SSH终端部署两种模式
            </p>
          </div>

          {/* Claude API Configuration */}
          <ClaudeConfig
            apiKey={claudeApiKey}
            onApiKeyChange={handleApiKeyChange}
            isConfigured={!!claudeApiKey}
          />

          {/* 部署模式选择 */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">部署模式选择</h2>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeploymentMode('traditional')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  deploymentMode === 'traditional'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>模拟部署</span>
              </button>
              <button
                onClick={() => setDeploymentMode('real')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  deploymentMode === 'real'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>真实部署</span>
              </button>
              <button
                onClick={() => setDeploymentMode('ssh')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  deploymentMode === 'ssh'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <TerminalIcon className="w-4 h-4" />
                <span>SSH终端</span>
              </button>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              {deploymentMode === 'traditional' 
                ? '模拟部署流程，显示部署步骤但不执行真实命令'
                : deploymentMode === 'real'
                ? '⚡ 真实执行部署命令，自动修复错误，迭代优化部署流程'
                : '直接在浏览器中使用SSH终端，私钥本地处理，更安全的部署方式'
              }
            </div>
          </div>

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
                  {deploymentMode === 'traditional' ? (
                  <button
                      onClick={handleTraditionalDeploy}
                    disabled={isDeploying || !claudeApiKey}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                      isDeploying || !claudeApiKey
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isDeploying ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                      <span>{isDeploying ? '部署中...' : '模拟部署'}</span>
                    </button>
                  ) : deploymentMode === 'real' ? (
                    <button
                      onClick={handleRealDeploy}
                      disabled={isDeploying || !claudeApiKey}
                      className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                        isDeploying || !claudeApiKey
                          ? 'bg-gray-400 cursor-not-allowed text-white'
                          : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {isDeploying ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      <span>{isDeploying ? '真实部署中...' : '开始真实部署'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSSHDeploy}
                      disabled={isDeploying}
                      className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                        isDeploying
                          ? 'bg-gray-400 cursor-not-allowed text-white'
                          : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
                      }`}
                    >
                      <TerminalIcon className="w-4 h-4" />
                      <span>打开SSH终端</span>
                  </button>
                  )}
                  
                  {(deploymentStatus.stage !== 'idle') && (
                    <button
                      onClick={resetDeployment}
                      className="px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                    >
                      重置
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Deployment Status */}
            <div className="xl:col-span-2 space-y-6">
              {/* SSH Terminal Modal */}
              {showSSHTerminal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-5/6 flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h3 className="text-lg font-semibold flex items-center">
                        <TerminalIcon className="w-5 h-5 mr-2" />
                        SSH 终端 - {serverConfig.username}@{serverConfig.host}
                        {sshConnected && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            已连接
                          </span>
                        )}
                      </h3>
                      <button
                        onClick={() => setShowSSHTerminal(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 p-4">
                      <SSHTerminal
                        sshConfig={sshConfig}
                        onConnect={handleSSHConnect}
                        onError={handleSSHError}
                        className="h-full"
                      />
                    </div>
                    {sshConnected && githubUrl && (
                      <div className="p-4 border-t bg-gray-50">
                        <button
                          onClick={() => {
                            // 在终端中开始自动部署
                            const terminal = document.querySelector('.ssh-terminal');
                            if (terminal) {
                              // 这里可以调用 SSH 终端的自动部署功能
                              console.log('开始自动部署:', githubUrl);
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                        >
                          🚀 开始自动部署
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Traditional Deployment UI */}
              {deploymentMode === 'traditional' && (
                <>
                  {/* 部署流程可视化 */}
                  <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <DeploymentProgress
                  stage={deploymentStatus.stage}
                  progress={deploymentStatus.progress}
                />
            </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AgentStatus
                agents={deploymentStatus.activeAgents}
                currentAgent={deploymentStatus.currentAgent}
              />

                <DeploymentLogs
                  logs={deploymentStatus.logs}
                      isActive={deploymentStatus.stage !== 'idle' && deploymentStatus.stage !== 'completed' && deploymentStatus.stage !== 'failed'}
                />
              </div>
              
              {deploymentStatus.summary && (
                    <DeploymentSummary 
                      summary={deploymentStatus.summary}
                    />
                  )}
                </>
              )}

              {/* Real Deployment UI */}
              {deploymentMode === 'real' && (
                <>
                  {/* 部署流程可视化 */}
                  <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <DeploymentProgress 
                      stage={deploymentStatus.stage} 
                      progress={deploymentStatus.progress} 
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AgentStatus 
                      agents={deploymentStatus.activeAgents}
                      currentAgent={deploymentStatus.currentAgent}
                    />
                    
                    <DeploymentLogs 
                      logs={deploymentStatus.logs} 
                      isActive={deploymentStatus.stage !== 'idle' && deploymentStatus.stage !== 'completed' && deploymentStatus.stage !== 'failed'}
                    />
                  </div>

                  {/* Enhanced Log Viewer for Real Deployment */}
                  <LogViewer 
                    isActive={isDeploying}
                    showCategories={['ssh_execution', 'connection', 'deployment']}
                    maxHeight="500px"
                  />

                  {deploymentStatus.summary && (
                    <DeploymentSummary 
                      summary={deploymentStatus.summary}
                    />
                  )}
                </>
              )}

              {/* SSH Mode Status */}
              {deploymentMode === 'ssh' && !showSSHTerminal && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <TerminalIcon className="w-5 h-5 mr-2" />
                    SSH 终端模式
                  </h2>
                  <div className="text-center py-12">
                    <TerminalIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 mb-2">
                      SSH 终端部署模式
                    </h3>
                    <p className="text-gray-600 mb-6">
                      配置服务器信息后，点击"打开SSH终端"开始安全的部署过程
                    </p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center justify-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        私钥在浏览器本地处理，更安全
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        实时终端交互，完全可控
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                        支持智能错误检测和自动修复
                      </div>
                    </div>
                  </div>
                </div>
              )}
        </div>
      </div>

          {/* 交互式用户输入 */}
          {deploymentStatus.stage === 'waiting-input' && deploymentStatus.userPrompt && (
        <UserPromptModal
          prompt={deploymentStatus.userPrompt}
          onResponse={handleUserResponse}
              onCancel={() => handleUserResponse('cancel')}
            />
          )}

          {/* 错误分析模态框 */}
      <ErrorAnalysisModal
        isOpen={showErrorModal}
            error={deploymentStatus.logs.find(log => log.level === 'error')?.message || '未知错误'}
            analysis={errorAnalysis ? errorAnalysis as ErrorAnalysis : undefined}
        isAnalyzing={isAnalyzingError}
        onClose={() => setShowErrorModal(false)}
        onRetry={handleRetryDeployment}
            context={{}} 
          />
        </div>
      </div>
    </div>
  );
}

export default App;