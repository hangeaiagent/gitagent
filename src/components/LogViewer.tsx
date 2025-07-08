import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, LogLevel, logger } from '../services/loggerService';
import { Terminal, Filter, Download, Trash2, Search, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface LogViewerProps {
  isActive?: boolean;
  showCategories?: string[];
  maxHeight?: string;
}

const LogViewer: React.FC<LogViewerProps> = ({ 
  isActive = true, 
  showCategories = ['all'],
  maxHeight = '400px'
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<LogLevel[]>([
    LogLevel.INFO, LogLevel.SUCCESS, LogLevel.WARNING, LogLevel.ERROR
  ]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 获取初始日志
    const initialLogs = logger.getAllLogs();
    setLogs(initialLogs);

    // 添加日志监听器
    const handleNewLog = (logEntry: LogEntry) => {
      setLogs(prev => [...prev, logEntry]);
    };

    logger.addListener(handleNewLog);

    return () => {
      logger.removeListener(handleNewLog);
    };
  }, []);

  useEffect(() => {
    // 过滤日志
    let filtered = logs;

    // 按级别过滤
    if (selectedLevels.length > 0) {
      filtered = filtered.filter(log => selectedLevels.includes(log.level));
    }

    // 按类别过滤
    if (!selectedCategories.includes('all')) {
      filtered = filtered.filter(log => 
        log.category && selectedCategories.includes(log.category)
      );
    }

    // 按搜索词过滤
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.agentName && log.agentName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredLogs(filtered);
  }, [logs, selectedLevels, selectedCategories, searchTerm]);

  useEffect(() => {
    // 自动滚动到底部
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG:
        return 'text-gray-400';
      case LogLevel.INFO:
        return 'text-blue-400';
      case LogLevel.SUCCESS:
        return 'text-green-400';
      case LogLevel.WARNING:
        return 'text-yellow-400';
      case LogLevel.ERROR:
        return 'text-red-400';
      case LogLevel.CRITICAL:
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  const getLevelIcon = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG:
        return '🔍';
      case LogLevel.INFO:
        return 'ℹ️';
      case LogLevel.SUCCESS:
        return '✅';
      case LogLevel.WARNING:
        return '⚠️';
      case LogLevel.ERROR:
        return '❌';
      case LogLevel.CRITICAL:
        return '💥';
      default:
        return '📝';
    }
  };

  const getSourceBadge = (source: string): string => {
    switch (source) {
      case 'frontend':
        return 'bg-blue-100 text-blue-800';
      case 'backend':
        return 'bg-green-100 text-green-800';
      case 'ssh':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleLevelToggle = (level: LogLevel) => {
    setSelectedLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => {
      if (category === 'all') {
        return ['all'];
      }
      
      const newCategories = prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev.filter(c => c !== 'all'), category];
      
      return newCategories.length === 0 ? ['all'] : newCategories;
    });
  };

  const clearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const exportLogs = () => {
    const logData = logger.exportLogs();
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gitagent-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const refreshLogs = () => {
    const currentLogs = logger.getAllLogs();
    setLogs(currentLogs);
  };

  const availableCategories = Array.from(new Set(logs.map(log => log.category).filter(Boolean)));

  if (!isExpanded) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-800">系统日志</h3>
            <span className="text-sm text-gray-500">({logs.length} 条)</span>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-blue-600 hover:text-blue-800"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 头部控制栏 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-800">系统日志</h3>
            {isActive && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600">实时监控</span>
              </div>
            )}
            <span className="text-sm text-gray-500">({filteredLogs.length}/{logs.length})</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`p-2 rounded ${autoScroll ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
              title={autoScroll ? '禁用自动滚动' : '启用自动滚动'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`p-2 rounded ${showDetails ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
              title={showDetails ? '隐藏详情' : '显示详情'}
            >
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            
            <button
              onClick={refreshLogs}
              className="p-2 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
              title="刷新日志"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <button
              onClick={exportLogs}
              className="p-2 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
              title="导出日志"
            >
              <Download className="w-4 h-4" />
            </button>
            
            <button
              onClick={clearLogs}
              className="p-2 rounded bg-red-100 text-red-600 hover:bg-red-200"
              title="清空日志"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
              title="收起日志"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="搜索日志..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 过滤器 */}
        <div className="flex flex-wrap gap-4">
          {/* 日志级别过滤 */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">级别:</span>
            {Object.values(LogLevel).map(level => (
              <button
                key={level}
                onClick={() => handleLevelToggle(level)}
                className={`px-2 py-1 text-xs rounded ${
                  selectedLevels.includes(level)
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {getLevelIcon(level)} {level.toUpperCase()}
              </button>
            ))}
          </div>

          {/* 类别过滤 */}
          {availableCategories.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">类别:</span>
              <button
                onClick={() => handleCategoryToggle('all')}
                className={`px-2 py-1 text-xs rounded ${
                  selectedCategories.includes('all')
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                全部
              </button>
              {availableCategories.map(category => (
                <button
                  key={category}
                  onClick={() => handleCategoryToggle(category)}
                  className={`px-2 py-1 text-xs rounded ${
                    selectedCategories.includes(category)
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 日志内容 */}
      <div 
        className="bg-gray-900 text-white font-mono text-sm overflow-y-auto"
        style={{ maxHeight }}
      >
        {filteredLogs.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {logs.length === 0 ? '暂无日志' : '没有匹配的日志'}
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 py-1">
                <span className="text-gray-400 text-xs whitespace-nowrap">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                
                <span className={`${getLevelColor(log.level)} font-medium text-xs`}>
                  [{log.level.toUpperCase()}]
                </span>
                
                <span className={`px-2 py-1 text-xs rounded ${getSourceBadge(log.source)}`}>
                  {log.source}
                </span>
                
                {log.agentName && (
                  <span className="text-purple-400 text-xs">
                    [{log.agentName}]
                  </span>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 break-words">{log.message}</p>
                  {showDetails && log.details && (
                    <p className="text-gray-500 text-xs mt-1 break-words">
                      {log.details}
                    </p>
                  )}
                  {showDetails && log.metadata && (
                    <div className="mt-1 text-xs text-gray-600">
                      <details className="cursor-pointer">
                        <summary className="text-blue-400 hover:text-blue-300">
                          元数据
                        </summary>
                        <pre className="mt-1 text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    </div>
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

export default LogViewer; 