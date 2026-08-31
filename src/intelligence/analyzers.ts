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

export async function analyzeRisks(client: LlmClient, context: FilingAnalysisContext): Promise<RiskAnalysis> {
  const response = await client.completeJson(riskPrompt(
    context.current.risk_factors,
    context.previous?.risk_factors,
    context.textualChanges,
  ));
  return validateLlmResponse(RiskAnalysisSchema, response, 'risk analysis');
}

export async function analyzeTone(client: LlmClient, context: FilingAnalysisContext): Promise<ToneAnalysis> {
  const response = await client.completeJson(tonePrompt(
    context.current.management_discussion,
    context.previous?.management_discussion,
    context.textualChanges,
  ));
  return validateLlmResponse(ToneAnalysisSchema, response, 'tone analysis');
}

export async function analyzeGuidance(client: LlmClient, context: FilingAnalysisContext): Promise<GuidanceAnalysis> {
  const response = await client.completeJson(guidancePrompt(
    context.current.management_discussion,
    context.previous?.management_discussion,
    context.textualChanges,
  ));
  return validateLlmResponse(GuidanceAnalysisSchema, response, 'guidance analysis');
}

export async function analyzeLegal(client: LlmClient, context: FilingAnalysisContext): Promise<LegalAnalysis> {
  const response = await client.completeJson(legalPrompt(
    context.current.legal_proceedings,
    context.previous?.legal_proceedings,
    context.textualChanges,
  ));
  return validateLlmResponse(LegalAnalysisSchema, response, 'legal analysis');
}
