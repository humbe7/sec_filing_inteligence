/**
 * Tests for CompanyFactsClient
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompanyFactsClient } from '../src/xbrl/companyFactsClient.js';
import { SecClient } from '../src/sec/secClient.js';
import { CompanyFacts, XBRLFact } from '../src/xbrl/xbrlTypes.js';

vi.mock('../src/sec/secClient.js');

describe('CompanyFactsClient', () => {
  let client: CompanyFactsClient;
  let mockSecClient: any;

  const mockFacts: CompanyFacts = {
    'us-gaap': {
      'us-gaap:Revenues': [
        {
          accn: '0001000000-24-000001',
          fy: 2024,
          fp: 'Q1',
          form: '10-Q',
          filed: '2024-05-15',
          start: '2024-01-01',
          end: '2024-03-31',
          val: 25_000_000_000,
          accn_fp: '0001000000-24-000001_q1',
          unit: 'USD',
          negating: 0,
        },
      ],
      'us-gaap:NetIncomeLoss': [
        {
          accn: '0001000000-24-000001',
          fy: 2024,
          fp: 'Q1',
          form: '10-Q',
          filed: '2024-05-15',
          start: '2024-01-01',
          end: '2024-03-31',
          val: 5_000_000_000,
          accn_fp: '0001000000-24-000001_q1',
          unit: 'USD',
          negating: 0,
        },
      ],
    },
  };

  beforeEach(() => {
    mockSecClient = new SecClient() as any;
    client = new CompanyFactsClient(mockSecClient);
  });

  afterEach(() => {
    client.clearCache();
    vi.clearAllMocks();
  });

  it('should fetch company facts', async () => {
    mockSecClient.getCompanyFacts.mockResolvedValue(mockFacts);

    const facts = await client.getCompanyFacts('0001000000');

    expect(facts['us-gaap']).toBeDefined();
    expect(facts['us-gaap']['us-gaap:Revenues']).toBeDefined();
    expect(mockSecClient.getCompanyFacts).toHaveBeenCalledWith('0001000000');
  });

  it('should cache results', async () => {
    mockSecClient.getCompanyFacts.mockResolvedValue(mockFacts);

    // First call
    await client.getCompanyFacts('0001000000');

    // Clear mock to verify it's not called again
    mockSecClient.getCompanyFacts.mockClear();

    // Second call should use cache
    const facts = await client.getCompanyFacts('0001000000');

    expect(facts['us-gaap']).toBeDefined();
    expect(mockSecClient.getCompanyFacts).not.toHaveBeenCalled();
  });

  it('should normalize CIK before fetching', async () => {
    mockSecClient.getCompanyFacts.mockResolvedValue(mockFacts);

    await client.getCompanyFacts('1000000');

    // Should be padded to 10 digits
    expect(mockSecClient.getCompanyFacts).toHaveBeenCalledWith('0001000000');
  });

  it('should return empty facts on error', async () => {
    mockSecClient.getCompanyFacts.mockRejectedValue(new Error('API Error'));

    const facts = await client.getCompanyFacts('0001000000');

    expect(facts['us-gaap']).toBeDefined();
    expect(Object.keys(facts['us-gaap']).length).toBe(0);
  });

  it('should get concept facts', () => {
    const facts = client.getConceptFacts(mockFacts, 'us-gaap:Revenues');

    expect(facts.length).toBe(1);
    expect(facts[0].val).toBe(25_000_000_000);
  });

  it('should return empty array for unknown concept', () => {
    const facts = client.getConceptFacts(mockFacts, 'us-gaap:UnknownConcept');

    expect(facts.length).toBe(0);
  });

  it('should find best fact by form', () => {
    const facts: XBRLFact[] = [
      {
        accn: '0001000000-24-000001',
        fy: 2024,
        fp: 'Q1',
        form: '10-Q',
        filed: '2024-05-15',
        start: '2024-01-01',
        end: '2024-03-31',
        val: 25_000_000_000,
        accn_fp: '0001000000-24-000001_q1',
        unit: 'USD',
        negating: 0,
      },
      {
        accn: '0001000000-23-000001',
        fy: 2023,
        fp: 'Q1',
        form: '10-Q',
        filed: '2023-05-10',
        start: '2023-01-01',
        end: '2023-03-31',
        val: 20_000_000_000,
        accn_fp: '0001000000-23-000001_q1',
        unit: 'USD',
        negating: 0,
      },
    ];

    const best = client.findBestFact(facts, '10-Q');

    expect(best).not.toBeNull();
    expect(best?.val).toBe(25_000_000_000);
    expect(best?.filed).toBe('2024-05-15');
  });

  it('should filter facts by fiscal period', () => {
    const facts: XBRLFact[] = [
      {
        accn: '0001000000-24-000001',
        fy: 2024,
        fp: 'Q1',
        form: '10-Q',
        filed: '2024-05-15',
        start: '2024-01-01',
        end: '2024-03-31',
        val: 25_000_000_000,
        accn_fp: '0001000000-24-000001_q1',
        unit: 'USD',
        negating: 0,
      },
    ];

    const best = client.findBestFact(facts, '10-Q', 'Q1');

    expect(best).not.toBeNull();
    expect(best?.fp).toBe('Q1');
  });

  it('should get unique periods', () => {
    const facts: XBRLFact[] = [
      {
        accn: '0001000000-24-000001',
        fy: 2024,
        fp: 'Q1',
        form: '10-Q',
        filed: '2024-05-15',
        start: '2024-01-01',
        end: '2024-03-31',
        val: 25_000_000_000,
        accn_fp: '0001000000-24-000001_q1',
        unit: 'USD',
        negating: 0,
      },
      {
        accn: '0001000000-24-000002',
        fy: 2024,
        fp: 'Q2',
        form: '10-Q',
        filed: '2024-08-01',
        start: '2024-04-01',
        end: '2024-06-30',
        val: 26_000_000_000,
        accn_fp: '0001000000-24-000002_q2',
        unit: 'USD',
        negating: 0,
      },
    ];

    const periods = client.getUniquePeriods(facts, '10-Q');

    expect(periods).toContain('Q1');
    expect(periods).toContain('Q2');
  });
});
