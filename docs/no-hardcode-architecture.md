# No-Hardcode Architecture

This project should not rely on hardcoded legal data as the long-term architecture.

## Core principle

The engine should be deterministic, but the legal and standards data it uses should come from authoritative, versioned datasets resolved by filing date and geography.

## Important scope note

The bankruptcy means test itself is not district-specific. It is driven by federal forms and federal/UST/IRS datasets. District-specific logic matters for filing packets, local forms, filing procedures, matrix formats, and local rules — that belongs in a separate court/district registry layer.

## Target architecture

### 1. Calculation engine
- Pure deterministic engine
- No scraping
- No network calls during calculation
- Consumes a resolved dataset bundle plus normalized case facts

### 2. Dataset resolver
- Resolves the correct dataset versions for a given filing date
- Returns median income, national standards, transportation, housing, and abuse thresholds
- Supports historical reruns and future updates

### 3. Dataset ingestion pipeline
- Fetches authoritative sources from DOJ/UST and related official pages
- Produces versioned JSON artifacts
- Runs validations before publishing
- Records source URLs, hashes, fetch timestamp, and effective dates

### 4. Geography registry
- Nationwide state/county coverage
- County normalization and alias handling
- MSA mapping where applicable
- Explicit fallback behavior when county lookup fails

### 5. Court registry (separate from means test)
- Bankruptcy district/division coverage across the United States
- Local forms
- local rules
- packet requirements
- filing procedures
- filing constraints

The means test tool should stay federal and reusable. Court-specific filing requirements should be implemented elsewhere and composed later by the agent.

## Data artifact model

Recommended structure:

```text
/data/means-test/
  /2025-11-01/
    median-income.json
    national-standards.json
    transportation.json
    housing.json
    thresholds.json
    manifest.json
  /2026-04-01/
    transportation.json
    manifest.json
```

Each artifact should include:
- `effective_date`
- `source_url`
- `source_hash`
- `fetched_at`
- `coverage`
- `warnings`
- `data`

## Manifest example

```json
{
  "filing_date_resolution": {
    "median_income": "2025-11-01",
    "national_standards": "2025-11-01",
    "transportation": "2026-04-01",
    "housing": "2025-11-01",
    "thresholds": "2025-11-01"
  }
}
```

## Required behavior

- No hardcoded state/county values in the long-term engine path
- No UI assumptions in the calculation layer
- JSON-in / JSON-out API and CLI surfaces
- Every result must include audit metadata showing which dataset versions were used
- The engine must work for all U.S. states and county-based lookups nationwide
- Fail closed when a required authoritative dataset cannot be resolved

## Recommended next implementation steps

1. Replace `src/data/meansTestData.ts` constants with generated versioned JSON artifacts.
2. Add a `resolveDatasetsForFilingDate(filingDate)` module.
3. Add county normalization helpers and nationwide coverage validation.
4. Add contract tests that assert all states resolve and sample counties in every region resolve.
5. Keep district-specific filing logic out of the means test package.
