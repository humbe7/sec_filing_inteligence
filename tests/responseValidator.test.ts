import { describe, expect, it } from 'vitest';
import { RiskAnalysisSchema, validateLlmResponse } from '../src/ai/responseValidator.js';

describe('responseValidator', () => {
  it('accepts a structured risk analysis response', () => {
    const result = validateLlmResponse(RiskAnalysisSchema, {
      overallRiskTrend: 'increased',
      newRisks: ['New tariff exposure'],
      removedRisks: [],
      summary: 'Risk disclosures added tariff exposure.',
      evidence: [{ statement: 'Tariffs may raise costs.', section: 'risk_factors' }],
    }, 'risk analysis');

    expect(result.overallRiskTrend).toBe('increased');
    expect(result.evidence).toHaveLength(1);
  });

  it('rejects an invalid analysis response', () => {
    expect(() => validateLlmResponse(RiskAnalysisSchema, {
      overallRiskTrend: 'higher',
      newRisks: [],
      removedRisks: [],
      summary: 'Invalid enum value.',
      evidence: [],
    }, 'risk analysis')).toThrow('Invalid risk analysis response');
  });
});
