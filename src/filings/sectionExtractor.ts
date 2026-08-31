import { ParsedFiling } from './filingParser.js';
import { normalizeText } from './textNormalizer.js';

export interface ExtractedSection {
  key: string;
  title: string;
  text: string;
  startLine: number;
  endLine: number;
  wordCount: number;
}

interface SectionDefinition {
  key: string;
  title: string;
  aliases: string[];
}

const SECTION_DEFINITIONS: Record<string, SectionDefinition[]> = {
  '10-Q': [
    { key: 'management_discussion', title: "Management's Discussion and Analysis", aliases: ['management s discussion and analysis', "management's discussion and analysis", 'item 2 management s discussion and analysis', "item 2 management's discussion and analysis"] },
    { key: 'risk_factors', title: 'Risk Factors', aliases: ['risk factors', 'item 1a risk factors'] },
    { key: 'legal_proceedings', title: 'Legal Proceedings', aliases: ['legal proceedings', 'item 1 legal proceedings'] },
    { key: 'controls_procedures', title: 'Controls and Procedures', aliases: ['controls and procedures', 'item 4 controls and procedures'] },
    { key: 'financial_statements', title: 'Financial Statements', aliases: ['financial statements', 'item 1 financial statements'] },
  ],
  '10-K': [
    { key: 'business', title: 'Business', aliases: ['business', 'item 1 business'] },
    { key: 'risk_factors', title: 'Risk Factors', aliases: ['risk factors', 'item 1a risk factors'] },
    { key: 'management_discussion', title: "Management's Discussion and Analysis", aliases: ['management s discussion and analysis', "management's discussion and analysis", 'item 7 management s discussion and analysis', "item 7 management's discussion and analysis"] },
    { key: 'legal_proceedings', title: 'Legal Proceedings', aliases: ['legal proceedings', 'item 3 legal proceedings'] },
  ],
};

function normalizeHeading(line: string): string {
  return line
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function matchesHeading(line: string, aliases: string[]): boolean {
  const heading = normalizeHeading(line);
  return aliases.some(alias => heading === alias || heading.startsWith(`${alias} `));
}

export function extractSections(parsed: ParsedFiling): ExtractedSection[] {
  const lines = normalizeText(parsed.text).split('\n');
  const definitions = SECTION_DEFINITIONS[parsed.filingType] || [];

  const matches = definitions
    .map(definition => {
      // SEC filings commonly repeat headings in the table of contents. The
      // final heading is the substantive section, while prefix matching keeps
      // standard item headings with descriptive suffixes discoverable.
      const startLine = lines.reduce(
        (lastMatch, line, index) => matchesHeading(line, definition.aliases) ? index : lastMatch,
        -1,
      );

      return startLine >= 0 ? { definition, startLine } : null;
    })
    .filter((match): match is { definition: SectionDefinition; startLine: number } => match !== null)
    .sort((a, b) => a.startLine - b.startLine);

  return matches.map((match, index) => {
    const endLine = index < matches.length - 1 ? matches[index + 1].startLine - 1 : lines.length - 1;
    const content = lines.slice(match.startLine + 1, endLine + 1).join('\n').trim();

    return {
      key: match.definition.key,
      title: match.definition.title,
      text: content,
      startLine: match.startLine,
      endLine,
      wordCount: countWords(content),
    };
  }).filter(section => section.text.length > 0);
}
