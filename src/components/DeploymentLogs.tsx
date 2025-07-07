import React, { useEffect, useRef } from 'react';
import { Terminal, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { DeploymentLog } from '../types/deployment';

interface DeploymentLogsProps {
  logs: DeploymentLog[];
  isActive: boolean;
}

const DeploymentLogs: React.FC<DeploymentLogsProps> = ({ logs, isActive }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />;
    }
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-blue-400';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Terminal className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-medium text-gray-800">部署日志</h3>
        {isActive && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600">实时监控中</span>
          </div>
        )}
      </div>
      
      <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            等待部署开始...
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3">
                {getLogIcon(log.level)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-xs">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span className={`${getLogColor(log.level)} font-medium`}>
                      [{log.level.toUpperCase()}]
                    </span>
                  </div>
                  <p className="text-gray-300 mt-1">{log.message}</p>
                  {log.details && (
                    <p className="text-gray-500 text-xs mt-1">{log.details}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentLogs;