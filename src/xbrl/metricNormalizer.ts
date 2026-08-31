/**
 * Financial Metric Normalizer
 * Maps XBRL concepts to canonical financial metrics
 * Handles multiple concept aliases and fallback logic
 */

import {
  FinancialMetric,
  US_GAAP_CONCEPT_MAPPINGS,
  XBRLFact,
  FinancialValue,
  PeriodType,
} from './xbrlTypes.js';

export interface MetricResolution {
  metric: FinancialMetric;
  value: FinancialValue;
  concepts: string[];
  selectedConcept: string;
  confidence: number;
}

export class MetricNormalizer {

  /**
   * Resolve a financial metric to concrete XBRL concepts
   */
  resolveConcepts(metric: FinancialMetric): string[] {
    const concepts = US_GAAP_CONCEPT_MAPPINGS[metric];
    return concepts || [];
  }

  /**
   * Find best fact for a metric given multiple candidates
   */
  selectBestFact(
    metric: FinancialMetric,
    candidates: XBRLFact[],
    form: string,
  ): { fact: XBRLFact; concept: string; confidence: number } | null {
    if (candidates.length === 0) {
      return null;
    }

    // Prefer more recent filings
    const sorted = candidates.sort((a, b) => new Date(b.filed).getTime() - new Date(a.filed).getTime());

    // Get the first (most recent) with highest confidence
    const best = sorted[0];
    const confidence = this.calculateConfidence(metric, best, form);

    // Find which concept this came from
    const concepts = this.resolveConcepts(metric);
    let selectedConcept = 'unknown';

    // Try to match the fact to a concept (this would be known from the calling context)
    // For now, we'll just use the first concept as a placeholder
    if (concepts.length > 0) {
      selectedConcept = concepts[0];
    }

    return {
      fact: best,
      concept: selectedConcept,
      confidence,
    };
  }

  /**
   * Calculate confidence score for a metric
   * Considers: data source, consistency, form type, unit, recency
   */
  private calculateConfidence(_metric: FinancialMetric, fact: XBRLFact, form: string): number {
    let confidence = 0.95; // Start high

    // Penalty for amendments (10-Q/A, 10-K/A)
    if (form.includes('/A')) {
      confidence -= 0.05;
    }

    // Penalty for 8-K (less reliable than 10-Q/10-K)
    if (form === '8-K') {
      confidence -= 0.15;
    }

    // Penalty for non-standard units
    if (fact.unit !== 'USD' && fact.unit !== 'shares') {
      confidence -= 0.1;
    }

    // Penalty for zero or very small values (might be missing)
    if (Math.abs(fact.val) < 1000) {
      confidence -= 0.05;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Normalize fact to financial value
   */
  normalizeToValue(
    metric: FinancialMetric,
    fact: XBRLFact,
    concept: string,
    form: string,
  ): FinancialValue {
    // Apply negating flag if needed
    const value = fact.negating ? -fact.val : fact.val;

    // Determine unit
    let unit = 'USD';
    if (fact.unit.includes('per-share') || (fact.unit.includes('USD') && fact.unit.includes('shares'))) {
      unit = 'USD/share';
    } else if (fact.unit.includes('shares')) {
      unit = 'shares';
    }

    return {
      metric,
      value,
      unit,
      concept,
      source: 'XBRL',
      confidence: this.calculateConfidence(metric, fact, form),
      periodEnd: fact.end,
      fiscalYear: fact.fy,
      fiscalPeriod: fact.fp,
      filingDate: fact.filed,
      accessionNumber: fact.accn,
      periodType: fact.start ? PeriodType.DURATION : PeriodType.INSTANT,
      durationDays: fact.start
        ? Math.round((new Date(fact.end).getTime() - new Date(fact.start).getTime()) / (1000 * 60 * 60 * 24))
        : undefined,
    };
  }

  /**
   * Calculate derived metrics (margins, etc.)
   */
  calculateDerivedMetric(
    _metric: FinancialMetric,
    numeratorValue?: number,
    denominatorValue?: number,
  ): number | null {
    if (numeratorValue === undefined || denominatorValue === undefined) {
      return null;
    }

    if (denominatorValue === 0) {
      return null;
    }

    switch (_metric) {
      case FinancialMetric.GROSS_MARGIN:
      case FinancialMetric.OPERATING_MARGIN:
      case FinancialMetric.NET_MARGIN:
        // Return as decimal (e.g., 0.45 for 45%)
        return numeratorValue / denominatorValue;

      default:
        return null;
    }
  }

  /**
   * Normalize metric name for logging
   */
  formatMetricName(metric: FinancialMetric): string {
    return metric
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  /**
   * Format financial value for display
   */
  formatValue(value: FinancialValue, decimals: number = 2): string {
    if (value.unit === 'shares') {
      return `${(value.value / 1_000_000).toFixed(decimals)}M shares`;
    }

    if (value.unit === 'USD/share') {
      return `$${value.value.toFixed(decimals)}/share`;
    }

    // USD
    const billions = value.value / 1_000_000_000;
    if (Math.abs(billions) >= 1) {
      return `$${billions.toFixed(decimals)}B`;
    }

    const millions = value.value / 1_000_000;
    if (Math.abs(millions) >= 1) {
      return `$${millions.toFixed(decimals)}M`;
    }

    return `$${value.value.toFixed(decimals)}`;
  }
}
