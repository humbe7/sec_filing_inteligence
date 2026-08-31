import { describe, expect, it } from 'vitest';
import { htmlToPlainText, splitIntoSentences } from '../src/filings/textNormalizer.js';

describe('textNormalizer', () => {
  it('converts common HTML structures into readable text', () => {
    const html = `
      <html>
        <body>
          <h1>Risk Factors</h1>
          <p>Demand softened &amp; pricing became more competitive.</p>
          <ul><li>Supply chain remained stable.</li></ul>
        </body>
      </html>
    `;

    const text = htmlToPlainText(html);

    expect(text).toContain('Risk Factors');
    expect(text).toContain('Demand softened & pricing became more competitive.');
    expect(text).toContain('- Supply chain remained stable.');
  });

  it('splits normalized text into sentences', () => {
    const sentences = splitIntoSentences(
      'Revenue grew sharply year over year. Gross margin expanded because costs fell. Cash flow stayed strong.',
    );

    expect(sentences).toHaveLength(3);
    expect(sentences[1]).toContain('Gross margin expanded');
  });
});
