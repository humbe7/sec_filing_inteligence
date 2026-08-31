import { describe, expect, it } from 'vitest';
import { detectMaterialChanges } from '../src/comparison/semanticDiff.js';

describe('semanticDiff', () => {
  it('classifies strengthened regulatory risk language as an increased risk', () => {
    const changes = detectMaterialChanges([{
      section: 'risk_factors',
      title: 'Risk Factors',
      currentWordCount: 400,
      previousWordCount: 300,
      addedSentences: ['Expanded export controls may materially restrict sales and adversely affect revenue.'],
      removedSentences: ['Export controls may affect sales.'],
      similarity: 0.7,
      changeMagnitude: 'high',
    }]);

    expect(changes[0]).toMatchObject({ type: 'RISK_INCREASED', category: 'REGULATORY', materiality: 80 });
    expect(changes[0].evidence.current[0]).toContain('Expanded export controls');
  });

  it('does not turn low ordinary wording changes into material changes', () => {
    expect(detectMaterialChanges([{
      section: 'management_discussion', title: 'MD&A', currentWordCount: 100, previousWordCount: 99,
      addedSentences: ['We continued to execute our strategy.'], removedSentences: [], similarity: 0.98, changeMagnitude: 'low',
    }])).toEqual([]);
  });
});
