/**
 * Tests for FinancialAnalyzer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FinancialAnalyzer } from '../src/xbrl/financialAnalyzer.js';
import { CompanyFactsClient } from '../src/xbrl/companyFactsClient.js';
import { FinancialMetric, FinancialValue } from '../src/xbrl/xbrlTypes.js';
import { SecClient } from '../src/sec/secClient.js';

vi.mock('../src/sec/secClient.js');

describe('FinancialAnalyzer', () => {
  let analyzer: FinancialAnalyzer;
  let mockFactsClient: any;

  beforeEach(() => {
    const mockSecClient = new SecClient() as any;
    mockFactsClient = new CompanyFactsClient(mockSecClient);
    analyzer = new FinancialAnalyzer(mockFactsClient);
  });

  it('should calculate financial changes', () => {
    const current: FinancialValue = {
      metric: FinancialMetric.REVENUE,
      value: 30_000_000_000,
      unit: 'USD',
      source: 'XBRL',
      confidence: 0.95,
      periodEnd: '2024-03-31',
      fiscalYear: 2024,
      fiscalPeriod: 'Q1',
      filingDate: '2024-05-15',
      accessionNumber: '0001000000-24-000001',
    };

    const previous: FinancialValue = {
      metric: FinancialMetric.REVENUE,
      value: 20_000_000_000,
      unit: 'USD',
      source: 'XBRL',
      confidence: 0.95,
      periodEnd: '2023-03-31',
      fiscalYear: 2023,
      fiscalPeriod: 'Q1',
      filingDate: '2023-05-10',
      accessionNumber: '0001000000-23-000001',
    };

    const change = analyzer.calculateFinancialChanges(current, previous, 'YOY');

    expect(change).not.toBeNull();
    expect(change!.absoluteChange).toBe(10_000_000_000);
    expect(change!.percentChange).toBe(50);
    expect(change!.direction).toBe('increase');
    expect(change!.comparisonType).toBe('YOY');
  });

  it('should handle negative changes', () => {
    const current: FinancialValue = {
      metric: FinancialMetric.NET_INCOME,
      value: 2_000_000_000,
      unit: 'USD',
      source: 'XBRL',
      confidence: 0.95,
      periodEnd: '2024-03-31',
      fiscalYear: 2024,
      fiscalPeriod: 'Q1',
      filingDate: '2024-05-15',
      accessionNumber: '0001000000-24-000001',
    };

    const previous: FinancialValue = {
      metric: FinancialMetric.NET_INCOME,
      value: 5_000_000_000,
      unit: 'USD',
      source: 'XBRL',
      confidence: 0.95,
      periodEnd: '2023-03-31',
      fiscalYear: 2023,
      fiscalPeriod: 'Q1',
      filingDate: '2023-05-10',
      accessionNumber: '0001000000-23-000001',
    };

    const change = analyzer.calculateFinancialChanges(current, previous, 'YOY');

    expect(change!.absoluteChange).toBe(-3_000_000_000);
    expect(change!.percentChange).toBe(-60);
    expect(change!.direction).toBe('decrease');
  });

  it('should handle zero previous value', () => {
    const current: FinancialValue = {
      metric: FinancialMetric.NET_INCOME,
      value: 2_000_000_000,
      unit: 'USD',
      source: 'XBRL',
      confidence: 0.95,
      periodEnd: '2024-03-31',
      fiscalYear: 2024,
      fiscalPeriod: 'Q1',
      filingDate: '2024-05-15',
      accessionNumber: '0001000000-24-000001',
    };

    const previous: FinancialValue = {
      metric: FinancialMetric.NET_INCOME,
      value: 0,
      unit: 'USD',
      source: 'XBRL',
      confidence: 0.95,
      periodEnd: '2023-03-31',
      fiscalYear: 2023,
      fiscalPeriod: 'Q1',
      filingDate: '2023-05-10',
      accessionNumber: '0001000000-23-000001',
    };

    const change = analyzer.calculateFinancialChanges(current, previous, 'YOY');

    expect(change).not.toBeNull();
    expect(change!.percentChange).toBe(0);
  });

  it('should calculate margins', () => {
    const margin = analyzer.calculateMargin(18_000_000_000, 25_000_000_000);
    expect(margin).toBe(0.72);
  });

  it('should handle zero denominator in margin', () => {
    const margin = analyzer.calculateMargin(1_000_000_000, 0);
    expect(margin).toBeNull();
  });

  it('should calculate free cash flow', () => {
    const ocf: FinancialValue = {
      metric: FinancialMetric.OPERATING_CASH_FLOW,
      value: 5_000_000_000,
      unit: 'USD',
      source: 'XBRL',
      confidence: 0.95,
      periodEnd: '2024-03-31',
      fiscalYear: 2024,
      fiscalPeriod: 'Q1',
      filingDate: '2024-05-15',
      accessionNumber: '0001000000-24-000001',
    };

    const capex: FinancialValue = {
      metric: FinancialMetric.CAPITAL_EXPENDITURES,
      value: 1_000_000_000,
      unit: 'USD',
      source: 'XBRL',
      confidence: 0.95,
      periodEnd: '2024-03-31',
      fiscalYear: 2024,
      fiscalPeriod: 'Q1',
      filingDate: '2024-05-15',
      accessionNumber: '0001000000-24-000001',
    };

    const fcf = analyzer.calculateFreeCashFlow(ocf, capex);

    expect(fcf).not.toBeNull();
    expect(fcf!.value).toBe(4_000_000_000);
    expect(fcf!.metric).toBe(FinancialMetric.FREE_CASH_FLOW);
    expect(fcf!.source).toBe('CALCULATED');
  });

  it('should identify high significance changes', () => {
    const current: FinancialValue = {
      metric: FinancialMetric.REVENUE,
      value: 30_000_000_000,
      unit: 'USD',
      source: 'XBRL',
      confidence: 0.95,
      periodEnd: '2024-03-31',
      fiscalYear: 2024,
      fiscalPeriod: 'Q1',
      filingDate: '2024-05-15',
      accessionNumber: '0001000000-24-000001',
    };

    const previous: FinancialValue = {
      metric: FinancialMetric.REVENUE,
      value: 15_000_000_000,
      unit: 'USD',
      source: 'XBRL',
      confidence: 0.95,
      periodEnd: '2023-03-31',
      fiscalYear: 2023,
      fiscalPeriod: 'Q1',
      filingDate: '2023-05-10',
      accessionNumber: '0001000000-23-000001',
    };

    const change = analyzer.calculateFinancialChanges(current, previous, 'YOY');

    expect(change!.significance).toBe('high');
  });

  it('should identify low significance changes', () => {
    const current: FinancialValue = {
      metric: FinancialMetric.REVENUE,
      value: 20_400_000_000,
      unit: 'USD',
      source: 'XBRL',
      confidence: 0.95,
      periodEnd: '2024-03-31',
      fiscalYear: 2024,
      fiscalPeriod: 'Q1',
      filingDate: '2024-05-15',
      accessionNumber: '0001000000-24-000001',
    };

    const previous: FinancialValue = {
      metric: FinancialMetric.REVENUE,
      value: 20_000_000_000,
      unit: 'USD',
      source: 'XBRL',
      confidence: 0.95,
      periodEnd: '2023-03-31',
      fiscalYear: 2023,
      fiscalPeriod: 'Q1',
      filingDate: '2023-05-10',
      accessionNumber: '0001000000-23-000001',
    };

    const change = analyzer.calculateFinancialChanges(current, previous, 'YOY');

    expect(change!.percentChange).toBe(2);
    expect(change!.significance).toBe('low');
  });

  it('should format financial changes for display', () => {
    const change = {
      metric: FinancialMetric.REVENUE,
      current: {
        metric: FinancialMetric.REVENUE,
        value: 30_000_000_000,
        unit: 'USD',
        source: 'XBRL' as const,
        confidence: 0.95,
        periodEnd: '2024-03-31',
        fiscalYear: 2024,
        fiscalPeriod: 'Q1',
        filingDate: '2024-05-15',
        accessionNumber: '0001000000-24-000001',
      },
      previous: {
        metric: FinancialMetric.REVENUE,
        value: 20_000_000_000,
        unit: 'USD',
        source: 'XBRL' as const,
        confidence: 0.95,
        periodEnd: '2023-03-31',
        fiscalYear: 2023,
        fiscalPeriod: 'Q1',
        filingDate: '2023-05-10',
        accessionNumber: '0001000000-23-000001',
      },
      absoluteChange: 10_000_000_000,
      percentChange: 50,
      direction: 'increase' as const,
      significance: 'high' as const,
      comparisonType: 'YOY' as const,
    };

    const formatted = analyzer.formatChange(change);

    expect(formatted).toContain('Revenue');
    expect(formatted).toContain('↑');
    expect(formatted).toContain('50');
  });
});
