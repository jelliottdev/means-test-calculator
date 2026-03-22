# Artifact Generation Workflow

The repository now has a seed artifact generation path.

## New scripts

- `scripts/lib/write-artifacts.ts`
- `scripts/generate-artifacts.ts`

## Purpose

These scripts are the bridge away from patching source-code constants.

## Current behavior

`generate-artifacts.ts` builds a dataset bundle from the current embedded data and writes versioned JSON artifacts plus a filing-date manifest.

Example:

```bash
node ./scripts/generate-artifacts.ts --filing-date 2026-03-21 --out-dir data/means-test
```

## Target behavior

The existing DOJ/UST fetch pipeline should be refactored so that instead of patching `src/data/meansTestData.ts`, it produces these JSON artifacts directly.

## Required artifact outputs

- `median-income.json`
- `national-standards.json`
- `transportation.json`
- `housing.json`
- `thresholds.json`
- `manifest.json`

## Why this matters

Once the fetch pipeline writes these files, the resolved CLI/API path can become the primary engine path and the embedded resolver can be retired.
