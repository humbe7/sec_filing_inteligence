/**
 * Unit tests for Ticker Resolver
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TickerResolver } from '../src/sec/tickerResolver.js';
import { CompanyNotFoundError, InvalidTickerError } from '../src/actor/errors.js';
import { SecClient } from '../src/sec/secClient.js';

// Mock SecClient
vi.mock('../src/sec/secClient.js');

describe('TickerResolver', () => {
  let resolver: TickerResolver;
  let mockSecClient: any;

  beforeEach(() => {
    mockSecClient = new SecClient() as any;
    resolver = new TickerResolver(mockSecClient);
  });

  afterEach(() => {
    resolver.clearCache();
    vi.clearAllMocks();
  });

  it('should resolve a valid ticker', async () => {
    mockSecClient.getCompanyTickers.mockResolvedValue({
      '0': {
        cik_str: 1045810,
        ticker: 'NVDA',
        title: 'NVIDIA Corporation',
      },
    });

    const company = await resolver.resolveTicker('NVDA');
    expect(company.ticker).toBe('NVDA');
    expect(company.cik).toBe('0001045810');
    expect(company.name).toBe('NVIDIA Corporation');
  });

  it('should normalize ticker to uppercase', async () => {
    mockSecClient.getCompanyTickers.mockResolvedValue({
      '0': {
        cik_str: 1045810,
        ticker: 'NVDA',
        title: 'NVIDIA Corporation',
      },
    });

    const company = await resolver.resolveTicker('nvda');
    expect(company.ticker).toBe('NVDA');
  });

  it('should cache results', async () => {
    mockSecClient.getCompanyTickers.mockResolvedValue({
      '0': {
        cik_str: 1045810,
        ticker: 'NVDA',
        title: 'NVIDIA Corporation',
      },
    });

    // First call
    await resolver.resolveTicker('NVDA');

    // Clear mock to verify it's not called again
    mockSecClient.getCompanyTickers.mockClear();

    // Second call should use cache
    const company = await resolver.resolveTicker('NVDA');
    expect(company.ticker).toBe('NVDA');
    expect(mockSecClient.getCompanyTickers).not.toHaveBeenCalled();
  });

  it('should throw on invalid ticker format', async () => {
    await expect(resolver.resolveTicker('INVALID123')).rejects.toThrow(InvalidTickerError);
  });

  it('should throw CompanyNotFoundError for unknown ticker', async () => {
    // NOTREAL is only 7 chars but still needs to be valid format
    mockSecClient.getCompanyTickers.mockResolvedValue({
      '0': {
        cik_str: 1045810,
        ticker: 'NVDA',
        title: 'NVIDIA Corporation',
      },
    });

    // Use a valid format but non-existent ticker
    await expect(resolver.resolveTicker('ZZZZZ')).rejects.toThrow(CompanyNotFoundError);
  });

  it('should normalize CIK to 10 digits', () => {
    expect(resolver.normalizeCik(1045810)).toBe('0001045810');
    expect(resolver.normalizeCik('1045810')).toBe('0001045810');
    expect(resolver.normalizeCik('0000001045810')).toBe('0001045810');
  });

  it('should throw on invalid CIK', () => {
    expect(() => resolver.normalizeCik('INVALID')).toThrow(InvalidTickerError);
  });
});
