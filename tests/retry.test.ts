import { describe, expect, it } from 'vitest';
import { SecUnavailableError } from '../src/actor/errors.js';
import { isRetryable, retry } from '../src/utils/retry.js';

describe('retry', () => {
  it('retries transient SEC availability errors', async () => {
    let attempts = 0;
    const result = await retry(async () => {
      attempts += 1;
      if (attempts === 1) throw new SecUnavailableError(503);
      return 'recovered';
    }, { maxAttempts: 2, initialDelayMs: 0, jitter: false });

    expect(result).toBe('recovered');
    expect(attempts).toBe(2);
  });

  it('does not retry validation errors', () => {
    expect(isRetryable(new Error('Invalid input'))).toBe(false);
  });
});
