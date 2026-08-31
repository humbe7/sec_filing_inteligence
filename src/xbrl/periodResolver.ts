/**
 * Period Resolver
 * Determines financial periods and handles period comparison logic
 * Never compares incompatible periods (e.g., 3-month vs 9-month)
 */

import { FinancialPeriod, ReportPeriod, XBRLFact } from './xbrlTypes.js';
import { Logger } from '../utils/logger.js';

export class PeriodResolver {
  private logger: Logger;

  constructor() {
    this.logger = new Logger({ phase: 'PERIOD_RESOLVER' });
  }

  /**
   * Parse XBRL fact into period information
   */
  resolvePeriod(fact: XBRLFact): FinancialPeriod {
    const startDate = new Date(fact.start);
    const endDate = new Date(fact.end);
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));

    // Determine report period
    let reportPeriod: ReportPeriod;
    if (fact.fp === 'Q1') {
      reportPeriod = ReportPeriod.Q1;
    } else if (fact.fp === 'Q2') {
      reportPeriod = ReportPeriod.Q2;
    } else if (fact.fp === 'Q3') {
      reportPeriod = ReportPeriod.Q3;
    } else if (fact.fp === 'Q4' || fact.fp === 'FY') {
      // Q4 could be final quarter or full year depending on context
      reportPeriod = ReportPeriod.FULL_YEAR;
    } else {
      // Try to infer from duration
      reportPeriod = this.inferPeriodFromDuration(durationDays);
    }

    return {
      fiscalYear: fact.fy,
      fiscalPeriod: reportPeriod,
      startDate: fact.start,
      endDate: fact.end,
      durationDays,
      form: fact.form,
      filingDate: fact.filed,
      accessionNumber: fact.accn,
    };
  }

  /**
   * Infer period type from duration
   */
  private inferPeriodFromDuration(durationDays: number): ReportPeriod {
    // Full year: ~365 days
    if (durationDays >= 350 && durationDays <= 375) {
      return ReportPeriod.FULL_YEAR;
    }

    // Quarter: ~90 days (83-92 days typical range)
    if (durationDays >= 83 && durationDays <= 92) {
      return ReportPeriod.Q1; // Could be Q1-Q3, treat as Q1 for simplicity
    }

    // Year-to-date: ~180-270 days
    if (durationDays >= 170 && durationDays <= 280) {
      return ReportPeriod.Q2; // Approximate
    }

    return ReportPeriod.FULL_YEAR;
  }

  /**
   * Check if two periods are comparable
   */
  arePeriodsComparable(
    period1: FinancialPeriod,
    period2: FinancialPeriod,
  ): { comparable: boolean; reason?: string } {
    // Must be same form type (10-Q vs 10-Q, 10-K vs 10-K)
    if (period1.form !== period2.form) {
      return {
        comparable: false,
        reason: `Different form types: ${period1.form} vs ${period2.form}`,
      };
    }

    // Must be same fiscal period type (Q1 vs Q1, etc.)
    if (period1.fiscalPeriod !== period2.fiscalPeriod) {
      return {
        comparable: false,
        reason: `Different fiscal periods: ${period1.fiscalPeriod} vs ${period2.fiscalPeriod}`,
      };
    }

    // Duration must be within 5% (account for 52/53 week years, etc.)
    const durationDiff = Math.abs(period1.durationDays - period2.durationDays);
    const durationRatio = durationDiff / Math.max(period1.durationDays, period2.durationDays);
    if (durationRatio > 0.05) {
      return {
        comparable: false,
        reason: `Significantly different durations: ${period1.durationDays} vs ${period2.durationDays} days`,
      };
    }

    return { comparable: true };
  }

  /**
   * Find comparable previous period for QoQ or YoY comparison
   */
  findComparablePeriod(
    currentPeriod: FinancialPeriod,
    allPeriods: FinancialPeriod[],
  ): {
    period: FinancialPeriod | null;
    comparisonType: 'QOQ' | 'YOY' | null;
  } {
    // Filter to same form type
    const sameForms = allPeriods.filter(p => p.form === currentPeriod.form);

    if (sameForms.length === 0) {
      return { period: null, comparisonType: null };
    }

    // Sort by end date ascending (oldest first)
    sameForms.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

    // Find current period index
    const currentIndex = sameForms.findIndex(p => p.accessionNumber === currentPeriod.accessionNumber);
    if (currentIndex < 0) {
      return { period: null, comparisonType: null };
    }

    // For 10-K (annual): prefer previous year
    if (currentPeriod.form === '10-K') {
      for (let i = currentIndex - 1; i >= 0; i--) {
        const candidate = sameForms[i];
        if (candidate.fiscalYear === currentPeriod.fiscalYear - 1) {
          const check = this.arePeriodsComparable(currentPeriod, candidate);
          if (check.comparable) {
            return { period: candidate, comparisonType: 'YOY' };
          }
        }
      }
    }

    // For 10-Q: prefer same quarter previous year
    if (currentPeriod.form === '10-Q') {
      // Try same fiscal quarter, previous year
      for (let i = currentIndex - 1; i >= 0; i--) {
        const candidate = sameForms[i];
        if (
          candidate.fiscalYear === currentPeriod.fiscalYear - 1 &&
          candidate.fiscalPeriod === currentPeriod.fiscalPeriod
        ) {
          const check = this.arePeriodsComparable(currentPeriod, candidate);
          if (check.comparable) {
            this.logger.debug('Found YoY comparable period', {
              current: currentPeriod.accessionNumber,
              comparable: candidate.accessionNumber,
            });
            return { period: candidate, comparisonType: 'YOY' };
          }
        }
      }

      // Fallback: previous quarter
      if (currentIndex > 0) {
        const previous = sameForms[currentIndex - 1];
        const check = this.arePeriodsComparable(currentPeriod, previous);
        if (check.comparable) {
          this.logger.debug('Found QoQ comparable period', {
            current: currentPeriod.accessionNumber,
            comparable: previous.accessionNumber,
          });
          return { period: previous, comparisonType: 'QOQ' };
        }
      }
    }

    // Fallback: immediate previous period
    if (currentIndex > 0) {
      return { period: sameForms[currentIndex - 1], comparisonType: 'QOQ' };
    }

    return { period: null, comparisonType: null };
  }

  /**
   * Format period for display
   */
  formatPeriod(period: FinancialPeriod): string {
    if (period.fiscalPeriod === ReportPeriod.FULL_YEAR) {
      return `FY${period.fiscalYear}`;
    }
    return `${period.fiscalPeriod} FY${period.fiscalYear}`;
  }

  /**
   * Get period short label
   */
  getPeriodLabel(fiscalPeriod: ReportPeriod, fiscalYear: number): string {
    if (fiscalPeriod === ReportPeriod.FULL_YEAR) {
      return `FY${fiscalYear}`;
    }
    return `${fiscalPeriod}${fiscalYear}`;
  }
}
