# SEC Filing Intelligence

SEC Filing Intelligence is an Apify Actor that turns SEC filings into structured, explainable research data. It retrieves a company's latest 10-Q, 10-K, or 8-K filing, optionally finds a period-compatible prior filing, and returns the information needed to understand what changed.

## What It Provides

- Ticker-to-CIK resolution and authoritative SEC filing metadata
- Period-compatible financial comparisons from SEC Company Facts XBRL data
- Filing-text changes across risk factors, legal proceedings, and management discussion
- Deterministic liquidity, materiality, direction, and confidence assessments
- 8-K event classification and materiality
- Optional AI analysis of risks, tone, guidance, and legal developments

Every output includes the selected accession number, filing date, and report date. Financial changes include their source concept, units, period metadata, and comparison type.

## Run In Apify

Open the Actor in Apify Console, select **Start**, and use an input such as:

```json
{
  "ticker": "NVDA",
  "filingType": "10-Q",
  "comparePrevious": true,
  "includeAIAnalysis": false,
  "analysis": {
    "financials": true,
    "liquidity": true
  }
}
```

### Input Reference

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `ticker` | string | required | U.S. ticker symbol, one to five letters, for example `NVDA`. |
| `filingType` | `10-Q` \| `10-K` \| `8-K` | `10-Q` | Filing type to analyze. |
| `comparePrevious` | boolean | `true` | Finds a period-compatible prior filing when one is available. |
| `includeAIAnalysis` | boolean | `false` | Requests optional AI analysis when the Actor operator has configured an LLM provider. |
| `analysis.financials` | boolean | `true` | Extracts available XBRL financial metrics and comparisons. |
| `analysis.liquidity` | boolean | `false` | Produces a deterministic liquidity assessment from verified metrics. |
| `analysis.riskFactors` | boolean | `false` | Requests AI analysis of risk-factor changes. |
| `analysis.managementTone` | boolean | `false` | Requests AI analysis of MD&A tone. |
| `analysis.guidance` | boolean | `false` | Requests AI analysis of guidance in MD&A. |
| `analysis.legal` | boolean | `false` | Requests AI analysis of legal proceedings. |

## Use The API

Replace `<actor-id>` with the Actor ID or `username~actor-name`, and keep your Apify token in an environment variable rather than source code.

```bash
export APIFY_TOKEN="your_apify_api_token"

curl --request POST \
  "https://api.apify.com/v2/actors/<actor-id>/run-sync-get-dataset-items" \
  --header "Authorization: Bearer ${APIFY_TOKEN}" \
  --header "Content-Type: application/json" \
  --data '{
    "ticker": "NVDA",
    "filingType": "10-Q",
    "comparePrevious": true,
    "includeAIAnalysis": false,
    "analysis": { "financials": true, "liquidity": true }
  }'
```

The synchronous endpoint returns dataset items after the run finishes. It has a 300-second request limit, so production integrations should start runs asynchronously, store the returned run ID, and retrieve the default dataset once the run succeeds.

## AI Analysis

Set `includeAIAnalysis` to `true` and request the relevant analysis options:

```json
{
  "ticker": "IONQ",
  "filingType": "10-Q",
  "comparePrevious": true,
  "includeAIAnalysis": true,
  "analysis": {
    "financials": true,
    "riskFactors": true,
    "managementTone": true,
    "guidance": true,
    "legal": true
  }
}
```

AI analysis is optional. Each accepted AI result contains at least one verbatim quote from the relevant SEC filing section. If the filing does not contain the required section, or the provider is not configured, that analysis is omitted rather than replaced with an unsupported conclusion.

Actor operators must configure `SEC_CONTACT_EMAIL` for SEC fair access. AI requires an operator-managed `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`. Never place either provider key or an Apify API token in input JSON, source code, or a public README.

## Output

Each run writes one JSON record to the default dataset. Common fields are:

```json
{
  "company": {
    "ticker": "NVDA",
    "cik": "0001045810",
    "name": "NVIDIA CORP"
  },
  "filing": {
    "current": {
      "accessionNumber": "0001045810-26-000075",
      "filingType": "10-Q",
      "reportDate": "2026-07-26"
    },
    "previous": null
  },
  "financialChanges": [],
  "metadata": {
    "analysisVersion": "5.0.0",
    "phase": "PHASE_5_EXPLAINABLE_SCORING"
  }
}
```

Optional fields include `metrics`, `sections`, `textualChanges`, `liquidity`, `materialChanges`, `summary`, `keyTakeaways`, `scoring`, `aiAnalysis`, and `eightKAnalysis`. Their availability depends on the filing type, requested options, SEC disclosure structure, and whether a safe comparable filing was found.

## Best Practices

- Use `comparePrevious: true` for 10-Q and 10-K analysis, but handle a missing `filing.previous` as a valid outcome.
- Store the filing accession number and report date with downstream research so results remain reproducible.
- Treat absent metrics or AI fields as insufficient evidence, not as zero values or negative findings.
- Check the evidence quotes and original SEC filing before using an AI conclusion in a decision or report.
- Use asynchronous Actor runs and persist the run ID for production workloads; reserve synchronous calls for short interactive requests.
- Set a maximum run cost in your Apify integration and monitor runs before enabling paid AI analysis at scale.
- Do not use this Actor as the sole basis for investment, legal, tax, or financial decisions.

## Supported Filings

- `10-Q` quarterly reports
- `10-K` annual reports
- `8-K` current reports

## Disclaimer

SEC Filing Intelligence is intended for research and automation workflows. It does not provide investment, legal, tax, or financial advice. Verify material conclusions against the original SEC filing.
