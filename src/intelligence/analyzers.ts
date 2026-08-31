import { FilingSectionOutput, TextualChangeOutput } from '../actor/output.js';
import { LlmClient } from '../ai/llmClient.js';
import {
  GuidanceAnalysis,
  GuidanceAnalysisSchema,
  LegalAnalysis,
  LegalAnalysisSchema,
  RiskAnalysis,
  RiskAnalysisSchema,
  ToneAnalysis,
  ToneAnalysisSchema,
  validateLlmResponse,
} from '../ai/responseValidator.js';
import { guidancePrompt, legalPrompt, riskPrompt, tonePrompt } from '../ai/prompts.js';

export interface FilingAnalysisContext {
  current: Record<string, FilingSectionOutput>;
  previous?: Record<string, FilingSectionOutput>;
  textualChanges: TextualChangeOutput[];
}

function requireGroundedEvidence<T extends { evidence: Array<{ statement: string; section: string }> }>(
  result: T,
  context: FilingAnalysisContext,
): T {
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();
  for (const evidence of result.evidence) {
    const section = context.current[evidence.section] || context.previous?.[evidence.section];
    if (!section || !normalize(section.text).includes(normalize(evidence.statement))) {
      throw new Error(`AI evidence is not a verbatim quote from section ${evidence.section}`);
    }
  }
  return result;
}

export async function analyzeRisks(client: LlmClient, context: FilingAnalysisContext): Promise<RiskAnalysis> {
  const response = await client.completeJson(riskPrompt(
    context.current.risk_factors,
    context.previous?.risk_factors,
    context.textualChanges,
  ));
  return requireGroundedEvidence(validateLlmResponse(RiskAnalysisSchema, response, 'risk analysis'), context);
}

export async function analyzeTone(client: LlmClient, context: FilingAnalysisContext): Promise<ToneAnalysis> {
  const response = await client.completeJson(tonePrompt(
    context.current.management_discussion,
    context.previous?.management_discussion,
    context.textualChanges,
  ));
  return requireGroundedEvidence(validateLlmResponse(ToneAnalysisSchema, response, 'tone analysis'), context);
}

export async function analyzeGuidance(client: LlmClient, context: FilingAnalysisContext): Promise<GuidanceAnalysis> {
  const response = await client.completeJson(guidancePrompt(
    context.current.management_discussion,
    context.previous?.management_discussion,
    context.textualChanges,
  ));
  return requireGroundedEvidence(validateLlmResponse(GuidanceAnalysisSchema, response, 'guidance analysis'), context);
}

export async function analyzeLegal(client: LlmClient, context: FilingAnalysisContext): Promise<LegalAnalysis> {
  const response = await client.completeJson(legalPrompt(
    context.current.legal_proceedings,
    context.previous?.legal_proceedings,
    context.textualChanges,
  ));
  return requireGroundedEvidence(validateLlmResponse(LegalAnalysisSchema, response, 'legal analysis'), context);
}
