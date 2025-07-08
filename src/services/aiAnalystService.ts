import { Terminal } from '@xterm/xterm';

export interface DeploymentStep {
  id: string;
  command: string;
  description: string;
  timeout?: number;
  retryCount?: number;
  successPattern?: string;
}

export interface AIAnalystContext {
  failedCommand: string;
  stdout: string;
  stderr: string;
  projectType: string;
  osType?: 'linux' | 'windows' | 'macos';
}

export interface AIFixSuggestion {
  suggestedCommand: string;
  explanation: string;
}

export interface DeploymentConfig {
  githubUrl: string;
  projectType: string;
  deploymentPath?: string;
}

/**
 * AI Analyst Service
 * This service is responsible for interacting with a Large Language Model (LLM)
 * to get suggestions for fixing deployment errors and generating deployment plans.
 */
export class AIAnalystService {
  private terminal: Terminal;

  constructor(terminal: Terminal) {
    this.terminal = terminal;
  }

  /**
   * Generates a deployment plan by analyzing the project.
   * 
   * @param config The deployment configuration containing the GitHub URL and project type.
   * @returns A promise that resolves to an array of deployment steps.
   */
  async generateDeploymentPlan(config: DeploymentConfig): Promise<DeploymentStep[]> {
    this.logToTerminal(`\r\n🤔 AI is analyzing the project: ${config.githubUrl}`);
    this.logToTerminal(`   - Project Type: ${config.projectType}`);

    // --- REAL IMPLEMENTATION ---
    // Here, you would call an LLM with a prompt asking it to generate a JSON array
    // of deployment steps based on the project's characteristics. You might analyze
    // package.json, requirements.txt, etc., to provide more context.
    //
    // const prompt = this.constructPlanPrompt(config);
    // const aiResponse = await this.callClaudeAPI(prompt); 
    // return this.parsePlanResponse(aiResponse);
    // -------------------------

    // --- MOCK IMPLEMENTATION ---
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate analysis delay
    this.logToTerminal('   - Analysis complete. Generating deployment plan...');
    
    const projectName = config.githubUrl.substring(config.githubUrl.lastIndexOf('/') + 1).replace('.git', '');
    const deploymentPath = config.deploymentPath || `~/deployments/${projectName}`;

    const baseSteps: DeploymentStep[] = [
      { id: 'clone_repo', command: `git clone ${config.githubUrl} ${deploymentPath}`, description: 'Clone repository from GitHub' },
      { id: 'navigate_to_dir', command: `cd ${deploymentPath}`, description: 'Navigate into project directory' },
    ];
    
    const projectSpecificSteps = this.getMockProjectSteps(config.projectType);

    this.logToTerminal('   - AI has generated the following plan.');
    return [...baseSteps, ...projectSpecificSteps];
  }

  /**
   * Gets a fix suggestion from an AI model.
   * 
   * @param context The context of the error.
   * @returns A promise that resolves to a fix suggestion.
   */
  async getFixSuggestion(context: AIAnalystContext): Promise<AIFixSuggestion> {
    this.logToTerminal(`\r\n🤔 AI is analyzing an error for command: ${context.failedCommand}`);
    this.logToTerminal(`   - Stderr: ${context.stderr.substring(0, 100)}...`);

    // --- REAL IMPLEMENTATION (as described before) ---
    // const prompt = this.constructFixPrompt(context);
    // ... call LLM API ...
    // return this.parseFixResponse(aiResponse);
    // -------------------------

    // --- MOCK IMPLEMENTATION ---
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
    return this.getMockSuggestion(context);
  }

  /**
   * Mocks a project-specific deployment plan.
   */
  private getMockProjectSteps(projectType: string): DeploymentStep[] {
    switch (projectType.toLowerCase()) {
      case 'react':
      case 'vue':
      case 'angular':
        return [
          { id: 'install_deps', command: 'npm install', description: 'Install Node.js dependencies' },
          { id: 'build_project', command: 'npm run build', description: 'Build the frontend application' },
          { id: 'setup_pm2', command: 'npm install -g pm2', description: 'Ensure PM2 is installed globally' },
          { id: 'start_service', command: 'pm2 serve build 3000 --spa --name gitagent-app --delete-old-pm2', description: 'Serve the build folder with PM2' }
        ];
      case 'python':
        return [
          { id: 'create_venv', command: 'python3 -m venv venv', description: 'Create a Python virtual environment' },
          { id: 'activate_venv', command: 'source venv/bin/activate', description: 'Activate the virtual environment' },
          { id: 'install_deps', command: 'pip install -r requirements.txt', description: 'Install Python dependencies' },
          { id: 'start_gunicorn', command: 'gunicorn app:app -b 0.0.0.0:8000', description: 'Start the application with Gunicorn' }
        ];
      default:
        this.logToTerminal(`\r\n⚠️ No specific plan available for project type '${projectType}'. Using a generic plan.`);
        return [];
    }
  }

  /**
   * Simulates an AI's response based on the error context.
   * This is a placeholder for the actual LLM call.
   */
  private getMockSuggestion(context: AIAnalystContext): AIFixSuggestion {
    const stderr = context.stderr.toLowerCase();
    const cmd = context.failedCommand.toLowerCase();

    if (stderr.includes('command not found')) {
      const missingCommand = stderr.split(':')[1]?.split(' ')[1]?.trim();
      if (missingCommand) {
        let installCommand = '';
        if (context.projectType === 'python') {
            installCommand = `pip install ${missingCommand}`;
        } else {
             // Default to npm/npx for Node.js projects
            installCommand = `npm install -g ${missingCommand}`;
        }
        return {
          suggestedCommand: installCommand,
          explanation: `The command '${missingCommand}' was not found. I suggest installing it globally.`
        };
      }
    }

    if (stderr.includes('permission denied') && !cmd.includes('sudo')) {
      return {
        suggestedCommand: `sudo ${context.failedCommand}`,
        explanation: 'The operation failed due to permission issues. I suggest running it with sudo.'
      };
    }

    if (stderr.includes('eaddrinuse')) {
        // Extracts the port from error messages like 'Error: listen EADDRINUSE: address already in use :::3000'
        const portMatch = stderr.match(/:(\d+)/);
        const port = portMatch ? portMatch[1] : 'the specified port';
        return {
            suggestedCommand: `sudo lsof -t -i:${port} | xargs kill -9`,
            explanation: `The port ${port} is already in use. I suggest finding and killing the process using it.`
        }
    }

    return {
      suggestedCommand: '',
      explanation: 'I was unable to determine a fix for this issue.'
    };
  }

  /**
   * Constructs a detailed prompt for the LLM to get a FIX.
   */
  private constructFixPrompt(context: AIAnalystContext): string {
    return `
      You are an expert system administrator and DevOps engineer. You are assisting in an automated deployment script.
      A command has failed. Please provide a single shell command to fix the issue.
      Your response should be in JSON format with two keys: "suggestedCommand" and "explanation".

      Here is the context of the error:
      - Operating System: ${context.osType || 'Linux'}
      - Project Type: ${context.projectType}
      - Failed Command: \`${context.failedCommand}\`
      
      - STDOUT:
      \`\`\`
      ${context.stdout || '(empty)'}
      \`\`\`

      - STDERR:
      \`\`\`
      ${context.stderr || '(empty)'}
      \`\`\`

      Based on this information, what is the single best command to try next to resolve this error?
      If you cannot determine a command, return an empty string for "suggestedCommand".
    `;
  }

  /**
   * Constructs a detailed prompt for the LLM to get a DEPLOYMENT PLAN.
   */
  private constructPlanPrompt(config: DeploymentConfig): string {
     return `
      You are an expert system administrator and DevOps engineer. Your task is to create a deployment plan for a project.
      Analyze the project details and return a JSON array of deployment steps. Each step should be an object with "id", "command", and "description" keys.
      The plan should be robust and follow best practices.

      Here is the project information:
      - GitHub URL: ${config.githubUrl}
      - Declared Project Type: ${config.projectType}
      - Target Deployment Path: ${config.deploymentPath || '~/deployments/'}

      Please provide the deployment plan as a JSON array.
     `;
  }

  /**
   * Parses the JSON response from the LLM for a FIX.
   */
  private parseFixResponse(responseText: string): AIFixSuggestion {
    try {
        const jsonResponse = JSON.parse(responseText);
        return {
            suggestedCommand: jsonResponse.suggestedCommand || '',
            explanation: jsonResponse.explanation || 'AI did not provide an explanation.'
        };
    } catch (error) {
        console.error("Failed to parse AI response:", error);
        // If parsing fails, maybe the AI just returned a raw command
        return {
            suggestedCommand: responseText.trim(),
            explanation: "Received a raw response from AI."
        };
    }
  }
  
  /**
   * Parses the JSON response from the LLM for a PLAN.
   */
  private parsePlanResponse(responseText: string): DeploymentStep[] {
      try {
          // The AI should return a direct JSON array of steps
          return JSON.parse(responseText);
      } catch (error) {
          console.error("Failed to parse AI plan response:", error);
          this.logToTerminal("\r\n❌ Error: The AI returned an invalid deployment plan. Aborting.");
          return []; // Return an empty plan to gracefully fail
      }
  }

  private logToTerminal(message: string) {
    // Replace newline characters with carriage return + newline for proper terminal display
    const formattedMessage = message.replace(/\n/g, '\r\n');
    this.terminal.write(formattedMessage);
  }
} 