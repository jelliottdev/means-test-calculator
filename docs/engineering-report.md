# Bankruptcy Means Test Calculator Engineering Report

## Purpose

This document captures a best-in-class engineering target for this repository. It is intentionally broader than the code that exists today: it describes the legal, data-governance, auditability, and product-workflow controls required for an attorney-grade bankruptcy means test calculator.

Where this report describes capabilities that are not yet implemented in the repository, treat them as roadmap guidance rather than current-state claims.

## Executive summary

A bankruptcy means test calculator is not just a worksheet. It is a rules engine whose outputs can affect presumptions of abuse, Chapter 13 plan duration, and attorney review workflows. The core computational spine is statutory: Current Monthly Income (CMI) uses a six-month lookback window, then feeds distinct decision paths for Chapter 7 and Chapter 13.

The biggest engineering risks are:

- table and version correctness for median-income tables, IRS standards, and inflation-adjusted thresholds;
- jurisdiction resolution for state, county, and MSA-based Local Standards;
- forward-looking adjustments recognized in case law, especially for Chapter 13; and
- auditability for attorney review and court scrutiny.

The strongest architectural pattern for this repository is already visible in the current codebase: treat legal datasets as immutable, versioned artifacts selected by filing date rather than by whatever is "latest" at runtime.

## Findings from the current repository

The existing repository is most valuable as an engineering pattern library for compliance-grade means-test data handling.

### Artifact-first data governance

The repository already emphasizes an official fetch-to-artifacts workflow:

- fetch official source material;
- convert it into versioned artifacts;
- validate completeness and publication readiness; and
- fail closed when parsing or coverage is incomplete.

That posture is the right default for a legal workflow. Partial or silently degraded parsing is more dangerous here than a hard failure.

### Filing-date-aware dataset resolution

The repository also includes manifest-backed dataset resolution keyed to filing date. That is the correct operating model because median-income tables, IRS standards, and abuse thresholds do not always change in sync.

A legally defensible calculator should resolve all datasets by filing date and refuse unsupported dates with a clear reason.

### Audit and publication controls

The production-oriented docs in this repository already point in the right direction:

- publication-readiness checks;
- provenance output;
- coverage validation; and
- explicit recording of effective dates in downstream artifacts.

Those controls should remain mandatory as the project evolves.

## Best-in-class product requirements

A best-in-class calculator should expose two product surfaces backed by the same rules engine:

### 1. Attorney/professional mode

This mode should provide:

- line-by-line transparency mapped to the official forms;
- dataset provenance and effective-date disclosure;
- attachment references and review notes;
- diffing between runs; and
- exportable audit packets.

### 2. Consumer mode

This mode should provide:

- guided intake;
- simplified terminology;
- aggressive validation;
- plain-language warnings; and
- the same filing-date dataset binding used in professional mode.

## Core engineering recommendations

### Version legal datasets as immutable artifacts

Every legal dataset should be keyed by effective date and resolved by filing date.

At minimum, artifact bundles should separate:

- state median income;
- IRS National Standards;
- IRS Local Housing and Utilities;
- IRS Local Transportation;
- Chapter 7 threshold amounts; and
- any administrative multipliers or form-version metadata.

### Fail closed on incomplete parsing

The artifact pipeline should reject publication when:

- required source documents are missing;
- parser confidence is below threshold;
- geography coverage is incomplete;
- source provenance is missing; or
- the bundle contains mixed effective dates that exceed the requested filing date.

### Preserve line-level explainability

The calculation engine should expose a line-by-line computation model that:

- maps directly to official form line identifiers;
- stores intermediate values;
- records assumptions and fallbacks;
- preserves rounding boundaries; and
- emits reviewer-friendly trace output.

### Separate mechanical outputs from forward-looking overlays

The tool should distinguish between:

1. the mechanical official-form result; and
2. practitioner overlays for known or virtually certain future changes.

That distinction matters most in Chapter 13, where projected disposable income analysis may depart from the historical average used for CMI.

## Functional requirements

### Required case metadata

The calculator should bind every run to:

- filing date;
- chapter selection;
- state;
- county;
- MSA or transportation region where applicable;
- household size; and
- marital / spouse-filing status.

### Required income model

Income should be stored as received-date events, not just normalized monthly estimates.

The engine should support:

- wages and salary;
- bonuses, commissions, and overtime;
- self-employment receipts and ordinary business expenses;
- unemployment, pensions, and annuities;
- child support and alimony;
- regular household contributions from others; and
- explicitly excluded categories such as Social Security benefits.

### Required expense and debt model

The calculator should also capture:

- IRS National and Local Standards inputs;
- taxes and payroll deductions;
- health insurance and other actual deductions;
- secured debt payment streams;
- priority debt amounts; and
- special-circumstances narratives with documentation references.

## UX requirements

The UI should make the binding logic visible.

A user should always be able to see:

- filing date;
- the six-month lookback window;
- the effective date of every bound dataset; and
- whether any fallback or grouped geography rule was used.

All auto-derived values should be explainable and overrideable with a note.

## Edge-case policy

### High-variance income

The engine should compute mechanical CMI strictly from the statutory lookback period, then optionally layer on analytics such as trend, variance, and practitioner notes.

### Recent job loss or expected income change

The baseline form computation should remain mechanical. Any forward-looking adjustment should be shown separately as a reviewer-facing scenario or projected-disposable-income overlay.

### Jurisdiction-sensitive deductions

The calculator should support jurisdiction notes or toggles for litigated items. Where a deduction is disputed across courts, the system should default to a conservative posture and clearly disclose the rule being applied.

### Geography anomalies

County, county-equivalent, MSA, and grouped-region mappings should be versioned and auditable. Ambiguous mappings should be treated as review-required, not silently accepted.

## Testing strategy

A practitioner-grade calculator should include four test layers.

### 1. Unit tests for line functions

Each line-level function should be deterministic, typed, and independently testable.

### 2. Golden regression tests

The project should keep canonical scenario outputs keyed to filing date and dataset bundle.

### 3. Dataset validation tests

Artifact publication should be gated by:

- schema checks;
- provenance checks;
- geography coverage checks; and
- publication-readiness validation.

### 4. Cross-check fixtures

When official examples exist, they should be encoded as fixtures. Otherwise, the project should build a library of attorney-reviewed fact patterns.

## Security and privacy posture

A means test calculator handles highly sensitive financial and household data. For attorney workflows, the system should assume confidentiality and privilege concerns from the start.

Recommended defaults:

- minimum-necessary data retention;
- encryption at rest and in transit;
- least-privilege role-based access;
- immutable audit logs with PII minimization;
- controlled export behavior; and
- documented breach-response procedures.

## Recommended implementation sequence

To move this repository toward the standard described above, the highest-value sequence is:

1. complete authoritative parsers for all required dataset components;
2. make filing-date-aware artifact resolution the default across all surfaces;
3. preserve raw-source provenance and hashes end to end;
4. add attorney-reviewed golden scenario fixtures;
5. expand line-level audit output into a full review packet; and
6. add continuous source-drift monitoring for update cycles.

## Relationship to existing repository docs

This report complements, and does not replace, the existing project documentation:

- `docs/best-in-class-roadmap.md` provides a concise gap analysis;
- `docs/remaining-work.md` tracks implementation work still open in this repository;
- `docs/production-cutover.md` describes deployment-time compliance controls; and
- `docs/dataset-resolver.md` explains the filing-date artifact binding model.

Use this report as the broad design brief and the other documents as implementation guides.
