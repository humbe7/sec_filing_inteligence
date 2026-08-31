import { calculateConfidenceScore } from './confidenceScore.js';
import { calculateDirectionScore } from './directionScore.js';
import { calculateMaterialityScore } from './materialityScore.js';
import { ScoringInput } from './scoringTypes.js';

export function calculateFilingScores(input: ScoringInput) {
  return {
    materiality: calculateMaterialityScore(input),
    direction: calculateDirectionScore(input),
    confidence: calculateConfidenceScore(input),
  };
}
