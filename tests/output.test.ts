import { describe, expect, it } from 'vitest';
import { validateOutput } from '../src/actor/output.js';

describe('output validation', () => {
  it('rejects output without a normalized CIK', () => {
    expect(() => validateOutput({
      company: { ticker: 'NVDA', cik: '1045810', name: 'NVIDIA', sic: '', category: '' },
      filing: { current: { accessionNumber: '0001045810-24-000100', filingType: '10-Q' } },
      metadata: { phase: 'PHASE_1_SEC_INGESTION', generatedAt: '2024-01-01T00:00:00.000Z' },
    })).toThrow();
  });
});
