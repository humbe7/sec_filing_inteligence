import { describe, expect, it } from 'vitest';
import { generateFilingSummary } from '../src/intelligence/summaryGenerator.js';

describe('summaryGenerator', () => {
  it('uses evidenced material changes and significant financial facts', () => {
    const summary = generateFilingSummary([{
      section: 'risk_factors', type: 'RISK_INCREASED', category: 'REGULATORY', materiality: 80, confidence: 0.8,
      summary: 'Risk Factors: risk increased.', evidence: { current: ['Evidence'], previous: [] },
    }], [], undefined);

    expect(summary.keyTakeaways).toEqual(['Risk Factors: risk increased.']);
  });
});
