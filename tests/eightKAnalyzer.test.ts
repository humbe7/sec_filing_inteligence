import { describe, expect, it } from 'vitest';
import { analyzeEightK } from '../src/events/eightKAnalyzer.js';
import { ParsedFiling } from '../src/filings/filingParser.js';

describe('eightKAnalyzer', () => {
  it('classifies 8-K event items and reports highest materiality', () => {
    const filing: ParsedFiling = {
      accessionNumber: '0000000000-24-000001',
      filingType: '8-K',
      filingDate: '2024-05-01',
      title: 'Current Report',
      text: `
Item 2.02 Results of Operations and Financial Condition
The company reported quarterly results and issued an earnings release.

Item 5.02 Departure of Directors or Certain Officers
The chief financial officer resigned effective immediately following the filing.

Item 9.01 Financial Statements and Exhibits
The earnings release is furnished as an exhibit.
      `.trim(),
    };

    const result = analyzeEightK(filing);

    expect(result.eventCount).toBe(3);
    expect(result.events[0]).toMatchObject({ item: '2.02', category: 'financial_results', materiality: 'medium' });
    expect(result.events[1]).toMatchObject({ item: '5.02', category: 'governance', eventType: 'EXECUTIVE_DEPARTURE', materiality: 'high' });
    expect(result.overallMateriality).toBe('high');
  });

  it('does not classify periodic filings as 8-K events', () => {
    const result = analyzeEightK({
      accessionNumber: '0000000000-24-000001',
      filingType: '10-Q',
      filingDate: '2024-05-01',
      title: 'Quarterly Report',
      text: 'Item 2.02 Results of Operations and Financial Condition',
    });

    expect(result).toMatchObject({ eventCount: 0, overallMateriality: 'none' });
  });

  it('recognizes a disclosed cybersecurity incident', () => {
    const result = analyzeEightK({ accessionNumber: '0000000000-24-000001', filingType: '8-K', filingDate: '2024-05-01', title: 'Current Report', text: 'Item 1.05 Material Cybersecurity Incidents\nThe company identified a material cybersecurity incident affecting systems.' });
    expect(result.events[0]).toMatchObject({ category: 'cybersecurity', eventType: 'CYBERSECURITY_INCIDENT', materiality: 'high' });
  });
});
