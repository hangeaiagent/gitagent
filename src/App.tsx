import React, { useState, useEffect } from 'react';
import SSHTerminal from './components/SSHTerminal'; // Correctly import the default export
import { useDeployment } from './hooks/useDeployment'; 
import './App.css'; 

function App() {
  // Consolidate all state declarations here
  const { 
    deploymentStatus, // Use deploymentStatus to check the stage
    //... any other properties from the hook
  } = useDeployment();

  const [githubUrl, setGithubUrl] = useState('https://github.com/hangeaigent/scira');
  const [privateKey, setPrivateKey] = useState('');
  const [projectType, setProjectType] = useState('react');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  
  // Assuming server config might be needed elsewhere, otherwise it could be simplified
  const [serverAddress, setServerAddress] = useState('44.203.197.203');
  const [username, setUsername] = useState('ec2-user');

  // Define the WebSocket URL state
  const [wsUrl, setWsUrl] = useState('');

  useEffect(() => {
    // Fetch the WebSocket port from the server
    const fetchWsPort = async () => {
      try {
        // We initially try the default port for the API call
        const response = await fetch(`http://${window.location.hostname}:3000/api/ws-port`);
        if (!response.ok) {
          throw new Error('Failed to fetch WebSocket port');
        }
        const data = await response.json();
        const port = data.port;
        setWsUrl(`ws://${window.location.hostname}:${port}/ssh`);
      } catch (error) {
        console.error("Could not determine WebSocket URL, falling back to 3000.", error);
        // Fallback in case the API is unreachable
        setWsUrl(`ws://${window.location.hostname}:3000/ssh`);
      }
    };

    fetchWsPort();
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const keyContent = event.target?.result as string;
        setPrivateKey(keyContent);
      };
      reader.readAsText(file);
    }
  };

  const handleSSHDeploy = () => {
    if (privateKey && githubUrl) {
      setIsTerminalOpen(true);
    } else {
      alert('请先上传私钥并填写GitHub仓库地址。');
    }
  };

  const closeSshTerminal = () => {
    setIsTerminalOpen(false);
  };

  // This is a placeholder for your main UI structure.
  // The important part is the logic for opening the modal terminal.
  return (
    <div className="app-container">
       <div className="deployment-config-form">
        <h1>部署配置</h1>
        <div className="form-group">
            <label>GitHub 项目链接</label>
            <input type="text" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} />
        </div>
        <div className="form-group">
            <label>服务器地址</label>
            <input type="text" value={serverAddress} onChange={e => setServerAddress(e.target.value)} />
        </div>
         <div className="form-group">
            <label>用户名</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="form-group">
            <label>SSH 私钥文件 (.pem)</label>
            <input type="file" onChange={handleFileChange} accept=".pem" />
        </div>
         <div className="form-group">
            <label>项目类型</label>
            <select value={projectType} onChange={e => setProjectType(e.target.value)}>
                <option value="react">React/Vue/Angular</option>
                <option value="python">Python</option>
            </select>
        </div>
        <button 
          onClick={handleSSHDeploy} 
          disabled={deploymentStatus.stage !== 'idle' && deploymentStatus.stage !== 'completed' && deploymentStatus.stage !== 'failed'} // Disable button based on deployment stage
          className="deploy-button"
        >
          打开SSH终端并自动部署
        </button>
      </div>

      {isTerminalOpen && wsUrl && ( // Only render terminal when wsUrl is set
        <div className="ssh-modal-overlay">
          <div className="ssh-modal-content">
             <button onClick={closeSshTerminal} className="ssh-modal-close-button" title="Close Terminal">X</button>
             <SSHTerminal
                privateKey={privateKey}
                githubUrl={githubUrl}
                projectType={projectType}
                wsUrl={wsUrl} // Pass the URL as a prop
                onClose={closeSshTerminal}
                onError={(error: string) => { // Explicitly type the error parameter
                    console.error("SSH Terminal Error:", error);
                    alert(`An error occurred in the terminal: ${error}`);
                    closeSshTerminal();
                }}
             />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;