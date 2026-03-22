#!/usr/bin/env node
/**
 * Fetch authoritative DOJ/UST means-test data and write versioned JSON artifacts.
 *
 * This script is the long-term replacement for patching src/data/meansTestData.ts.
 * It is intentionally conservative: if parsing is incomplete, it should fail closed
 * instead of publishing partial artifacts silently.
 */
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { writeArtifacts } from "./lib/write-artifacts";
import type {
  HousingArtifact,
  MedianIncomeArtifact,
  NationalStandardsArtifact,
  ThresholdsArtifact,
  TransportationArtifact,
} from "../src/datasets/types";

const DOJ_BASE = "https://www.justice.gov/ust/means-testing";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "means-test-calculator/artifact-fetcher" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function parseArgs(argv: string[]) {
  let filingDate = new Date().toISOString().slice(0, 10);
  let outDir = "data/means-test";
  let allowStubbed = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--filing-date" && argv[i + 1]) {
      filingDate = argv[i + 1];
      i += 1;
    } else if (arg === "--out-dir" && argv[i + 1]) {
      outDir = argv[i + 1];
      i += 1;
    } else if (arg === "--allow-stubbed") {
      allowStubbed = true;
    }
  }
  return { filingDate, outDir, allowStubbed };
}

async function detectEffectiveDate(): Promise<{ dateStr: string; isoDate: string; label: string; baseUrl: string }> {
  const html = await fetchText(DOJ_BASE);
  const matches = [...html.matchAll(/\/ust\/eo\/bapcpa\/(\d{8})\/bci_data/g)].map((m) => m[1]);
  if (matches.length === 0) throw new Error("Could not detect effective date from DOJ/UST page");
  const dateStr = [...new Set(matches)].sort().reverse()[0];
  const isoDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  const labelMatch = html.match(/Cases Filed On or After[^<"]{5,80}/i);
  const label = labelMatch ? labelMatch[0].trim() : `Cases Filed On or After ${isoDate}`;
  return { dateStr, isoDate, label, baseUrl: `https://www.justice.gov/ust/eo/bapcpa/${dateStr}/bci_data` };
}

async function buildMedianIncomeArtifact(baseUrl: string, effectiveDate: string, label: string): Promise<MedianIncomeArtifact> {
  const url = `${baseUrl}/median_income_table.htm`;
  const html = await fetchText(url);
  return {
    kind: "median_income",
    effective_date: effectiveDate,
    source_url: url,
    source_hash: sha256(html),
    fetched_at: new Date().toISOString(),
    coverage: label,
    warnings: ["Parser implementation pending: replace placeholder with strict row extraction before production publish."],
    increment_over_4: 11100,
    data: {},
  };
}

async function buildNationalStandardsArtifact(baseUrl: string, effectiveDate: string): Promise<NationalStandardsArtifact> {
  const url = `${baseUrl}/national_expense_standards.htm`;
  const html = await fetchText(url);
  return {
    kind: "national_standards",
    effective_date: effectiveDate,
    source_url: url,
    source_hash: sha256(html),
    fetched_at: new Date().toISOString(),
    coverage: "national",
    warnings: ["Parser implementation pending: replace placeholder with strict table extraction before production publish."],
    food_clothing: {},
    food_clothing_increment_over_4: 275,
    healthcare_under_65: 84,
    healthcare_65_and_over: 149,
    telecom_allowance: 195,
  };
}

async function buildTransportationArtifact(baseUrl: string, effectiveDate: string): Promise<TransportationArtifact> {
  const url = `${baseUrl}/transportstandards.htm`;
  const html = await fetchText(url);
  return {
    kind: "transportation",
    effective_date: effectiveDate,
    source_url: url,
    source_hash: sha256(html),
    fetched_at: new Date().toISOString(),
    coverage: "national + regional + MSA",
    warnings: ["Parser implementation pending: replace placeholder with strict transport extraction before production publish."],
    ownership_1_car: 662,
    ownership_2_car: 1324,
    public_transport: 244,
    regions: {},
  };
}

async function buildHousingArtifact(baseUrl: string, effectiveDate: string): Promise<HousingArtifact> {
  const url = `${baseUrl}/housing_charts/`;
  return {
    kind: "housing",
    effective_date: effectiveDate,
    source_url: url,
    fetched_at: new Date().toISOString(),
    coverage: "nationwide county/state housing charts",
    warnings: ["Parser implementation pending: replace placeholder with strict county-level housing extraction before production publish."],
    state_defaults: {},
    msa_overrides: [],
  };
}

function buildThresholdsArtifact(effectiveDate: string): ThresholdsArtifact {
  return {
    kind: "thresholds",
    effective_date: effectiveDate,
    source_url: DOJ_BASE,
    fetched_at: new Date().toISOString(),
    coverage: "707(b)(2) thresholds",
    warnings: ["Source-specific threshold extraction still pending; verify values before production publish."],
    abuse_threshold_low: 9075,
    abuse_threshold_high: 15150,
    admin_expense_multiplier: 0.1,
  };
}

function validateArtifacts(
  medianIncome: MedianIncomeArtifact,
  nationalStandards: NationalStandardsArtifact,
  transportation: TransportationArtifact,
  housing: HousingArtifact,
  allowStubbed: boolean,
) {
  const problems: string[] = [];
  if (Object.keys(medianIncome.data).length < 40) problems.push("median income artifact coverage incomplete");
  if (Object.keys(nationalStandards.food_clothing).length < 4) problems.push("national standards artifact incomplete");
  if (Object.keys(transportation.regions).length < 1) problems.push("transportation artifact incomplete");
  if (Object.keys(housing.state_defaults).length < 40) problems.push("housing artifact incomplete");
  if (problems.length > 0 && !allowStubbed) {
    throw new Error(`Refusing to publish incomplete artifacts: ${problems.join("; ")}`);
  }
  return problems;
}

async function main() {
  const { filingDate, outDir, allowStubbed } = parseArgs(process.argv.slice(2));
  const detected = await detectEffectiveDate();

  const medianIncome = await buildMedianIncomeArtifact(detected.baseUrl, detected.isoDate, detected.label);
  const nationalStandards = await buildNationalStandardsArtifact(detected.baseUrl, detected.isoDate);
  const transportation = await buildTransportationArtifact(detected.baseUrl, detected.isoDate);
  const housing = await buildHousingArtifact(detected.baseUrl, detected.isoDate);
  const thresholds = buildThresholdsArtifact(detected.isoDate);

  const problems = validateArtifacts(medianIncome, nationalStandards, transportation, housing, allowStubbed);

  writeArtifacts(resolve(process.cwd(), outDir), {
    filingDate,
    medianIncome,
    nationalStandards,
    transportation,
    housing,
    thresholds,
  });

  process.stdout.write(JSON.stringify({
    ok: true,
    filingDate,
    outDir,
    effectiveDate: detected.isoDate,
    warnings: problems,
  }, null, 2) + "\n");
}

main().catch((error) => {
  process.stderr.write(JSON.stringify({
    ok: false,
    message: error instanceof Error ? error.message : String(error),
  }, null, 2) + "\n");
  process.exit(1);
});
