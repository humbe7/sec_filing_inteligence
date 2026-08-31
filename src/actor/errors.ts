/**
 * Typed errors for SEC Filing Intelligence Actor
 */

export class SecFilingError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SecFilingError';
  }
}

export class InvalidTickerError extends SecFilingError {
  constructor(ticker: string) {
    super(`Invalid ticker format: "${ticker}"`, 'INVALID_TICKER');
    this.name = 'InvalidTickerError';
  }
}

export class CompanyNotFoundError extends SecFilingError {
  constructor(ticker: string) {
    super(`Company not found for ticker: "${ticker}"`, 'COMPANY_NOT_FOUND');
    this.name = 'CompanyNotFoundError';
  }
}

export class FilingNotFoundError extends SecFilingError {
  constructor(cik: string, form: string) {
    super(`No ${form} filing found for CIK: ${cik}`, 'FILING_NOT_FOUND');
    this.name = 'FilingNotFoundError';
  }
}

export class PreviousFilingNotFoundError extends SecFilingError {
  constructor(cik: string, form: string) {
    super(`No previous comparable ${form} filing found for CIK: ${cik}`, 'PREVIOUS_FILING_NOT_FOUND');
    this.name = 'PreviousFilingNotFoundError';
  }
}

export class SecRateLimitError extends SecFilingError {
  constructor(retryAfterSeconds?: number) {
    const message = retryAfterSeconds
      ? `SEC rate limit exceeded. Retry after ${retryAfterSeconds} seconds.`
      : 'SEC rate limit exceeded.';
    super(message, 'SEC_RATE_LIMIT');
    this.name = 'SecRateLimitError';
  }
}

export class SecUnavailableError extends SecFilingError {
  constructor(statusCode: number) {
    super(`SEC API unavailable (HTTP ${statusCode})`, 'SEC_UNAVAILABLE');
    this.name = 'SecUnavailableError';
  }
}

export class FilingParseError extends SecFilingError {
  constructor(accessionNumber: string, reason: string) {
    super(`Failed to parse filing ${accessionNumber}: ${reason}`, 'FILING_PARSE_ERROR');
    this.name = 'FilingParseError';
  }
}

export class ValidationError extends SecFilingError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
