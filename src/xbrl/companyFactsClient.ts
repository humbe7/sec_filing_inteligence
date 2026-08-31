/**
 * XBRL Company Facts Client
 * Fetches structured financial data from SEC EDGAR API
 */

import { SecClient } from '../sec/secClient.js';
import { CompanyFacts, XBRLFact } from './xbrlTypes.js';
import { Logger } from '../utils/logger.js';

export class CompanyFactsClient {
  private secClient: SecClient;
  private logger: Logger;
  private cache: Map<string, CompanyFacts> = new Map();
  private cachedAt: Map<string, number> = new Map();
  private cacheMaxAgeMs = 24 * 60 * 60 * 1000; // 24 hours

  constructor(secClient: SecClient) {
    this.secClient = secClient;
    this.logger = new Logger({ phase: 'COMPANY_FACTS_CLIENT' });
  }

  /**
   * Get company facts (XBRL data) from SEC
   */
  async getCompanyFacts(cik: string): Promise<CompanyFacts> {
    // Normalize CIK
    const normalizedCik = cik.padStart(10, '0');

    // Check cache
    const cached = this.cache.get(normalizedCik);
    if (cached) {
      const cachedTime = this.cachedAt.get(normalizedCik) || 0;
      if (Date.now() - cachedTime < this.cacheMaxAgeMs) {
        this.logger.debug('Cache hit for company facts', { cik: normalizedCik });
        return cached;
      }
    }

    this.logger.info('Fetching company facts from SEC', { cik: normalizedCik });

    try {
      const facts = (await this.secClient.getCompanyFacts(normalizedCik)) as CompanyFacts;

      // Validate structure
      if (!facts || typeof facts !== 'object') {
        this.logger.error('Invalid company facts structure', { cik: normalizedCik });
        return { 'us-gaap': {} };
      }

      // Cache result
      this.cache.set(normalizedCik, facts);
      this.cachedAt.set(normalizedCik, Date.now());

      return facts;
    } catch (error) {
      this.logger.error('Failed to fetch company facts', { error, cik: normalizedCik });
      // Return empty facts rather than failing completely
      return { 'us-gaap': {} };
    }
  }

  /**
   * Get all values for a specific XBRL concept across all periods
   */
  getConceptFacts(facts: CompanyFacts, concept: string): XBRLFact[] {
    const allFacts: XBRLFact[] = [];

    // Check US-GAAP
    if (facts['us-gaap'] && facts['us-gaap'][concept]) {
      allFacts.push(...facts['us-gaap'][concept]);
    }

    // Check IFRS (if available)
    if (facts['ifrs-full'] && facts['ifrs-full'][concept]) {
      allFacts.push(...facts['ifrs-full'][concept]);
    }

    // Check DEI
    if (facts['dei'] && facts['dei'][concept]) {
      allFacts.push(...facts['dei'][concept]);
    }

    return allFacts;
  }

  /**
   * Find best fact for a specific metric, period, and form
   */
  findBestFact(
    facts: XBRLFact[],
    form: string,
    fiscalPeriod?: string,
  ): XBRLFact | null {
    if (facts.length === 0) {
      return null;
    }

    // Filter by form
    let filtered = facts.filter(f => f.form === form || f.form.startsWith(form));

    // Filter by fiscal period if specified
    if (fiscalPeriod) {
      const periodFiltered = filtered.filter(f => f.fp === fiscalPeriod);
      if (periodFiltered.length > 0) {
        filtered = periodFiltered;
      }
    }

    if (filtered.length === 0) {
      return null;
    }

    // Sort by filing date (descending) and return most recent
    return filtered.sort((a, b) => new Date(b.filed).getTime() - new Date(a.filed).getTime())[0];
  }

  /**
   * Filter facts by form type and date range
   */
  filterFactsByPeriod(
    facts: XBRLFact[],
    form: string,
    startDate?: string,
    endDate?: string,
  ): XBRLFact[] {
    let filtered = facts.filter(f => f.form === form);

    if (startDate) {
      filtered = filtered.filter(f => f.end >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(f => f.end <= endDate);
    }

    // Sort by end date descending (most recent first)
    return filtered.sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());
  }

  /**
   * Get all unique fiscal periods for a given form
   */
  getUniquePeriods(facts: XBRLFact[], form: string): string[] {
    const periods = new Set<string>();
    facts.filter(f => f.form === form).forEach(f => periods.add(f.fp));
    return Array.from(periods).sort();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cachedAt.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}
