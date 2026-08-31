import { describe, expect, it } from 'vitest';
import { analyzeLiquidity } from '../src/intelligence/liquidityAnalyzer.js';
import { FinancialChangeOutput } from '../src/actor/output.js';

function change(metric: string, direction: FinancialChangeOutput['direction'], significance: FinancialChangeOutput['significance']): FinancialChangeOutput {
  return {
    metric,
    current: { value: 120, unit: 'USD', confidence: 0.95, concept: metric, source: 'XBRL', periodEnd: '2024-06-30', fiscalYear: 2024, fiscalPeriod: 'Q2', filingDate: '2024-08-01' },
    previous: { value: 100, unit: 'USD', confidence: 0.95, concept: metric, source: 'XBRL', periodEnd: '2023-06-30', fiscalYear: 2023, fiscalPeriod: 'Q2', filingDate: '2023-08-01' },
    absoluteChange: direction === 'decrease' ? -20 : direction === 'increase' ? 20 : 0,
    percentChange: direction === 'decrease' ? -20 : direction === 'increase' ? 20 : 0,
    direction,
    significance,
    comparisonType: 'YOY',
  };
}

describe('liquidityAnalyzer', () => {
  it('identifies improved liquidity from cash, debt, and operating cash flow', () => {
    const result = analyzeLiquidity([
      change('TOTAL_CASH', 'increase', 'high'),
      change('TOTAL_DEBT', 'decrease', 'high'),
      change('OPERATING_CASH_FLOW', 'increase', 'medium'),
    ]);

    expect(result.classification).toBe('improved');
    expect(result.factors).toHaveLength(3);
  });

  it('returns insufficient evidence without liquidity-related metrics', () => {
    const result = analyzeLiquidity([change('REVENUE', 'increase', 'high')]);

    expect(result.classification).toBe('insufficient_evidence');
  });

  it('reports mixed liquidity when verified signals conflict', () => {
    const result = analyzeLiquidity([
      change('TOTAL_CASH', 'increase', 'medium'),
      change('TOTAL_DEBT', 'increase', 'medium'),
    ]);

    expect(result.classification).toBe('mixed');
  });
});
