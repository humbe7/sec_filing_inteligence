/**
 * Financial Analyzer
 * Extracts financial metrics from XBRL data and calculates comparisons
 * Handles all deterministic financial calculations
 */

import {
  CompanyFacts,
  FinancialMetric,
  FinancialValue,
  FinancialChange,
} from './xbrlTypes.js';
import { CompanyFactsClient } from './companyFactsClient.js';
import { MetricNormalizer } from './metricNormalizer.js';
import { Logger } from '../utils/logger.js';

export interface MetricsForPeriod {
  period: string;
  metrics: Map<FinancialMetric, FinancialValue>;
}

export class FinancialAnalyzer {
  private factsClient: CompanyFactsClient;
  private normalizer: MetricNormalizer;
  private logger: Logger;

  constructor(factsClient: CompanyFactsClient) {
    this.factsClient = factsClient;
    this.normalizer = new MetricNormalizer();
    this.logger = new Logger({ phase: 'FINANCIAL_ANALYZER' });
  }

  /**
   * Extract key financial metrics for a company and period
   */
  async extractMetrics(
    cik: string,
    form: string,
    requestedMetrics: FinancialMetric[] = [],
  ): Promise<MetricsForPeriod> {
    const facts = await this.factsClient.getCompanyFacts(cik);

    // Default to common metrics if none specified
    const metricsToExtract =
      requestedMetrics.length > 0
        ? requestedMetrics
        : [
            FinancialMetric.REVENUE,
            FinancialMetric.GROSS_PROFIT,
            FinancialMetric.OPERATING_INCOME,
            FinancialMetric.NET_INCOME,
            FinancialMetric.CASH_AND_EQUIVALENTS,
            FinancialMetric.TOTAL_DEBT,
            FinancialMetric.OPERATING_CASH_FLOW,
            FinancialMetric.EARNINGS_PER_SHARE_DILUTED,
          ];

    const metrics = new Map<FinancialMetric, FinancialValue>();

    for (const metric of metricsToExtract) {
      try {
        const value = this.extractMetric(metric, facts, form);
        if (value) {
          metrics.set(metric, value);
        }
      } catch (error) {
        this.logger.warn(`Failed to extract metric ${metric}`, { error, cik, form });
      }
    }

    return {
      period: form,
      metrics,
    };
  }

  /**
   * Extract a single metric from company facts
   */
  private extractMetric(metric: FinancialMetric, facts: CompanyFacts, form: string): FinancialValue | null {
    const concepts = this.normalizer.resolveConcepts(metric);

    if (concepts.length === 0) {
      this.logger.debug(`No concepts mapped for metric ${metric}`);
      return null;
    }

    // Try each concept in order
    for (const concept of concepts) {
      const conceptFacts = this.factsClient.getConceptFacts(facts, concept);

      if (conceptFacts.length === 0) {
        continue;
      }

      const best = this.factsClient.findBestFact(conceptFacts, form);
      if (best) {
        const value = this.normalizer.normalizeToValue(metric, best, concept, form);
        this.logger.debug(`Extracted metric`, {
          metric,
          concept,
          value: value.value,
          unit: value.unit,
        });
        return value;
      }
    }

    return null;
  }

  /**
   * Compare two periods and calculate financial changes
   */
  calculateFinancialChanges(
    current: FinancialValue,
    previous: FinancialValue,
    comparisonType: 'QOQ' | 'YOY' = 'QOQ',
  ): FinancialChange | null {
    // Sanity check: same metric
    if (current.metric !== previous.metric) {
      this.logger.warn('Attempting to compare different metrics', {
        current: current.metric,
        previous: previous.metric,
      });
      return null;
    }

    // Can't compare if either value is zero for percentage calculation
    if (previous.value === 0) {
      this.logger.debug('Cannot calculate percentage change from zero baseline', {
        metric: current.metric,
      });

      return {
        metric: current.metric,
        current,
        previous,
        absoluteChange: current.value - previous.value,
        percentChange: 0,
        direction: current.value > previous.value ? 'increase' : current.value < previous.value ? 'decrease' : 'unchanged',
        significance: this.calculateSignificance(current.metric, current.value - previous.value, current.value),
        comparisonType,
      };
    }

    const absoluteChange = current.value - previous.value;
    const percentChange = (absoluteChange / Math.abs(previous.value)) * 100;
    const direction = absoluteChange > 0 ? 'increase' : absoluteChange < 0 ? 'decrease' : 'unchanged';

    return {
      metric: current.metric,
      current,
      previous,
      absoluteChange,
      percentChange,
      direction,
      significance: this.calculateSignificance(current.metric, absoluteChange, current.value),
      comparisonType,
    };
  }

  /**
   * Calculate significance of a change
   */
  private calculateSignificance(
    metric: FinancialMetric,
    absoluteChange: number,
    currentValue: number,
  ): 'high' | 'medium' | 'low' {
    // For some metrics, even small percentage changes are significant
    const percentChange = currentValue !== 0 ? Math.abs(absoluteChange) / Math.abs(currentValue) : 0;

    switch (metric) {
      // Revenue/profit changes: >5% is significant
      case FinancialMetric.REVENUE:
      case FinancialMetric.GROSS_PROFIT:
      case FinancialMetric.OPERATING_INCOME:
      case FinancialMetric.NET_INCOME:
      case FinancialMetric.OPERATING_CASH_FLOW:
        if (percentChange > 0.1) return 'high';
        if (percentChange > 0.05) return 'medium';
        return 'low';

      // Margin changes: in percentage points (not %)
      // This is handled in calculateMarginChange
      case FinancialMetric.GROSS_MARGIN:
      case FinancialMetric.OPERATING_MARGIN:
      case FinancialMetric.NET_MARGIN:
        if (Math.abs(absoluteChange) > 0.05) return 'high'; // >5 percentage points
        if (Math.abs(absoluteChange) > 0.02) return 'medium';
        return 'low';

      // EPS changes: >10% is significant
      case FinancialMetric.EARNINGS_PER_SHARE_BASIC:
      case FinancialMetric.EARNINGS_PER_SHARE_DILUTED:
        if (percentChange > 0.1) return 'high';
        if (percentChange > 0.05) return 'medium';
        return 'low';

      // Cash/Debt changes: >20% is significant
      case FinancialMetric.CASH_AND_EQUIVALENTS:
      case FinancialMetric.TOTAL_DEBT:
      case FinancialMetric.LONG_TERM_DEBT:
        if (percentChange > 0.2) return 'high';
        if (percentChange > 0.1) return 'medium';
        return 'low';

      // Default: moderate threshold
      default:
        if (percentChange > 0.15) return 'high';
        if (percentChange > 0.07) return 'medium';
        return 'low';
    }
  }

  /**
   * Calculate margin values
   * Returns decimal (e.g., 0.45 for 45%)
   */
  calculateMargin(numeratorValue: number, denominatorValue: number): number | null {
    if (denominatorValue === 0 || denominatorValue === null) {
      return null;
    }

    return numeratorValue / denominatorValue;
  }

  /**
   * Calculate derived metric (gross margin, etc.)
   */
  calculateDerivedMetric(
    metric: FinancialMetric,
    input1: FinancialValue,
    input2: FinancialValue,
  ): FinancialValue | null {
    const calculatedValue = this.normalizer.calculateDerivedMetric(metric, input1.value, input2.value);

    if (calculatedValue === null) {
      return null;
    }

    return {
      metric,
      value: calculatedValue,
      unit: 'ratio',
      source: 'CALCULATED',
      confidence: 0.95,
      periodEnd: input1.periodEnd,
      fiscalYear: input1.fiscalYear,
      fiscalPeriod: input1.fiscalPeriod,
      filingDate: input1.filingDate,
      accessionNumber: input1.accessionNumber,
      notes: `Calculated from ${input1.metric} / ${input2.metric}`,
    };
  }

  /**
   * Calculate Free Cash Flow if not available directly
   * FCF = Operating Cash Flow - Capital Expenditures
   */
  calculateFreeCashFlow(ocf: FinancialValue, capex: FinancialValue): FinancialValue | null {
    if (ocf.value === null || capex.value === null) {
      return null;
    }

    const fcf = ocf.value - capex.value;

    return {
      metric: FinancialMetric.FREE_CASH_FLOW,
      value: fcf,
      unit: 'USD',
      source: 'CALCULATED',
      confidence: Math.min(ocf.confidence, capex.confidence),
      periodEnd: ocf.periodEnd,
      fiscalYear: ocf.fiscalYear,
      fiscalPeriod: ocf.fiscalPeriod,
      filingDate: ocf.filingDate,
      accessionNumber: ocf.accessionNumber,
      notes: 'Calculated as OCF - CapEx',
    };
  }

  /**
   * Filter significant changes
   */
  filterSignificantChanges(changes: FinancialChange[], minSignificance: 'high' | 'medium' | 'low' = 'medium'): FinancialChange[] {
    const significanceRank = { high: 3, medium: 2, low: 1 };
    const minRank = significanceRank[minSignificance];

    return changes.filter(c => significanceRank[c.significance] >= minRank);
  }

  /**
   * Format financial change for display
   */
  formatChange(change: FinancialChange): string {
    const metricName = this.normalizer.formatMetricName(change.metric);
    const direction = change.direction === 'increase' ? '↑' : change.direction === 'decrease' ? '↓' : '→';

    if (change.metric.includes('MARGIN')) {
      // Margin is in basis points
      const bps = change.absoluteChange * 10000;
      return `${metricName}: ${direction} ${Math.abs(bps).toFixed(0)} bps`;
    }

    return `${metricName}: ${direction} ${change.percentChange.toFixed(1)}% (${change.comparisonType})`;
  }
}
