import OpenAI from 'openai';
import { LLMProvider, CompletionOptions } from './llm';

/**
 * OpenAI-based LLM provider.
 * Pure infrastructure layer - no business logic, just API calls.
 *
 * Accepts messages and configuration, calls OpenAI API, returns raw response.
 * All prompt construction, parsing, and validation happens in the calling layer.
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async complete(options: CompletionOptions): Promise<string> {
    try {
      const {
        messages,
        model = 'gpt-4o-2024-08-06',
        temperature = 0.7,
        ...providerOptions
      } = options;

      const completion = await this.client.chat.completions.create({
        model,
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature,
        ...providerOptions, // Pass through any provider-specific options (e.g., response_format)
      });

      const messageContent = completion.choices[0].message.content;

      if (!messageContent) {
        throw new Error('No content in OpenAI response');
      }

      return messageContent;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API call failed: ${error.message}`);
      }
      throw new Error('OpenAI API call failed with unknown error');
    }
  }
}
