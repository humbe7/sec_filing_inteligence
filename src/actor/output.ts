/**
 * Phase 1: Basic SEC Ingestion Output Types
 * Contains company info and filing metadata
 */

export interface CompanyIdentity {
  ticker: string;
  cik: string;
  name: string;
  sic: string;
  category: string;
}

export interface FilingMetadata {
  cik: string;
  accessionNumber: string;
  filingType: string;
  filingDate: string;
  reportDate?: string;
  primaryDocument: string;
  filingUrl: string;
  isAmendment: boolean;
}

export interface FilingPair {
  current: FilingMetadata;
  previous?: FilingMetadata | null;
}

/**
 * Phase 1 output: Basic filing metadata
 */
export interface Phase1Output {
  company: CompanyIdentity;
  filing: FilingPair;
  metadata: {
    generatedAt: string;
    analysisVersion: string;
    phase: 'PHASE_1_SEC_INGESTION';
  };
  warnings?: Array<{
    code: string;
    message: string;
  }>;
}

/**
 * Phase 2: Financial Metrics Analysis Output Types
 */
export interface FinancialValueOutput {
  value: number;
  unit: string;
  confidence: number;
  concept: string;
  source: 'XBRL' | 'CALCULATED';
  periodEnd: string;
  fiscalYear: number;
  fiscalPeriod: string;
  filingDate: string;
}

export interface FinancialChangeOutput {
  metric: string;
  current: FinancialValueOutput;
  previous: FinancialValueOutput;
  absoluteChange: number;
  percentChange: number;
  direction: 'increase' | 'decrease' | 'unchanged';
  significance: 'high' | 'medium' | 'low';
  comparisonType: 'QOQ' | 'YOY';
}

/**
 * Phase 2 output: Financial analysis and metrics
 */
export interface Phase2Output extends Omit<Phase1Output, 'metadata'> {
  financialChanges?: FinancialChangeOutput[];
  metrics?: {
    current: Record<string, FinancialValueOutput>;
    previous?: Record<string, FinancialValueOutput>;
  };
  metadata: {
    generatedAt: string;
    analysisVersion: string;
    phase: 'PHASE_2_XBRL_ANALYSIS';
  };
}

export interface FilingSectionOutput {
  title: string;
  wordCount: number;
  text: string;
}

export interface TextualChangeOutput {
  section: string;
  title: string;
  currentWordCount: number;
  previousWordCount: number;
  addedSentences: string[];
  removedSentences: string[];
  similarity: number;
  changeMagnitude: 'none' | 'low' | 'medium' | 'high';
}

export interface Phase3Output extends Omit<Phase2Output, 'metadata'> {
  sections?: {
    current: Record<string, FilingSectionOutput>;
    previous?: Record<string, FilingSectionOutput>;
  };
  textualChanges?: TextualChangeOutput[];
  metadata: {
    generatedAt: string;
    analysisVersion: string;
    phase: 'PHASE_3_FILING_CONTENT_ANALYSIS';
  };
}

export interface AiAnalysisOutput {
  riskFactors?: import('../ai/responseValidator.js').RiskAnalysis;
  managementTone?: import('../ai/responseValidator.js').ToneAnalysis;
  guidance?: import('../ai/responseValidator.js').GuidanceAnalysis;
  legal?: import('../ai/responseValidator.js').LegalAnalysis;
}

export interface Phase4Output extends Omit<Phase3Output, 'metadata'> {
  aiAnalysis: AiAnalysisOutput;
  metadata: {
    generatedAt: string;
    analysisVersion: string;
    phase: 'PHASE_4_AI_INTELLIGENCE';
  };
}

export interface FilingScoresOutput {
  materiality: import('../scoring/materialityScore.js').MaterialityScore;
  direction: import('../scoring/directionScore.js').DirectionScore;
  confidence: import('../scoring/confidenceScore.js').ConfidenceScore;
}

export interface Phase5Output extends Omit<Phase3Output, 'metadata'> {
  aiAnalysis?: AiAnalysisOutput;
  liquidity?: import('../intelligence/liquidityAnalyzer.js').LiquidityAnalysis;
  materialChanges?: import('../comparison/semanticDiff.js').MaterialChange[];
  summary?: string;
  keyTakeaways?: string[];
  scoring: FilingScoresOutput;
  metadata: {
    generatedAt: string;
    analysisVersion: string;
    phase: 'PHASE_5_EXPLAINABLE_SCORING';
  };
}

export interface EightKEventOutput {
  item: string;
  title: string;
  category: import('../events/eightKAnalyzer.js').EightKCategory;
  eventType: import('../events/eightKAnalyzer.js').EightKEvent['eventType'];
  materiality: import('../events/eightKAnalyzer.js').EventMateriality;
  summary: string;
  evidence: string[];
}

export interface EightKAnalysisOutput {
  events: EightKEventOutput[];
  eventCount: number;
  overallMateriality: import('../events/eightKAnalyzer.js').EventMateriality | 'none';
  categories: import('../events/eightKAnalyzer.js').EightKCategory[];
}

export interface Phase6Output extends Omit<Phase2Output, 'metadata'> {
  eightKAnalysis: EightKAnalysisOutput;
  metadata: {
    generatedAt: string;
    analysisVersion: string;
    phase: 'PHASE_6_8K_EVENT_ANALYSIS';
  };
}
