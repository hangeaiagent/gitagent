import React from 'react';
import { Server, Download, Settings, TestTube, CheckCircle, AlertCircle } from 'lucide-react';

interface DeploymentProgressProps {
  stage: 'idle' | 'connecting' | 'analyzing' | 'downloading' | 'installing' | 'testing' | 'completed' | 'failed';
  progress: number;
}

const DeploymentProgress: React.FC<DeploymentProgressProps> = ({ stage, progress }) => {
  const stages = [
    { key: 'connecting', label: '连接服务器', icon: Server },
    { key: 'analyzing', label: '分析项目', icon: Settings },
    { key: 'downloading', label: '下载代码', icon: Download },
    { key: 'installing', label: '安装依赖', icon: Settings },
    { key: 'testing', label: '测试部署', icon: TestTube },
    { key: 'completed', label: '部署完成', icon: CheckCircle },
  ];

  const getStageStatus = (stageKey: string) => {
    const currentIndex = stages.findIndex(s => s.key === stage);
    const stageIndex = stages.findIndex(s => s.key === stageKey);
    
    if (stage === 'failed') {
      return stageIndex < currentIndex ? 'completed' : 'failed';
    }
    
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'active':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-400 bg-gray-100';
    }
  };

  if (stage === 'idle') {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <Server className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">准备开始部署...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-800">部署进度</h3>
        <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="space-y-3">
        {stages.map((stageItem) => {
          const status = getStageStatus(stageItem.key);
          const Icon = stageItem.icon;
          
          return (
            <div key={stageItem.key} className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStageColor(status)}`}>
                {status === 'failed' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span className={`text-sm font-medium ${
                status === 'completed' ? 'text-green-600' :
                status === 'active' ? 'text-blue-600' :
                status === 'failed' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {stageItem.label}
              </span>
              {status === 'active' && (
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {stage === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">部署失败</span>
          </div>
          <p className="text-red-700 text-sm mt-1">请检查服务器配置和网络连接</p>
        </div>
      )}
    </div>
  );
};

export default DeploymentProgress;