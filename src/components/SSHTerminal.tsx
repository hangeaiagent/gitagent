import React, { useEffect, useRef, useState } from 'react';
import { Terminal, ITheme } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { AIAnalystService, AIAnalystContext, DeploymentConfig, DeploymentStep } from '../services/aiAnalystService';

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
          this.terminal.write('🔌 WebSocket 连接已建立\r\n');
          this.isConnected = true;
          this.sessionId = sessionId;
          this.sendHello(privateKey, sessionId);
          this.startHeartbeat();
          this.processMessageQueue();
          resolve();
        };
  
        this.ws.onclose = (event) => {
          this.terminal.write(`\r\n🔌 WebSocket 连接已关闭: ${event.reason}\r\n`);
          this.isConnected = false;
          this.stopHeartbeat();
          if (!this.manualDisconnect) {
            this.reconnect(url, privateKey, sessionId);
          }
        };
  
        this.ws.onerror = (event) => {
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
  
        let stdout = '';
        let stderr = '';

        const handler = (event: MessageEvent) => {
          const message = JSON.parse(event.data);
          if (message.commandId === commandId) {
            if(message.type === 'stdout') {
                stdout += message.data;
                this.terminal.write(message.data);
            } else if (message.type === 'stderr') {
                stderr += message.data;
                this.terminal.write(`\x1b[31m${message.data}\x1b[0m`); // Write stderr in red
            }
            else if (message.type === 'command_result') {
              this.ws?.removeEventListener('message', handler);
              clearTimeout(commandTimeout);
              resolve({ stdout, stderr, exitCode: message.exitCode });
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
    this.aiAnalyst = new AIAnalystService(terminal);
  }

  async startDeployment(config: DeploymentConfig) {
    if (this.isDeploying) {
      this.terminal.write('\r\n⚠️ 部署正在进行中，请等待完成\r\n');
      return;
    }

    this.isDeploying = true;
    this.stopMonitoring();
    this.aiFixAttempted = {};

    try {
      // Step 1: Get the deployment plan from the AI
      this.deploymentSteps = await this.aiAnalyst.generateDeploymentPlan(config);

      if (this.deploymentSteps.length === 0) {
        this.terminal.write('\r\n❌ AI未能生成部署计划，任务中止。\r\n');
        this.isDeploying = false;
        return;
      }
      
      this.terminal.write('\r\n\r\n📋 AI-Generated Deployment Plan:\r\n');
      this.deploymentSteps.forEach((step, index) => {
        this.terminal.write(`   ${index + 1}. ${step.description} (\`${step.command}\`)\r\n`);
      });
      this.terminal.write('\r\n');

      // Step 2: Execute the plan
      let deploymentSucceeded = true;
      for (const step of this.deploymentSteps) {
        this.terminal.write(`\r\n🔄 [Executing Step] ${step.description}\r\n`);
        try {
          await this.executeStep(step);
          this.terminal.write(`\r\n✅ [Success] ${step.description}\r\n`);
        } catch (error) {
          this.terminal.write(`\r\n❌ [Failed] ${step.description}\r\n`);
          const canRetry = await this.handleStepError(error as Error, step, config);
          if (canRetry) {
            this.terminal.write(`\r\n🔄 [Retrying Step] ${step.description}\r\n`);
            try {
              await this.executeStep(step);
              this.terminal.write(`\r\n✅ [Success on Retry] ${step.description}\r\n`);
            } catch (retryError) {
              this.terminal.write(`\r\n💥 [Failed on Retry] ${step.description}. Deployment halted.\r\n`);
              deploymentSucceeded = false;
              break;
            }
          } else {
            this.terminal.write('\r\n💥 [Cannot Recover] Deployment halted.\r\n');
            deploymentSucceeded = false;
            break;
          }
        }
      }

      // Step 3: Start monitoring if successful
      if (deploymentSucceeded) {
        this.terminal.write('\r\n\r\n🎉 Deployment plan executed successfully!\r\n');
        this.startMonitoring(config);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.terminal.write(`\r\n💥 An unexpected error occurred: ${errorMessage}\r\n`);
    } finally {
      this.isDeploying = false;
    }
  }

  startMonitoring(config: DeploymentConfig) {
    if (this.isMonitoring) return;
    // For simplicity, health checks are still locally defined for now.
    // They could also be generated by the AI in a future version.
    this.healthCheckSteps = this.generateHealthCheckSteps(config);
    if (this.healthCheckSteps.length === 0) return;

    this.isMonitoring = true;
    this.terminal.write(`\r\n\r\n✅ Starting continuous health monitoring...\r\n`);

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
      this.terminal.write('\r\n🛑 Monitoring stopped.\r\n');
    }
  }

  private async performHealthCheck(): Promise<void> {
    for (const step of this.healthCheckSteps) {
      this.terminal.write(`   - Checking: ${step.description}... `);
      const result = await this.sshClient.executeCommand(step.command, step.timeout);
      const success = result.exitCode === 0 && (!step.successPattern || new RegExp(step.successPattern).test(result.stdout));
      if (!success) {
        this.terminal.write('❌ FAILED\r\n');
        throw new Error(`Health check '${step.description}' failed.`);
      }
      this.terminal.write('✅ OK\r\n');
    }
  }
  
  private async analyzeAndRecover(error: Error, config: DeploymentConfig) {
    this.terminal.write(`\r\n🔍 Analyzing failure for recovery...\r\n`);
    const restartStep = this.generateHealthCheckSteps(config).find(step => step.id.includes('check'));
     if (restartStep) {
        // A simple recovery: just try to restart the service
        const startCommand = this.deploymentSteps.find(step => step.id === 'start_service');
        if(startCommand){
            try {
                await this.sshClient.executeCommand(startCommand.command, startCommand.timeout);
                this.startMonitoring(config);
            } catch (restartError) {
                // permanent failure
            }
        }
     }
  }

  private async executeStep(step: DeploymentStep): Promise<void> {
    const result = await this.sshClient.executeCommand(step.command, step.timeout);
    if (result.exitCode !== 0) {
      throw new Error(`STDOUT: ${result.stdout}\nSTDERR: ${result.stderr}`);
    }
  }

  private async handleStepError(error: Error, step: DeploymentStep, config: DeploymentConfig): Promise<boolean> {
    this.terminal.write(`\r\n🔍 Error details: ${error.message}\r\n`);

    if (!this.aiFixAttempted[step.id]) {
      this.aiFixAttempted[step.id] = true;

      const [stdout, stderr] = this.splitOutput(error.message);
      
      const context: AIAnalystContext = {
        failedCommand: step.command,
        stdout,
        stderr,
        projectType: config.projectType,
      };

      const suggestion = await this.aiAnalyst.getFixSuggestion(context);

      if (suggestion.suggestedCommand) {
        this.terminal.write(`\r\n🧠 AI Suggestion: ${suggestion.explanation}\r\n`);
        this.terminal.write(`   > Will execute: \`${suggestion.suggestedCommand}\`\r\n`);
        
        try {
          await this.executeStep({
            id: `${step.id}_fix`,
            command: suggestion.suggestedCommand,
            description: "Executing AI-suggested fix"
          });
          this.terminal.write('\r\n✅ AI-suggested command executed successfully.\r\n');
          return true; // Retry the original step
        } catch (fixError) {
          this.terminal.write(`\r\n❌ AI fix failed: ${(fixError as Error).message}\r\n`);
          return false;
        }
      } else {
        this.terminal.write('\r\n🤷 AI could not provide a solution.\r\n');
        return false;
      }
    }
    
    this.terminal.write('\r\n💥 Previous fix attempt failed. No more retries for this step.\r\n');
    return false;
  }
  
  private splitOutput(message: string): [string, string] {
    const stdoutMatch = message.match(/STDOUT:([\s\S]*?)STDERR:/);
    const stderrMatch = message.match(/STDERR:([\s\S]*)/);
    const stdout = stdoutMatch ? stdoutMatch[1].trim() : '';
    const stderr = stderrMatch ? stderrMatch[1].trim() : message;
    return [stdout, stderr];
  }

  private generateHealthCheckSteps = (config: DeploymentConfig): DeploymentStep[] => {
    // This is still mock, but could be AI-driven in the future
    return [{
        id: 'health_check_pm2',
        description: `Check if app is online via PM2`,
        command: `pm2 describe gitagent-app`,
        successPattern: 'online',
    }];
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

const SSHTerminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [sshClient, setSSHClient] = useState<EnhancedSSHWebSocketClient | null>(null);
  const [deploymentManager, setDeploymentManager] = useState<ProactiveDeploymentManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const [privateKey, setPrivateKey] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [projectType, setProjectType] = useState('react');
  
  useEffect(() => {
    if (terminalRef.current) {
      const term = new Terminal({ theme: customTheme, fontSize: 14, convertEol: true });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();

      const client = new EnhancedSSHWebSocketClient(term);
      const manager = new ProactiveDeploymentManager(term, client);
      setSSHClient(client);
      setDeploymentManager(manager);

      term.onData((data: string) => client.onData(data));
      term.onResize(() => fitAddon.fit());

      return () => {
        client.disconnect();
        term.dispose();
      };
    }
  }, []);

  const handleConnect = async () => {
    if (sshClient && privateKey) {
      try {
        await sshClient.connect(
          `ws://${window.location.hostname}:3000/ssh`,
          privateKey,
          `session-${Date.now()}`
        );
        setIsConnected(true);
      } catch (error) {
        // error is already written to terminal by the client
        setIsConnected(false);
      }
    }
  };

  const handleStartDeployment = () => {
    if (deploymentManager && githubUrl) {
      const config: DeploymentConfig = {
        githubUrl: githubUrl,
        projectType: projectType,
      };
      deploymentManager.startDeployment(config);
    }
  };

  const controlStyles: React.CSSProperties = {
    padding: '10px',
    backgroundColor: '#252526',
    borderBottom: '1px solid #333',
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
  };

  const sectionStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const inputStyles: React.CSSProperties = {
    padding: '8px',
    border: '1px solid #3c3c3c',
    backgroundColor: '#3c3c3c',
    color: '#d4d4d4',
    borderRadius: '4px',
    fontFamily: 'monospace',
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={controlStyles}>
        <div style={sectionStyles}>
          <label>SSH Private Key</label>
          <textarea 
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="-----BEGIN RSA PRIVATE KEY-----..."
            rows={5}
            style={{...inputStyles, width: '300px'}}
            disabled={isConnected}
          />
          <button onClick={handleConnect} style={buttonStyles} disabled={isConnected}>
            {isConnected ? 'Connected' : 'Connect'}
          </button>
        </div>

        <div style={sectionStyles}>
          <label>GitHub Repository URL</label>
          <input 
            type="text"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/user/repo.git"
            style={{...inputStyles, width: '300px'}}
            disabled={!isConnected}
          />
          <label>Project Type</label>
           <select value={projectType} onChange={(e) => setProjectType(e.target.value)} style={inputStyles} disabled={!isConnected}>
            <option value="react">React/Vue/Angular</option>
            <option value="python">Python</option>
          </select>
          <button onClick={handleStartDeployment} style={{...buttonStyles, backgroundColor: isConnected ? '#0e639c' : '#555'}} disabled={!isConnected}>
            Deploy with AI
          </button>
        </div>
      </div>
      <div ref={terminalRef} style={{ flex: 1, overflow: 'hidden' }} />
    </div>
  );
};

export default SSHTerminal; 