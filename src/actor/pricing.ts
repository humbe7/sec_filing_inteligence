export const BASIC_ANALYSIS_EVENT = 'basic-analysis';
export const FILING_COMPARISON_EVENT = 'filing-comparison';
export const FULL_INTELLIGENCE_EVENT = 'full-intelligence';
export const FILING_ANALYSIS_EVENT = FULL_INTELLIGENCE_EVENT;

export interface PpeChargeResult {
  eventChargeLimitReached: boolean;
  chargedCount: number;
  chargeableWithinLimit: Record<string, number>;
}

export interface PpeActor {
  charge(options: { eventName: string; count?: number }): Promise<PpeChargeResult>;
}

export type BillingStatus =
  | { status: 'disabled' }
  | { status: 'charged'; result: PpeChargeResult }
  | { status: 'failed'; error: Error };

export function isPpeChargingEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function resolvePpeEvent(output: { metadata: { phase: string }; aiAnalysis?: unknown }): string {
  if (output.aiAnalysis) return FULL_INTELLIGENCE_EVENT;
  if (output.metadata.phase === 'PHASE_3_FILING_CONTENT_ANALYSIS' || output.metadata.phase === 'PHASE_5_EXPLAINABLE_SCORING') {
    return FILING_COMPARISON_EVENT;
  }
  return BASIC_ANALYSIS_EVENT;
}

/**
 * Charges only after an analysis has been saved, so users are never billed for
 * output they cannot access. The event price is configured in Apify Console.
 */
export async function chargeCompletedFilingAnalysis(
  actor: PpeActor,
  enabled: boolean,
  eventName = FILING_ANALYSIS_EVENT,
): Promise<BillingStatus> {
  if (!enabled) {
    return { status: 'disabled' };
  }

  try {
    const result = await actor.charge({ eventName, count: 1 });
    return { status: 'charged', result };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error : new Error('Unknown PPE charging failure'),
    };
  }
}
