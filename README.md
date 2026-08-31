# SEC Filing Intelligence

SEC Filing Intelligence is an Apify Actor that turns SEC filings into structured, explainable research data. It retrieves a company's latest 10-Q, 10-K, or 8-K filing, optionally finds a comparable prior filing, and returns the information needed to understand what changed.

## What It Analyzes

- Ticker-to-CIK resolution and SEC filing metadata
- Comparable filing selection for period-over-period analysis
- SEC Company Facts XBRL metrics, including revenue, profitability, cash, operating cash flow, and earnings per share
- Period-compatible financial changes with units, reporting dates, and source concepts
- Filing sections such as risk factors, legal proceedings, and management discussion
- Deterministic textual changes, liquidity assessment, materiality, direction, and confidence scoring
- 8-K event classification and materiality
- Optional AI analysis of risks, management tone, guidance, and legal developments

## AI Evidence

AI analysis is optional. When enabled, each AI result must include at least one verbatim quote from the relevant SEC filing section. Analyses are skipped when the required source section is unavailable, rather than generating unsupported conclusions.

## Output

Each run writes one structured JSON record to the Apify default dataset. The record includes company and filing metadata, available financial comparisons, filing-text changes, optional AI analysis, explainable scores, and 8-K event results where applicable.

## Supported Filings

- `10-Q` quarterly reports
- `10-K` annual reports
- `8-K` current reports

## Important Note

This Actor is intended for research and automation workflows. It does not provide investment, legal, tax, or financial advice. Users should verify material conclusions against the original SEC filing.
