# Regression Fixtures

This directory is for long-lived regression fixtures.

## Purpose

Fixtures make the means test tool auditable and safe to evolve.
They should cover:
- official source HTML snapshots
- parsed artifact snapshots
- expected calculation outputs for known case facts

## Recommended layout

```text
/fixtures/
  /sources/
    /2025-11-01/
      median_income_table.html
      national_expense_standards.html
      transportstandards.html
      means_testing_index.html
  /artifacts/
    /2025-11-01/
      median-income.json
      national-standards.json
      transportation.json
      housing.json
      thresholds.json
  /cases/
    below-median-single.json
    above-median-joint-two-cars.json
    no-vehicle-public-transit.json
    business-debt-exempt.json
  /expected/
    below-median-single.result.json
    above-median-joint-two-cars.result.json
    no-vehicle-public-transit.result.json
    business-debt-exempt.result.json
```

## Policy

- do not update fixtures casually
- if a fixture changes, explain why in commit history
- use fixtures to detect source-format drift and parser regressions
