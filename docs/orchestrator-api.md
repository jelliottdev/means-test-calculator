# Orchestrator API

The repository now exposes a higher-level orchestration surface for agents and workflow runners.

## What it provides

- filing-date bundle status
- provenance
- safe execution wrappers
- legacy-input compatibility

## Example

```ts
import {
  getBundleStatus,
  runBundleCheckedMeansTest,
  runBundleCheckedLegacyMeansTest,
} from "./src/api/orchestrator";

const status = await getBundleStatus("2026-03-21");
if (!status.publication_ready) {
  throw new Error(`Bundle not ready: ${status.publication.hard_failures.join("; ")}`);
}

const result = await runBundleCheckedLegacyMeansTest(legacyInput);
```

## Why use this layer

This lets the future bankruptcy orchestration agent treat the means test tool as one controlled subsystem rather than many separate helper functions and CLIs.
