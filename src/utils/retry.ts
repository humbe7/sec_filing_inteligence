/**
 * Retry logic with exponential backoff and jitter
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Sleep for a given number of milliseconds
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  options: Required<RetryOptions>,
): number {
  const exponentialDelay = Math.min(
    options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1),
    options.maxDelayMs,
  );

  if (!options.jitter) {
    return exponentialDelay;
  }

  // Add ±20% jitter
  const jitterFactor = 0.8 + Math.random() * 0.4;
  return Math.floor(exponentialDelay * jitterFactor);
}

/**
 * Determine if an error should be retried
 */
export function isRetryable(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String(error.code);
    if (['SEC_RATE_LIMIT', 'SEC_UNAVAILABLE', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT'].includes(code)) {
      return true;
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Network errors
    if (message.includes('econnrefused') || message.includes('enotfound') || message.includes('econnreset') || message.includes('eai_again')) {
      return true;
    }
    
    // Timeout
    if (message.includes('timeout')) {
      return true;
    }

    if (message.includes('rate limit') || message.includes('unavailable') || /status code (429|5\d\d)/.test(message)) {
      return true;
    }
  }

  return false;
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === opts.maxAttempts) {
        throw lastError;
      }

      if (!isRetryable(error)) {
        throw lastError;
      }

      const delayMs = calculateDelay(attempt, opts);
      await sleep(delayMs);
    }
  }

  throw lastError || new Error('Retry failed without error');
}
