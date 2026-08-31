import { describe, expect, it } from 'vitest';
import {
  chargeCompletedFilingAnalysis,
  FILING_ANALYSIS_EVENT,
  FILING_COMPARISON_EVENT,
  isPpeChargingEnabled,
  PpeActor,
  resolvePpeEvent,
} from '../src/actor/pricing.js';

describe('PPE pricing', () => {
  it('only enables charging with an explicit true value', () => {
    expect(isPpeChargingEnabled('true')).toBe(true);
    expect(isPpeChargingEnabled(' TRUE ')).toBe(true);
    expect(isPpeChargingEnabled('false')).toBe(false);
    expect(isPpeChargingEnabled(undefined)).toBe(false);
  });

  it('charges one completed filing analysis when enabled', async () => {
    const calls: Array<{ eventName: string; count?: number }> = [];
    const actor: PpeActor = {
      async charge(options) {
        calls.push(options);
        return { chargedCount: 1, eventChargeLimitReached: false, chargeableWithinLimit: {} };
      },
    };

    const result = await chargeCompletedFilingAnalysis(actor, true);

    expect(calls).toEqual([{ eventName: FILING_ANALYSIS_EVENT, count: 1 }]);
    expect(result).toMatchObject({ status: 'charged', result: { chargedCount: 1 } });
  });

  it('does not call the platform when billing is disabled', async () => {
    const actor: PpeActor = {
      async charge() {
        throw new Error('should not be called');
      },
    };

    await expect(chargeCompletedFilingAnalysis(actor, false)).resolves.toEqual({ status: 'disabled' });
  });

  it('selects a billing tier that matches the completed output', () => {
    expect(resolvePpeEvent({ metadata: { phase: 'PHASE_1_SEC_INGESTION' } })).toBe('basic-analysis');
    expect(resolvePpeEvent({ metadata: { phase: 'PHASE_5_EXPLAINABLE_SCORING' } })).toBe(FILING_COMPARISON_EVENT);
    expect(resolvePpeEvent({ metadata: { phase: 'PHASE_4_AI_INTELLIGENCE' }, aiAnalysis: {} })).toBe(FILING_ANALYSIS_EVENT);
  });
});
