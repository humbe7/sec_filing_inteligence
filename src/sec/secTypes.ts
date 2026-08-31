/**
 * Type definitions for SEC EDGAR API responses
 */

export interface SecCompanyTicker {
  cik_str: number;
  ticker: string;
  title: string;
}

export interface SecSubmission {
  cik_str: number;
  entityType: string;
  name: string;
  sic: string;
  sicDescription: string;
  categoryIteration: number;
  entityIteration: number;
  latest: {
    accession_number: string;
    filingDate: string;
    reportDate: string;
    acceptanceDateTime: string;
    act: string;
    form: string;
    fileNumber: string;
    filmNumber: string;
    items: string;
    size: number;
    isXBRL: number;
    isInlineXBRL: number;
    primaryDocument: string;
    primaryDocumentDescription: string;
  };
  filings: {
    recent: SecFiling[];
    files: Array<{
      name: string;
      filingCount: number;
    }>;
  };
}

export interface SecFiling {
  accession_number: string;
  filingDate: string;
  reportDate: string;
  acceptanceDateTime: string;
  act: string;
  form: string;
  fileNumber: string;
  filmNumber: string;
  items: string;
  size: number;
  isXBRL: number;
  isInlineXBRL: number;
  primaryDocument: string;
  primaryDocumentDescription: string;
  // Additional derived fields
  cik?: string;
}

export interface SecFact {
  accn: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  start: string;
  end: string;
  val: number;
  accn_fp: string;
  unit: string;
  negating: number;
}

export interface CompanyFacts {
  'us-gaap': Record<string, Array<SecFact>>;
  'ifrs-full': Record<string, Array<SecFact>>;
  'dei': Record<string, Array<SecFact>>;
}
