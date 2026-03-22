#!/usr/bin/env node
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { writeArtifacts } from "./lib/write-artifacts";
import { parseMedianIncomeArtifact } from "./lib/parse-medians";
import { parseNationalStandardsArtifact } from "./lib/parse-national-standards";
import { parseTransportationArtifact } from "./lib/parse-transportation";
import type {
  HousingArtifact,
  ThresholdsArtifact,
} from "../src/datasets/types";

const DOJ_BASE = "https://www.justice.gov/ust/means-testing";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "means-test-calculator/strict-artifact-fetcher-v2" },
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

async function buildHousingArtifact(baseUrl: string, effectiveDate: string): Promise<HousingArtifact> {
  return {
    kind: "housing",
    effective_date: effectiveDate,
    source_url: `${baseUrl}/housing_charts/`,
    fetched_at: new Date().toISOString(),
    coverage: "nationwide county/state housing charts",
    warnings: ["Strict housing parser not implemented yet."],
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
    warnings: ["Strict threshold source extraction not implemented yet; values must be validated before production."],
    abuse_threshold_low: 9075,
    abuse_threshold_high: 15150,
    admin_expense_multiplier: 0.1,
  };
}

async function main() {
  const { filingDate, outDir, allowStubbed } = parseArgs(process.argv.slice(2));
  const detected = await detectEffectiveDate();

  const medianUrl = `${detected.baseUrl}/median_income_table.htm`;
  const medianHtml = await fetchText(medianUrl);
  const medianIncome = parseMedianIncomeArtifact({
    html: medianHtml,
    sourceUrl: medianUrl,
    effectiveDate: detected.isoDate,
    coverageLabel: detected.label,
    sourceHash: sha256(medianHtml),
    fetchedAt: new Date().toISOString(),
  });

  const nationalUrl = `${detected.baseUrl}/national_expense_standards.htm`;
  const nationalHtml = await fetchText(nationalUrl);
  const nationalStandards = parseNationalStandardsArtifact({
    html: nationalHtml,
    sourceUrl: nationalUrl,
    effectiveDate: detected.isoDate,
    sourceHash: sha256(nationalHtml),
    fetchedAt: new Date().toISOString(),
  });

  const transportUrl = `${detected.baseUrl}/transportstandards.htm`;
  const transportHtml = await fetchText(transportUrl);
  const transportation = parseTransportationArtifact({
    html: transportHtml,
    sourceUrl: transportUrl,
    effectiveDate: detected.isoDate,
    sourceHash: sha256(transportHtml),
    fetchedAt: new Date().toISOString(),
  });

  const housing = await buildHousingArtifact(detected.baseUrl, detected.isoDate);
  const thresholds = buildThresholdsArtifact(detected.isoDate);

  const warnings: string[] = [];
  if (Object.keys(transportation.regions).length === 0) warnings.push("transportation regional/MSA operating-cost extraction incomplete");
  if (Object.keys(housing.state_defaults).length === 0) warnings.push("housing artifact incomplete");
  if (warnings.length > 0 && !allowStubbed) {
    throw new Error(`Refusing to publish incomplete artifacts: ${warnings.join("; ")}`);
  }

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
    warnings,
  }, null, 2) + "\n");
}

main().catch((error) => {
  process.stderr.write(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : String(error) }, null, 2) + "\n");
  process.exit(1);
});
