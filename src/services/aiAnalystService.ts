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

/**
 * AI Analyst Service
 * This service is responsible for interacting with a Large Language Model (LLM)
 * to get suggestions for fixing deployment errors.
 */
export class AIAnalystService {
  
  /**
   * Gets a fix suggestion from an AI model.
   * 
   * @param context The context of the error.
   * @returns A promise that resolves to a fix suggestion.
   */
  async getFixSuggestion(context: AIAnalystContext): Promise<AIFixSuggestion> {
    this.logToTerminal(`\n🤔 Analyzing error for command: ${context.failedCommand}`);
    this.logToTerminal(`   - Stderr: ${context.stderr.substring(0, 100)}...`);

    // --- REAL IMPLEMENTATION ---
    // In a real-world scenario, you would make an API call to an LLM like Claude here.
    // You would need to:
    // 1. Get an API key for the service.
    // 2. Use an HTTP client (like fetch or axios) to make a POST request.
    // 3. Construct a detailed prompt with the context.
    // 4. Parse the JSON response to extract the suggested command and explanation.
    //
    // const prompt = this.constructPrompt(context);
    // const response = await fetch('https://api.anthropic.com/v1/messages', {
    //   method: 'POST',
    //   headers: {
    //     'x-api-key': 'YOUR_CLAUDE_API_KEY',
    //     'Content-Type': 'application/json',
    //     'anthropic-version': '2023-06-01'
    //   },
    //   body: JSON.stringify({
    //     model: "claude-3-sonnet-20240229",
    //     max_tokens: 1024,
    //     messages: [{ role: 'user', content: prompt }]
    //   })
    // });
    // const data = await response.json();
    // return this.parseAIResponse(data.content[0].text);
    // -------------------------

    // --- MOCK IMPLEMENTATION ---
    // For now, we simulate the AI's response with a delay and pre-canned answers.
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
    return this.getMockSuggestion(context);
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
   * Constructs a detailed prompt for the LLM.
   */
  private constructPrompt(context: AIAnalystContext): string {
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
   * Parses the JSON response from the LLM.
   */
  private parseAIResponse(responseText: string): AIFixSuggestion {
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

  // This is a dummy log function. In a real implementation, this would
  // be a callback to the terminal UI.
  private logToTerminal(message: string) {
    console.log(`[AI Analyst] ${message}`);
  }
} 