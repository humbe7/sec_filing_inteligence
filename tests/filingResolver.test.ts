/**
 * Unit tests for Filing Resolver
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilingResolver } from '../src/sec/filingResolver.js';
import { FilingNotFoundError, PreviousFilingNotFoundError } from '../src/actor/errors.js';
import { SecClient } from '../src/sec/secClient.js';
import { SecSubmission } from '../src/sec/secTypes.js';

vi.mock('../src/sec/secClient.js');

describe('FilingResolver', () => {
  let resolver: FilingResolver;
  let mockSecClient: any;

  const mockSubmission: SecSubmission = {
    cik_str: 1045810,
    entityType: 'large-accelerated-filer',
    name: 'NVIDIA Corporation',
    sic: '3674',
    sicDescription: 'Semiconductors and Related Devices',
    categoryIteration: 1,
    entityIteration: 1,
    latest: {
      accession_number: '0000000000-00-000001',
      filingDate: '2024-08-26',
      reportDate: '2024-08-26',
      acceptanceDateTime: '2024-08-26T15:30:00.000Z',
      act: '34',
      form: '10-Q',
      fileNumber: '001-10882',
      filmNumber: '241100101',
      items: '2',
      size: 5000000,
      isXBRL: 1,
      isInlineXBRL: 1,
      primaryDocument: '0000000000-24-000001/index.html',
      primaryDocumentDescription: 'INDEX',
    },
    filings: {
      recent: [
        {
          accession_number: '0001045810-24-000100',
          filingDate: '2024-08-26',
          reportDate: '2024-07-31',
          acceptanceDateTime: '2024-08-26T15:30:00.000Z',
          act: '34',
          form: '10-Q',
          fileNumber: '001-10882',
          filmNumber: '241100101',
          items: '2',
          size: 5000000,
          isXBRL: 1,
          isInlineXBRL: 1,
          primaryDocument: 'nvda-20240731.htm',
          primaryDocumentDescription: '10-Q',
        },
        {
          accession_number: '0001045810-24-000075',
          filingDate: '2024-05-23',
          reportDate: '2024-04-30',
          acceptanceDateTime: '2024-05-23T15:30:00.000Z',
          act: '34',
          form: '10-Q',
          fileNumber: '001-10882',
          filmNumber: '241100101',
          items: '2',
          size: 4500000,
          isXBRL: 1,
          isInlineXBRL: 1,
          primaryDocument: 'nvda-20240430.htm',
          primaryDocumentDescription: '10-Q',
        },
        {
          accession_number: '0001045810-23-000080',
          filingDate: '2023-08-18',
          reportDate: '2023-07-31',
          acceptanceDateTime: '2023-08-18T15:30:00.000Z',
          act: '34',
          form: '10-Q',
          fileNumber: '001-10882',
          filmNumber: '231100101',
          items: '2',
          size: 4000000,
          isXBRL: 1,
          isInlineXBRL: 1,
          primaryDocument: 'nvda-20230731.htm',
          primaryDocumentDescription: '10-Q',
        },
      ],
      files: [],
    },
  };

  beforeEach(() => {
    mockSecClient = new SecClient() as any;
    resolver = new FilingResolver(mockSecClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should find latest 10-Q filing', async () => {
    mockSecClient.getSubmissions.mockResolvedValue(mockSubmission);

    const filing = await resolver.findLatestFiling('0000001045810', '10-Q');

    expect(filing.accessionNumber).toBe('0001045810-24-000100');
    expect(filing.filingType).toBe('10-Q');
    expect(filing.filingDate).toBe('2024-08-26');
    expect(filing.reportDate).toBe('2024-07-31');
    expect(filing.isAmendment).toBe(false);
  });

  it('should normalize the SEC columnar recent-filings response', async () => {
    const columnarSubmission: SecSubmission = {
      ...mockSubmission,
      filings: {
        recent: {
          accessionNumber: ['0001045810-24-000100', '0001045810-23-000080'],
          filingDate: ['2024-08-26', '2023-08-18'],
          reportDate: ['2024-07-31', '2023-07-31'],
          acceptanceDateTime: ['2024-08-26T15:30:00.000Z', '2023-08-18T15:30:00.000Z'],
          act: ['34', '34'],
          form: ['10-Q', '10-Q'],
          fileNumber: ['001-10882', '001-10882'],
          filmNumber: ['241100101', '231100101'],
          items: ['2', '2'],
          size: [5000000, 4000000],
          isXBRL: [1, 1],
          isInlineXBRL: [1, 1],
          primaryDocument: ['nvda-20240731.htm', 'nvda-20230731.htm'],
          primaryDocDescription: ['10-Q', '10-Q'],
        },
        files: [],
      },
    };
    mockSecClient.getSubmissions.mockResolvedValue(columnarSubmission);

    const filing = await resolver.findLatestFiling('0000001045810', '10-Q');

    expect(filing.accessionNumber).toBe('0001045810-24-000100');
    expect(filing.primaryDocument).toBe('nvda-20240731.htm');
  });

  it('should throw FilingNotFoundError when no matching filing exists', async () => {
    const emptySubmission: SecSubmission = {
      ...mockSubmission,
      filings: {
        recent: [
          {
            accession_number: '0001045810-24-000100',
            filingDate: '2024-08-26',
            reportDate: '2024-07-31',
            acceptanceDateTime: '2024-08-26T15:30:00.000Z',
            act: '34',
            form: '8-K',
            fileNumber: '001-10882',
            filmNumber: '241100101',
            items: '2',
            size: 5000000,
            isXBRL: 1,
            isInlineXBRL: 1,
            primaryDocument: '8k.htm',
            primaryDocumentDescription: '8-K',
          },
        ],
        files: [],
      },
    };

    mockSecClient.getSubmissions.mockResolvedValue(emptySubmission);

    await expect(resolver.findLatestFiling('0000001045810', '10-Q')).rejects.toThrow(
      FilingNotFoundError,
    );
  });

  it('should find comparable previous 10-Q filing', async () => {
    mockSecClient.getSubmissions.mockResolvedValue(mockSubmission);

    const currentFiling = await resolver.findLatestFiling('0000001045810', '10-Q');
    const previousFiling = await resolver.findComparablePreviousFiling(currentFiling);

    expect(previousFiling).not.toBeNull();
    // Should find the YoY (same quarter previous year) filing
    expect(previousFiling?.accessionNumber).toBe('0001045810-23-000080');
  });

  it('should return null for previous 8-K filing', async () => {
    const filing = {
      cik: '0000001045810',
      accessionNumber: '0001045810-24-000100',
      filingType: '8-K',
      filingDate: '2024-08-26',
      reportDate: '2024-08-26',
      primaryDocument: '8k.htm',
      filingUrl: 'https://sec.gov',
      isAmendment: false,
    };

    const previous = await resolver.findComparablePreviousFiling(filing);

    expect(previous).toBeNull();
  });

  it('should detect amendment filings', async () => {
    const submissionWithAmendment: SecSubmission = {
      ...mockSubmission,
      filings: {
        recent: [
          {
            accession_number: '0001045810-24-000100',
            filingDate: '2024-08-27',
            reportDate: '2024-07-31',
            acceptanceDateTime: '2024-08-27T15:30:00.000Z',
            act: '34',
            form: '10-Q/A',
            fileNumber: '001-10882',
            filmNumber: '241100101',
            items: '2',
            size: 5000000,
            isXBRL: 1,
            isInlineXBRL: 1,
            primaryDocument: 'nvda-20240731.htm',
            primaryDocumentDescription: '10-Q/A',
          },
        ],
        files: [],
      },
    };

    mockSecClient.getSubmissions.mockResolvedValue(submissionWithAmendment);

    const filing = await resolver.findLatestFiling('0000001045810', '10-Q/A' as any);

    expect(filing.isAmendment).toBe(true);
  });

  it('should construct proper filing URL', async () => {
    mockSecClient.getSubmissions.mockResolvedValue(mockSubmission);

    const filing = await resolver.findLatestFiling('0000001045810', '10-Q');

    expect(filing.filingUrl).toContain('https://www.sec.gov');
    expect(filing.filingUrl).toContain('0001045810-24-000100');
  });
});
