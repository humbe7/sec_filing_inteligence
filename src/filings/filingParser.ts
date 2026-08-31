import { DownloadedFiling } from '../sec/filingDownloader.js';
import { htmlToPlainText } from './textNormalizer.js';

export interface ParsedFiling {
  accessionNumber: string;
  filingType: string;
  filingDate: string;
  title: string;
  text: string;
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch?.[1]?.replace(/\s+/g, ' ').trim() || 'SEC Filing';
}

export function parseFiling(downloaded: DownloadedFiling): ParsedFiling {
  return {
    accessionNumber: downloaded.accessionNumber,
    filingType: downloaded.filingType,
    filingDate: downloaded.filingDate,
    title: extractTitle(downloaded.html),
    text: htmlToPlainText(downloaded.html),
  };
}
