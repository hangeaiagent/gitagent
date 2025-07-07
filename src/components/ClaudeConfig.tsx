import React, { useState } from 'react';
import { Key, Eye, EyeOff, Settings } from 'lucide-react';

interface ClaudeConfigProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  isConfigured: boolean;
}

const ClaudeConfig: React.FC<ClaudeConfigProps> = ({ apiKey, onApiKeyChange, isConfigured }) => {
  const [showKey, setShowKey] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!isConfigured);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-800">Claude API 配置</h3>
          {isConfigured && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              已配置
            </span>
          )}
        </div>
        <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Key className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800">Claude API Key</h4>
                <p className="text-sm text-blue-600 mt-1">
                  需要Claude API密钥来启用智能分析和自动化部署功能
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• 获取API Key: <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.anthropic.com</a></p>
            <p>• API Key将安全存储在本地，不会上传到服务器</p>
            <p>• 智能体功能需要API Key才能正常工作</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaudeConfig;