import { OpenAIProvider } from './openai';

/**
 * Message format for LLM completion requests.
 * Compatible with OpenAI chat completions API.
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Options for LLM completion requests.
 * Providers may accept additional provider-specific options.
 */
export interface CompletionOptions {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow provider-specific options (e.g., responseFormat for OpenAI)
}

/**
 * Abstract interface for LLM providers.
 * Pure infrastructure - accepts messages and configuration, returns raw text response.
 * All business logic (prompt construction, parsing, validation) lives in the calling layer.
 */
export interface LLMProvider {
  /**
   * Generate a completion from the LLM.
   * @param options - Messages, model, temperature, and provider-specific options
   * @returns Promise resolving to the raw text response from the LLM
   * @throws Error if the API call fails
   */
  complete(options: CompletionOptions): Promise<string>;
}

/**
 * Get the configured LLM provider instance.
 * Currently returns OpenAIProvider, but can be extended to support other providers.
 */
export function getLLMProvider(): LLMProvider {
  return new OpenAIProvider();
}
