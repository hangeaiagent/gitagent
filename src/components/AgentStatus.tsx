import React from 'react';
import { Bot, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { AgentAction } from '../types/deployment';

interface AgentStatusProps {
  agents: AgentAction[];
  currentAgent?: string;
}

const AgentStatus: React.FC<AgentStatusProps> = ({ agents, currentAgent }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'running':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'retry':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'retry':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (agents.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Bot className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-800">智能体状态</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          等待智能体启动...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Bot className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-medium text-gray-800">智能体状态</h3>
        <span className="text-sm text-gray-500">({agents.length} 个智能体)</span>
      </div>

      <div className="space-y-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`p-4 rounded-lg border-2 transition-all ${getStatusColor(agent.status)} ${
              currentAgent === agent.agentName ? 'ring-2 ring-blue-300' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(agent.status)}
                <div>
                  <h4 className="font-medium text-gray-800">{agent.agentName}</h4>
                  <p className="text-sm text-gray-600">{agent.action}</p>
                </div>
              </div>
              
              <div className="text-right">
                {agent.retryCount > 0 && (
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                    重试 {agent.retryCount}/{agent.maxRetries}
                  </span>
                )}
                {agent.status === 'running' && currentAgent === agent.agentName && (
                  <div className="flex items-center space-x-1 mt-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-blue-600">执行中</span>
                  </div>
                )}
              </div>
            </div>

            {agent.error && agent.status === 'failed' && (
              <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-700">
                错误: {agent.error}
              </div>
            )}

            {agent.result && agent.status === 'completed' && (
              <div className="mt-2 p-2 bg-green-100 rounded text-sm text-green-700">
                ✅ 执行成功
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentStatus;