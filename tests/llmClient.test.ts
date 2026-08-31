import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnthropicMessagesLlmClient, LlmClientError } from '../src/ai/llmClient.js';

describe('AnthropicMessagesLlmClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a native Messages API request and parses the text block as JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: '{"result":"ok"}' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const client = new AnthropicMessagesLlmClient({ apiKey: 'test-key', model: 'claude-test' });

    await expect(client.completeJson('Analyze this filing.')).resolves.toEqual({ result: 'ok' });

    expect(fetchMock).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', expect.objectContaining({
      headers: expect.objectContaining({
        'x-api-key': 'test-key',
        'anthropic-version': '2023-06-01',
      }),
    }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      model: 'claude-test',
      messages: [{ role: 'user', content: 'Analyze this filing.' }],
    });
  });

  it('throws a clear error when Claude returns no text block', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ content: [] }) }));
    const client = new AnthropicMessagesLlmClient({ apiKey: 'test-key' });

    await expect(client.completeJson('Analyze this filing.')).rejects.toThrow(LlmClientError);
  });
});
