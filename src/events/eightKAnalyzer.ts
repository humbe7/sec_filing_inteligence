import { ParsedFiling } from '../filings/filingParser.js';
import { normalizeText, splitIntoSentences } from '../filings/textNormalizer.js';

export type EightKCategory =
  | 'agreements'
  | 'financial_results'
  | 'financing'
  | 'restructuring'
  | 'securities_listing'
  | 'accounting'
  | 'cybersecurity'
  | 'governance'
  | 'regulation_fd'
  | 'other';

export type EventMateriality = 'high' | 'medium' | 'low';

export interface EightKEvent {
  item: string;
  title: string;
  category: EightKCategory;
  eventType: 'MATERIAL_AGREEMENT' | 'EARNINGS_RELEASE' | 'DEBT_ISSUANCE' | 'CYBERSECURITY_INCIDENT' | 'EXECUTIVE_DEPARTURE' | 'OTHER';
  materiality: EventMateriality;
  summary: string;
  evidence: string[];
}

export interface EightKAnalysis {
  events: EightKEvent[];
  eventCount: number;
  overallMateriality: EventMateriality | 'none';
  categories: EightKCategory[];
}

interface ItemDefinition {
  category: EightKCategory;
  materiality: EventMateriality;
  eventType?: EightKEvent['eventType'];
}

const ITEM_DEFINITIONS: Record<string, ItemDefinition> = {
  '1.01': { category: 'agreements', materiality: 'medium', eventType: 'MATERIAL_AGREEMENT' },
  '1.05': { category: 'cybersecurity', materiality: 'high', eventType: 'CYBERSECURITY_INCIDENT' },
  '1.02': { category: 'agreements', materiality: 'medium' },
  '1.03': { category: 'restructuring', materiality: 'high' },
  '2.01': { category: 'agreements', materiality: 'high' },
  '2.02': { category: 'financial_results', materiality: 'medium', eventType: 'EARNINGS_RELEASE' },
  '2.03': { category: 'financing', materiality: 'high', eventType: 'DEBT_ISSUANCE' },
  '2.04': { category: 'financing', materiality: 'high' },
  '2.05': { category: 'restructuring', materiality: 'high' },
  '2.06': { category: 'accounting', materiality: 'high' },
  '3.01': { category: 'securities_listing', materiality: 'high' },
  '3.02': { category: 'financing', materiality: 'medium' },
  '3.03': { category: 'securities_listing', materiality: 'medium' },
  '4.01': { category: 'accounting', materiality: 'high' },
  '4.02': { category: 'accounting', materiality: 'high' },
  '5.01': { category: 'governance', materiality: 'high' },
  '5.02': { category: 'governance', materiality: 'high', eventType: 'EXECUTIVE_DEPARTURE' },
  '5.03': { category: 'governance', materiality: 'medium' },
  '5.04': { category: 'governance', materiality: 'medium' },
  '5.05': { category: 'governance', materiality: 'low' },
  '5.06': { category: 'governance', materiality: 'medium' },
  '5.07': { category: 'governance', materiality: 'medium' },
  '7.01': { category: 'regulation_fd', materiality: 'low' },
  '8.01': { category: 'other', materiality: 'low' },
  '9.01': { category: 'other', materiality: 'low' },
};

const MATERIALITY_RANK: Record<EventMateriality, number> = { high: 3, medium: 2, low: 1 };

interface ItemMatch {
  item: string;
  title: string;
  line: number;
}

function findItemMatches(lines: string[]): ItemMatch[] {
  return lines.flatMap((line, index) => {
    const match = line.match(/^item\s+(\d\.\d{2})\s*[-.:]?\s*(.*)$/i);
    if (!match || !ITEM_DEFINITIONS[match[1]]) return [];
    return [{ item: match[1], title: match[2].trim() || `Item ${match[1]}`, line: index }];
  });
}

function summarize(content: string): { summary: string; evidence: string[] } {
  const evidence = splitIntoSentences(content).slice(0, 3);
  const fallback = normalizeText(content).split('\n').find(line => line.length > 0) || '';
  const summary = (evidence.join(' ') || fallback).slice(0, 1000);
  return { summary, evidence };
}

/** Extracts disclosed 8-K items and maps their SEC item codes to event categories. */
export function analyzeEightK(parsed: ParsedFiling): EightKAnalysis {
  if (parsed.filingType !== '8-K') {
    return { events: [], eventCount: 0, overallMateriality: 'none', categories: [] };
  }

  const lines = normalizeText(parsed.text).split('\n');
  const matches = findItemMatches(lines);
  const events = matches.map((match, index) => {
    const endLine = index < matches.length - 1 ? matches[index + 1].line : lines.length;
    const content = lines.slice(match.line + 1, endLine).join('\n').trim();
    const { summary, evidence } = summarize(content);
    const definition = ITEM_DEFINITIONS[match.item];

    return {
      item: match.item,
      title: match.title,
      category: definition.category,
      eventType: definition.eventType || 'OTHER',
      materiality: definition.materiality,
      summary,
      evidence,
    } satisfies EightKEvent;
  }).filter(event => event.summary.length > 0 || event.evidence.length > 0);

  const overallMateriality = events.reduce<EventMateriality | 'none'>((highest, event) => {
    if (highest === 'none' || MATERIALITY_RANK[event.materiality] > MATERIALITY_RANK[highest]) {
      return event.materiality;
    }
    return highest;
  }, 'none');

  return {
    events,
    eventCount: events.length,
    overallMateriality,
    categories: [...new Set(events.map(event => event.category))],
  };
}
