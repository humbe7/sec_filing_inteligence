/**
 * XBRL (eXtensible Business Reporting Language) types
 * Financial metrics extracted from SEC company facts data
 */

export enum FinancialMetric {
  // Revenue
  REVENUE = 'REVENUE',
  GROSS_PROFIT = 'GROSS_PROFIT',
  GROSS_MARGIN = 'GROSS_MARGIN',
  COST_OF_REVENUE = 'COST_OF_REVENUE',

  // Operating
  OPERATING_INCOME = 'OPERATING_INCOME',
  OPERATING_MARGIN = 'OPERATING_MARGIN',
  OPERATING_EXPENSES = 'OPERATING_EXPENSES',
  RESEARCH_AND_DEVELOPMENT = 'RESEARCH_AND_DEVELOPMENT',
  SG_A = 'SG_A',

  // Profitability
  NET_INCOME = 'NET_INCOME',
  NET_MARGIN = 'NET_MARGIN',
  EARNINGS_PER_SHARE_BASIC = 'EARNINGS_PER_SHARE_BASIC',
  EARNINGS_PER_SHARE_DILUTED = 'EARNINGS_PER_SHARE_DILUTED',

  // Balance Sheet
  CASH_AND_EQUIVALENTS = 'CASH_AND_EQUIVALENTS',
  SHORT_TERM_INVESTMENTS = 'SHORT_TERM_INVESTMENTS',
  TOTAL_CASH = 'TOTAL_CASH',
  CURRENT_ASSETS = 'CURRENT_ASSETS',
  TOTAL_ASSETS = 'TOTAL_ASSETS',
  CURRENT_LIABILITIES = 'CURRENT_LIABILITIES',
  TOTAL_LIABILITIES = 'TOTAL_LIABILITIES',
  STOCKHOLDERS_EQUITY = 'STOCKHOLDERS_EQUITY',
  LONG_TERM_DEBT = 'LONG_TERM_DEBT',
  SHORT_TERM_DEBT = 'SHORT_TERM_DEBT',
  TOTAL_DEBT = 'TOTAL_DEBT',

  // Cash Flow
  OPERATING_CASH_FLOW = 'OPERATING_CASH_FLOW',
  CAPITAL_EXPENDITURES = 'CAPITAL_EXPENDITURES',
  FREE_CASH_FLOW = 'FREE_CASH_FLOW',
  INVESTING_CASH_FLOW = 'INVESTING_CASH_FLOW',
  FINANCING_CASH_FLOW = 'FINANCING_CASH_FLOW',

  // Shares
  SHARES_OUTSTANDING = 'SHARES_OUTSTANDING',
  SHARES_OUTSTANDING_BASIC = 'SHARES_OUTSTANDING_BASIC',
  SHARES_OUTSTANDING_DILUTED = 'SHARES_OUTSTANDING_DILUTED',
}

export enum PeriodType {
  INSTANT = 'INSTANT',           // Point-in-time (balance sheet)
  DURATION = 'DURATION',         // Period (income statement)
}

export enum ReportPeriod {
  Q1 = 'Q1',
  Q2 = 'Q2',
  Q3 = 'Q3',
  Q4 = 'Q4',
  FULL_YEAR = 'FULL_YEAR',
}

export interface XBRLFact {
  accn: string;           // Accession number
  fy: number;             // Fiscal year
  fp: string;             // Fiscal period (Q1, Q2, etc.)
  form: string;           // Form type (10-Q, 10-K)
  filed: string;          // Filing date
  start: string;          // Period start date
  end: string;            // Period end date
  val: number;            // Value
  accn_fp: string;        // Accession + fiscal period
  unit: string;           // Unit (USD, shares, etc.)
  negating: number;       // Whether to negate value
}

export interface XBRLConcept {
  concept: string;        // Taxonomy concept (us-gaap:Revenue)
  label: string;          // Human-readable label
  description: string;    // Description
  periodType: PeriodType; // INSTANT or DURATION
}

export interface FinancialValue {
  metric: FinancialMetric;
  value: number;
  unit: string;
  concept?: string;           // XBRL concept used
  source: 'XBRL' | 'CALCULATED';
  confidence: number;         // 0.0-1.0
  periodEnd: string;
  fiscalYear: number;
  fiscalPeriod: string;
  filingDate: string;
  accessionNumber: string;
  notes?: string;
}

export interface FinancialPeriod {
  fiscalYear: number;
  fiscalPeriod: ReportPeriod;
  startDate: string;
  endDate: string;
  durationDays: number;
  form: string;              // 10-Q or 10-K
  filingDate: string;
  accessionNumber: string;
}

export interface FinancialChange {
  metric: FinancialMetric;
  current: FinancialValue;
  previous: FinancialValue;
  absoluteChange: number;
  percentChange: number;
  percentPointChange?: number; // For margins
  direction: 'increase' | 'decrease' | 'unchanged';
  significance: 'high' | 'medium' | 'low';
  comparisonType: 'QOQ' | 'YOY';
}

export interface CompanyFacts {
  'us-gaap': Record<string, XBRLFact[]>;
  'ifrs-full'?: Record<string, XBRLFact[]>;
  'dei'?: Record<string, XBRLFact[]>;
}

/**
 * Metric concept mappings for US-GAAP
 * Multiple concepts can map to the same metric
 */
export const US_GAAP_CONCEPT_MAPPINGS: Record<FinancialMetric, string[]> = {
  // Revenue
  [FinancialMetric.REVENUE]: [
    'us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax',
    'us-gaap:Revenues',
    'us-gaap:RevenueFromContractWithCustomer',
  ],
  [FinancialMetric.COST_OF_REVENUE]: [
    'us-gaap:CostOfRevenue',
    'us-gaap:CostOfGoodsAndServicesSold',
  ],
  [FinancialMetric.GROSS_PROFIT]: [
    'us-gaap:GrossProfit',
  ],

  // Operating
  [FinancialMetric.OPERATING_INCOME]: [
    'us-gaap:OperatingIncomeLoss',
  ],
  [FinancialMetric.OPERATING_EXPENSES]: [
    'us-gaap:OperatingExpenses',
  ],
  [FinancialMetric.RESEARCH_AND_DEVELOPMENT]: [
    'us-gaap:ResearchAndDevelopmentExpense',
  ],
  [FinancialMetric.SG_A]: [
    'us-gaap:SellingGeneralAndAdministrativeExpense',
    'us-gaap:GeneralAndAdministrativeExpense',
  ],

  // Profitability
  [FinancialMetric.NET_INCOME]: [
    'us-gaap:NetIncomeLoss',
    'us-gaap:NetIncomeAttributableToUsersOfParent',
  ],
  [FinancialMetric.EARNINGS_PER_SHARE_BASIC]: [
    'us-gaap:EarningsPerShareBasic',
  ],
  [FinancialMetric.EARNINGS_PER_SHARE_DILUTED]: [
    'us-gaap:EarningsPerShareDiluted',
  ],

  // Balance Sheet - Assets
  [FinancialMetric.CASH_AND_EQUIVALENTS]: [
    'us-gaap:CashAndCashEquivalentsAtCarryingValue',
    'us-gaap:Cash',
  ],
  [FinancialMetric.SHORT_TERM_INVESTMENTS]: [
    'us-gaap:MarketableSecuritiesCurrent',
  ],
  [FinancialMetric.TOTAL_CASH]: [
    'us-gaap:CashCashEquivalentsAndShortTermInvestments',
  ],
  [FinancialMetric.CURRENT_ASSETS]: [
    'us-gaap:AssetsCurrent',
  ],
  [FinancialMetric.TOTAL_ASSETS]: [
    'us-gaap:Assets',
  ],

  // Balance Sheet - Liabilities
  [FinancialMetric.CURRENT_LIABILITIES]: [
    'us-gaap:LiabilitiesCurrent',
  ],
  [FinancialMetric.TOTAL_LIABILITIES]: [
    'us-gaap:Liabilities',
  ],

  // Equity
  [FinancialMetric.STOCKHOLDERS_EQUITY]: [
    'us-gaap:StockholdersEquity',
    'us-gaap:MembersEquity',
  ],

  // Debt
  [FinancialMetric.LONG_TERM_DEBT]: [
    'us-gaap:LongTermBorrowings',
    'us-gaap:LongTermDebt',
  ],
  [FinancialMetric.SHORT_TERM_DEBT]: [
    'us-gaap:ShortTermBorrowings',
    'us-gaap:CommercialPaper',
  ],
  [FinancialMetric.TOTAL_DEBT]: [
    'us-gaap:Liabilities',  // Calculated
  ],

  // Cash Flow
  [FinancialMetric.OPERATING_CASH_FLOW]: [
    'us-gaap:NetCashProvidedByUsedInOperatingActivities',
  ],
  [FinancialMetric.CAPITAL_EXPENDITURES]: [
    'us-gaap:PaymentsToAcquirePropertyPlantAndEquipment',
  ],
  [FinancialMetric.FREE_CASH_FLOW]: [
    'us-gaap:FreeCashFlow',  // May not exist, calculated
  ],
  [FinancialMetric.INVESTING_CASH_FLOW]: [
    'us-gaap:NetCashProvidedByUsedInInvestingActivities',
  ],
  [FinancialMetric.FINANCING_CASH_FLOW]: [
    'us-gaap:NetCashProvidedByUsedInFinancingActivities',
  ],

  // Shares
  [FinancialMetric.SHARES_OUTSTANDING]: [
    'us-gaap:CommonStockSharesOutstanding',
    'us-gaap:CommonStockSharesIssued',
  ],
  [FinancialMetric.SHARES_OUTSTANDING_BASIC]: [
    'us-gaap:WeightedAverageNumberOfSharesOutstandingBasic',
  ],
  [FinancialMetric.SHARES_OUTSTANDING_DILUTED]: [
    'us-gaap:WeightedAverageNumberOfSharesDilutedAssumingConversion',
  ],

  // Calculated/Derived metrics
  [FinancialMetric.GROSS_MARGIN]: [],
  [FinancialMetric.OPERATING_MARGIN]: [],
  [FinancialMetric.NET_MARGIN]: [],
};
