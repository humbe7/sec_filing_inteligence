/**
 * Tests for PeriodResolver
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PeriodResolver } from '../src/xbrl/periodResolver.js';
import { FinancialPeriod, ReportPeriod } from '../src/xbrl/xbrlTypes.js';

describe('PeriodResolver', () => {
  let resolver: PeriodResolver;

  beforeEach(() => {
    resolver = new PeriodResolver();
  });

  it('should resolve Q1 period', () => {
    const period = resolver.resolvePeriod({
      accn: '0001000000-24-000001',
      fy: 2024,
      fp: 'Q1',
      form: '10-Q',
      filed: '2024-05-15',
      start: '2024-01-01',
      end: '2024-03-31',
      val: 0,
      accn_fp: 'test',
      unit: 'USD',
      negating: 0,
    });

    expect(period.fiscalPeriod).toBe(ReportPeriod.Q1);
    expect(period.durationDays).toBeGreaterThan(80);
    expect(period.durationDays).toBeLessThan(100);
  });

  it('should resolve full year period', () => {
    const period = resolver.resolvePeriod({
      accn: '0001000000-24-000001',
      fy: 2024,
      fp: 'FY',
      form: '10-K',
      filed: '2024-02-26',
      start: '2023-01-01',
      end: '2023-12-31',
      val: 0,
      accn_fp: 'test',
      unit: 'USD',
      negating: 0,
    });

    expect(period.fiscalPeriod).toBe(ReportPeriod.FULL_YEAR);
    expect(period.durationDays).toBeGreaterThan(360);
    expect(period.durationDays).toBeLessThan(370);
  });

  it('should calculate duration correctly', () => {
    const period = resolver.resolvePeriod({
      accn: '0001000000-24-000001',
      fy: 2024,
      fp: 'Q2',
      form: '10-Q',
      filed: '2024-08-01',
      start: '2024-04-01',
      end: '2024-06-30',
      val: 0,
      accn_fp: 'test',
      unit: 'USD',
      negating: 0,
    });

    expect(period.durationDays).toBe(90);
  });

  it('should identify comparable periods - same quarter YoY', () => {
    const current: FinancialPeriod = {
      fiscalYear: 2024,
      fiscalPeriod: ReportPeriod.Q1,
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      durationDays: 91,
      form: '10-Q',
      filingDate: '2024-05-15',
      accessionNumber: '0001000000-24-000002',
    };

    const previous: FinancialPeriod = {
      fiscalYear: 2023,
      fiscalPeriod: ReportPeriod.Q1,
      startDate: '2023-01-01',
      endDate: '2023-03-31',
      durationDays: 90,
      form: '10-Q',
      filingDate: '2023-05-10',
      accessionNumber: '0001000000-23-000001',
    };

    const check = resolver.arePeriodsComparable(current, previous);
    expect(check.comparable).toBe(true);
  });

  it('should reject incomparable periods - different forms', () => {
    const current: FinancialPeriod = {
      fiscalYear: 2024,
      fiscalPeriod: ReportPeriod.Q1,
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      durationDays: 91,
      form: '10-Q',
      filingDate: '2024-05-15',
      accessionNumber: '0001000000-24-000001',
    };

    const previous: FinancialPeriod = {
      fiscalYear: 2023,
      fiscalPeriod: ReportPeriod.Q1,
      startDate: '2023-01-01',
      endDate: '2023-03-31',
      durationDays: 91,
      form: '8-K',
      filingDate: '2023-05-10',
      accessionNumber: '0001000000-23-000001',
    };

    const check = resolver.arePeriodsComparable(current, previous);
    expect(check.comparable).toBe(false);
  });

  it('should reject incomparable periods - different fiscal periods', () => {
    const current: FinancialPeriod = {
      fiscalYear: 2024,
      fiscalPeriod: ReportPeriod.Q1,
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      durationDays: 91,
      form: '10-Q',
      filingDate: '2024-05-15',
      accessionNumber: '0001000000-24-000001',
    };

    const previous: FinancialPeriod = {
      fiscalYear: 2023,
      fiscalPeriod: ReportPeriod.Q2,
      startDate: '2023-04-01',
      endDate: '2023-06-30',
      durationDays: 92,
      form: '10-Q',
      filingDate: '2023-08-10',
      accessionNumber: '0001000000-23-000001',
    };

    const check = resolver.arePeriodsComparable(current, previous);
    expect(check.comparable).toBe(false);
  });

  it('should find comparable previous period in list', () => {
    const current: FinancialPeriod = {
      fiscalYear: 2024,
      fiscalPeriod: ReportPeriod.Q1,
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      durationDays: 91,
      form: '10-Q',
      filingDate: '2024-05-15',
      accessionNumber: '0001000000-24-000002',
    };

    const periods: FinancialPeriod[] = [
      {
        fiscalYear: 2023,
        fiscalPeriod: ReportPeriod.Q1,
        startDate: '2023-01-01',
        endDate: '2023-03-31',
        durationDays: 90,
        form: '10-Q',
        filingDate: '2023-05-10',
        accessionNumber: '0001000000-23-000001',
      },
      {
        fiscalYear: 2023,
        fiscalPeriod: ReportPeriod.Q2,
        startDate: '2023-04-01',
        endDate: '2023-06-30',
        durationDays: 92,
        form: '10-Q',
        filingDate: '2023-08-10',
        accessionNumber: '0001000000-23-000002',
      },
      {
        fiscalYear: 2024,
        fiscalPeriod: ReportPeriod.Q1,
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        durationDays: 91,
        form: '10-Q',
        filingDate: '2024-05-15',
        accessionNumber: '0001000000-24-000002',
      },
    ];

    const result = resolver.findComparablePeriod(current, periods);

    expect(result.period).not.toBeNull();
    expect(result.comparisonType).toBe('YOY');
    expect(result.period?.accessionNumber).toBe('0001000000-23-000001');
  });

  it('should format period correctly', () => {
    const period: FinancialPeriod = {
      fiscalYear: 2024,
      fiscalPeriod: ReportPeriod.Q1,
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      durationDays: 91,
      form: '10-Q',
      filingDate: '2024-05-15',
      accessionNumber: '0001000000-24-000001',
    };

    expect(resolver.formatPeriod(period)).toBe('Q1 FY2024');
  });

  it('should format full year period correctly', () => {
    const period: FinancialPeriod = {
      fiscalYear: 2024,
      fiscalPeriod: ReportPeriod.FULL_YEAR,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      durationDays: 365,
      form: '10-K',
      filingDate: '2025-02-26',
      accessionNumber: '0001000000-25-000001',
    };

    expect(resolver.formatPeriod(period)).toBe('FY2024');
  });
});
