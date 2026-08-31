import { TextualChangeOutput } from '../actor/output.js';

export type MaterialChangeType =
  | 'NEW_RISK'
  | 'RISK_INCREASED'
  | 'RISK_DECREASED'
  | 'RISK_REMOVED'
  | 'NEW_GUIDANCE'
  | 'GUIDANCE_RAISED'
  | 'GUIDANCE_LOWERED'
  | 'GUIDANCE_WITHDRAWN'
  | 'OTHER_MATERIAL_CHANGE';

export type MaterialChangeCategory = 'REGULATORY' | 'LEGAL' | 'LIQUIDITY' | 'COMPETITION' | 'SUPPLY_CHAIN' | 'GUIDANCE' | 'OTHER';

export interface MaterialChange {
  section: string;
  type: MaterialChangeType;
  category: MaterialChangeCategory;
  materiality: number;
  confidence: number;
  summary: string;
  evidence: {
    previous: string[];
    current: string[];
  };
}

function categoryFor(text: string): MaterialChangeCategory {
  const lower = text.toLowerCase();
  if (/(regulat|export control|sanction|government)/.test(lower)) return 'REGULATORY';
  if (/(legal|litigation|claim|proceeding)/.test(lower)) return 'LEGAL';
  if (/(liquidity|debt|cash flow|borrow)/.test(lower)) return 'LIQUIDITY';
  if (/(compet|market share)/.test(lower)) return 'COMPETITION';
  if (/(supply|supplier|shortage)/.test(lower)) return 'SUPPLY_CHAIN';
  if (/(guidance|outlook|expect|forecast)/.test(lower)) return 'GUIDANCE';
  return 'OTHER';
}

function classify(change: TextualChangeOutput): MaterialChangeType | null {
  const added = change.addedSentences.join(' ').toLowerCase();
  const removed = change.removedSentences.join(' ').toLowerCase();
  if (change.section === 'risk_factors') {
    if (added && /(increas|expand|material|advers|restrict|uncertain)/.test(added)) return 'RISK_INCREASED';
    if (added) return 'NEW_RISK';
    if (removed) return 'RISK_REMOVED';
  }
  if (/(guidance|outlook|expect|forecast)/.test(`${added} ${removed}`)) {
    if (/(rais|increas|improv)/.test(added)) return 'GUIDANCE_RAISED';
    if (/(lower|decreas|weak|reduc)/.test(added)) return 'GUIDANCE_LOWERED';
    if (removed && !added) return 'GUIDANCE_WITHDRAWN';
    if (added) return 'NEW_GUIDANCE';
  }
  return change.changeMagnitude === 'high' ? 'OTHER_MATERIAL_CHANGE' : null;
}

/** Classifies only substantial deterministic diffs and retains their source sentences. */
export function detectMaterialChanges(changes: TextualChangeOutput[]): MaterialChange[] {
  return changes.flatMap(change => {
    if (change.changeMagnitude === 'none') return [];
    const type = classify(change);
    if (!type) return [];
    const current = change.addedSentences.slice(0, 3);
    const previous = change.removedSentences.slice(0, 3);
    const text = `${current.join(' ')} ${previous.join(' ')}`;
    const materiality = change.changeMagnitude === 'high' ? 80 : change.changeMagnitude === 'medium' ? 55 : 30;
    return [{
      section: change.section,
      type,
      category: categoryFor(text),
      materiality,
      confidence: Number((0.55 + change.similarity * 0.35).toFixed(2)),
      summary: `${change.title}: ${type.replace(/_/g, ' ').toLowerCase()}.`,
      evidence: { previous, current },
    }];
  });
}
