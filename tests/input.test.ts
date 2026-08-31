/**
 * Unit tests for Actor Input Validation
 */

import { describe, it, expect } from 'vitest';
import { validateInput, ActorInput } from '../src/actor/input.js';
import { ValidationError } from '../src/actor/errors.js';

describe('Input Validation', () => {
  it('should validate minimal input', () => {
    const input = validateInput({
      ticker: 'NVDA',
    });

    expect(input.ticker).toBe('NVDA');
    expect(input.filingType).toBe('10-Q');
    expect(input.comparePrevious).toBe(true);
    expect(input.includeAIAnalysis).toBe(false);
  });

  it('should validate full input', () => {
    const input = validateInput({
      ticker: 'NVDA',
      filingType: '10-K',
      comparePrevious: false,
      includeAIAnalysis: true,
      analysis: {
        financials: true,
        riskFactors: true,
        managementTone: true,
        guidance: true,
        liquidity: true,
        legal: true,
      },
    });

    expect(input.ticker).toBe('NVDA');
    expect(input.filingType).toBe('10-K');
    expect(input.comparePrevious).toBe(false);
    expect(input.includeAIAnalysis).toBe(true);
    expect(input.analysis?.financials).toBe(true);
    expect(input.analysis?.riskFactors).toBe(true);
  });

  it('should normalize ticker to uppercase', () => {
    const input = validateInput({
      ticker: 'nvda',
    });

    expect(input.ticker).toBe('NVDA');
  });

  it('should trim whitespace from ticker', () => {
    const input = validateInput({
      ticker: '  NVDA  ',
    });

    expect(input.ticker).toBe('NVDA');
  });

  it('should reject invalid ticker format', () => {
    expect(() =>
      validateInput({
        ticker: 'INVALID123',
      }),
    ).toThrow(ValidationError);
  });

  it('should reject invalid filing type', () => {
    expect(() =>
      validateInput({
        ticker: 'NVDA',
        filingType: '10-X' as any,
      }),
    ).toThrow(ValidationError);
  });

  it('should reject missing ticker', () => {
    expect(() =>
      validateInput({
        filingType: '10-Q',
      }),
    ).toThrow(ValidationError);
  });

  it('should accept empty analysis object', () => {
    const input = validateInput({
      ticker: 'NVDA',
      analysis: {},
    });

    expect(input.analysis?.financials).toBe(true);
  });

  it('should accept single-letter ticker', () => {
    const input = validateInput({
      ticker: 'F',
    });

    expect(input.ticker).toBe('F');
  });

  it('should accept five-letter ticker', () => {
    const input = validateInput({
      ticker: 'GOOGL',
    });

    expect(input.ticker).toBe('GOOGL');
  });

  it('should reject ticker with numbers', () => {
    expect(() =>
      validateInput({
        ticker: 'NV1A',
      }),
    ).toThrow(ValidationError);
  });

  it('should reject ticker with special characters', () => {
    expect(() =>
      validateInput({
        ticker: 'NV-DA',
      }),
    ).toThrow(ValidationError);
  });
});
