import { ScoringInput, ScoreFactor } from './scoringTypes.js';

export interface ConfidenceScore {
  score: number;
  level: 'high' | 'medium' | 'low';
  factors: ScoreFactor[];
}

export function calculateConfidenceScore(input: ScoringInput): ConfidenceScore {
  const factors: ScoreFactor[] = [];
  let score = 0;
  const financialChanges = input.financialChanges || [];
  if (financialChanges.length > 0) {
    const averageConfidence = financialChanges.reduce(
      (total, change) => total + Math.min(change.current.confidence, change.previous.confidence),
      0,
    ) / financialChanges.length;
    const impact = Math.round(40 * averageConfidence);
    score += impact;
    factors.push({ source: 'financials', impact, explanation: 'Score uses confidence from SEC XBRL financial facts.' });
  }

  if ((input.textualChanges || []).length > 0) {
    score += 25;
    factors.push({ source: 'filing_text', impact: 25, explanation: 'Comparable filing sections support the analysis.' });
  }

  if (input.liquidity && input.liquidity.classification !== 'insufficient_evidence') {
    score += 5;
    factors.push({ source: 'financials', impact: 5, explanation: 'Verified liquidity and debt metrics support the analysis.' });
  }

  const analyses = [
    ['risk_analysis', input.aiAnalysis?.riskFactors?.evidence.length || 0],
    ['tone_analysis', input.aiAnalysis?.managementTone?.evidence.length || 0],
    ['guidance_analysis', input.aiAnalysis?.guidance?.evidence.length || 0],
    ['legal_analysis', input.aiAnalysis?.legal?.evidence.length || 0],
  ] as const;
  for (const [source, evidenceCount] of analyses) {
    if (evidenceCount > 0) {
      const impact = Math.min(9, 3 + evidenceCount * 2);
      score += impact;
      factors.push({ source, impact, explanation: 'AI conclusion includes filing-section evidence.' });
    }
  }

  score = Math.min(score, 100);
  return {
    score,
    level: score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low',
    factors,
  };
}
