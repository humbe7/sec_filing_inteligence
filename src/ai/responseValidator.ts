import { z } from 'zod';

const EvidenceSchema = z.object({
  statement: z.string().min(1).max(1000),
  section: z.string().min(1).max(100),
});

export const RiskAnalysisSchema = z.object({
  overallRiskTrend: z.enum(['increased', 'decreased', 'unchanged', 'unclear']),
  newRisks: z.array(z.string().min(1).max(500)).max(10),
  removedRisks: z.array(z.string().min(1).max(500)).max(10),
  summary: z.string().min(1).max(1500),
  evidence: z.array(EvidenceSchema).min(1).max(10),
});

export const ToneAnalysisSchema = z.object({
  currentTone: z.enum(['positive', 'neutral', 'cautious', 'negative', 'mixed']),
  previousTone: z.enum(['positive', 'neutral', 'cautious', 'negative', 'mixed']).optional(),
  change: z.enum(['more_positive', 'more_cautious', 'more_negative', 'unchanged', 'unclear']),
  summary: z.string().min(1).max(1500),
  evidence: z.array(EvidenceSchema).min(1).max(10),
});

export const GuidanceAnalysisSchema = z.object({
  outlook: z.enum(['raised', 'lowered', 'maintained', 'introduced', 'withdrawn', 'none', 'unclear']),
  guidance: z.array(z.string().min(1).max(750)).max(10),
  changes: z.array(z.string().min(1).max(750)).max(10),
  summary: z.string().min(1).max(1500),
  evidence: z.array(EvidenceSchema).min(1).max(10),
});

export const LegalAnalysisSchema = z.object({
  severity: z.enum(['high', 'medium', 'low', 'none', 'unclear']),
  developments: z.array(z.string().min(1).max(750)).max(10),
  summary: z.string().min(1).max(1500),
  evidence: z.array(EvidenceSchema).min(1).max(10),
});

export type RiskAnalysis = z.infer<typeof RiskAnalysisSchema>;
export type ToneAnalysis = z.infer<typeof ToneAnalysisSchema>;
export type GuidanceAnalysis = z.infer<typeof GuidanceAnalysisSchema>;
export type LegalAnalysis = z.infer<typeof LegalAnalysisSchema>;

export function validateLlmResponse<T>(schema: z.ZodType<T>, response: unknown, label: string): T {
  const result = schema.safeParse(response);
  if (!result.success) {
    throw new Error(`Invalid ${label} response: ${result.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
  }
  return result.data;
}
