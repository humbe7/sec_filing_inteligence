import { ScoringInput, ScoreFactor } from './scoringTypes.js';

export interface MaterialityScore {
  score: number;
  level: 'high' | 'medium' | 'low' | 'minimal';
  factors: ScoreFactor[];
}

function levelFor(score: number): MaterialityScore['level'] {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 15) return 'low';
  return 'minimal';
}

export function calculateMaterialityScore(input: ScoringInput): MaterialityScore {
  const factors: ScoreFactor[] = [];
  let score = 0;

  const financialImpact = (input.financialChanges || []).reduce((total, change) => {
    if (change.significance === 'high') return total + 15;
    if (change.significance === 'medium') return total + 7;
    return total + 2;
  }, 0);
  if (financialImpact > 0) {
    const impact = Math.min(financialImpact, 40);
    score += impact;
    factors.push({ source: 'financials', impact, explanation: 'Significant financial metric changes were detected.' });
  }

  const textImpact = (input.textualChanges || []).reduce((total, change) => {
    if (change.changeMagnitude === 'high') return total + 12;
    if (change.changeMagnitude === 'medium') return total + 6;
    if (change.changeMagnitude === 'low') return total + 2;
    return total;
  }, 0);
  if (textImpact > 0) {
    const impact = Math.min(textImpact, 30);
    score += impact;
    factors.push({ source: 'filing_text', impact, explanation: 'Material changes were detected in comparable filing sections.' });
  }

  const riskTrend = input.aiAnalysis?.riskFactors?.overallRiskTrend;
  if (riskTrend === 'increased') {
    score += 15;
    factors.push({ source: 'risk_analysis', impact: 15, explanation: 'AI analysis identified an increased risk profile.' });
  } else if (riskTrend === 'decreased') {
    score += 8;
    factors.push({ source: 'risk_analysis', impact: 8, explanation: 'AI analysis identified a decreased risk profile.' });
  }

  const guidanceOutlook = input.aiAnalysis?.guidance?.outlook;
  if (guidanceOutlook && !['none', 'unclear', 'maintained'].includes(guidanceOutlook)) {
    score += 10;
    factors.push({ source: 'guidance_analysis', impact: 10, explanation: `Management outlook was ${guidanceOutlook}.` });
  }

  const legalSeverity = input.aiAnalysis?.legal?.severity;
  const legalImpact = legalSeverity === 'high' ? 20 : legalSeverity === 'medium' ? 12 : legalSeverity === 'low' ? 5 : 0;
  if (legalImpact > 0) {
    score += legalImpact;
    factors.push({ source: 'legal_analysis', impact: legalImpact, explanation: `AI analysis identified ${legalSeverity} severity legal developments.` });
  }

  const liquidityImpact = input.liquidity?.classification === 'deteriorated' || input.liquidity?.classification === 'improved'
    ? 10 : input.liquidity?.classification === 'mixed' ? 5 : 0;
  if (liquidityImpact > 0) {
    score += liquidityImpact;
    factors.push({
      source: 'financials',
      impact: liquidityImpact,
      explanation: `Verified liquidity analysis was ${input.liquidity?.classification}.`,
    });
  }

  score = Math.min(score, 100);
  return { score, level: levelFor(score), factors };
}
