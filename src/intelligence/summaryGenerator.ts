import { FinancialChangeOutput } from '../actor/output.js';
import { MaterialChange } from '../comparison/semanticDiff.js';
import { LiquidityAnalysis } from './liquidityAnalyzer.js';

export interface FilingSummary {
  summary: string;
  keyTakeaways: string[];
}

/** Produces a deterministic synopsis from already-evidenced findings. */
export function generateFilingSummary(
  materialChanges: MaterialChange[],
  financialChanges: FinancialChangeOutput[],
  liquidity?: LiquidityAnalysis,
): FilingSummary {
  const takeaways = [
    ...materialChanges.slice(0, 3).map(change => change.summary),
    ...financialChanges.filter(change => change.significance === 'high').slice(0, 2)
      .map(change => `${change.metric} ${change.direction} ${Math.abs(change.percentChange).toFixed(1)}% year over year.`),
  ];
  if (liquidity && liquidity.classification !== 'insufficient_evidence') {
    takeaways.push(liquidity.summary);
  }
  const uniqueTakeaways = [...new Set(takeaways)].slice(0, 5);
  return {
    summary: uniqueTakeaways.length > 0
      ? uniqueTakeaways.slice(0, 2).join(' ')
      : 'No material deterministic changes were identified in the available comparison data.',
    keyTakeaways: uniqueTakeaways,
  };
}
