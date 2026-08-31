/**
 * XBRL Company Facts Client
 * Fetches structured financial data from SEC EDGAR API
 */

import { SecClient } from '../sec/secClient.js';
import { CompanyFacts, XBRLFact } from './xbrlTypes.js';
import { Logger } from '../utils/logger.js';

export interface FactSelectionOptions {
  accessionNumber?: string;
  reportDate?: string;
  periodType?: 'instant' | 'duration';
  minDurationDays?: number;
  maxDurationDays?: number;
}

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
      const response = await this.secClient.getCompanyFacts(normalizedCik);
      const facts = this.normalizeCompanyFacts(response);

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
    accessionNumber?: string,
    options: FactSelectionOptions = {},
  ): XBRLFact | null {
    if (facts.length === 0) {
      return null;
    }

    // Filter by form
    let filtered = facts.filter(f => f.form === form || f.form.startsWith(form));

    const selectedAccession = options.accessionNumber || accessionNumber;
    if (selectedAccession) {
      filtered = filtered.filter(f => f.accn === selectedAccession);
    }

    // Filter by fiscal period if specified
    if (fiscalPeriod) {
      const periodFiltered = filtered.filter(f => f.fp === fiscalPeriod);
      if (periodFiltered.length > 0) {
        filtered = periodFiltered;
      }
    }

    if (options.reportDate) {
      filtered = filtered.filter(f => f.end === options.reportDate);
    }

    if (options.periodType === 'instant') {
      filtered = filtered.filter(f => !f.start);
    } else if (options.periodType === 'duration') {
      filtered = filtered.filter(f => this.durationDays(f) !== null);
    }

    if (options.minDurationDays !== undefined || options.maxDurationDays !== undefined) {
      filtered = filtered.filter(f => {
        const durationDays = this.durationDays(f);
        return durationDays !== null
          && (options.minDurationDays === undefined || durationDays >= options.minDurationDays)
          && (options.maxDurationDays === undefined || durationDays <= options.maxDurationDays);
      });
    }

    if (filtered.length === 0) {
      return null;
    }

    const hasPeriodConstraint = Boolean(
      options.reportDate || options.periodType || options.minDurationDays !== undefined || options.maxDurationDays !== undefined,
    );
    return filtered.sort((a, b) => {
      if (!hasPeriodConstraint) {
        return new Date(b.filed).getTime() - new Date(a.filed).getTime();
      }
      const durationA = this.durationDays(a) ?? Number.POSITIVE_INFINITY;
      const durationB = this.durationDays(b) ?? Number.POSITIVE_INFINITY;
      return durationA - durationB || new Date(b.filed).getTime() - new Date(a.filed).getTime();
    })[0];
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

  private durationDays(fact: XBRLFact): number | null {
    if (!fact.start) return null;
    const start = new Date(fact.start).getTime();
    const end = new Date(fact.end).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    return Math.round((end - start) / (1000 * 60 * 60 * 24));
  }

  /** Normalize the SEC's taxonomy-and-units response into the internal fact map. */
  private normalizeCompanyFacts(response: unknown): CompanyFacts {
    if (!response || typeof response !== 'object') {
      return { 'us-gaap': {} };
    }

    const root = response as Record<string, unknown>;
    const rawTaxonomies = root.facts;
    if (!rawTaxonomies || typeof rawTaxonomies !== 'object') {
      return response as CompanyFacts;
    }

    const normalized: CompanyFacts = { 'us-gaap': {} };
    for (const [taxonomy, rawConcepts] of Object.entries(rawTaxonomies as Record<string, unknown>)) {
      if (!rawConcepts || typeof rawConcepts !== 'object') continue;

      const taxonomyFacts: Record<string, XBRLFact[]> = {};
      for (const [conceptName, rawConcept] of Object.entries(rawConcepts as Record<string, unknown>)) {
        if (!rawConcept || typeof rawConcept !== 'object') continue;
        const units = (rawConcept as Record<string, unknown>).units;
        if (!units || typeof units !== 'object') continue;

        const facts: XBRLFact[] = [];
        for (const [unit, rawFacts] of Object.entries(units as Record<string, unknown>)) {
          if (!Array.isArray(rawFacts)) continue;
          for (const rawFact of rawFacts) {
            const fact = this.normalizeFact(rawFact, unit);
            if (fact) facts.push(fact);
          }
        }

        if (facts.length > 0) {
          taxonomyFacts[`${taxonomy}:${conceptName}`] = facts;
        }
      }

      if (taxonomy === 'us-gaap') {
        normalized['us-gaap'] = taxonomyFacts;
      } else if (taxonomy === 'ifrs-full') {
        normalized['ifrs-full'] = taxonomyFacts;
      } else if (taxonomy === 'dei') {
        normalized.dei = taxonomyFacts;
      }
    }

    return normalized;
  }

  private normalizeFact(rawFact: unknown, unit: string): XBRLFact | null {
    if (!rawFact || typeof rawFact !== 'object') return null;
    const fact = rawFact as Record<string, unknown>;
    if (typeof fact.accn !== 'string' || typeof fact.form !== 'string' || typeof fact.filed !== 'string'
      || typeof fact.end !== 'string' || typeof fact.val !== 'number') {
      return null;
    }

    return {
      accn: fact.accn,
      fy: typeof fact.fy === 'number' ? fact.fy : 0,
      fp: typeof fact.fp === 'string' ? fact.fp : '',
      form: fact.form,
      filed: fact.filed,
      start: typeof fact.start === 'string' ? fact.start : '',
      end: fact.end,
      val: fact.val,
      accn_fp: `${fact.accn}_${typeof fact.fp === 'string' ? fact.fp : ''}`,
      unit,
      negating: typeof fact.negating === 'number' ? fact.negating : 0,
    };
  }
}
