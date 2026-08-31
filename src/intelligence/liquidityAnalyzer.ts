import { FinancialChangeOutput } from '../actor/output.js';

export type LiquidityClassification =
  | 'improved'
  | 'deteriorated'
  | 'mixed'
  | 'unchanged'
  | 'insufficient_evidence';

export interface LiquidityFactor {
  metric: string;
  direction: 'improved' | 'deteriorated' | 'unchanged';
  significance: 'high' | 'medium' | 'low';
  current: number;
  previous: number;
  percentChange: number;
}

export interface LiquidityAnalysis {
  classification: LiquidityClassification;
  summary: string;
  factors: LiquidityFactor[];
}

const CASH_METRICS = new Set(['TOTAL_CASH', 'CASH_AND_EQUIVALENTS']);
const DEBT_METRICS = new Set(['TOTAL_DEBT', 'LONG_TERM_DEBT', 'SHORT_TERM_DEBT']);
const CASH_FLOW_METRICS = new Set(['OPERATING_CASH_FLOW', 'FREE_CASH_FLOW']);

function factorDirection(metric: string, change: FinancialChangeOutput): LiquidityFactor['direction'] {
  if (change.direction === 'unchanged') return 'unchanged';
  const improvesWhenIncreased = CASH_METRICS.has(metric) || CASH_FLOW_METRICS.has(metric);
  return (change.direction === 'increase') === improvesWhenIncreased ? 'improved' : 'deteriorated';
}

function factorWeight(factor: LiquidityFactor): number {
  const magnitude = factor.significance === 'high' ? 2 : factor.significance === 'medium' ? 1 : 0;
  return factor.direction === 'improved' ? magnitude : factor.direction === 'deteriorated' ? -magnitude : 0;
}

/** Uses only verified XBRL changes to assess liquidity and debt conditions. */
export function analyzeLiquidity(changes: FinancialChangeOutput[]): LiquidityAnalysis {
  const selected = new Map<string, FinancialChangeOutput>();
  for (const change of changes) {
    const metric = change.metric.toUpperCase();
    if (!CASH_METRICS.has(metric) && !DEBT_METRICS.has(metric) && !CASH_FLOW_METRICS.has(metric)) continue;

    // Prefer total cash over the narrower cash-and-equivalents metric.
    if (metric === 'CASH_AND_EQUIVALENTS' && selected.has('TOTAL_CASH')) continue;
    if (metric === 'TOTAL_CASH') selected.delete('CASH_AND_EQUIVALENTS');
    selected.set(metric, change);
  }

  const factors = [...selected.entries()].map(([metric, change]) => ({
    metric,
    direction: factorDirection(metric, change),
    significance: change.significance,
    current: change.current.value,
    previous: change.previous.value,
    percentChange: change.percentChange,
  }));
  if (factors.length === 0) {
    return {
      classification: 'insufficient_evidence',
      summary: 'Insufficient verified XBRL liquidity, debt, or operating cash flow data for comparison.',
      factors,
    };
  }

  const score = factors.reduce((total, factor) => total + factorWeight(factor), 0);
  const classification: LiquidityClassification = score >= 2 ? 'improved'
    : score <= -2 ? 'deteriorated'
    : score === 0 && factors.every(factor => factor.direction === 'unchanged') ? 'unchanged'
    : 'mixed';
  const improved = factors.filter(factor => factor.direction === 'improved').map(factor => factor.metric);
  const deteriorated = factors.filter(factor => factor.direction === 'deteriorated').map(factor => factor.metric);
  const summary = classification === 'improved'
    ? `Liquidity improved based on ${improved.join(', ')}.`
    : classification === 'deteriorated'
      ? `Liquidity deteriorated based on ${deteriorated.join(', ')}.`
      : classification === 'unchanged'
        ? 'Liquidity and debt metrics were unchanged in the available comparison data.'
        : `Liquidity signals were mixed: improved ${improved.join(', ') || 'none'}; deteriorated ${deteriorated.join(', ') || 'none'}.`;

  return { classification, summary, factors };
}
