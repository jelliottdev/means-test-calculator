# Remaining Work

The repository now has the right architecture for an agent-first, no-hardcode means test tool.

## Completed foundation

- Deterministic engine with audit output
- API and CLI surfaces
- Dataset resolver abstraction
- File-backed artifact resolver
- Artifact writer/generator
- Artifact validator
- Strict parsers started for median income, national standards, transportation base values, thresholds
- Housing parser skeleton
- Geography normalization helpers

## Remaining parser work

### Transportation
- Extract regional operating costs
- Extract MSA operating costs
- Preserve state -> county -> MSA mapping in final artifact
- Add validation that all expected regions exist

### Housing
- Fetch and parse all authoritative housing chart pages
- Preserve county-level rows, not just state defaults
- Derive or extract MSA overrides where officially available
- Add validation thresholds for county coverage by state

### Thresholds
- Confirm regex extraction across official source variations
- Add source regression fixtures

## Remaining integration work

- Make resolved artifact execution the primary CLI/API path
- Deprecate embedded resolver for production use
- Replace runtime dependence on source constants
- Add golden calculation tests

## Safe publication rule

Generated artifacts should only be used by the agent when:
- validator returns `ok: true`
- warnings are acceptable under your deployment policy
- effective dates and source hashes are recorded in audit output
