/**
 * Rate limiter for SEC API requests
 * SEC allows up to 10 requests/second, but we use a conservative default
 */

export interface RateLimiterOptions {
  requestsPerSecond?: number;
  globalRateLimit?: boolean;
}

/**
 * Global rate limiter state
 */
let globalLastRequestTime = 0;
let globalRequestQueue: Promise<void> = Promise.resolve();

export class RateLimiter {
  private requestTimes: number[] = [];
  private minIntervalMs: number;
  private maxRequests: number;
  private windowMs = 1000;
  private useGlobal: boolean;

  constructor(options: RateLimiterOptions = {}) {
    const configuredRate = options.requestsPerSecond ?? 8;
    // SEC guidance limits automated clients to 10 requests per second.
    const requestsPerSecond = Number.isFinite(configuredRate)
      ? Math.min(10, Math.max(1, Math.floor(configuredRate)))
      : 8;
    this.minIntervalMs = Math.ceil(1000 / requestsPerSecond);
    this.maxRequests = requestsPerSecond;
    this.useGlobal = options.globalRateLimit ?? true;
  }

  /**
   * Wait until we can make the next request
   */
  async waitForCapacity(): Promise<void> {
    if (this.useGlobal) {
      await this.waitGlobal();
    } else {
      await this.waitLocal();
    }
  }

  /**
   * Local rate limiter (per instance)
   */
  private async waitLocal(): Promise<void> {
    const now = Date.now();

    // Remove timestamps outside the current window
    this.requestTimes = this.requestTimes.filter(t => now - t < this.windowMs);

    // If we've hit the limit, wait
    if (this.requestTimes.length >= this.maxRequests) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = this.windowMs - (now - oldestRequest) + 1;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      // Recursively check again after waiting
      return this.waitLocal();
    }

    this.requestTimes.push(Date.now());
  }

  /**
   * Global rate limiter (across all instances)
   */
  private async waitGlobal(): Promise<void> {
    // Serialize slot allocation so concurrent callers cannot form a burst.
    const slot = globalRequestQueue.then(async () => {
      const now = Date.now();
      const timeSinceLastRequest = now - globalLastRequestTime;
      if (timeSinceLastRequest < this.minIntervalMs) {
        await new Promise(resolve => setTimeout(resolve, this.minIntervalMs - timeSinceLastRequest));
      }
      globalLastRequestTime = Date.now();
    });
    globalRequestQueue = slot.catch(() => undefined);
    await slot;
  }

  /**
   * Reset the rate limiter (useful for testing)
   */
  reset(): void {
    this.requestTimes = [];
    globalLastRequestTime = 0;
    globalRequestQueue = Promise.resolve();
  }

  /**
   * Get current rate (requests per second)
   */
  getRequestsPerSecond(): number {
    return 1000 / this.minIntervalMs;
  }
}
