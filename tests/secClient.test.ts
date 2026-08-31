import { describe, expect, it } from 'vitest';
import { buildFilingDocumentPath } from '../src/sec/secClient.js';

describe('SEC filing document path', () => {
  it('uses the accession CIK prefix for the SEC archive path', () => {
    expect(buildFilingDocumentPath('0001045810-24-000100', 'nvda-20240731.htm'))
      .toBe('/Archives/1045810/000104581024000100/nvda-20240731.htm');
  });

  it('rejects malformed accession numbers and document paths', () => {
    expect(() => buildFilingDocumentPath('../bad', 'filing.htm')).toThrow('Invalid SEC accession number');
    expect(() => buildFilingDocumentPath('0001045810-24-000100', '../filing.htm')).toThrow('Invalid SEC primary document name');
  });
});
