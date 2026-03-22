#!/usr/bin/env node
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { writeArtifacts } from "./lib/write-artifacts";
import { parseMedianIncomeArtifact } from "./lib/parse-medians";
import { parseNationalStandardsArtifact } from "./lib/parse-national-standards";
import { parseTransportationArtifact } from "./lib/parse-transportation";
import { enrichTransportationWithRegionsV3 } from "./lib/parse-transport-regions-v3";
import { parseHousingArtifactV3 } from "./lib/parse-housing-v3";
import { parseThresholdsArtifactV2 } from "./lib/parse-thresholds-v2";

const DOJ_BASE = "https://www.justice.gov/ust/means-testing";
const STATE_CODES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
];

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "means-test-calculator/strict-artifact-fetcher-v6" },
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

async function fetchHousingPages(baseUrl: string): Promise<{ htmlByState: Record<string, string>; hashByState: Record<string, string> }> {
  const htmlByState: Record<string, string> = {};
  const hashByState: Record<string, string> = {};
  const patterns = [
    (state: string) => `${baseUrl}/housing_charts/${state.toLowerCase()}.htm`,
    (state: string) => `${baseUrl}/housing_charts/${state}.htm`,
    (state: string) => `${baseUrl}/housing_util/${state.toLowerCase()}.htm`,
  ];

  for (const state of STATE_CODES) {
    let html: string | null = null;
    for (const makeUrl of patterns) {
      try {
        html = await fetchText(makeUrl(state));
        break;
      } catch {
        // try next pattern
      }
    }
    if (html) {
      htmlByState[state] = html;
      hashByState[state] = sha256(html);
    }
  }

  return { htmlByState, hashByState };
}

async function main() {
  const { filingDate, outDir, allowStubbed } = parseArgs(process.argv.slice(2));
  const detected = await detectEffectiveDate();
  const now = new Date().toISOString();

  const medianUrl = `${detected.baseUrl}/median_income_table.htm`;
  const medianHtml = await fetchText(medianUrl);
  const medianIncome = parseMedianIncomeArtifact({
    html: medianHtml,
    sourceUrl: medianUrl,
    effectiveDate: detected.isoDate,
    coverageLabel: detected.label,
    sourceHash: sha256(medianHtml),
    fetchedAt: now,
  });

  const nationalUrl = `${detected.baseUrl}/national_expense_standards.htm`;
  const nationalHtml = await fetchText(nationalUrl);
  const nationalStandards = parseNationalStandardsArtifact({
    html: nationalHtml,
    sourceUrl: nationalUrl,
    effectiveDate: detected.isoDate,
    sourceHash: sha256(nationalHtml),
    fetchedAt: now,
  });

  const transportUrl = `${detected.baseUrl}/transportstandards.htm`;
  const transportHtml = await fetchText(transportUrl);
  const transportBase = parseTransportationArtifact({
    html: transportHtml,
    sourceUrl: transportUrl,
    effectiveDate: detected.isoDate,
    sourceHash: sha256(transportHtml),
    fetchedAt: now,
  });
  const transportation = enrichTransportationWithRegionsV3(transportHtml, transportBase);

  const { htmlByState, hashByState } = await fetchHousingPages(detected.baseUrl);
  const housing = parseHousingArtifactV3({
    htmlByState,
    sourceBaseUrl: `${detected.baseUrl}/housing_charts/`,
    effectiveDate: detected.isoDate,
    fetchedAt: now,
    sourceHashByState: hashByState,
  });

  const dojHtml = await fetchText(DOJ_BASE);
  const thresholds = parseThresholdsArtifactV2({
    html: dojHtml,
    sourceUrl: DOJ_BASE,
    effectiveDate: detected.isoDate,
    sourceHash: sha256(dojHtml),
    fetchedAt: now,
  });

  const warnings: string[] = [];
  if (Object.keys(transportation.regions).length < 4) warnings.push("transportation v6 regional/MSA extraction incomplete");
  if ((housing.msa_overrides?.length ?? 0) === 0) warnings.push("housing v6 derived no MSA-like overrides");
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
    housingStatesFetched: Object.keys(htmlByState).length,
    transportRegions: Object.keys(transportation.regions).length,
    housingOverrides: housing.msa_overrides?.length ?? 0,
  }, null, 2) + "\n");
}

main().catch((error) => {
  process.stderr.write(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : String(error) }, null, 2) + "\n");
  process.exit(1);
});
