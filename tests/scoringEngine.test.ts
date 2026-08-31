import { describe, expect, it } from 'vitest';
import { calculateFilingScores } from '../src/scoring/scoringEngine.js';

describe('scoringEngine', () => {
  it('produces explainable materiality, direction, and confidence scores', () => {
    const scores = calculateFilingScores({
      financialChanges: [{
        metric: 'REVENUE',
        current: { value: 130, unit: 'USD', confidence: 0.95, concept: 'Revenue', source: 'XBRL', periodEnd: '2024-06-30', fiscalYear: 2024, fiscalPeriod: 'Q2', filingDate: '2024-08-01' },
        previous: { value: 100, unit: 'USD', confidence: 0.9, concept: 'Revenue', source: 'XBRL', periodEnd: '2023-06-30', fiscalYear: 2023, fiscalPeriod: 'Q2', filingDate: '2023-08-01' },
        absoluteChange: 30,
        percentChange: 30,
        direction: 'increase',
        significance: 'high',
        comparisonType: 'YOY',
      }],
      textualChanges: [{
        section: 'risk_factors',
        title: 'Risk Factors',
        currentWordCount: 100,
        previousWordCount: 80,
        addedSentences: ['Tariffs may raise costs.'],
        removedSentences: [],
        similarity: 0.7,
        changeMagnitude: 'high',
      }],
      aiAnalysis: {
        riskFactors: {
          overallRiskTrend: 'increased',
          newRisks: ['Tariffs'],
          removedRisks: [],
          summary: 'Tariff risk was added.',
          evidence: [{ statement: 'Tariffs may raise costs.', section: 'risk_factors' }],
        },
        guidance: {
          outlook: 'raised',
          guidance: ['Revenue growth is expected.'],
          changes: ['Outlook increased.'],
          summary: 'Management raised outlook.',
          evidence: [{ statement: 'We expect growth.', section: 'management_discussion' }],
        },
      },
    });

    expect(scores.materiality.level).toBe('medium');
    expect(scores.materiality.factors.length).toBeGreaterThan(2);
    expect(scores.direction.direction).toBe('mixed');
    expect(scores.confidence.level).toBe('medium');
  });

  it('returns low-confidence unclear scores when no comparable signals exist', () => {
    const scores = calculateFilingScores({});

    expect(scores.materiality).toMatchObject({ score: 0, level: 'minimal' });
    expect(scores.direction).toMatchObject({ score: 0, direction: 'unclear' });
    expect(scores.confidence).toMatchObject({ score: 0, level: 'low' });
  });
});
