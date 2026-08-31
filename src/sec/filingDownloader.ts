import { FilingMetadata } from '../actor/output.js';
import { SecClient } from './secClient.js';
import { Logger } from '../utils/logger.js';

export interface DownloadedFiling {
  accessionNumber: string;
  filingType: string;
  filingDate: string;
  primaryDocument: string;
  html: string;
}

export class FilingDownloader {
  private logger: Logger;

  constructor(private readonly secClient: SecClient) {
    this.logger = new Logger({ phase: 'FILING_DOWNLOADER' });
  }

  async downloadFiling(filing: FilingMetadata): Promise<DownloadedFiling> {
    this.logger.info('Downloading filing document', {
      accessionNumber: filing.accessionNumber,
      primaryDocument: filing.primaryDocument,
    });

    const html = await this.secClient.getFilingDocument(
      filing.accessionNumber,
      filing.primaryDocument,
    );

    return {
      accessionNumber: filing.accessionNumber,
      filingType: filing.filingType,
      filingDate: filing.filingDate,
      primaryDocument: filing.primaryDocument,
      html,
    };
  }
}
