/**
 * Tests for MetricNormalizer
 */

import { describe, it, expect } from 'vitest';
import { MetricNormalizer } from '../src/xbrl/metricNormalizer.js';
import { FinancialMetric, XBRLFact } from '../src/xbrl/xbrlTypes.js';

describe('MetricNormalizer', () => {
  let normalizer: MetricNormalizer;

  beforeEach(() => {
    normalizer = new MetricNormalizer();
  });

  it('should resolve revenue concepts', () => {
    const concepts = normalizer.resolveConcepts(FinancialMetric.REVENUE);
    expect(concepts.length).toBeGreaterThan(0);
    expect(concepts).toContain('us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax');
  });

  it('should resolve net income concepts', () => {
    const concepts = normalizer.resolveConcepts(FinancialMetric.NET_INCOME);
    expect(concepts.length).toBeGreaterThan(0);
    expect(concepts).toContain('us-gaap:NetIncomeLoss');
  });

  it('should resolve EPS concepts', () => {
    const concepts = normalizer.resolveConcepts(FinancialMetric.EARNINGS_PER_SHARE_DILUTED);
    expect(concepts).toContain('us-gaap:EarningsPerShareDiluted');
  });

  it('should handle derived metrics (no concepts)', () => {
    const concepts = normalizer.resolveConcepts(FinancialMetric.GROSS_MARGIN);
    expect(concepts.length).toBe(0);
  });

  it('should normalize facts to financial values', () => {
    const fact: XBRLFact = {
      accn: '0001000000-24-000001',
      fy: 2024,
      fp: 'Q1',
      form: '10-Q',
      filed: '2024-05-15',
      start: '2024-01-01',
      end: '2024-03-31',
      val: 25_000_000_000,
      accn_fp: '0001000000-24-0000001_q1',
      unit: 'USD',
      negating: 0,
    };

    const value = normalizer.normalizeToValue(
      FinancialMetric.REVENUE,
      fact,
      'us-gaap:Revenues',
      '10-Q',
    );

    expect(value.metric).toBe(FinancialMetric.REVENUE);
    expect(value.value).toBe(25_000_000_000);
    expect(value.unit).toBe('USD');
    expect(value.source).toBe('XBRL');
    expect(value.confidence).toBeGreaterThan(0);
  });

  it('should apply negating flag', () => {
    const fact: XBRLFact = {
      accn: '0001000000-24-000001',
      fy: 2024,
      fp: 'Q1',
      form: '10-Q',
      filed: '2024-05-15',
      start: '2024-01-01',
      end: '2024-03-31',
      val: 5_000_000_000,
      accn_fp: '0001000000-24-0000001_q1',
      unit: 'USD',
      negating: 1,
    };

    const value = normalizer.normalizeToValue(
      FinancialMetric.COST_OF_REVENUE,
      fact,
      'us-gaap:CostOfRevenue',
      '10-Q',
    );

    expect(value.value).toBe(-5_000_000_000);
  });

  it('should calculate derived metrics', () => {
    const margin = normalizer.calculateDerivedMetric(
      FinancialMetric.GROSS_MARGIN,
      18_000_000_000, // numerator: gross profit
      25_000_000_000, // denominator: revenue
    );

    expect(margin).toBe(0.72);
  });

  it('should return null for invalid denominator', () => {
    const margin = normalizer.calculateDerivedMetric(FinancialMetric.NET_MARGIN, 1_000_000_000, 0);
    expect(margin).toBeNull();
  });

  it('should format metric names', () => {
    expect(normalizer.formatMetricName(FinancialMetric.GROSS_PROFIT)).toBe('Gross Profit');
    expect(normalizer.formatMetricName(FinancialMetric.OPERATING_INCOME)).toBe('Operating Income');
  });

  it('should format large values with B suffix', () => {
    const value = {
      metric: FinancialMetric.REVENUE,
      value: 25_000_000_000,
      unit: 'USD',
      concept: 'us-gaap:Revenues',
      source: 'XBRL' as const,
      confidence: 0.95,
      periodEnd: '2024-03-31',
      fiscalYear: 2024,
      fiscalPeriod: 'Q1',
      filingDate: '2024-05-15',
      accessionNumber: '0001000000-24-000001',
    };

    const formatted = normalizer.formatValue(value);
    expect(formatted).toContain('25');
    expect(formatted).toContain('B');
  });

  it('should format millions with M suffix', () => {
    const value = {
      metric: FinancialMetric.REVENUE,
      value: 500_000_000,
      unit: 'USD',
      concept: 'us-gaap:Revenues',
      source: 'XBRL' as const,
      confidence: 0.95,
      periodEnd: '2024-03-31',
      fiscalYear: 2024,
      fiscalPeriod: 'Q1',
      filingDate: '2024-05-15',
      accessionNumber: '0001000000-24-000001',
    };

    const formatted = normalizer.formatValue(value);
    expect(formatted).toContain('M');
  });

  it('should format shares', () => {
    const value = {
      metric: FinancialMetric.SHARES_OUTSTANDING,
      value: 500_000_000,
      unit: 'shares',
      concept: 'us-gaap:CommonStockSharesOutstanding',
      source: 'XBRL' as const,
      confidence: 0.95,
      periodEnd: '2024-03-31',
      fiscalYear: 2024,
      fiscalPeriod: 'Q1',
      filingDate: '2024-05-15',
      accessionNumber: '0001000000-24-000001',
    };

    const formatted = normalizer.formatValue(value);
    expect(formatted).toContain('500');
    expect(formatted).toContain('shares');
  });
});
