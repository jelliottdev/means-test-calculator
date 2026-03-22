# Threshold Fixture Workflow

The threshold parser now has regression fixtures under `test/fixtures/thresholds`.

## Check command

```bash
node ./scripts/check-threshold-fixtures.ts
```

## Expected behavior

- exits 0 when all variants extract valid low/high thresholds
- exits non-zero when any fixture fails extraction or ordering validation

## Why this matters

Threshold source text can vary across official pages and periods. The parser should not rely on one lucky regex match.

## Workflow recommendation

Run this check whenever:
- threshold parser patterns change
- strict fetch pipeline changes
- official source pages appear to have changed wording

## Failure handling

If this check fails:
1. inspect which fixture failed
2. add or adjust source-variant patterns conservatively
3. rerun the fixture check before publishing artifacts
