# Means Test V2

This branch adds a production-oriented V2 engine alongside the existing calculator.

## What V2 adds

- Versioned dataset registry metadata
- Audit payload on every result
- Backward-compatible normalization from the legacy `MeansTestInput`
- Per-vehicle input model for future-proof transportation handling
- Explicit warnings/assumptions for missing county and fallback behavior

## Files

- `src/engine/v2/types.ts`
- `src/engine/v2/registry.ts`
- `src/engine/v2/normalize.ts`
- `src/engine/v2/meansTestV2.ts`
- `src/engine/v2/index.ts`

## Use with current app input

```ts
import { runMeansTestV2, normalizeLegacyInput } from "./src/engine/v2";
import type { MeansTestInput } from "./src/engine/meansTest";

const legacyInput: MeansTestInput = getInputSomehow();
const v2Input = normalizeLegacyInput(legacyInput);
const result = runMeansTestV2(v2Input);
```

## Recommended next step

Switch the current UI result screen to render `result.audit.warnings`, `result.audit.assumptions`, and dataset effective dates. Then replace the legacy engine call with the V2 call.

## Remaining work

- Replace transport registry metadata with truly filing-date-resolved dataset selection
- Add county-level housing dataset artifacts instead of relying on current helper behavior
- Add test fixtures for edge cases and golden calculations
- Move update script output from TypeScript constants to versioned JSON snapshots
