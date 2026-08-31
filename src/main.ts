/**
 * SEC Filing Intelligence Actor - Phase 1: SEC Ingestion
 * Main entry point
 */

import { Actor } from 'apify';
import { ActorInput, validateInput } from './actor/input.js';
import {
  Phase1Output,
  Phase2Output,
  Phase3Output,
  Phase4Output,
  Phase5Output,
  Phase6Output,
  FinancialChangeOutput,
  FinancialValueOutput,
  FilingSectionOutput,
} from './actor/output.js';
import { SecFilingError } from './actor/errors.js';
import { SecClient } from './sec/secClient.js';
import { TickerResolver } from './sec/tickerResolver.js';
import { FilingResolver } from './sec/filingResolver.js';
import { createLogger } from './utils/logger.js';
import { CompanyFactsClient } from './xbrl/companyFactsClient.js';
import { FinancialAnalyzer } from './xbrl/financialAnalyzer.js';
import { FilingDownloader } from './sec/filingDownloader.js';
import { parseFiling } from './filings/filingParser.js';
import { extractSections } from './filings/sectionExtractor.js';
import { compareSections } from './comparison/textualDiff.js';
import { AnthropicMessagesLlmClient, LlmClient, OpenAiCompatibleLlmClient } from './ai/llmClient.js';
import { analyzeGuidance, analyzeLegal, analyzeRisks, analyzeTone } from './intelligence/analyzers.js';
import { calculateFilingScores } from './scoring/scoringEngine.js';
import { analyzeEightK } from './events/eightKAnalyzer.js';
import { chargeCompletedFilingAnalysis, isPpeChargingEnabled, resolvePpeEvent } from './actor/pricing.js';
import { analyzeLiquidity, LiquidityAnalysis } from './intelligence/liquidityAnalyzer.js';
import { detectMaterialChanges } from './comparison/semanticDiff.js';
import { generateFilingSummary } from './intelligence/summaryGenerator.js';

const logger = createLogger({ phase: 'MAIN' });

/**
 * Main actor function
 */
async function main(): Promise<void> {
  await Actor.init();
  logger.info('SEC Filing Intelligence Actor starting');

  // Get and validate input
  let input: ActorInput;
  try {
    const rawInput = await Actor.getInput();
    logger.info('Received input');
    input = validateInput(rawInput);
    logger.info('Input validation passed', { ticker: input.ticker, form: input.filingType });
  } catch (error) {
    logger.error('Input validation failed', error);
    process.exit(1);
  }

  const runLogger = logger.withContext({
    ticker: input.ticker,
    filingType: input.filingType,
  });

  try {
    // Initialize SEC clients
    const secClient = new SecClient({
      userAgent: 'SECFilingIntelligence/1.0',
      contactEmail: process.env.SEC_CONTACT_EMAIL || 'contact@example.com',
      requestsPerSecond: process.env.SEC_MAX_REQUESTS_PER_SECOND
        ? parseInt(process.env.SEC_MAX_REQUESTS_PER_SECOND, 10)
        : 8,
    });

    const tickerResolver = new TickerResolver(secClient);
    const filingResolver = new FilingResolver(secClient);
    const filingDownloader = new FilingDownloader(secClient);

    // Phase 1: Resolve ticker
    runLogger.info('Step 1: Resolving ticker to CIK');
    const company = await tickerResolver.resolveTicker(input.ticker);
    runLogger.info('Ticker resolved', { cik: company.cik, name: company.name });

    // Phase 2: Find current filing
    runLogger.info('Step 2: Finding current filing', { form: input.filingType });
    const currentFiling = await filingResolver.findLatestFiling(company.cik, input.filingType);
    runLogger.info('Current filing found', {
      accessionNumber: currentFiling.accessionNumber,
      filingDate: currentFiling.filingDate,
    });

    // Phase 3: Find previous filing (if requested)
    runLogger.info('Step 3: Finding previous comparable filing');
    let previousFiling = null;
    if (input.comparePrevious) {
      try {
        previousFiling = await filingResolver.findComparablePreviousFiling(currentFiling);
        if (previousFiling) {
          runLogger.info('Previous filing found', {
            accessionNumber: previousFiling.accessionNumber,
            filingDate: previousFiling.filingDate,
          });
        } else {
          runLogger.warn('No previous comparable filing found');
        }
      } catch (error) {
        runLogger.warn('Failed to find previous filing', error);
        // Don't fail the entire run, just warn
      }
    }

    // Phase 4: Extract financial metrics (Phase 2 - XBRL Analysis)
    let phase2Output: Phase2Output | null = null;
    if (input.analysis?.financials) {
      try {
        runLogger.info('Phase 2: Starting XBRL financial analysis');

        // Initialize XBRL components
        const factsClient = new CompanyFactsClient(secClient);
        const financialAnalyzer = new FinancialAnalyzer(factsClient);

        // Extract current and previous metrics
        runLogger.info('Extracting current period metrics');
        const currentMetrics = await financialAnalyzer.extractMetrics(
          company.cik,
          currentFiling.filingType,
          [],
          currentFiling.accessionNumber,
        );
        runLogger.info('Current metrics extracted', { metricCount: currentMetrics.metrics.size });

        let previousMetrics = null;
        if (previousFiling) {
          runLogger.info('Extracting previous period metrics');
          previousMetrics = await financialAnalyzer.extractMetrics(
            company.cik,
            previousFiling.filingType,
            [],
            previousFiling.accessionNumber,
          );
          runLogger.info('Previous metrics extracted', { metricCount: previousMetrics.metrics.size });
        }

        // Calculate financial changes
        const financialChanges: FinancialChangeOutput[] = [];
        if (previousMetrics) {
          for (const [metric, currentValue] of currentMetrics.metrics) {
            const previousValue = previousMetrics.metrics.get(metric);
            if (previousValue) {
              const change = financialAnalyzer.calculateFinancialChanges(
                currentValue,
                previousValue,
                currentFiling.filingType === '10-Q' ? 'YOY' : 'YOY',
              );

              if (change) {
                financialChanges.push({
                  metric: metric,
                  current: {
                    value: change.current.value,
                    unit: change.current.unit,
                    confidence: change.current.confidence,
                    concept: change.current.concept || '',
                    source: change.current.source,
                    periodEnd: change.current.periodEnd,
                    fiscalYear: change.current.fiscalYear,
                    fiscalPeriod: change.current.fiscalPeriod,
                    filingDate: change.current.filingDate,
                  },
                  previous: {
                    value: change.previous.value,
                    unit: change.previous.unit,
                    confidence: change.previous.confidence,
                    concept: change.previous.concept || '',
                    source: change.previous.source,
                    periodEnd: change.previous.periodEnd,
                    fiscalYear: change.previous.fiscalYear,
                    fiscalPeriod: change.previous.fiscalPeriod,
                    filingDate: change.previous.filingDate,
                  },
                  absoluteChange: change.absoluteChange,
                  percentChange: change.percentChange,
                  direction: change.direction,
                  significance: change.significance,
                  comparisonType: change.comparisonType,
                });
              }
            }
          }
        }

        // Convert to output format
        const metricsOutput: {
          current: Record<string, FinancialValueOutput>;
          previous?: Record<string, FinancialValueOutput>;
        } = {
          current: {},
        };

        for (const [metric, value] of currentMetrics.metrics) {
          metricsOutput.current[metric] = {
            value: value.value,
            unit: value.unit,
            confidence: value.confidence,
            concept: value.concept || '',
            source: value.source,
            periodEnd: value.periodEnd,
            fiscalYear: value.fiscalYear,
            fiscalPeriod: value.fiscalPeriod,
            filingDate: value.filingDate,
          };
        }

        if (previousMetrics) {
          metricsOutput.previous = {};
          for (const [metric, value] of previousMetrics.metrics) {
            metricsOutput.previous[metric] = {
              value: value.value,
              unit: value.unit,
              confidence: value.confidence,
              concept: value.concept || '',
              source: value.source,
              periodEnd: value.periodEnd,
              fiscalYear: value.fiscalYear,
              fiscalPeriod: value.fiscalPeriod,
              filingDate: value.filingDate,
            };
          }
        }

        phase2Output = {
          company: {
            ticker: company.ticker,
            cik: company.cik,
            name: company.name,
            sic: company.sic || '',
            category: company.category || '',
          },
          filing: {
            current: currentFiling,
            previous: previousFiling,
          },
          financialChanges: financialChanges.length > 0 ? financialChanges : undefined,
          metrics: Object.keys(metricsOutput.current).length > 0 ? metricsOutput : undefined,
          metadata: {
            generatedAt: new Date().toISOString(),
            analysisVersion: '2.0.0',
            phase: 'PHASE_2_XBRL_ANALYSIS',
          },
        };

        runLogger.info('Phase 2 complete', {
          metricsExtracted: currentMetrics.metrics.size,
          changesCalculated: financialChanges.length,
        });
      } catch (error) {
        runLogger.warn('Phase 2 XBRL analysis failed', error);
        // Don't fail the run, just skip Phase 2
      }
    }

    const baseOutput = phase2Output
      ? phase2Output
      : ({
          company: {
            ticker: company.ticker,
            cik: company.cik,
            name: company.name,
            sic: company.sic || '',
            category: company.category || '',
          },
          filing: {
            current: currentFiling,
            previous: previousFiling,
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            analysisVersion: '1.0.0',
            phase: 'PHASE_1_SEC_INGESTION',
          },
        } as Phase1Output);

    let phase3Output: Phase3Output | null = null;
    if (previousFiling && currentFiling.filingType !== '8-K') {
      try {
        runLogger.info('Phase 3: Starting filing content analysis');

        const currentDocument = await filingDownloader.downloadFiling(currentFiling);
        const previousDocument = await filingDownloader.downloadFiling(previousFiling);

        const currentParsed = parseFiling(currentDocument);
        const previousParsed = parseFiling(previousDocument);

        const currentSections = extractSections(currentParsed);
        const previousSections = extractSections(previousParsed);
        const textualChanges = compareSections(currentSections, previousSections);

        const currentSectionOutput = Object.fromEntries(
          currentSections.map(section => [
            section.key,
            {
              title: section.title,
              wordCount: section.wordCount,
              text: section.text,
            } satisfies FilingSectionOutput,
          ]),
        );

        const previousSectionOutput = Object.fromEntries(
          previousSections.map(section => [
            section.key,
            {
              title: section.title,
              wordCount: section.wordCount,
              text: section.text,
            } satisfies FilingSectionOutput,
          ]),
        );

        phase3Output = {
          ...baseOutput,
          sections: {
            current: currentSectionOutput,
            previous: Object.keys(previousSectionOutput).length > 0
              ? previousSectionOutput
              : undefined,
          },
          textualChanges: textualChanges.length > 0 ? textualChanges : undefined,
          metadata: {
            generatedAt: new Date().toISOString(),
            analysisVersion: '3.0.0',
            phase: 'PHASE_3_FILING_CONTENT_ANALYSIS',
          },
        };

        runLogger.info('Phase 3 complete', {
          currentSections: currentSections.length,
          previousSections: previousSections.length,
          textualChanges: textualChanges.length,
        });
      } catch (error) {
        runLogger.warn('Phase 3 filing content analysis failed', error);
      }
    }

    let phase4Output: Phase4Output | null = null;
    if (input.includeAIAnalysis) {
      if (!phase3Output?.sections) {
        runLogger.warn('Phase 4 requires comparable filing sections; AI analysis skipped');
      } else if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        runLogger.warn('Phase 4 requested but no LLM API key is configured; AI analysis skipped');
      } else {
        runLogger.info('Phase 4: Starting AI intelligence analysis');

        const maxOutputTokens = process.env.MAX_OUTPUT_TOKENS
          ? Number.parseInt(process.env.MAX_OUTPUT_TOKENS, 10)
          : undefined;
        const client: LlmClient = process.env.ANTHROPIC_API_KEY
          ? new AnthropicMessagesLlmClient({
              apiKey: process.env.ANTHROPIC_API_KEY,
              baseUrl: process.env.ANTHROPIC_BASE_URL,
              model: process.env.ANTHROPIC_MODEL,
              timeoutMs: process.env.ANTHROPIC_TIMEOUT_MS
                ? Number.parseInt(process.env.ANTHROPIC_TIMEOUT_MS, 10)
                : undefined,
              maxOutputTokens,
            })
          : new OpenAiCompatibleLlmClient({
              apiKey: process.env.OPENAI_API_KEY as string,
              baseUrl: process.env.OPENAI_BASE_URL,
              model: process.env.OPENAI_MODEL,
              timeoutMs: process.env.OPENAI_TIMEOUT_MS
                ? Number.parseInt(process.env.OPENAI_TIMEOUT_MS, 10)
                : undefined,
              maxOutputTokens,
            });
        const context = {
          current: phase3Output.sections.current,
          previous: phase3Output.sections.previous,
          textualChanges: phase3Output.textualChanges || [],
        };
        const analysis = input.analysis;
        const selectedCoreAnalysis = Boolean(
          analysis?.riskFactors || analysis?.managementTone || analysis?.guidance || analysis?.legal,
        );
        const includeRisk = analysis?.riskFactors || !selectedCoreAnalysis;
        const includeTone = analysis?.managementTone || !selectedCoreAnalysis;
        const includeGuidance = analysis?.guidance || !selectedCoreAnalysis;
        const includeLegal = analysis?.legal || !selectedCoreAnalysis;
        const aiAnalysis: NonNullable<Phase4Output['aiAnalysis']> = {};

        const tasks: Array<Promise<void>> = [];
        if (includeRisk) {
          tasks.push(analyzeRisks(client, context).then(result => { aiAnalysis.riskFactors = result; }));
        }
        if (includeTone) {
          tasks.push(analyzeTone(client, context).then(result => { aiAnalysis.managementTone = result; }));
        }
        if (includeGuidance) {
          tasks.push(analyzeGuidance(client, context).then(result => { aiAnalysis.guidance = result; }));
        }
        if (includeLegal) {
          tasks.push(analyzeLegal(client, context).then(result => { aiAnalysis.legal = result; }));
        }

        const results = await Promise.allSettled(tasks);
        const failedAnalyses = results.filter(result => result.status === 'rejected');
        for (const result of failedAnalyses) {
          runLogger.warn('Phase 4 analysis component failed', result.reason);
        }

        if (Object.keys(aiAnalysis).length > 0) {
          phase4Output = {
            ...phase3Output,
            aiAnalysis,
            metadata: {
              generatedAt: new Date().toISOString(),
              analysisVersion: '4.0.0',
              phase: 'PHASE_4_AI_INTELLIGENCE',
            },
          };
        }

        runLogger.info('Phase 4 complete', {
          completedAnalyses: Object.keys(aiAnalysis).length,
          failedAnalyses: failedAnalyses.length,
        });
      }
    }

    const liquidity: LiquidityAnalysis | undefined = input.analysis?.liquidity && phase2Output?.financialChanges
      ? analyzeLiquidity(phase2Output.financialChanges)
      : undefined;
    const materialChanges = detectMaterialChanges(phase3Output?.textualChanges || []);
    const filingSummary = generateFilingSummary(
      materialChanges,
      phase2Output?.financialChanges || [],
      liquidity,
    );

    let phase5Output: Phase5Output | null = null;
    if (previousFiling) {
      runLogger.info('Phase 5: Calculating explainable filing scores');
      const scoring = calculateFilingScores({
        financialChanges: phase2Output?.financialChanges,
        textualChanges: phase3Output?.textualChanges,
        aiAnalysis: phase4Output?.aiAnalysis,
        liquidity,
      });

      phase5Output = {
        ...baseOutput,
        sections: phase3Output?.sections,
        textualChanges: phase3Output?.textualChanges,
        aiAnalysis: phase4Output?.aiAnalysis,
        liquidity,
        materialChanges: materialChanges.length > 0 ? materialChanges : undefined,
        summary: filingSummary.summary,
        keyTakeaways: filingSummary.keyTakeaways,
        scoring,
        metadata: {
          generatedAt: new Date().toISOString(),
          analysisVersion: '5.0.0',
          phase: 'PHASE_5_EXPLAINABLE_SCORING',
        },
      };

      runLogger.info('Phase 5 complete', {
        materiality: scoring.materiality.score,
        direction: scoring.direction.direction,
        confidence: scoring.confidence.score,
      });
    }

    let phase6Output: Phase6Output | null = null;
    if (currentFiling.filingType === '8-K') {
      try {
        runLogger.info('Phase 6: Starting 8-K event analysis');
        const document = await filingDownloader.downloadFiling(currentFiling);
        const analysis = analyzeEightK(parseFiling(document));

        phase6Output = {
          ...baseOutput,
          eightKAnalysis: analysis,
          metadata: {
            generatedAt: new Date().toISOString(),
            analysisVersion: '6.0.0',
            phase: 'PHASE_6_8K_EVENT_ANALYSIS',
          },
        };
        runLogger.info('Phase 6 complete', {
          events: analysis.eventCount,
          overallMateriality: analysis.overallMateriality,
        });
      } catch (error) {
        runLogger.warn('Phase 6 8-K event analysis failed', error);
      }
    }

    const output = phase6Output ?? phase5Output ?? phase4Output ?? phase3Output ?? baseOutput;

    runLogger.info('Phase 1 complete, pushing results to dataset');

    // Save output before charging so users are only billed for accessible data.
    await Actor.pushData(output);

    const billing = await chargeCompletedFilingAnalysis(
      Actor,
      isPpeChargingEnabled(process.env.ENABLE_PPE_CHARGING),
      resolvePpeEvent(output),
    );
    if (billing.status === 'charged') {
      runLogger.info('Phase 7: Filing analysis charged', {
        chargedCount: billing.result.chargedCount,
        budgetReached: billing.result.eventChargeLimitReached,
      });
    } else if (billing.status === 'failed') {
      runLogger.warn('Phase 7: Filing analysis charge failed', billing.error);
    }

    logger.info('Actor completed successfully', {
      ticker: input.ticker,
      currentAccession: currentFiling.accessionNumber,
      previousAccession: previousFiling?.accessionNumber,
    });
    await Actor.exit();
  } catch (error) {
    if (error instanceof SecFilingError) {
      logger.error(`SEC Filing Error: ${error.code}`, error);
      process.exit(2);
    } else {
      logger.error('Unexpected error', error);
      process.exit(1);
    }
  }
}

// Run the actor
main();
