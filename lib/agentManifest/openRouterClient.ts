/**
 * Simplified OpenRouter Client for Agent Manifest Generation
 * Minimal implementation without large prompts for serverless functions
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  created: number;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

/**
 * Safely get environment variable from process.env
 * For serverless functions, only process.env is available
 */
function getEnvVar(key: string): string | undefined {
  // In serverless functions (Vercel), use process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  
  return undefined;
}

/**
 * Simple OpenRouter client for manifest generation
 */
export class SimpleOpenRouterClient {
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(apiKey: string, model: string = 'anthropic/claude-sonnet-4.5') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = 'https://openrouter.ai/api/v1';
  }

  /**
   * Make chat completion request to OpenRouter
   */
  async chat(
    messages: ChatMessage[],
    options?: {
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://anoteroslogos.com',
          'X-Title': 'Anóteros Lógos Agent Manifest Generator',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.max_tokens ?? 2000,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as OpenRouterError;
        throw new Error(
          `OpenRouter API error: ${errorData.error.message} (${errorData.error.code})`
        );
      }

      const data = (await response.json()) as OpenRouterResponse;

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from AI model');
      }

      return data.choices[0].message.content;
    } catch (error) {
      if (error instanceof Error) {
        console.error('OpenRouter API error:', error.message);
        throw error;
      }
      throw new Error('Unknown error occurred while calling OpenRouter API');
    }
  }
}

/**
 * Create OpenRouter client from environment variables
 * For serverless functions, reads from process.env.OPENROUTER_API_KEY
 */
export function createSimpleOpenRouterClient(): SimpleOpenRouterClient | null {
  const apiKey = getEnvVar('OPENROUTER_API_KEY');
  
  if (!apiKey) {
    console.warn('OpenRouter API key not found. AI service will be disabled.');
    return null;
  }

  return new SimpleOpenRouterClient(apiKey);
}
