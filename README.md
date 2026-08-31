# SEC Filing Intelligence Actor

An Apify Actor that analyzes SEC filings and transforms long regulatory documents into structured, explainable financial intelligence.

## Status: Phase 8 - Production Hardening ✅

See [PHASE_8_COMPLETION.md](PHASE_8_COMPLETION.md) for the latest completion report.

---

## Overview

**SEC Filing Intelligence** is a production-quality SEC filing analysis system that:

1. **Retrieves SEC filings reliably** - Finds current and comparable previous filings
2. **Extracts financial information** - Normalizes SEC Company Facts XBRL data
3. **Detects meaningful changes** - Calculates deterministic period-over-period changes
4. **Generates AI summaries** - Provides actionable insights with confidence scores
5. **Returns machine-readable JSON** - Optimized for APIs and automation

### Key Differentiator

This is NOT a simple filing downloader. It transforms regulatory documents into actionable intelligence.

---

## Features (By Phase)

### Phase 1 ✅
- [x] Ticker → CIK resolution
- [x] Latest filing retrieval (10-Q, 10-K, 8-K)
- [x] Comparable previous filing detection
- [x] SEC API compliance with rate limiting
- [x] Comprehensive error handling
- [x] Structured logging
- [x] 31 unit tests

### Phase 2 ✅
- [x] XBRL financial metric extraction
- [x] QoQ and YoY change calculation
- [x] Financial anomaly detection

### Phase 3 ✅
- [x] Filing section extraction
- [x] Textual change detection
- [x] Section matching

### Phase 4 ✅
- [x] AI-powered risk analysis
- [x] Management tone analysis
- [x] Guidance detection
- [x] Legal/regulatory change identification
- [x] Deterministic liquidity and debt analysis

### Phase 5 ✅
- [x] Materiality scoring
- [x] Direction scoring
- [x] Confidence scoring

### Phase 6 ✅
- [x] 8-K event classification
- [x] 8-K materiality detection

### Phase 7 ✅
- [x] Pay-per-event billing integration
- [x] Store-ready Actor and output metadata
- [x] Controlled billing configuration

### Phase 8 ✅
- [x] Network retry and timeout hardening
- [x] SEC rate and document-size limits
- [x] CI quality gate and edge-case coverage

### Future
- [ ] Advanced features

---

## Architecture

### Core Components

```
SEC Filing Intelligence Actor
├── Input Validation (Zod)
├── SEC API Client
│   ├── Ticker Resolver → CIK
│   └── Filing Resolver → Metadata
├── Error Handling (Typed errors)
├── Rate Limiter (SEC compliant)
├── Structured Logging
└── Output Schema
```

### Technology Stack

- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js + Apify SDK
- **Validation:** Zod
- **Testing:** Vitest
- **HTTP:** Axios
- **Data Source:** SEC EDGAR API + XBRL

---

## Quick Start

### Prerequisites
- Node.js v18+
- npm v9+

### Installation

```bash
git clone https://github.com/yourname/sec-filing-intelligence.git
cd sec-filing-intelligence
npm install
```

### Local Development

```bash
# Build TypeScript
npm run build

# Run tests
npm test
npm test:watch

# Type check
npm run typecheck

# Run actor locally with sample input
npm run dev
```

### Configuration

Create `.env` file:

```bash
cp .env.example .env
```

Configure:

```env
# SEC API (required)
SEC_CONTACT_EMAIL=your-email@example.com
SEC_MAX_REQUESTS_PER_SECOND=8

# Logging
LOG_LEVEL=INFO

# Cache
ENABLE_CACHE=true
```

---

## API Usage

### Input Schema

```json
{
  "ticker": "NVDA",
  "filingType": "10-Q",
  "comparePrevious": true,
  "includeAIAnalysis": false,
  "analysis": {
    "financials": true,
    "riskFactors": false,
    "managementTone": false,
    "guidance": false,
    "liquidity": false,
    "legal": false
  }
}
```

**Parameters:**
- `ticker` *(string, required)* - Stock ticker symbol (1-5 uppercase letters)
- `filingType` *(string, default: "10-Q")* - Filing type: "10-Q", "10-K", "8-K"
- `comparePrevious` *(boolean, default: true)* - Find comparable previous filing
- `includeAIAnalysis` *(boolean, default: false)* - Include AI intelligence; requires `OPENAI_API_KEY`
- `analysis` *(object, optional)* - Specific analysis components

### Output Schema (Phase 4)

```json
{
  "company": {
    "ticker": "NVDA",
    "cik": "0001045810",
    "name": "NVIDIA Corporation",
    "sic": "3674",
    "category": ""
  },
  "filing": {
    "current": {
      "cik": "0001045810",
      "accessionNumber": "0001045810-24-000100",
      "filingType": "10-Q",
      "filingDate": "2024-08-26",
      "reportDate": "2024-07-31",
      "primaryDocument": "nvda-20240731.htm",
      "filingUrl": "https://www.sec.gov/cgi-bin/viewer?...",
      "isAmendment": false
    },
    "previous": {
      "cik": "0001045810",
      "accessionNumber": "0001045810-23-000080",
      "filingType": "10-Q",
      "filingDate": "2023-08-18",
      "reportDate": "2023-07-31",
      "primaryDocument": "nvda-20230731.htm",
      "filingUrl": "https://www.sec.gov/cgi-bin/viewer?...",
      "isAmendment": false
    }
  },
  "metadata": {
    "generatedAt": "2026-08-30T23:14:39.065Z",
    "analysisVersion": "4.0.0",
    "phase": "PHASE_4_AI_INTELLIGENCE"
  },
  "sections": {
    "current": {
      "management_discussion": {
        "title": "Management's Discussion and Analysis",
        "wordCount": 1240,
        "text": "Management discussed revenue growth, gross margin, and demand trends..."
      }
    }
  },
  "textualChanges": [
    {
      "section": "management_discussion",
      "title": "Management's Discussion and Analysis",
      "currentWordCount": 1240,
      "previousWordCount": 1178,
      "addedSentences": [
        "We expect data center demand to remain elevated through the second half."
      ],
      "removedSentences": [],
      "similarity": 0.842,
      "changeMagnitude": "low"
    }
  ],
  "aiAnalysis": {
    "riskFactors": {
      "overallRiskTrend": "increased",
      "newRisks": ["Potential tariff-related cost pressure"],
      "removedRisks": [],
      "summary": "The filing adds tariff exposure as a risk.",
      "evidence": [{"statement": "Tariffs may raise costs next quarter.", "section": "risk_factors"}]
    }
  },
  "scoring": {
    "materiality": {"score": 62, "level": "medium", "factors": []},
    "direction": {"score": -5, "direction": "mixed", "factors": []},
    "confidence": {"score": 74, "level": "medium", "factors": []}
  }
}
```

AI analysis is opt-in. Set `includeAIAnalysis: true` and configure `OPENAI_API_KEY`; optional `OPENAI_BASE_URL` and `OPENAI_MODEL` support OpenAI-compatible providers. When no core AI option is selected, the actor runs risk, tone, guidance, and legal analysis. AI responses are schema-validated and include filing evidence; they are informational and not investment advice.

### Explainable Scoring (Phase 5)

When a comparable filing is available, the actor calculates deterministic 0-100 materiality and confidence scores plus a directional assessment. Each score includes its contributing factors. Materiality reflects significant financial, textual, risk, guidance, and legal changes; direction balances positive and negative signals; confidence reflects available XBRL, comparable-filing, and evidence-backed AI sources. Phase 5 does not require an LLM.

### Liquidity Analysis

Set `analysis.liquidity: true` to include a deterministic liquidity assessment derived only from comparable XBRL cash, debt, and operating cash-flow changes. The response is `improved`, `deteriorated`, `mixed`, `unchanged`, or `insufficient_evidence`, and includes each verified contributing metric. The assessment is also incorporated into explainable materiality, direction, and confidence scoring.

### 8-K Event Analysis (Phase 6)

For `filingType: "8-K"`, the actor downloads the current report, extracts standard SEC item headings, and returns `eightKAnalysis` instead of treating the filing as a periodic-report comparison. Each event contains its SEC item code, event category, deterministic materiality level, summary, and supporting disclosure sentences.

```json
{
  "eightKAnalysis": {
    "eventCount": 2,
    "overallMateriality": "high",
    "categories": ["financial_results", "governance"],
    "events": [{
      "item": "5.02",
      "title": "Departure of Directors or Certain Officers",
      "category": "governance",
      "materiality": "high",
      "summary": "The chief financial officer resigned effective immediately.",
      "evidence": ["The chief financial officer resigned effective immediately."]
    }]
  }
}
```

The materiality label reflects the standard SEC item category and is not an investment recommendation.

### Pay-Per-Event Billing (Phase 7)

Phase 7 provides opt-in Apify pay-per-event billing for each completed result. The actor saves the result first, then charges the custom `filing-analysis` event. Billing is disabled by default and is enabled only when `ENABLE_PPE_CHARGING=true`.

Before enabling billing in production, configure the matching `filing-analysis` event and its price in Apify Console. The existing pricing estimate suggests a starting point of `$0.15` per completed filing analysis, but it should be validated against actual LLM and platform costs before publication. A charge failure is logged without deleting a saved result.

For a local PPE integration test, run the built actor with both `ACTOR_TEST_PAY_PER_EVENT=true` and `ENABLE_PPE_CHARGING=true`. Apify writes simulated charge records to the local `charging-log` dataset; no real platform charge occurs.

### Production Hardening (Phase 8)

The production path enforces the SEC maximum of 10 requests per second, retries transient SEC document-download failures, and caps downloaded filing documents at 20 MiB. Filing archive paths validate accession numbers and primary-document names before issuing a request.

AI requests use a 30-second timeout by default and cap output at 1,200 tokens. Set `OPENAI_TIMEOUT_MS` between 1,000 and 120,000 milliseconds or `MAX_OUTPUT_TOKENS` between 64 and 4,096 to tune those limits; invalid values fall back to safe defaults. GitHub Actions runs lint, build, and tests on every pull request and `main` push.

---

## Error Handling

The system uses typed, specific errors:

```typescript
InvalidTickerError       // Invalid ticker format
CompanyNotFoundError     // Ticker not found in SEC database
FilingNotFoundError      // No such filing for company
PreviousFilingNotFoundError  // No comparable previous filing
SecRateLimitError        // Rate limited by SEC (429)
SecUnavailableError      // SEC API unavailable (5xx)
FilingParseError         // Failed to parse filing
ValidationError          // Input validation failed
```

Each error includes:
- Descriptive message
- Unique error code
- Structured logging

---

## SEC API Compliance

### Fair Access Requirements

- ✅ **User-Agent:** Proper identification required
- ✅ **Rate Limiting:** 8 requests/second (configurable, below SEC's 10/sec max)
- ✅ **Retry Logic:** Exponential backoff with jitter
- ✅ **No Abuse:** Conservative defaults, no aggressive scraping
- ✅ **Caching:** Immutable data cached locally
- ✅ **Contact Info:** SEC contact email in User-Agent

### SEC EDGAR Endpoints Used

- `/files/documents/company_tickers.json` - Ticker to CIK mapping
- `/submissions/CIK{CIK}.json` - Filing history and submissions
- `/api/xbrl/companyfacts/CIK{CIK}.json` - XBRL financial data (Phase 2)

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
npm test -- tickerResolver.test.ts
```

### Watch Mode

```bash
npm test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

### Test Structure

```
tests/
├── input.test.ts           # Input validation (12 tests)
├── rateLimiter.test.ts     # Rate limiting (6 tests)
├── tickerResolver.test.ts  # Ticker resolution (7 tests)
└── filingResolver.test.ts  # Filing resolution (6 tests)
```

**Total: 97 tests, 100% passing**

---

## Project Structure

```
sec-filing-intelligence/
├── src/
│   ├── main.ts                    # Actor entry point
│   ├── actor/
│   │   ├── input.ts              # Input validation
│   │   ├── output.ts             # Output types
│   │   ├── errors.ts             # Error classes
│   │   └── pricing.ts            # PPE billing (Phase 7)
│   ├── sec/
│   │   ├── secClient.ts          # HTTP client
│   │   ├── secTypes.ts           # SEC API types
│   │   ├── tickerResolver.ts     # Ticker → CIK
│   │   ├── filingResolver.ts     # Filing metadata
│   │   ├── rateLimiter.ts        # Rate limiting
│   │   ├── filingDownloader.ts   # Downloader (Phase 3)
│   │   └── submissionsParser.ts  # Parser (Phase 3)
│   ├── xbrl/
│   │   ├── companyFactsClient.ts # XBRL client (Phase 2)
│   │   ├── metricNormalizer.ts   # Metric mapping (Phase 2)
│   │   └── financialAnalyzer.ts  # Finance analysis (Phase 2)
│   ├── filings/
│   │   ├── filingParser.ts       # HTML parsing (Phase 3)
│   │   ├── sectionExtractor.ts   # Section extraction (Phase 3)
│   │   └── textNormalizer.ts     # Text cleanup (Phase 3)
│   ├── comparison/
│   │   ├── financialDiff.ts      # Financial comparison (Phase 2)
│   │   ├── textualDiff.ts        # Text comparison (Phase 3)
│   │   └── semanticDiff.ts       # Semantic comparison (Phase 4)
│   ├── intelligence/
│   │   ├── riskAnalyzer.ts       # Risk analysis (Phase 4)
│   │   ├── toneAnalyzer.ts       # Tone analysis (Phase 4)
│   │   ├── guidanceAnalyzer.ts   # Guidance (Phase 4)
│   │   └── summaryGenerator.ts   # Summary (Phase 4)
│   ├── events/
│   │   └── eightKAnalyzer.ts     # 8-K item classification (Phase 6)
│   ├── scoring/
│   │   ├── materialityScore.ts   # Materiality (Phase 5)
│   │   ├── directionScore.ts     # Direction (Phase 5)
│   │   └── confidenceScore.ts    # Confidence (Phase 5)
│   ├── ai/
│   │   ├── llmClient.ts          # LLM abstraction (Phase 4)
│   │   ├── prompts.ts            # Prompt templates (Phase 4)
│   │   └── responseValidator.ts  # Output validation (Phase 4)
│   ├── cache/
│   │   ├── filingCache.ts        # Filing cache (Phase 3)
│   │   └── analysisCache.ts      # Analysis cache (Phase 4)
│   └── utils/
│       ├── logger.ts             # Logging
│       ├── retry.ts              # Retry logic
│       ├── numbers.ts            # Math utilities
│       └── hashing.ts            # Content hashing
├── tests/
│   ├── input.test.ts
│   ├── rateLimiter.test.ts
│   ├── tickerResolver.test.ts
│   └── filingResolver.test.ts
├── .actor/
│   └── input_schema.json         # Apify input schema
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
├── .gitignore
├── README.md                      # This file
└── PHASE_1_COMPLETION.md         # Phase 1 report
```

---

## Performance

### Phase 1 Metrics

| Metric | Value |
|--------|-------|
| Ticker resolution | ~200ms (first), <1ms (cached) |
| Filing lookup | ~300ms |
| Full run | ~500ms without content analysis |
| Memory usage | <50MB |
| Rate limit | 8 req/sec (SEC compliant) |

### Optimization Strategies

1. **Caching** - 24-hour cache for ticker mappings
2. **Rate Limiting** - Prevents SEC from blocking us
3. **Minimal Logging** - Only on errors/phase changes (Phase 1)
4. **Lazy Loading** - Only load needed phases
5. **Pooling** - Reuse HTTP connections

---

## Security & Privacy

### ✅ Implemented
- Strict TypeScript type safety
- Zod input validation
- No hardcoded secrets
- Environment variable configuration
- Proper error messages without stack traces
- No arbitrary code execution
- Secure User-Agent headers

### Best Practices
- Never log API keys or credentials
- Validate all external input
- Sanitize error messages
- Use secure defaults
- Regular dependency updates

---

## Cost Analysis

### SEC API Costs
**$0** - SEC EDGAR API is completely free

### Apify Compute
- Phase 1: ~0.5 seconds = ~$0.0001-0.0002
- Phase 4+: ~2-5 seconds = ~$0.0002-0.0005

### AI (Optional Phase 4)
- Phase 4+: ~3-5 LLM calls @ ~$0.002-0.01 per call

**Suggested PPE Pricing:**
- Basic analysis (Phase 1-2): $0.03
- Filing comparison (Phase 3): $0.07
- Full intelligence (Phase 4-5): $0.15

---

## Known Limitations

### Current
- No historical filing retrieval beyond recent ~40 filings
- Section extraction relies on deterministic heading heuristics for common 10-Q and 10-K structures
- 8-K analysis recognizes standard item headings in the primary filing document; nonstandard formatting may not be classified

### Ticker Coverage
- US stocks only
- Primarily large and mid-cap companies
- Some private filings not in public ticker list

### Filing Coverage
- Supports 10-Q, 10-K, 8-K only (other forms in future phases)
- Only English-language filings
- Some foreign issuers use different forms (20-F)

---

## Disclaimer

**SEC Filing Intelligence** provides automated analysis of publicly available SEC regulatory filings. 

- ⚠️ AI-generated interpretations may contain errors
- ⚠️ Always verify important findings against original SEC filings
- ⚠️ This is NOT investment advice
- ⚠️ Consult financial professionals before making investment decisions
- ⚠️ Use at your own risk

---

## Development Roadmap

### ✅ Phase 1: SEC Ingestion
Foundation for SEC API integration and filing discovery

### ✅ Phase 2: XBRL Financial Extraction
Structured financial metric extraction and comparison

### ✅ Phase 3: Filing Content Analysis
HTML parsing, section extraction, textual change detection

### ✅ Phase 4: AI Intelligence
Opt-in, schema-validated risk, tone, guidance, and legal analysis with OpenAI-compatible LLM integration

### ✅ Phase 5: Explainable Scoring
Deterministic materiality, direction, and confidence scores with contributing factors

### ✅ Phase 6: 8-K Analysis
Specialized SEC item classification and deterministic materiality detection

### ✅ Phase 7: Apify Commercialization
Opt-in PPE billing plus Store-ready Actor and output metadata

### ✅ Phase 8: Production Hardening
Network resilience, resource limits, CI quality gates, and edge-case coverage

---

## Contributing

This is a reference implementation. To extend:

1. Follow existing code style and architecture
2. Add tests for new features
3. Update documentation
4. Maintain strict TypeScript
5. Follow SOLID principles

---

## Support & Issues

### Getting Help
- Check [PHASE_1_COMPLETION.md](PHASE_1_COMPLETION.md) for detailed technical info
- Review error messages and logs
- Check SEC API documentation

### Reporting Issues
- Include error code and message
- Provide ticker and filing type
- Include timestamp and environment

---

## License

MIT License

---

## References

- [SEC EDGAR API Documentation](https://www.sec.gov/developer)
- [SEC Fair Access Requirements](https://www.sec.gov/os/webmaster-faq#moreinfo)
- [XBRL Financial Reporting](https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&XBRL=1)
- [Apify Actor Documentation](https://docs.apify.com/actors)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Current Phase:** Phase 8 ✅ Complete  
**Last Updated:** 2026-08-30  
**Next Review:** Advanced-feature prioritization
