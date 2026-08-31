/**
 * Ticker to CIK resolver
 * Converts ticker symbols to SEC CIK numbers with caching
 */

import { SecClient } from './secClient.js';
import { CompanyNotFoundError, InvalidTickerError } from '../actor/errors.js';
import { SecCompanyTicker } from './secTypes.js';
import { Logger } from '../utils/logger.js';

export interface CompanyIdentity {
  ticker: string;
  cik: string;
  name: string;
  sic?: string;
  category?: string;
}

export class TickerResolver {
  private cache: Map<string, CompanyIdentity> = new Map();
  private cachedAt: Map<string, number> = new Map();
  private cacheMaxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
  private secClient: SecClient;
  private logger: Logger;

  constructor(secClient: SecClient) {
    this.secClient = secClient;
    this.logger = new Logger({ phase: 'TICKER_RESOLVER' });
  }

  /**
   * Resolve ticker symbol to company identity (CIK, name, etc.)
   */
  async resolveTicker(ticker: string): Promise<CompanyIdentity> {
    // Normalize ticker
    const normalizedTicker = ticker.toUpperCase().trim();

    // Validate format
    if (!/^[A-Z]{1,5}$/.test(normalizedTicker)) {
      this.logger.error('Invalid ticker format', { ticker });
      throw new InvalidTickerError(ticker);
    }

    // Check cache
    const cached = this.cache.get(normalizedTicker);
    if (cached) {
      const cachedTime = this.cachedAt.get(normalizedTicker) || 0;
      if (Date.now() - cachedTime < this.cacheMaxAgeMs) {
        this.logger.debug('Cache hit for ticker', { ticker: normalizedTicker });
        return cached;
      }
    }

    // Fetch from SEC
    const company = await this.fetchCompanyTicker(normalizedTicker);

    // Cache result
    this.cache.set(normalizedTicker, company);
    this.cachedAt.set(normalizedTicker, Date.now());

    return company;
  }

  /**
   * Fetch company ticker from SEC API
   */
  private async fetchCompanyTicker(ticker: string): Promise<CompanyIdentity> {
    this.logger.info('Fetching ticker from SEC', { ticker });

    const tickers = await this.secClient.getCompanyTickers() as Record<string, SecCompanyTicker>;

    // Find matching company
    for (const entry of Object.values(tickers)) {
      if (entry.ticker?.toUpperCase() === ticker) {
        const cik = String(entry.cik_str).padStart(10, '0');
        return {
          ticker,
          cik,
          name: entry.title || '',
        };
      }
    }

    this.logger.error('Company not found', { ticker });
    throw new CompanyNotFoundError(ticker);
  }

  /**
   * Normalize CIK to 10-digit format (required by SEC)
   */
  normalizeCik(cik: string | number): string {
    const cikStr = String(cik)
      .replace(/^CIK/, '')  // Remove CIK prefix
      .replace(/^0+/, '')   // Remove leading zeros first
      .trim();              // Trim whitespace

    if (!cikStr || !/^\d{1,10}$/.test(cikStr)) {
      throw new InvalidTickerError(`Invalid CIK: ${cik}`);
    }
    return cikStr.padStart(10, '0');
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    this.cachedAt.clear();
  }

  /**
   * Get cache size (for monitoring)
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}
