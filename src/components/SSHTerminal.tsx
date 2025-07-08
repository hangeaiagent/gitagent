import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import { WebglAddon } from '@xterm/addon-webgl';
import { AttachAddon } from '@xterm/addon-attach';
import '@xterm/xterm/css/xterm.css';

interface SSHConfig {
  host: string;
  port: number;
  username: string;
  privateKey: string;
}

interface SSHTerminalProps {
  sshConfig?: SSHConfig;
  onConnect?: (connected: boolean) => void;
  onError?: (error: string) => void;
  onOutput?: (data: string) => void;
  className?: string;
}

interface DeploymentStep {
  id: string;
  command: string;
  description: string;
  timeout?: number;
  retryCount?: number;
}

class SSHWebSocketClient {
  private websocket: WebSocket | null = null;
  private terminal: Terminal;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private onConnectCallback?: (connected: boolean) => void;
  private onErrorCallback?: (error: string) => void;

  constructor(terminal: Terminal) {
    this.terminal = terminal;
  }

  connect(config: SSHConfig, onConnect?: (connected: boolean) => void, onError?: (error: string) => void): Promise<void> {
    this.onConnectCallback = onConnect;
    this.onErrorCallback = onError;

    return new Promise((resolve, reject) => {
      try {
        // 连接到本地 SSH 代理服务
        const wsUrl = `ws://localhost:3000/ssh`;
        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
          this.terminal.write('\r\n🔗 正在连接到服务器...\r\n');
          
          // 发送 SSH 连接配置
          this.websocket?.send(JSON.stringify({
            type: 'connect',
            config: {
              host: config.host,
              port: config.port,
              username: config.username,
              privateKey: config.privateKey
            }
          }));
        };

        this.websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
            
            if (data.type === 'connected') {
              this.reconnectAttempts = 0;
              this.onConnectCallback?.(true);
              resolve();
            } else if (data.type === 'error') {
              this.onErrorCallback?.(data.message);
              reject(new Error(data.message));
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.websocket.onclose = () => {
          this.terminal.write('\r\n❌ 连接已断开\r\n');
          this.onConnectCallback?.(false);
          this.attemptReconnect(config);
        };

        this.websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.onErrorCallback?.('WebSocket连接错误');
          reject(error);
        };

        // 监听终端输入
        this.terminal.onData((data) => {
          if (this.websocket?.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
              type: 'input',
              data
            }));
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'data':
        this.terminal.write(data.content);
        break;
      case 'connected':
        this.terminal.write('\r\n✅ SSH 连接成功!\r\n');
        break;
      case 'error':
        this.terminal.write(`\r\n❌ 错误: ${data.message}\r\n`);
        break;
      case 'disconnected':
        this.terminal.write('\r\n🔌 SSH 连接已断开\r\n');
        break;
    }
  }

  private attemptReconnect(config: SSHConfig) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.terminal.write(`\r\n🔄 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...\r\n`);
      
      setTimeout(() => {
        this.connect(config, this.onConnectCallback, this.onErrorCallback);
      }, 2000 * this.reconnectAttempts);
    } else {
      this.terminal.write('\r\n❌ 重连失败，已达到最大重试次数\r\n');
    }
  }

  executeCommand(command: string): Promise<{ output: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
        reject(new Error('SSH 连接未建立'));
        return;
      }

      const commandId = Date.now().toString();
      let output = '';
      
      const messageHandler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.commandId === commandId) {
            if (data.type === 'command_output') {
              output += data.content;
            } else if (data.type === 'command_complete') {
              this.websocket?.removeEventListener('message', messageHandler);
              resolve({ output, exitCode: data.exitCode });
            } else if (data.type === 'command_error') {
              this.websocket?.removeEventListener('message', messageHandler);
              reject(new Error(data.message));
            }
          }
        } catch (error) {
          console.error('Failed to parse command response:', error);
        }
      };

      this.websocket.addEventListener('message', messageHandler);

      // 发送命令执行请求
      this.websocket.send(JSON.stringify({
        type: 'execute_command',
        commandId,
        command
      }));

      // 设置超时
      setTimeout(() => {
        this.websocket?.removeEventListener('message', messageHandler);
        reject(new Error('命令执行超时'));
      }, 30000);
    });
  }

  disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
}

class AutoDeploymentManager {
  private terminal: Terminal;
  private sshClient: SSHWebSocketClient;
  private deploymentSteps: DeploymentStep[] = [];
  private currentStep = 0;
  private isDeploying = false;

  constructor(terminal: Terminal, sshClient: SSHWebSocketClient) {
    this.terminal = terminal;
    this.sshClient = sshClient;
  }

  async startDeployment(config: {
    githubUrl: string;
    projectType: string;
    deploymentPath?: string;
  }) {
    if (this.isDeploying) {
      this.terminal.write('\r\n⚠️ 部署正在进行中...\r\n');
      return;
    }

    this.isDeploying = true;
    this.currentStep = 0;

    try {
      this.terminal.write('\r\n🚀 开始自动化部署...\r\n');
      
      // 生成部署步骤
      this.deploymentSteps = await this.generateDeploymentSteps(config);
      
      // 执行部署步骤
      for (let i = 0; i < this.deploymentSteps.length; i++) {
        this.currentStep = i;
        const step = this.deploymentSteps[i];
        
        this.terminal.write(`\r\n📋 步骤 ${i + 1}/${this.deploymentSteps.length}: ${step.description}\r\n`);
        
        try {
          await this.executeStep(step);
          this.terminal.write(`✅ 步骤 ${i + 1} 完成\r\n`);
        } catch (error) {
          this.terminal.write(`❌ 步骤 ${i + 1} 失败: ${error.message}\r\n`);
          await this.handleStepError(error, step);
        }
      }

      this.terminal.write('\r\n🎉 部署完成!\r\n');
      
    } catch (error) {
      this.terminal.write(`\r\n❌ 部署失败: ${error.message}\r\n`);
    } finally {
      this.isDeploying = false;
    }
  }

  private async generateDeploymentSteps(config: {
    githubUrl: string;
    projectType: string;
    deploymentPath?: string;
  }): Promise<DeploymentStep[]> {
    const deployPath = config.deploymentPath || '/home/ec2-user/deployment';
    const projectName = this.extractProjectName(config.githubUrl);

    const baseSteps: DeploymentStep[] = [
      {
        id: 'prepare',
        command: `mkdir -p ${deployPath} && cd ${deployPath}`,
        description: '准备部署目录'
      },
      {
        id: 'clone',
        command: `git clone ${config.githubUrl} ${projectName}`,
        description: '克隆项目代码'
      },
      {
        id: 'enter_project',
        command: `cd ${deployPath}/${projectName}`,
        description: '进入项目目录'
      }
    ];

    // 根据项目类型添加特定步骤
    const projectSteps = this.getProjectSpecificSteps(config.projectType);
    
    return [...baseSteps, ...projectSteps];
  }

  private getProjectSpecificSteps(projectType: string): DeploymentStep[] {
    switch (projectType.toLowerCase()) {
      case 'react':
      case 'vue':
      case 'angular':
        return [
          {
            id: 'install_node',
            command: 'curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash - && sudo yum install -y nodejs',
            description: '安装 Node.js'
          },
          {
            id: 'install_deps',
            command: 'npm install',
            description: '安装项目依赖'
          },
          {
            id: 'build',
            command: 'npm run build',
            description: '构建项目'
          },
          {
            id: 'start',
            command: 'npm start',
            description: '启动应用'
          }
        ];
      
      case 'python':
        return [
          {
            id: 'install_python',
            command: 'sudo yum install -y python3 python3-pip',
            description: '安装 Python'
          },
          {
            id: 'install_deps',
            command: 'pip3 install -r requirements.txt',
            description: '安装 Python 依赖'
          },
          {
            id: 'start',
            command: 'python3 app.py',
            description: '启动 Python 应用'
          }
        ];
      
      default:
        return [
          {
            id: 'detect',
            command: 'ls -la && file *',
            description: '检测项目结构'
          }
        ];
    }
  }

  private async executeStep(step: DeploymentStep): Promise<void> {
    try {
      const result = await this.sshClient.executeCommand(step.command);
      
      if (result.exitCode !== 0) {
        throw new Error(`命令执行失败，退出码: ${result.exitCode}`);
      }
      
      return;
    } catch (error) {
      // 重试逻辑
      if (step.retryCount && step.retryCount > 0) {
        this.terminal.write(`🔄 重试步骤: ${step.description}\r\n`);
        step.retryCount--;
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.executeStep(step);
      }
      
      throw error;
    }
  }

  private async handleStepError(error: Error, step: DeploymentStep) {
    this.terminal.write(`\r\n🔍 分析错误...\r\n`);
    
    // 这里可以集成 AI 错误分析
    const errorAnalysis = await this.analyzeError(error.message, step);
    
    if (errorAnalysis.canAutoFix) {
      this.terminal.write(`🔧 尝试自动修复...\r\n`);
      try {
        await this.sshClient.executeCommand(errorAnalysis.fixCommand);
        this.terminal.write(`✅ 自动修复成功\r\n`);
        // 重试原步骤
        await this.executeStep(step);
      } catch (fixError) {
        this.terminal.write(`❌ 自动修复失败: ${fixError.message}\r\n`);
      }
    }
  }

  private async analyzeError(errorMessage: string, step: DeploymentStep): Promise<{
    canAutoFix: boolean;
    fixCommand?: string;
    suggestion?: string;
  }> {
    // 简单的错误分析逻辑，可以扩展为 AI 分析
    if (errorMessage.includes('permission denied')) {
      return {
        canAutoFix: true,
        fixCommand: `sudo chmod +x ${step.command.split(' ')[0]}`,
        suggestion: '权限不足，尝试添加执行权限'
      };
    }
    
    if (errorMessage.includes('command not found')) {
      return {
        canAutoFix: false,
        suggestion: '命令未找到，请检查是否已安装相关软件'
      };
    }
    
    return {
      canAutoFix: false,
      suggestion: '未知错误，请手动检查'
    };
  }

  private extractProjectName(githubUrl: string): string {
    const match = githubUrl.match(/\/([^\/]+)\.git$/);
    return match ? match[1] : 'project';
  }
}

const SSHTerminal: React.FC<SSHTerminalProps> = ({
  sshConfig,
  onConnect,
  onError,
  onOutput,
  className = ''
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [sshClient, setSSHClient] = useState<SSHWebSocketClient | null>(null);
  const [deploymentManager, setDeploymentManager] = useState<AutoDeploymentManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // 初始化终端
  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        selection: '#3a3d41',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      cursorBlink: true,
      rows: 30,
      cols: 100
    });

    // 添加插件
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();
    const clipboardAddon = new ClipboardAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(clipboardAddon);

    // 尝试加载 WebGL 插件
    try {
      const webglAddon = new WebglAddon();
      term.loadAddon(webglAddon);
    } catch (error) {
      console.warn('WebGL addon not available:', error);
    }

    term.open(terminalRef.current);
    fitAddon.fit();

    // 监听窗口大小变化
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    // 监听终端输出
    term.onData((data) => {
      onOutput?.(data);
    });

    // 创建 SSH 客户端和部署管理器
    const client = new SSHWebSocketClient(term);
    const manager = new AutoDeploymentManager(term, client);

    setTerminal(term);
    setSSHClient(client);
    setDeploymentManager(manager);

    // 显示欢迎信息
    term.write('🚀 GitAgent SSH 终端已就绪\r\n');
    term.write('💡 使用说明:\r\n');
    term.write('   - 配置 SSH 连接信息后点击连接\r\n');
    term.write('   - 连接成功后可以开始自动化部署\r\n');
    term.write('   - 支持智能错误检测和自动修复\r\n\r\n');

    return () => {
      window.removeEventListener('resize', handleResize);
      client.disconnect();
      term.dispose();
    };
  }, [onOutput]);

  // SSH 连接
  const connectSSH = useCallback(async (config: SSHConfig) => {
    if (!sshClient) {
      onError?.('SSH 客户端未初始化');
      return;
    }

    try {
      await sshClient.connect(
        config,
        (connected) => {
          setIsConnected(connected);
          onConnect?.(connected);
        },
        (error) => {
          onError?.(error);
        }
      );
    } catch (error) {
      onError?.(error.message);
    }
  }, [sshClient, onConnect, onError]);

  // 开始部署
  const startDeployment = useCallback(async (config: {
    githubUrl: string;
    projectType: string;
  }) => {
    if (!deploymentManager) {
      onError?.('部署管理器未初始化');
      return;
    }

    if (!isConnected) {
      onError?.('请先连接 SSH');
      return;
    }

    await deploymentManager.startDeployment(config);
  }, [deploymentManager, isConnected, onError]);

  // 自动连接
  useEffect(() => {
    if (sshConfig && sshClient && !isConnected) {
      connectSSH(sshConfig);
    }
  }, [sshConfig, sshClient, isConnected, connectSSH]);

  return (
    <div className={`ssh-terminal ${className}`}>
      <div 
        ref={terminalRef} 
        className="terminal-container"
        style={{
          width: '100%',
          height: '400px',
          backgroundColor: '#1e1e1e',
          border: '1px solid #333',
          borderRadius: '4px',
          padding: '8px'
        }}
      />
    </div>
  );
};

export default SSHTerminal;
export { SSHWebSocketClient, AutoDeploymentManager };
export type { SSHConfig, SSHTerminalProps }; 