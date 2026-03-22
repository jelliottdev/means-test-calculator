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
- The current repo only includes a sample manifest. Artifact generation still needs to be wired from the fetch pipeline.
