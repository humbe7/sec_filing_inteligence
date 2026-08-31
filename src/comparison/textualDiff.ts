import { ExtractedSection } from '../filings/sectionExtractor.js';
import { normalizeText, splitIntoSentences } from '../filings/textNormalizer.js';

export interface TextualChange {
  section: string;
  title: string;
  currentWordCount: number;
  previousWordCount: number;
  addedSentences: string[];
  removedSentences: string[];
  similarity: number;
  changeMagnitude: 'none' | 'low' | 'medium' | 'high';
}

function toSentenceSet(text: string): Set<string> {
  return new Set(
    splitIntoSentences(text).map(sentence => normalizeText(sentence).toLowerCase()),
  );
}

function calculateSimilarity(currentText: string, previousText: string): number {
  const currentTokens = new Set(
    normalizeText(currentText).toLowerCase().split(/\W+/).filter(token => token.length > 2),
  );
  const previousTokens = new Set(
    normalizeText(previousText).toLowerCase().split(/\W+/).filter(token => token.length > 2),
  );

  const intersection = [...currentTokens].filter(token => previousTokens.has(token)).length;
  const union = new Set([...currentTokens, ...previousTokens]).size;

  if (union === 0) {
    return 1;
  }

  return Number((intersection / union).toFixed(3));
}

function classifyChangeMagnitude(
  currentWordCount: number,
  previousWordCount: number,
  addedCount: number,
  removedCount: number,
): TextualChange['changeMagnitude'] {
  const baseline = Math.max(currentWordCount, previousWordCount, 1);
  const changeRatio = (addedCount + removedCount) / baseline;

  if (addedCount === 0 && removedCount === 0) {
    return 'none';
  }

  if (changeRatio >= 0.2) {
    return 'high';
  }

  if (changeRatio >= 0.08) {
    return 'medium';
  }

  return 'low';
}

export function compareSections(
  currentSections: ExtractedSection[],
  previousSections: ExtractedSection[],
): TextualChange[] {
  const previousByKey = new Map(previousSections.map(section => [section.key, section]));

  return currentSections
    .map(currentSection => {
      const previousSection = previousByKey.get(currentSection.key);
      if (!previousSection) {
        return null;
      }

      const currentSentences = splitIntoSentences(currentSection.text);
      const previousSentences = splitIntoSentences(previousSection.text);
      const currentSet = toSentenceSet(currentSection.text);
      const previousSet = toSentenceSet(previousSection.text);

      const addedSentences = currentSentences.filter(sentence =>
        !previousSet.has(normalizeText(sentence).toLowerCase()),
      );
      const removedSentences = previousSentences.filter(sentence =>
        !currentSet.has(normalizeText(sentence).toLowerCase()),
      );

      return {
        section: currentSection.key,
        title: currentSection.title,
        currentWordCount: currentSection.wordCount,
        previousWordCount: previousSection.wordCount,
        addedSentences: addedSentences.slice(0, 5),
        removedSentences: removedSentences.slice(0, 5),
        similarity: calculateSimilarity(currentSection.text, previousSection.text),
        changeMagnitude: classifyChangeMagnitude(
          currentSection.wordCount,
          previousSection.wordCount,
          addedSentences.length,
          removedSentences.length,
        ),
      };
    })
    .filter((change): change is TextualChange => change !== null);
}
