# Means Test Dataset Artifacts

This directory is the target location for versioned means test data artifacts.

## Structure

```text
/data/means-test/
  /2025-11-01/
    manifest.json
    median-income.json
    national-standards.json
    housing.json
    thresholds.json
  /2026-04-01/
    transportation.json
```

## Notes

- `manifest.json` under a filing-date directory maps each dataset kind to the effective date that should be used.
- This allows mixed effective dates across dataset types.
- The repo can be seeded from the embedded snapshot with `npm run generate:artifacts -- --filing-date 2025-11-01`.
- Generated artifacts should still be refreshed from the official DOJ/UST fetch pipeline before production publication.
