import { FinancialChangeOutput } from '../actor/output.js';
import { ScoringInput, ScoreFactor } from './scoringTypes.js';

export interface DirectionScore {
  score: number;
  direction: 'positive' | 'negative' | 'mixed' | 'neutral' | 'unclear';
  factors: ScoreFactor[];
}

function financialImpact(change: FinancialChangeOutput): number {
  const metric = change.metric.toLowerCase();
  const magnitude = change.significance === 'high' ? 15 : change.significance === 'medium' ? 8 : 3;
  const increaseIsPositive = !/(expense|cost|debt|liabilit)/.test(metric);
  if (change.direction === 'unchanged') return 0;
  const isPositive = (change.direction === 'increase') === increaseIsPositive;
  return isPositive ? magnitude : -magnitude;
}

function labelFor(score: number, factors: ScoreFactor[]): DirectionScore['direction'] {
  const hasPositive = factors.some(factor => factor.impact > 0);
  const hasNegative = factors.some(factor => factor.impact < 0);
  if (hasPositive && hasNegative && Math.abs(score) < 20) return 'mixed';
  if (score >= 15) return 'positive';
  if (score <= -15) return 'negative';
  return factors.length === 0 ? 'unclear' : 'neutral';
}

export function calculateDirectionScore(input: ScoringInput): DirectionScore {
  const factors: ScoreFactor[] = [];
  let score = 0;

  for (const change of input.financialChanges || []) {
    const impact = financialImpact(change);
    if (impact !== 0) {
      score += impact;
      factors.push({ source: 'financials', impact, explanation: `${change.metric} ${change.direction} with ${change.significance} significance.` });
    }
  }

  const riskImpact = input.aiAnalysis?.riskFactors?.overallRiskTrend === 'increased' ? -20
    : input.aiAnalysis?.riskFactors?.overallRiskTrend === 'decreased' ? 15 : 0;
  if (riskImpact !== 0) {
    score += riskImpact;
    factors.push({ source: 'risk_analysis', impact: riskImpact, explanation: 'Risk-profile change affected the directional score.' });
  }

  const outlook = input.aiAnalysis?.guidance?.outlook;
  const guidanceImpact = outlook === 'raised' || outlook === 'introduced' ? 20
    : outlook === 'lowered' || outlook === 'withdrawn' ? -20 : 0;
  if (guidanceImpact !== 0) {
    score += guidanceImpact;
    factors.push({ source: 'guidance_analysis', impact: guidanceImpact, explanation: `Management outlook was ${outlook}.` });
  }

  const tone = input.aiAnalysis?.managementTone?.currentTone;
  const toneImpact = tone === 'positive' ? 8 : tone === 'negative' ? -8 : tone === 'cautious' ? -4 : 0;
  if (toneImpact !== 0) {
    score += toneImpact;
    factors.push({ source: 'tone_analysis', impact: toneImpact, explanation: `Management tone was assessed as ${tone}.` });
  }

  const legalSeverity = input.aiAnalysis?.legal?.severity;
  const legalImpact = legalSeverity === 'high' ? -20 : legalSeverity === 'medium' ? -10 : legalSeverity === 'low' ? -3 : 0;
  if (legalImpact !== 0) {
    score += legalImpact;
    factors.push({ source: 'legal_analysis', impact: legalImpact, explanation: `Legal developments were assessed as ${legalSeverity} severity.` });
  }

  const liquidityImpact = input.liquidity?.classification === 'improved' ? 10
    : input.liquidity?.classification === 'deteriorated' ? -10 : 0;
  if (liquidityImpact !== 0) {
    score += liquidityImpact;
    factors.push({
      source: 'financials',
      impact: liquidityImpact,
      explanation: `Verified liquidity analysis was ${input.liquidity?.classification}.`,
    });
  }

  score = Math.max(-100, Math.min(100, score));
  return { score, direction: labelFor(score, factors), factors };
}
