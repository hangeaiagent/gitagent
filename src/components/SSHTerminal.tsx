import React, { useEffect, useRef, useState } from 'react';
import { Terminal, ITheme } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { AIAnalystService, AIAnalystContext } from '../services/aiAnalystService';

interface SSHTerminalProps {
  onOutput?: (data: string) => void;
  onConnect?: () => void;
  onError?: (error: string) => void;
}

interface DeploymentStep {
  id: string;
  command: string;
  description: string;
  timeout?: number;
  retryCount?: number;
  successPattern?: string;
}

interface DeploymentConfig {
  githubUrl: string;
  projectType: string;
  deploymentPath?: string;
}

class EnhancedSSHWebSocketClient {
    private ws: WebSocket | null = null;
    private terminal: Terminal;
    private isConnected = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private heartbeatInterval: number | null = null;
    private manualDisconnect = false;
    private sessionId: string | null = null;
    private messageQueue: string[] = [];
  
    constructor(terminal: Terminal) {
      this.terminal = terminal;
    }
  
    onData(data: string) {
      this.send({ type: 'data', data });
    }
  
    onResize(size: { cols: number, rows: number }) {
      this.send({ type: 'resize', ...size });
    }
  
    async connect(url: string, privateKey: string, sessionId: string): Promise<void> {
      return new Promise((resolve, reject) => {
        this.manualDisconnect = false;
        this.ws = new WebSocket(url);
  
        this.ws.onopen = () => {
          console.log('🔌 WebSocket 连接已建立');
          this.terminal.write('🔌 WebSocket 连接已建立\r\n');
          this.isConnected = true;
          this.sessionId = sessionId;
          this.sendHello(privateKey, sessionId);
          this.startHeartbeat();
          this.processMessageQueue();
          resolve();
        };
  
        this.ws.onclose = (event) => {
          console.log(`🔌 WebSocket 连接已关闭: ${event.reason} (${event.code})`);
          this.terminal.write(`\r\n🔌 WebSocket 连接已关闭: ${event.reason}\r\n`);
          this.isConnected = false;
          this.stopHeartbeat();
          if (!this.manualDisconnect) {
            this.reconnect(url, privateKey, sessionId);
          }
        };
  
        this.ws.onerror = (event) => {
          console.error('🔌 WebSocket 错误:', event);
          this.terminal.write('\r\n🔌 WebSocket 连接错误\r\n');
          this.isConnected = false;
          reject(new Error('WebSocket 连接失败'));
        };
  
        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.type === 'data') {
            this.terminal.write(message.data);
          } else if (message.type === 'heartbeat' && message.status === 'pong') {
            // Heartbeat response
          }
        };
      });
    }
  
    reconnect(url: string, privateKey: string, sessionId: string) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.terminal.write('\r\n🔌 达到最大重连次数，已放弃。\r\n');
        return;
      }
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      this.reconnectAttempts++;
      this.terminal.write(`\r\n🔌 ${delay / 1000}秒后尝试重新连接... (第${this.reconnectAttempts}次)\r\n`);
  
      setTimeout(() => {
        this.connect(url, privateKey, sessionId).catch(() => {
          // connect will call reconnect on its own on failure
        });
      }, delay);
    }
  
    disconnect() {
      this.manualDisconnect = true;
      this.stopHeartbeat();
      this.ws?.close();
    }
  
    private sendHello(privateKey: string, sessionId: string) {
      this.send({
        type: 'auth',
        sessionId: sessionId,
        privateKey: privateKey
      });
    }
  
    private send(message: { type: string, [key: string]: any }) {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      } else {
        this.messageQueue.push(JSON.stringify(message));
      }
    }
  
    private startHeartbeat() {
      this.stopHeartbeat();
      this.heartbeatInterval = window.setInterval(() => {
        this.send({ type: 'heartbeat', status: 'ping' });
      }, 30000);
    }
  
    private stopHeartbeat() {
      if (this.heartbeatInterval) {
        window.clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    }
  
    private processMessageQueue() {
      while (this.messageQueue.length > 0) {
        this.send(JSON.parse(this.messageQueue.shift()!));
      }
    }
  
    async executeCommand(command: string, timeout: number = 60000): Promise<{ stdout: string, stderr: string, exitCode: number }> {
      return new Promise((resolve, reject) => {
        const commandId = `cmd_${Math.random()}`;
        this.send({ type: 'execute', command, commandId });
  
        const handler = (event: MessageEvent) => {
          const message = JSON.parse(event.data);
          if (message.commandId === commandId) {
            if (message.type === 'command_result') {
              this.ws?.removeEventListener('message', handler);
              clearTimeout(commandTimeout);
              resolve({ stdout: message.stdout, stderr: message.stderr, exitCode: message.exitCode });
            }
          }
        };
  
        const commandTimeout = setTimeout(() => {
          this.ws?.removeEventListener('message', handler);
          reject(new Error(`Command timed out after ${timeout}ms`));
        }, timeout);
  
        this.ws?.addEventListener('message', handler);
      });
    }

    sendInterrupt() {
        this.send({ type: 'interrupt' });
    }

    async uploadFile(file: File, remotePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const fileData = (event.target?.result as ArrayBuffer);
                const a = new Uint8Array(fileData);
                this.send({
                    type: 'sftp_upload',
                    path: remotePath,
                    data: Array.from(a),
                });
                resolve();
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    }

    async downloadFile(remotePath: string): Promise<void> {
        const commandId = `sftp_dl_${Math.random()}`;
        this.send({ type: 'sftp_download', path: remotePath, commandId });

        return new Promise((resolve, reject) => {
            const handler = (event: MessageEvent) => {
                const message = JSON.parse(event.data);
                if (message.commandId === commandId && message.type === 'sftp_download_chunk') {
                    const blob = new Blob([new Uint8Array(message.data)], { type: 'application/octet-stream' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = remotePath.split('/').pop() || 'download';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    this.ws?.removeEventListener('message', handler);
                    resolve();
                } else if (message.commandId === commandId && message.type === 'error') {
                    this.ws?.removeEventListener('message', handler);
                    reject(new Error(message.message));
                }
            };
            this.ws?.addEventListener('message', handler);
        });
    }
}

class ProactiveDeploymentManager {
  private terminal: Terminal;
  private sshClient: EnhancedSSHWebSocketClient;
  private deploymentSteps: DeploymentStep[] = [];
  private healthCheckSteps: DeploymentStep[] = [];
  private isDeploying = false;
  private isMonitoring = false;
  private monitoringInterval: number | null = null;
  private aiAnalyst: AIAnalystService;
  private aiFixAttempted: { [stepId: string]: boolean } = {};

  constructor(terminal: Terminal, sshClient: EnhancedSSHWebSocketClient) {
    this.terminal = terminal;
    this.sshClient = sshClient;
    this.aiAnalyst = new AIAnalystService();
  }

  async startDeployment(config: DeploymentConfig) {
    if (this.isDeploying) {
      this.terminal.write('\r\n⚠️ 部署正在进行中，请等待完成\r\n');
      return;
    }

    this.isDeploying = true;
    this.stopMonitoring();
    this.aiFixAttempted = {}; // Reset AI fix attempts for new deployment
    
    try {
      this.terminal.write('\r\n🚀 开始自动化部署流程\r\n');
      this.deploymentSteps = await this.generateDeploymentSteps(config);
      this.terminal.write('📋 部署计划:\r\n');
      this.deploymentSteps.forEach((step, index) => {
        this.terminal.write(`  ${index + 1}. ${step.description}\r\n`);
      });

      let deploymentSucceeded = true;
      for (const step of this.deploymentSteps) {
        this.terminal.write(`\r\n🔄 ${step.description}\r\n`);
        try {
          await this.executeStep(step);
          this.terminal.write(`\r\n✅ 步骤 '${step.description}' 成功\r\n`);
        } catch (error) {
          this.terminal.write(`\r\n❌ 步骤 '${step.description}' 失败\r\n`);
          const canRetry = await this.handleStepError(error as Error, step, config);
          if (canRetry) {
            this.terminal.write(`\r\n🔄 重试步骤 '${step.description}'...\r\n`);
            try {
              await this.executeStep(step);
              this.terminal.write(`\r\n✅ 步骤 '${step.description}' 重试成功\r\n`);
            } catch (retryError) {
              this.terminal.write(`\r\n💥 重试失败，部署中止。\r\n`);
              deploymentSucceeded = false;
              break;
            }
          } else {
            deploymentSucceeded = false;
            break;
          }
        }
      }

      if (deploymentSucceeded) {
        this.terminal.write('\r\n🎉 部署流程完成！\r\n');
        this.startMonitoring(config);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.terminal.write(`\r\n💥 部署失败: ${errorMessage}\r\n`);
    } finally {
      this.isDeploying = false;
    }
  }

  startMonitoring(config: DeploymentConfig) {
    if (this.isMonitoring) return;
    this.healthCheckSteps = this.generateHealthCheckSteps(config);
    if (this.healthCheckSteps.length === 0) return;

    this.isMonitoring = true;
    this.terminal.write(`\r\n\r\n✅ 启动持续健康监控 (每60秒一次)...\r\n`);

    this.monitoringInterval = window.setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.stopMonitoring();
        await this.analyzeAndRecover(error as Error, config);
      }
    }, 60000);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      window.clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    if (this.isMonitoring) {
      this.isMonitoring = false;
      this.terminal.write('\r\n🛑 监控已停止。\r\n');
    }
  }

  private async performHealthCheck(): Promise<void> {
    for (const step of this.healthCheckSteps) {
      this.terminal.write(`   - ${step.description}... `);
      const result = await this.sshClient.executeCommand(step.command, step.timeout);
      const success = result.exitCode === 0 && (!step.successPattern || new RegExp(step.successPattern).test(result.stdout));
      if (!success) {
        this.terminal.write('❌ FAILED\r\n');
        throw new Error(`'${step.description}' 失败. 输出: ${result.stdout || result.stderr}`);
      }
      this.terminal.write('✅ OK\r\n');
    }
  }

  private async analyzeAndRecover(error: Error, config: DeploymentConfig) {
    this.terminal.write(`\r\n🔍 分析故障并尝试恢复...\r\n`);
    const restartStep = this.getProjectSpecificSteps(config.projectType).find(step => step.id === 'start_service');
    if (restartStep) {
      try {
        await this.sshClient.executeCommand(restartStep.command, restartStep.timeout);
        this.startMonitoring(config);
      } catch (restartError) {
        this.terminal.write(`\r\n❌ 恢复失败: ${restartError instanceof Error ? restartError.message : String(restartError)}\r\n`);
      }
    }
  }
  
  private async executeStep(step: DeploymentStep): Promise<void> {
    const result = await this.sshClient.executeCommand(step.command, step.timeout);
    this.terminal.write(result.stdout);
    this.terminal.write(result.stderr);
    if (result.exitCode !== 0) throw new Error(result.stderr || result.stdout);
  }

  private async handleStepError(error: Error, step: DeploymentStep, config: DeploymentConfig): Promise<boolean> {
    this.terminal.write(`\r\n🔍 错误分析: ${error.message}\r\n`);

    // First, try simple, hard-coded fixes
    if (error.message.toLowerCase().includes('permission denied') && !step.command.toLowerCase().includes('sudo')) {
      this.terminal.write('💡 检测到权限问题，自动尝试使用 sudo\r\n');
      step.command = `sudo ${step.command}`;
      return true; // Indicate that the step should be retried
    }

    // If simple fixes fail or don't apply, consult the AI (but only once per step)
    if (!this.aiFixAttempted[step.id]) {
      this.terminal.write('\r\n🤖 简单修复无效，正在向AI大模型请求解决方案...\r\n');
      this.aiFixAttempted[step.id] = true;

      const [stdout, stderr] = this.splitOutput(error.message);
      
      const context: AIAnalystContext = {
        failedCommand: step.command,
        stdout: stdout,
        stderr: stderr,
        projectType: config.projectType,
      };

      const suggestion = await this.aiAnalyst.getFixSuggestion(context);

      if (suggestion.suggestedCommand) {
        this.terminal.write(`\r\n🧠 AI 建议: ${suggestion.explanation}\r\n`);
        this.terminal.write(`   > ${suggestion.suggestedCommand}\r\n`);
        this.terminal.write('\r\n🔧 正在尝试执行AI的建议...\r\n');
        
        try {
          // Execute the AI's suggested command
          await this.executeStep({
            id: `${step.id}_fix`,
            command: suggestion.suggestedCommand,
            description: "执行AI修复命令"
          });
          this.terminal.write('\r\n✅ AI建议的命令执行成功。\r\n');
          // After successful fix, the original step should be retried.
          return true;
        } catch (fixError) {
          const errorMessage = fixError instanceof Error ? fixError.message : String(fixError);
          this.terminal.write(`\r\n❌ AI建议的命令执行失败: ${errorMessage}\r\n`);
          this.terminal.write('   部署中止。\r\n');
          return false; // AI fix failed, do not retry the original step.
        }
      } else {
        this.terminal.write('\r\n🤷 AI无法提供解决方案，部署中止。\r\n');
        return false;
      }
    }

    this.terminal.write('\r\n💥 自动修复失败，部署中止。\r\n');
    return false; // Do not retry
  }
  
  private splitOutput(output: string): [string, string] {
    // This is a simple way to split combined output. A real implementation might need a more robust method.
    const stdoutLines: string[] = [];
    const stderrLines: string[] = [];
    output.split('\n').forEach(line => {
        if (line.toLowerCase().includes('error') || line.toLowerCase().includes('fail')) {
            stderrLines.push(line);
        } else {
            stdoutLines.push(line);
        }
    });
    return [stdoutLines.join('\n'), stderrLines.join('\n')];
  }

  private extractProjectName = (githubUrl: string): string => {
    return githubUrl.substring(githubUrl.lastIndexOf('/') + 1).replace('.git', '');
  };

  private getProjectSpecificSteps = (projectType: string): DeploymentStep[] => {
    switch (projectType.toLowerCase()) {
      case 'react':
      case 'vue':
      case 'angular':
        return [
          { id: 'install_deps', command: 'npm install', description: '安装项目依赖' },
          { id: 'build_project', command: 'npm run build', description: '构建前端项目' },
          { id: 'start_service', command: 'pm2 serve build 3000 --spa', description: '使用PM2启动服务' }
        ];
      default:
        return [];
    }
  }

  private generateDeploymentSteps = async (config: DeploymentConfig): Promise<DeploymentStep[]> => {
    const projectName = this.extractProjectName(config.githubUrl);
    const deploymentPath = config.deploymentPath || `~/deployments/${projectName}`;
    const baseSteps: DeploymentStep[] = [
      { id: 'create_dir', command: `mkdir -p ${deploymentPath}`, description: '创建部署目录' },
      { id: 'clone_repo', command: `git clone ${config.githubUrl} ${deploymentPath} || (cd ${deploymentPath} && git pull)`, description: '克隆或更新代码' },
    ];
    const projectSteps = this.getProjectSpecificSteps(config.projectType);
    return baseSteps.map(s => ({...s, command: `cd ${deploymentPath} && ${s.command}`})).concat(projectSteps);
  }

  private generateHealthCheckSteps = (config: DeploymentConfig): DeploymentStep[] => {
    const projectName = this.extractProjectName(config.githubUrl);
    switch (config.projectType.toLowerCase()) {
      case 'react':
      case 'vue':
      case 'angular':
        return [{
            id: 'health_check_pm2',
            description: `检查 '${projectName}' 进程是否在线`,
            command: `pm2 describe ${projectName} || pm2 describe app`,
            successPattern: 'online',
        }];
      default: return [];
    }
  }
}

const customTheme: ITheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#ffffff',
  selectionBackground: '#ffffff',
  selectionForeground: '#000000',
  black: '#000000', red: '#cd3131', green: '#0dbc79', yellow: '#e5e510',
  blue: '#2472c8', magenta: '#bc3fbc', cyan: '#11a8cd', white: '#ffffff',
  brightBlack: '#808080', brightRed: '#f44747', brightGreen: '#23d18b',
  brightYellow: '#f5f543', brightBlue: '#3b8eea', brightMagenta: '#d670d6',
  brightCyan: '#29b8db', brightWhite: '#ffffff'
};

const SSHTerminal: React.FC<SSHTerminalProps> = ({ onOutput, onConnect, onError }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [sshClient, setSSHClient] = useState<EnhancedSSHWebSocketClient | null>(null);
  const [deploymentManager, setDeploymentManager] = useState<ProactiveDeploymentManager | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // State for UI controls
  const [privateKey, setPrivateKey] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [projectType, setProjectType] = useState('react');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [downloadPath, setDownloadPath] = useState('');

  useEffect(() => {
    if (terminalRef.current) {
      const term = new Terminal({ theme: customTheme, fontSize: 14 });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();

      const client = new EnhancedSSHWebSocketClient(term);
      const manager = new ProactiveDeploymentManager(term, client);
      setSSHClient(client);
      setDeploymentManager(manager);

      term.onData((data: string) => {
        client.onData(data);
        onOutput?.(data);
      });

      term.onResize((size: { cols: number, rows: number }) => client.onResize(size));
      term.focus();

      return () => {
        client.disconnect();
        term.dispose();
      };
    }
  }, [onOutput]);

  const handleConnect = async () => {
    if (sshClient && privateKey) {
      setConnectionStatus('connecting');
      try {
        await sshClient.connect(
          `ws://${window.location.hostname}:3000/ssh`,
          privateKey,
          `session-${Date.now()}`
        );
        setConnectionStatus('connected');
        onConnect?.();
      } catch (error) {
        setConnectionStatus('disconnected');
        onError?.(error instanceof Error ? error.message : String(error));
      }
    } else {
      onError?.('SSH Client not initialized or Private Key is missing.');
    }
  };

  const handleStartDeployment = () => {
    if (deploymentManager && githubUrl) {
      const config: DeploymentConfig = {
        githubUrl: githubUrl,
        projectType: projectType,
      };
      deploymentManager.startDeployment(config);
    } else {
       onError?.('Deployment Manager not initialized or GitHub URL is missing.');
    }
  };

  const handleSftpUpload = async () => {
    if (uploadFile && sshClient) {
        sshClient.uploadFile(uploadFile, `/home/ec2-user/upload/${uploadFile.name}`);
    }
  };

  const handleSftpDownload = async () => {
    if (downloadPath && sshClient) {
      sshClient.downloadFile(downloadPath);
    }
  };
  
  const interruptCommand = () => {
    sshClient?.sendInterrupt();
  };

  const controlStyles: React.CSSProperties = {
    padding: '10px',
    backgroundColor: '#252526',
    borderBottom: '1px solid #333',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px',
    alignItems: 'center',
  };

  const inputStyles: React.CSSProperties = {
    padding: '8px',
    border: '1px solid #3c3c3c',
    backgroundColor: '#3c3c3c',
    color: '#d4d4d4',
    borderRadius: '4px',
  };
  
  const buttonStyles: React.CSSProperties = {
    padding: '8px 15px',
    border: 'none',
    backgroundColor: '#0e639c',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  const sectionStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  };

  const labelStyles: React.CSSProperties = {
    fontSize: '12px',
    color: '#a0a0a0',
  };

  return (
    <div>
      <div style={controlStyles}>
        {/* Connection Section */}
        <div style={sectionStyles}>
          <label style={labelStyles}>SSH Private Key</label>
          <textarea 
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="-----BEGIN RSA PRIVATE KEY-----"
            rows={2}
            style={{...inputStyles, width: '200px', height: '35px'}}
          />
          <button onClick={handleConnect} style={buttonStyles} disabled={connectionStatus === 'connecting'}>
            {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
          </button>
        </div>

        {/* Deployment Section */}
        <div style={sectionStyles}>
          <label style={labelStyles}>GitHub URL</label>
          <input 
            type="text"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/user/repo.git"
            style={inputStyles}
          />
          <select value={projectType} onChange={(e) => setProjectType(e.target.value)} style={inputStyles}>
            <option value="react">React</option>
            <option value="vue">Vue</option>
            <option value="angular">Angular</option>
            <option value="python">Python</option>
          </select>
          <button onClick={handleStartDeployment} style={buttonStyles}>Deploy</button>
        </div>

        {/* SFTP Upload Section */}
        <div style={sectionStyles}>
          <label style={labelStyles}>SFTP Upload</label>
          <input type="file" onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)} style={inputStyles} />
          <button onClick={handleSftpUpload} style={buttonStyles}>Upload</button>
        </div>

        {/* SFTP Download Section */}
        <div style={sectionStyles}>
          <label style={labelStyles}>SFTP Download Path</label>
          <input 
            type="text"
            value={downloadPath}
            onChange={(e) => setDownloadPath(e.target.value)}
            placeholder="/home/user/file.txt"
            style={inputStyles}
          />
          <button onClick={handleSftpDownload} style={buttonStyles}>Download</button>
        </div>
         <div style={sectionStyles}>
          <label style={labelStyles}>Actions</label>
          <button onClick={interruptCommand} style={{...buttonStyles, backgroundColor: '#c72c41'}}>Interrupt (Ctrl+C)</button>
        </div>

      </div>
      <div ref={terminalRef} style={{ height: 'calc(100vh - 150px)', width: '100%' }} />
    </div>
  );
};

export default SSHTerminal; 