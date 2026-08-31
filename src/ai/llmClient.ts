export interface LlmClient {
  completeJson(prompt: string): Promise<unknown>;
}

export class LlmClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmClientError';
  }
}

interface OpenAiResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface AnthropicResponse {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
  error?: {
    message?: string;
  };
}

function boundedInteger(value: number | undefined, fallback: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(maximum, Math.max(minimum, Math.floor(value as number)));
}

export interface OpenAiCompatibleLlmClientOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
}

export interface AnthropicMessagesLlmClientOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
}

/** Minimal OpenAI-compatible client to keep the actor provider-neutral. */
export class OpenAiCompatibleLlmClient implements LlmClient {
  private readonly endpoint: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxOutputTokens: number;

  constructor(private readonly options: OpenAiCompatibleLlmClientOptions) {
    this.endpoint = `${(options.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`;
    this.model = options.model || 'gpt-4o-mini';
    this.timeoutMs = boundedInteger(options.timeoutMs, 30000, 1000, 120000);
    this.maxOutputTokens = boundedInteger(options.maxOutputTokens, 1200, 64, 4096);
  }

  async completeJson(prompt: string): Promise<unknown> {
    let response: Response;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          max_tokens: this.maxOutputTokens,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'You analyze SEC filings. Return only a JSON object. Do not give investment advice or invent evidence.',
            },
            { role: 'user', content: prompt },
          ],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      const message = timedOut
        ? `request timed out after ${this.timeoutMs}ms`
        : error instanceof Error ? error.message : 'Unknown network error';
      throw new LlmClientError(`LLM request failed: ${message}`);
    } finally {
      clearTimeout(timeout);
    }

    const payload = await response.json() as OpenAiResponse;
    if (!response.ok) {
      throw new LlmClientError(payload.error?.message || `LLM request failed with HTTP ${response.status}`);
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new LlmClientError('LLM response did not contain message content');
    }

    try {
      return JSON.parse(content.replace(/^```json\s*|\s*```$/g, '').trim());
    } catch {
      throw new LlmClientError('LLM response was not valid JSON');
    }
  }
}

/** Native Anthropic Messages API client for Claude models. */
export class AnthropicMessagesLlmClient implements LlmClient {
  private readonly endpoint: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxOutputTokens: number;

  constructor(private readonly options: AnthropicMessagesLlmClientOptions) {
    this.endpoint = `${(options.baseUrl || 'https://api.anthropic.com').replace(/\/$/, '')}/v1/messages`;
    this.model = options.model || 'claude-sonnet-4-20250514';
    this.timeoutMs = boundedInteger(options.timeoutMs, 30000, 1000, 120000);
    this.maxOutputTokens = boundedInteger(options.maxOutputTokens, 1200, 64, 4096);
  }

  async completeJson(prompt: string): Promise<unknown> {
    let response: Response;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': this.options.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          max_tokens: this.maxOutputTokens,
          system: 'You analyze SEC filings. Return only a JSON object. Do not give investment advice or invent evidence.',
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      const message = timedOut
        ? `request timed out after ${this.timeoutMs}ms`
        : error instanceof Error ? error.message : 'Unknown network error';
      throw new LlmClientError(`LLM request failed: ${message}`);
    } finally {
      clearTimeout(timeout);
    }

    const payload = await response.json() as AnthropicResponse;
    if (!response.ok) {
      throw new LlmClientError(payload.error?.message || `LLM request failed with HTTP ${response.status}`);
    }

    const content = payload.content?.find(block => block.type === 'text')?.text;
    if (!content) {
      throw new LlmClientError('Claude response did not contain a text content block');
    }

    try {
      return JSON.parse(content.replace(/^```json\s*|\s*```$/g, '').trim());
    } catch {
      throw new LlmClientError('Claude response was not valid JSON');
    }
  }
}
