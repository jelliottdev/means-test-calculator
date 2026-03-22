# Housing Target Model

The housing dataset should end in a county-first structure, not just state defaults.

## Target artifact evolution

Current `HousingArtifact` stores:
- `state_defaults`
- `msa_overrides`

That is enough for the current engine seam, but not enough for a truly authoritative nationwide county lookup.

## Next model

Add a richer internal generation model that keeps:
- state
- county
- non-mortgage / utility amount
- mortgage / rent cap
- source page hash
- source row provenance if possible

Then derive:
- state defaults
- MSA overrides
- county coverage metrics

## Why

The agent should be able to answer:
- which county row was used
- whether a fallback happened
- how much of the state was actually covered by parsed county rows

## Safe path

Do not remove current `HousingArtifact` yet.
Instead:
1. keep current runtime artifact shape
2. build richer generation-time county model
3. derive runtime artifact from that model
4. expose county provenance later in audit metadata
