import { AiAnalysisOutput, FinancialChangeOutput, TextualChangeOutput } from '../actor/output.js';
import { LiquidityAnalysis } from '../intelligence/liquidityAnalyzer.js';

export interface ScoringInput {
  financialChanges?: FinancialChangeOutput[];
  textualChanges?: TextualChangeOutput[];
  aiAnalysis?: AiAnalysisOutput;
  liquidity?: LiquidityAnalysis;
}

export interface ScoreFactor {
  source: 'financials' | 'filing_text' | 'risk_analysis' | 'tone_analysis' | 'guidance_analysis' | 'legal_analysis';
  impact: number;
  explanation: string;
}
