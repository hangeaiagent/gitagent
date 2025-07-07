import React, { useState } from 'react';
import { ExternalLink, Copy, CheckCircle, Code, Server, Play, FileText, Terminal, AlertTriangle } from 'lucide-react';

interface DeploymentSummaryProps {
  summary: {
    projectType: string;
    deploymentPath: string;
    startCommand: string;
    accessUrl?: string;
    installedPackages?: string[];
    deploymentTime?: number;
    realDeploymentInfo?: {
      projectName: string;
      deploymentPath: string;
      serverInfo: string;
      estimatedTime: string;
      requiredActions: string[];
    };
    deploymentCommands?: any;
    deploymentGuide?: any;
  };
}

const DeploymentSummary: React.FC<DeploymentSummaryProps> = ({ summary }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'commands' | 'guide'>('overview');
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(text);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const copyAllCommands = (commands: string[]) => {
    const allCommands = commands.join('\n');
    copyToClipboard(allCommands);
  };

  const realInfo = summary.realDeploymentInfo;
  const commands = summary.deploymentCommands;
  const guide = summary.deploymentGuide;

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
      {/* Header */}
      <div className="p-6 border-b border-green-200">
        <div className="flex items-center space-x-2 mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-green-800">部署分析完成</h3>
        </div>
        
        {realInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800">重要说明</h4>
                <p className="text-sm text-blue-700 mt-1">
                  当前为演示模式，已生成真实的部署策略和命令。实际部署需要在真实服务器环境中执行这些命令。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-white rounded-lg p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-green-100 text-green-800'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            概览信息
          </button>
          <button
            onClick={() => setActiveTab('commands')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'commands'
                ? 'bg-green-100 text-green-800'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            部署命令
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'guide'
                ? 'bg-green-100 text-green-800'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            部署指导
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Real Deployment Info */}
            {realInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Code className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">项目名称</span>
                  </div>
                  <p className="text-sm text-gray-600 pl-6">{realInfo.projectName}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Server className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">服务器信息</span>
                  </div>
                  <div className="flex items-center space-x-2 pl-6">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{realInfo.serverInfo}</code>
                    <button
                      onClick={() => copyToClipboard(realInfo.serverInfo)}
                      className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">部署路径</span>
                  </div>
                  <div className="flex items-center space-x-2 pl-6">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{realInfo.deploymentPath}</code>
                    <button
                      onClick={() => copyToClipboard(realInfo.deploymentPath)}
                      className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Play className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">预计时间</span>
                  </div>
                  <p className="text-sm text-gray-600 pl-6">{realInfo.estimatedTime}</p>
                </div>
              </div>
            )}

            {/* Manual Actions Required */}
            {realInfo?.requiredActions && realInfo.requiredActions.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">需要手动执行的步骤</h4>
                <ul className="space-y-1">
                  {realInfo.requiredActions.map((action, index) => (
                    <li key={index} className="text-yellow-700 text-sm flex items-start">
                      <span className="mr-2">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Legacy Info (fallback) */}
            {!realInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Code className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">项目类型</span>
                  </div>
                  <p className="text-sm text-gray-600 pl-6">{summary.projectType}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Server className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">部署路径</span>
                  </div>
                  <div className="flex items-center space-x-2 pl-6">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{summary.deploymentPath}</code>
                    <button
                      onClick={() => copyToClipboard(summary.deploymentPath)}
                      className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'commands' && commands && (
          <div className="space-y-6">
            {Object.entries(commands).map(([category, commandList]) => {
              if (category === 'manualSteps' || !Array.isArray(commandList)) return null;
              
              return (
                <div key={category} className="bg-white rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-800 capitalize">
                      {category.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <button
                      onClick={() => copyAllCommands(commandList as string[])}
                      className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>复制全部</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(commandList as string[]).map((command, index) => (
                      <div key={index} className="flex items-center space-x-2 group">
                        <code className="flex-1 text-sm bg-gray-900 text-green-400 p-2 rounded font-mono">
                          {command}
                        </code>
                        <button
                          onClick={() => copyToClipboard(command)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-gray-700 transition-all"
                        >
                          {copiedCommand === command ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'guide' && guide && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-medium text-gray-800 mb-2">部署概述</h4>
              <p className="text-gray-600 text-sm">{guide.overview}</p>
            </div>

            {guide.prerequisites && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">前置条件</h4>
                <ul className="space-y-1">
                  {guide.prerequisites.map((prereq: string, index: number) => (
                    <li key={index} className="text-blue-700 text-sm flex items-start">
                      <span className="mr-2">•</span>
                      <span>{prereq}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {guide.steps && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-800">部署步骤</h4>
                {guide.steps.map((step: any, index: number) => (
                  <div key={index} className="bg-white border rounded-lg p-4">
                    <h5 className="font-medium text-gray-800 mb-2">{step.title}</h5>
                    <p className="text-gray-600 text-sm mb-3">{step.description}</p>
                    {step.commands && step.commands.length > 0 && (
                      <div className="space-y-1">
                        {step.commands.map((command: string, cmdIndex: number) => (
                          <code key={cmdIndex} className="block text-sm bg-gray-900 text-green-400 p-2 rounded font-mono">
                            {command}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {guide.troubleshooting && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">常见问题排查</h4>
                <div className="space-y-2">
                  {guide.troubleshooting.commonIssues.map((issue: any, index: number) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium text-yellow-800">{issue.issue}:</span>
                      <span className="text-yellow-700 ml-1">{issue.solution}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentSummary;