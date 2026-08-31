/**
 * Unit tests for Rate Limiter
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from '../src/sec/rateLimiter.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ requestsPerSecond: 10, globalRateLimit: false });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should have correct requests per second', () => {
    expect(limiter.getRequestsPerSecond()).toBe(10);
  });

  it('should allow immediate first request', async () => {
    const startTime = Date.now();
    await limiter.waitForCapacity();
    const endTime = Date.now();
    expect(endTime - startTime).toBe(0);
  });

  it('should rate limit subsequent requests', async () => {
    // Make 3 requests in quick succession
    await limiter.waitForCapacity(); // t=0
    vi.advanceTimersByTime(50); // t=50

    await limiter.waitForCapacity(); // t=50, should wait ~100ms
    expect(Date.now()).toBeGreaterThanOrEqual(100);
  });

  it('should reset state', () => {
    limiter.reset();
    expect(limiter.getRequestsPerSecond()).toBe(10);
  });

  it('should cap high rate limits at the SEC maximum', () => {
    const fastLimiter = new RateLimiter({ requestsPerSecond: 100, globalRateLimit: false });
    expect(fastLimiter.getRequestsPerSecond()).toBe(10);
  });

  it('should allow low rate limit', () => {
    const slowLimiter = new RateLimiter({ requestsPerSecond: 1, globalRateLimit: false });
    expect(slowLimiter.getRequestsPerSecond()).toBe(1);
  });
});
