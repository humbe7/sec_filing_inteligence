/**
 * Filing resolver
 * Finds current and comparable previous filings for a given company and form type
 */

import { SecClient } from './secClient.js';
import { SecSubmission, SecFiling, SecFilingColumns } from './secTypes.js';
import { FilingNotFoundError, FilingParseError } from '../actor/errors.js';
import { FilingMetadata } from '../actor/output.js';
import { Logger } from '../utils/logger.js';

export type FilingType = '10-Q' | '10-K' | '8-K';

export class FilingResolver {
  private secClient: SecClient;
  private logger: Logger;

  constructor(secClient: SecClient) {
    this.secClient = secClient;
    this.logger = new Logger({ phase: 'FILING_RESOLVER' });
  }

  /**
   * Find latest filing of a given form type
   */
  async findLatestFiling(cik: string, form: FilingType): Promise<FilingMetadata> {
    this.logger.info('Finding latest filing', { cik, form });

    const submission = await this.getSubmission(cik);

    // Get all filings of the requested type
    const filings = this.getAllFilings(submission);
    const matching = filings.filter(f => f.form === form);

    if (matching.length === 0) {
      throw new FilingNotFoundError(cik, form);
    }

    // Return the most recent
    return this.filingToMetadata(matching[0], cik);
  }

  /**
   * Find comparable previous filing
   * For 10-Q: previous quarter (Q-1)
   * For 10-K: previous year (FY-1)
   * For 8-K: usually no comparison
   */
  async findComparablePreviousFiling(
    filing: FilingMetadata,
  ): Promise<FilingMetadata | null> {
    const cik = filing.cik;
    const form = filing.filingType;

    if (form === '8-K') {
      // 8-K is usually not compared
      return null;
    }

    this.logger.info('Finding previous comparable filing', {
      cik,
      form,
      currentFilingDate: filing.filingDate,
    });

    const submission = await this.getSubmission(cik);
    const filings = this.getAllFilings(submission);
    const matching = filings.filter(f => f.form === form);

    if (matching.length < 2) {
      this.logger.warn('No previous comparable filing found', {
        cik,
        form,
        availableCount: matching.length,
      });
      return null;
    }

    // Skip the current filing (it's at index 0)
    // Find the previous one that meets criteria
    if (form === '10-Q') {
      return this.findPreviousQuarterFiling(filing, matching, cik);
    }

    if (form === '10-K') {
      return this.findPreviousAnnualFiling(filing, matching, cik);
    }

    // Fallback: use the filing immediately before current
    return this.filingToMetadata(matching[1], cik);
  }

  /**
   * Find previous quarter for 10-Q comparison
   * Prefers same quarter previous year, falls back to previous quarter
   */
  private async findPreviousQuarterFiling(
    currentFiling: FilingMetadata,
    candidates: SecFiling[],
    cik: string,
  ): Promise<FilingMetadata | null> {
    if (!currentFiling.reportDate) {
      // Can't compare without report date
      return this.filingToMetadata(candidates[1], cik);
    }

    const currentDate = new Date(currentFiling.reportDate);
    const currentQuarter = Math.floor((currentDate.getMonth() + 1) / 3);

    // Try same quarter previous year first
    const oneYearAgo = new Date(currentDate);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const sameQuarterPreviousYear = candidates.find(f => {
      if (!f.reportDate) return false;
      const fDate = new Date(f.reportDate);
      const fQuarter = Math.floor((fDate.getMonth() + 1) / 3);
      const daysDiff = Math.abs(fDate.getTime() - oneYearAgo.getTime()) / (1000 * 60 * 60 * 24);
      return fQuarter === currentQuarter && daysDiff < 120; // Within ~4 months
    });

    if (sameQuarterPreviousYear) {
      this.logger.debug('Found YoY previous quarter', { cik });
      return this.filingToMetadata(sameQuarterPreviousYear, cik);
    }

    // Fallback: previous quarter
    this.logger.debug('No YoY match found, using previous quarter', { cik });
    return this.filingToMetadata(candidates[1], cik);
  }

  /**
   * Find previous year for 10-K comparison
   */
  private async findPreviousAnnualFiling(
    currentFiling: FilingMetadata,
    candidates: SecFiling[],
    cik: string,
  ): Promise<FilingMetadata | null> {
    if (!currentFiling.reportDate) {
      return this.filingToMetadata(candidates[1], cik);
    }

    const currentDate = new Date(currentFiling.reportDate);
    const currentYear = currentDate.getFullYear();

    // Find filing for previous year
    const previousYear = candidates.find(f => {
      if (!f.reportDate) return false;
      const fDate = new Date(f.reportDate);
      return fDate.getFullYear() === currentYear - 1;
    });

    if (previousYear) {
      return this.filingToMetadata(previousYear, cik);
    }

    // Fallback
    return this.filingToMetadata(candidates[1], cik);
  }

  /**
   * Get submission data from SEC
   */
  private async getSubmission(cik: string): Promise<SecSubmission> {
    try {
      const data = await this.secClient.getSubmissions(cik);
      return data as SecSubmission;
    } catch (error) {
      this.logger.error('Failed to fetch submissions', { error, cik });
      throw error;
    }
  }

  /**
   * Get all filings from submission (recent + older batches)
   */
  private getAllFilings(submission: SecSubmission): SecFiling[] {
    const recentFilings = submission.filings?.recent;
    if (!recentFilings) {
      return [];
    }

    // Unit fixtures and some cached data use objects; the live SEC API is columnar.
    const filings = Array.isArray(recentFilings)
      ? recentFilings
      : this.normalizeColumnarFilings(recentFilings);

    // In a full implementation, we'd also fetch older filings from the files list
    // For MVP, recent should be sufficient for finding current and previous

    return filings;
  }

  /** Convert the SEC submissions endpoint's columnar response into filing records. */
  private normalizeColumnarFilings(columns: SecFilingColumns): SecFiling[] {
    return columns.accessionNumber.map((accession_number, index) => ({
      accession_number,
      filingDate: columns.filingDate?.[index] ?? '',
      reportDate: columns.reportDate?.[index] ?? '',
      acceptanceDateTime: columns.acceptanceDateTime?.[index] ?? '',
      act: columns.act?.[index] ?? '',
      form: columns.form?.[index] ?? '',
      fileNumber: columns.fileNumber?.[index] ?? '',
      filmNumber: columns.filmNumber?.[index] ?? '',
      items: columns.items?.[index] ?? '',
      size: columns.size?.[index] ?? 0,
      isXBRL: columns.isXBRL?.[index] ?? 0,
      isInlineXBRL: columns.isInlineXBRL?.[index] ?? 0,
      primaryDocument: columns.primaryDocument?.[index] ?? '',
      primaryDocumentDescription: columns.primaryDocDescription?.[index] ?? '',
    }));
  }

  /**
   * Convert SEC filing to our metadata format
   */
  private filingToMetadata(filing: SecFiling, cik: string): FilingMetadata {
    const accessionNumber = filing.accession_number;
    if (!accessionNumber) {
      throw new FilingParseError('unknown', 'Missing accession number');
    }

    // Check if this is an amendment (form ends with /A)
    const isAmendment = filing.form?.endsWith('/A') ?? false;

    return {
      cik: cik.padStart(10, '0'),
      accessionNumber,
      filingType: filing.form || '',
      filingDate: filing.filingDate,
      reportDate: filing.reportDate,
      primaryDocument: filing.primaryDocument || 'index.html',
      filingUrl: `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${accessionNumber}`,
      isAmendment,
    };
  }
}
