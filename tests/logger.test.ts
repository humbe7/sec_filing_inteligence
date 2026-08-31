import { afterEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '../src/utils/logger.js';

describe('Logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves an Error message in warning output', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const logger = new Logger({ phase: 'TEST' });

    logger.warn('AI request failed', new Error('Invalid Anthropic API key'));

    const output = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(output.data).toMatchObject({
      errorName: 'Error',
      errorMessage: 'Invalid Anthropic API key',
    });
  });
});
