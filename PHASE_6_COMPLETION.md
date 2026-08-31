# Phase 6 Completion Report

## Overview

Phase 6 adds specialized analysis for Current Reports on Form 8-K. These filings are event-driven, so they now follow a dedicated extraction and classification path instead of the periodic-report comparison flow.

## Delivered

- Downloads and parses the latest 8-K primary filing document.
- Extracts standard SEC item headings and their disclosed content.
- Maps recognized item codes to event categories such as financial results, financing, accounting, governance, and Regulation FD.
- Assigns transparent deterministic materiality levels based on the SEC item category.
- Returns an overall materiality level, event count, distinct categories, summaries, and supporting disclosure sentences.
- Skips the Phase 3 through 5 comparison pipeline for 8-Ks without preventing the actor from returning its base filing data.

## Output

Successful 8-K analysis adds `eightKAnalysis` and updates metadata to:

```json
{
  "analysisVersion": "6.0.0",
  "phase": "PHASE_6_8K_EVENT_ANALYSIS"
}
```

Materiality is a classification of the standard SEC item category and is not investment advice.

## Verification

- `npm run lint` passes.
- `npm run build` passes.
- `npm test` passes.
