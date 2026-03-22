# Production Cutover Checklist

This checklist is for making the resolved artifact path the default production execution path.

## Pre-cutover requirements

- Strict artifact fetch pipeline succeeds without `--allow-stubbed`
- Artifact validator succeeds
- Geography coverage validator succeeds
- Publication readiness check succeeds
- Housing coverage is acceptable under deployment policy
- Transportation region/MSA coverage is acceptable under deployment policy

## Runtime cutover steps

1. Make resolved execution the default CLI/API path.
2. Keep embedded resolver only for local development and emergency fallback.
3. Surface bundle provenance in engine audit output and logs.
4. Reject artifact bundles that fail publication-readiness checks.
5. Record filing date and artifact effective dates in all downstream case artifacts.

## Post-cutover requirements

- Add regression fixtures for known filing dates
- Add golden means-test scenarios
- Add alerts when newly fetched artifacts are not publication-ready

## Agent policy

The agent should only run the means test tool against bundles that passed publication-readiness checks.
