import { describe, expect, it } from 'vitest';
import { extractSections } from '../src/filings/sectionExtractor.js';
import { ParsedFiling } from '../src/filings/filingParser.js';

describe('sectionExtractor', () => {
  it('extracts known 10-Q sections by heading', () => {
    const filing: ParsedFiling = {
      accessionNumber: '0000000000-24-000001',
      filingType: '10-Q',
      filingDate: '2024-05-01',
      title: 'Quarterly Report',
      text: `
Item 1 Financial Statements
Revenue was stable in the quarter.

Item 2 Management's Discussion and Analysis
Management discussed pricing, demand, and margin improvement.

Item 1A Risk Factors
Competition intensified in core markets.

Item 4 Controls and Procedures
Controls remained effective.
      `.trim(),
    };

    const sections = extractSections(filing);

    expect(sections.map(section => section.key)).toEqual([
      'financial_statements',
      'management_discussion',
      'risk_factors',
      'controls_procedures',
    ]);
    expect(sections[1].text).toContain('pricing, demand, and margin improvement');
  });

  it('uses the substantive heading instead of a table-of-contents duplicate', () => {
    const filing: ParsedFiling = {
      accessionNumber: '0000000000-24-000001', filingType: '10-Q', filingDate: '2024-05-01', title: 'Quarterly Report',
      text: `
Item 2 Management's Discussion and Analysis
Item 1A Risk Factors

Item 2 Management's Discussion and Analysis of Financial Condition and Results of Operations
Management expects demand to remain strong.

Item 1A Risk Factors
Competition intensified in core markets.
      `.trim(),
    };

    const sections = extractSections(filing);
    const managementDiscussion = sections.find(section => section.key === 'management_discussion');

    expect(managementDiscussion?.text).toContain('Management expects demand to remain strong.');
    expect(managementDiscussion?.text).not.toContain('Item 1A Risk Factors');
  });
});
