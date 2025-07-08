import React, { useState, useEffect } from 'react';
import { AlertTriangle, Brain, Lightbulb, Settings, Clock, X, RefreshCw } from 'lucide-react';

export interface ErrorAnalysis {
  errorType: string;
  rootCause: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  solution: string;
  userGuidance: string;
  alternativeCommands?: string[];
  requiresUserInput: boolean;
  userPrompt?: any;
  preventionTips: string[];
  estimatedFixTime: number;
}

interface ErrorAnalysisModalProps {
  isOpen: boolean;
  error: string;
  context: any;
  analysis?: ErrorAnalysis;
  isAnalyzing: boolean;
  onClose: () => void;
  onRetry: () => void;
  onUserInput?: (input: string) => void;
  onConfigChange?: () => void;
}

const ErrorAnalysisModal: React.FC<ErrorAnalysisModalProps> = ({
  isOpen,
  error,
  context,
  analysis,
  isAnalyzing,
  onClose,
  onRetry,
  onUserInput,
  onConfigChange
}) => {
  const [userResponse, setUserResponse] = useState('');

  if (!isOpen) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '❓';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">智能错误分析</h2>
              <p className="text-sm text-gray-600">Claude AI 正在分析问题并提供解决方案</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Details */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-medium text-red-800 mb-2">错误详情</h3>
            <p className="text-red-700 text-sm font-mono bg-red-100 p-2 rounded">
              {error}
            </p>
          </div>

          {/* AI Analysis Loading */}
          {isAnalyzing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Brain className="w-6 h-6 text-blue-600 animate-pulse" />
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-blue-800 font-medium">Claude AI 正在分析错误...</p>
              <p className="text-blue-600 text-sm mt-1">正在生成智能解决方案和用户指导</p>
            </div>
          )}

          {/* AI Analysis Results */}
          {analysis && !isAnalyzing && (
            <div className="space-y-4">
              {/* Severity and Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">错误类型</h4>
                  <p className="text-gray-700">{analysis.errorType}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">严重程度</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getSeverityIcon(analysis.severity ?? 'unknown')}</span>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getSeverityColor(analysis.severity ?? 'unknown')}`}>
                      {(analysis.severity ?? 'unknown').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Root Cause */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  根本原因分析
                </h4>
                <p className="text-yellow-700">{analysis.rootCause}</p>
              </div>

              {/* Solution */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">智能解决方案</h4>
                <p className="text-green-700 mb-3">{analysis.solution}</p>
                
                {analysis.estimatedFixTime && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">预计修复时间: {analysis.estimatedFixTime} 分钟</span>
                  </div>
                )}
              </div>

              {/* User Guidance */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  用户操作指导
                </h4>
                <p className="text-blue-700 whitespace-pre-line">{analysis.userGuidance}</p>
              </div>

              {/* Alternative Commands */}
              {analysis.alternativeCommands && analysis.alternativeCommands.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-medium text-purple-800 mb-2">替代命令</h4>
                  <div className="space-y-2">
                    {analysis.alternativeCommands.map((cmd, index) => (
                      <code key={index} className="block bg-purple-100 p-2 rounded text-sm text-purple-700">
                        {cmd}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Prevention Tips */}
              {analysis.preventionTips && analysis.preventionTips.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-medium text-indigo-800 mb-2">预防建议</h4>
                  <ul className="space-y-1">
                    {analysis.preventionTips.map((tip, index) => (
                      <li key={index} className="text-indigo-700 text-sm flex items-start">
                        <span className="mr-2">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* User Input Required */}
              {analysis.requiresUserInput && analysis.userPrompt && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-800 mb-3">需要您的输入</h4>
                  <p className="text-orange-700 mb-3">{analysis.userPrompt.message}</p>
                  
                  {analysis.userPrompt.inputType === 'select' && analysis.userPrompt.options ? (
                    <select
                      value={userResponse}
                      onChange={(e) => setUserResponse(e.target.value)}
                      className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">请选择...</option>
                      {analysis.userPrompt.options.map((option: string, index: number) => (
                        <option key={index} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <textarea
                      value={userResponse}
                      onChange={(e) => setUserResponse(e.target.value)}
                      placeholder="请输入您的回复..."
                      className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 resize-none"
                      rows={3}
                    />
                  )}
                  
                  <button
                    onClick={() => onUserInput && onUserInput(userResponse)}
                    disabled={!userResponse.trim()}
                    className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    提交回复
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <button
              onClick={onRetry}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>重试部署</span>
            </button>
            
            {onConfigChange && (
              <button
                onClick={onConfigChange}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>修改配置</span>
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorAnalysisModal;