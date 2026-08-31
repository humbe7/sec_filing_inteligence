import { z } from 'zod';
import { ValidationError } from './errors.js';

const AnalysisOptionsSchema = z.object({
  financials: z.boolean().default(true),
  riskFactors: z.boolean().default(false),
  managementTone: z.boolean().default(false),
  guidance: z.boolean().default(false),
  liquidity: z.boolean().default(false),
  legal: z.boolean().default(false),
}).optional();

export const ActorInputSchema = z.object({
  ticker: z
    .string()
    .trim()
    .min(1)
    .max(5)
    .transform(t => t.toUpperCase())
    .refine(t => /^[A-Z]{1,5}$/.test(t), 'Invalid ticker format'),
  
  filingType: z
    .enum(['10-Q', '10-K', '8-K'])
    .default('10-Q'),
  
  comparePrevious: z
    .boolean()
    .default(true),
  
  includeAIAnalysis: z
    .boolean()
    .default(false),
  
  analysis: AnalysisOptionsSchema,
});

export type ActorInput = z.infer<typeof ActorInputSchema>;

export type AnalysisOptions = z.infer<typeof AnalysisOptionsSchema>;

/**
 * Validate and parse actor input
 */
export function validateInput(input: unknown): ActorInput {
  try {
    return ActorInputSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new ValidationError(`Invalid input: ${messages}`);
    }
    throw error;
  }
}
