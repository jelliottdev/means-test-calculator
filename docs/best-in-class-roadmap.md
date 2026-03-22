# Best-in-class roadmap

This project is moving toward a high-trust means-test workflow, but it is **not** yet the best means-test tool in the world.

## Short answer

No — not yet.

Right now the repository has several strong foundations:

- deterministic calculation engines;
- embedded dataset snapshots;
- artifact generation and publication validation;
- audit metadata (dataset provenance, warnings, assumptions);
- nationwide county-exact housing coverage from the embedded snapshot; and
- regression tests for core engine behavior.

That is a strong technical base, but "best in the world" for a legally sensitive bankruptcy tool would require much more than a correct calculator.

## What would make it best-in-class

### 1. Filing-date resolution in the UI

Current state:

- the embedded snapshot now carries nationwide county and county-equivalent housing overrides for the current supported period;
- the UI is still pinned to a supported minimum filing date and embedded snapshot rather than resolving all supported historical/future bundles.

Best-in-class target:

- pick the exact effective datasets for the actual filing date;
- reject unsupported dates with a clear remediation path;
- show the exact period and source page for every dataset used.

### 2. Raw-source provenance, not just snapshot hashes

Current state:

- generated artifacts now carry stable snapshot hashes;
- some artifacts still do not preserve raw DOJ/UST source-document hashes or source-page capture evidence.

Best-in-class target:

- store the exact source URL, fetch timestamp, and raw-source hash for each dataset;
- preserve archived copies or references to the official source pages used;
- make publication readiness fail hard when provenance is incomplete.

### 3. Form-level explainability

Current state:

- the engine returns line items and audit metadata;
- the UI helps, but it is not yet a full form-review workflow.

Best-in-class target:

- every line on Forms 122A-1 / 122A-2 should have:
  - source basis,
  - legal rule,
  - calculation trace,
  - fallback explanation,
  - and reviewer signoff hooks.

### 4. Golden test fixtures from real-world scenarios

Current state:

- there are focused engine regression tests;
- there is not yet a broad library of attorney-reviewed fact patterns and expected outputs.

Best-in-class target:

- attorney-reviewed fixture library across:
  - below-median cases,
  - above-median pass/fail/borderline cases,
  - military/veteran/business-debt exemptions,
  - no-county / fallback scenarios,
  - and difficult local-standard edge cases.

### 5. Human review workflow

Current state:

- warnings and assumptions are surfaced;
- no formal reviewer workflow exists.

Best-in-class target:

- mandatory review gates for any fallback, grouped override, or unsupported exact-county condition;
- reviewer notes, approvals, and exportable audit packets;
- a clear distinction between "calculator output" and "filing-ready reviewed result."

### 6. Continuous official-source verification

Current state:

- the project has fetch/generate/validate tooling;
- it still relies partly on embedded snapshots and manual improvement work.

Best-in-class target:

- automated checks against current DOJ/UST publications on every update cycle;
- diff reports that show exactly what changed and why;
- alerting whenever embedded values drift from official publications.

## Priority order

If the goal is to become the best realistic means-test tool as fast as possible, the highest-value order is:

1. nationwide county-exact housing data;
2. filing-date-aware bundle resolution in the UI;
3. raw-source provenance + archived evidence;
4. attorney-reviewed golden fixtures;
5. reviewer signoff workflow;
6. continuous source-drift monitoring.

## Practical standard

The tool becomes "excellent" when:

- it uses the right dataset for the filing date,
- it uses exact county values wherever the U.S. Trustee provides them,
- every fallback is obvious,
- every result is auditable,
- and risky cases require reviewer signoff.

It becomes "best-in-class" only when those technical controls are paired with verified legal-review workflow and continuous source monitoring.
