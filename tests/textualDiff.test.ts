import { describe, expect, it } from 'vitest';
import { compareSections } from '../src/comparison/textualDiff.js';
import { ExtractedSection } from '../src/filings/sectionExtractor.js';

describe('textualDiff', () => {
  it('detects added and removed sentences within matching sections', () => {
    const currentSections: ExtractedSection[] = [
      {
        key: 'risk_factors',
        title: 'Risk Factors',
        text: 'Demand softened in Europe. Supply chain remained stable. Tariffs may raise costs next quarter.',
        startLine: 0,
        endLine: 3,
        wordCount: 14,
      },
    ];

    const previousSections: ExtractedSection[] = [
      {
        key: 'risk_factors',
        title: 'Risk Factors',
        text: 'Demand softened in Europe. Supply chain remained stable. Foreign exchange volatility affected pricing.',
        startLine: 0,
        endLine: 3,
        wordCount: 13,
      },
    ];

    const changes = compareSections(currentSections, previousSections);

    expect(changes).toHaveLength(1);
    expect(changes[0].section).toBe('risk_factors');
    expect(changes[0].addedSentences[0]).toContain('Tariffs may raise costs');
    expect(changes[0].removedSentences[0]).toContain('Foreign exchange volatility');
    expect(changes[0].similarity).toBeGreaterThan(0);
  });

  it('returns no changes for identical sections', () => {
    const sections: ExtractedSection[] = [
      {
        key: 'management_discussion',
        title: "Management's Discussion and Analysis",
        text: 'Revenue increased due to product mix improvements and better pricing discipline.',
        startLine: 0,
        endLine: 1,
        wordCount: 11,
      },
    ];

    const changes = compareSections(sections, sections);

    expect(changes[0].changeMagnitude).toBe('none');
    expect(changes[0].addedSentences).toEqual([]);
    expect(changes[0].removedSentences).toEqual([]);
    expect(changes[0].similarity).toBe(1);
  });
});
