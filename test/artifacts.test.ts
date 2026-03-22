import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getEmbeddedDatasetBundle } from "../src/datasets/embedded";
import { FileDatasetResolver } from "../src/datasets/fileResolver";
import { writeArtifacts } from "../scripts/lib/write-artifacts";
import { validateDatasetBundle } from "../scripts/lib/validate-artifacts";
import { validatePublicationReadiness } from "../scripts/lib/validate-publication";

test("generated artifacts round-trip through the file resolver and carry snapshot hashes", () => {
  const root = mkdtempSync(join(tmpdir(), "means-test-artifacts-"));
  const filingDate = "2026-04-01";
  const bundle = getEmbeddedDatasetBundle(filingDate);

  writeArtifacts(root, {
    filingDate,
    medianIncome: bundle.median_income,
    nationalStandards: bundle.national_standards,
    transportation: bundle.transportation,
    housing: bundle.housing,
    thresholds: bundle.thresholds,
  });

  const resolved = new FileDatasetResolver(root).resolve(filingDate);
  const validation = validateDatasetBundle(resolved);
  const publication = validatePublicationReadiness(resolved);

  assert.equal(validation.ok, true);
  assert.equal(publication.ready, true);
  assert.equal(resolved.median_income.source_hash?.startsWith("embedded-snapshot:"), true);
  assert.equal(resolved.national_standards.source_hash?.startsWith("embedded-snapshot:"), true);
  assert.equal(resolved.transportation.source_hash?.startsWith("embedded-snapshot:"), true);
  assert.equal(resolved.thresholds.source_hash?.startsWith("embedded-snapshot:"), true);
  assert.deepEqual(
    publication.soft_warnings.filter((warning) => warning.includes("missing source_hash")),
    []
  );
});
