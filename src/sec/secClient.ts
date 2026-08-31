/**
 * SEC EDGAR API Client
 * Handles all HTTP communication with SEC API endpoints
 */

import axios, { AxiosInstance } from 'axios';
import { RateLimiter, RateLimiterOptions } from './rateLimiter.js';
import { SecRateLimitError, SecUnavailableError } from '../actor/errors.js';
import { retry } from '../utils/retry.js';
import { Logger } from '../utils/logger.js';

export interface SecClientOptions extends RateLimiterOptions {
  userAgent?: string;
  contactEmail?: string;
  baseURL?: string;
  timeout?: number;
  websiteBaseURL?: string;
}

const SEC_BASE_URL = 'https://data.sec.gov';
const SEC_WEBSITE_BASE_URL = 'https://www.sec.gov';
const MAX_FILING_DOCUMENT_BYTES = 20 * 1024 * 1024;

export function buildFilingDocumentPath(accessionNumber: string, primaryDocument: string): string {
  if (!/^\d{10}-\d{2}-\d{6}$/.test(accessionNumber)) {
    throw new Error('Invalid SEC accession number');
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(primaryDocument)) {
    throw new Error('Invalid SEC primary document name');
  }

  const archiveCik = accessionNumber.slice(0, 10).replace(/^0+/, '') || '0';
  const accessionDigits = accessionNumber.replace(/-/g, '');
  return `/Archives/${archiveCik}/${accessionDigits}/${encodeURIComponent(primaryDocument)}`;
}

export class SecClient {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;
  private logger: Logger;
  private websiteBaseURL: string;

  constructor(options: SecClientOptions = {}) {
    const userAgent = options.userAgent || 'SECFilingIntelligence/1.0';
    const contactEmail = options.contactEmail || 'contact@example.com';
    const userAgentHeader = `${userAgent} (${contactEmail})`;

    this.client = axios.create({
      baseURL: options.baseURL || SEC_BASE_URL,
      timeout: options.timeout || 30000,
      headers: {
        'User-Agent': userAgentHeader,
        'Accept': 'application/json',
      },
    });
    this.websiteBaseURL = (options.websiteBaseURL || SEC_WEBSITE_BASE_URL).replace(/\/$/, '');

    this.rateLimiter = new RateLimiter({
      requestsPerSecond: options.requestsPerSecond,
      globalRateLimit: options.globalRateLimit,
    });

    this.logger = new Logger({
      phase: 'SEC_CLIENT',
    });
  }

  /**
   * Make a GET request with rate limiting and retry logic
   */
  private async request<T>(path: string, description: string): Promise<T> {
    return retry(
      async () => {
        await this.rateLimiter.waitForCapacity();
        this.logger.debug(`SEC request: ${description}`, { path });

        try {
          const response = await this.client.get<T>(path);
          return response.data;
        } catch (error) {
          this.handleError(error, description);
          throw error;
        }
      },
      {
        maxAttempts: 3,
        initialDelayMs: 2000,
        maxDelayMs: 30000,
      },
    );
  }

  /**
   * Handle SEC API errors
   */
  private handleError(error: unknown, description: string): void {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 429) {
        const retryAfter = error.response?.headers['retry-after'];
        const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
        this.logger.warn(`SEC rate limit (429): ${description}`, { retryAfterSeconds });
        throw new SecRateLimitError(retryAfterSeconds);
      }

      if (status && status >= 500) {
        this.logger.warn(`SEC server error (${status}): ${description}`);
        throw new SecUnavailableError(status);
      }

      if (status === 404) {
        this.logger.debug(`SEC not found (404): ${description}`);
        return;
      }

      if (status && status >= 400) {
        this.logger.error(`SEC client error (${status}): ${description}`, error);
        throw error;
      }
    }

    this.logger.error(`Request failed: ${description}`, error);
    throw error;
  }

  /**
   * Get company ticker mappings
   */
  async getCompanyTickers(): Promise<Record<string, unknown>> {
    return this.request(
      `${this.websiteBaseURL}/files/company_tickers.json`,
      'Get company ticker mappings',
    );
  }

  /**
   * Get company submissions (includes filing history)
   */
  async getSubmissions(cik: string): Promise<unknown> {
    const paddedCik = cik.padStart(10, '0');
    return this.request(
      `/submissions/CIK${paddedCik}.json`,
      `Get submissions for CIK ${cik}`,
    );
  }

  /**
   * Get company facts (XBRL data)
   */
  async getCompanyFacts(cik: string): Promise<unknown> {
    const paddedCik = cik.padStart(10, '0');
    return this.request(
      `/api/xbrl/companyfacts/CIK${paddedCik}.json`,
      `Get company facts for CIK ${cik}`,
    );
  }

  /**
   * Get filing document from Edgar
   * Returns the primary document HTML/text
   */
  async getFilingDocument(
    accessionNumber: string,
    primaryDocument: string,
  ): Promise<string> {
    const path = `${this.websiteBaseURL}${buildFilingDocumentPath(accessionNumber, primaryDocument)}`;

    // Filing HTML can be large; retry transient failures while bounding memory use.
    return retry(
      async () => {
        await this.rateLimiter.waitForCapacity();
        this.logger.debug('SEC filing request', { accessionNumber, primaryDocument });

        try {
          const response = await this.client.get<string>(path, {
            headers: { 'Accept': 'text/html,application/xhtml+xml' },
            maxContentLength: MAX_FILING_DOCUMENT_BYTES,
            maxBodyLength: MAX_FILING_DOCUMENT_BYTES,
          });
          return response.data;
        } catch (error) {
          this.handleError(error, `Get filing document ${accessionNumber}`);
          throw error;
        }
      },
      {
        maxAttempts: 3,
        initialDelayMs: 2000,
        maxDelayMs: 30000,
      },
    );
  }

  /**
   * Check if SEC API is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getCompanyTickers();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reset rate limiter (useful for testing)
   */
  resetRateLimit(): void {
    this.rateLimiter.reset();
  }
}
