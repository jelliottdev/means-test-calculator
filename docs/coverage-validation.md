# Coverage Validation

The means test tool should not rely on geographic datasets just because they parsed successfully.

## Why

Transportation and housing are the two most geography-sensitive parts of the means test pipeline.
They need coverage validation in addition to parser success.

## Validators added

- `validateTransportationCoverage()`
- `validateHousingCoverage()`

## What they check

### Transportation
- expected regional buckets exist
- states map to at least one region
- regional operating-cost values are present
- registry is not empty

### Housing
- state defaults exist
- utility and mortgage values are positive
- minimum state coverage threshold is met
- warns when MSA overrides are missing

## Deployment rule

Artifacts should not be promoted to production for agent use unless:
- parser stage succeeds
- artifact validator succeeds
- geography coverage validator succeeds
