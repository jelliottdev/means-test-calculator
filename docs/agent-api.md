# Agent API

The repository now exposes enough programmatic surfaces for an agent to:
- preflight a filing-date dataset bundle
- inspect provenance
- run the means test from resolved datasets

## Recommended flow

1. Run preflight for the filing date
2. Refuse or escalate if `publication_ready` is false
3. Normalize case facts
4. Run resolved means test execution
5. Attach audit + provenance to downstream artifacts

## Example

```ts
import { runAgentPreflight } from "./src/api/preflight";
import { runMeansTestResolved } from "./src/engine/v2/runner";
import { normalizeLegacyInput } from "./src/engine/v2";

const preflight = await runAgentPreflight("2026-03-21");
if (!preflight.publication_ready) {
  throw new Error(`Bundle not safe: ${preflight.hard_failures.join("; ")}`);
}

const result = await runMeansTestResolved(normalizeLegacyInput(legacyInput));
```

## Goal

The agent should not have to guess whether legal data is safe to use. The preflight layer makes that explicit.
