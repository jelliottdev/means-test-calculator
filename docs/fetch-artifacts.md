# Official Fetch-to-Artifacts Pipeline

The repository now includes `scripts/fetch-artifacts.ts`, which is the intended replacement path for patching source constants.

## Current state

The script is conservative scaffolding:
- detects the current DOJ/UST effective date
- fetches official source pages
- computes source hashes
- refuses to publish incomplete artifacts unless `--allow-stubbed` is used

## Important

The parser bodies are still placeholders. This is intentional.

For a tool used by an agent in a legal workflow, it is better to fail closed than to silently publish partially parsed or guessed legal datasets.

## Usage

```bash
node ./scripts/fetch-artifacts.ts --filing-date 2026-03-21 --out-dir data/means-test
```

To allow incomplete placeholder output during development only:

```bash
node ./scripts/fetch-artifacts.ts --filing-date 2026-03-21 --out-dir data/means-test --allow-stubbed
```

## What still needs implementation

- strict median-income table parsing
- strict national-standards parsing
- strict transportation parsing
- strict county-level housing parsing
- threshold extraction and validation from source material
- coverage tests before artifact publication

## Why this is the right path

This lets the project move to:
- authoritative fetches
- versioned JSON artifacts
- resolved execution by filing date
- no hardcoded runtime tables
- fail-closed publication behavior
