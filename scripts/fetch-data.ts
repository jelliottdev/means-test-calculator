#!/usr/bin/env node
/**
 * fetch-data.ts — DOJ/UST Means Test Data Collection Tool
 *
 * Fetches all official means test data from the United States Trustee Program
 * and updates src/data/meansTestData.ts.
 *
 * Usage:
 *   npx tsx scripts/fetch-data.ts              # fetch all, update file
 *   npx tsx scripts/fetch-data.ts --check      # dry-run, show changes only
 *   npx tsx scripts/fetch-data.ts --section medians
 *   npx tsx scripts/fetch-data.ts --section national
 *   npx tsx scripts/fetch-data.ts --section transport
 *   npx tsx scripts/fetch-data.ts --section housing
 *
 * Data sources (all public, no auth required):
 *   https://www.justice.gov/ust/means-testing
 *   https://www.justice.gov/ust/eo/bapcpa/{date}/bci_data/median_income_table.htm
 *   https://www.justice.gov/ust/eo/bapcpa/{date}/bci_data/national_expense_standards.htm
 *   https://www.justice.gov/ust/eo/bapcpa/{date}/bci_data/transportstandards.htm
 *   https://www.justice.gov/ust/eo/bapcpa/{date}/bci_data/housing_charts/{STATE}.htm
 *
 * Update schedule: DOJ publishes new data ~May 15 and ~November 1 each year.
 *
 * Requirements: Node.js 18+ (uses built-in fetch)
 * No external npm packages required.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_FILE = resolve(ROOT, "src/data/meansTestData.ts");

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--check");
const SECTION = (() => {
  const idx = args.indexOf("--section");
  return idx >= 0 ? args[idx + 1] : "all";
})();

// ── Logging ───────────────────────────────────────────────────────────────────
const log = (msg: string) => process.stdout.write(msg + "\n");
const warn = (msg: string) => process.stderr.write("[WARN] " + msg + "\n");
const err = (msg: string) => { process.stderr.write("[ERR]  " + msg + "\n"); process.exit(1); };

// ── HTTP fetch with retries ───────────────────────────────────────────────────
async function fetchText(url: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      log(`  GET ${url}`);
      const res = await fetch(url, {
        headers: { "User-Agent": "means-test-calculator/2.0 data-update-script" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.text();
    } catch (e) {
      if (attempt === retries) throw e;
      const delay = attempt * 2000;
      warn(`Attempt ${attempt} failed: ${(e as Error).message}. Retrying in ${delay / 1000}s…`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

// ── HTML parsing helpers ──────────────────────────────────────────────────────

/** Extract all <td> text values from an HTML table row */
function parseRow(row: string): string[] {
  return [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m =>
    m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim()
  );
}

/** Strip $ , and whitespace then parse integer */
function parseDollar(s: string): number {
  return parseInt(s.replace(/[\$,\s]/g, ""), 10) || 0;
}

/** Extract all table rows from HTML */
function tableRows(html: string): string[] {
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => m[1]);
}

// ── Step 1: Detect current effective date ────────────────────────────────────

interface EffectiveDateInfo {
  dateStr: string;       // e.g. "20251101"
  isoDate: string;       // e.g. "2025-11-01"
  label: string;         // human-readable period label
  baseUrl: string;       // https://www.justice.gov/ust/eo/bapcpa/20251101/bci_data
}

async function detectEffectiveDate(): Promise<EffectiveDateInfo> {
  log("\n[1/5] Detecting current effective date from DOJ/UST…");
  const html = await fetchText("https://www.justice.gov/ust/means-testing");

  // Pattern: links to /ust/eo/bapcpa/YYYYMMDD/bci_data/...
  const dateMatches = [...html.matchAll(/\/ust\/eo\/bapcpa\/(\d{8})\/bci_data/g)];
  if (dateMatches.length === 0) {
    err("Could not detect effective date from justice.gov/ust/means-testing. Page structure may have changed.");
  }

  // Use the most recent date found (sort descending)
  const dates = [...new Set(dateMatches.map(m => m[1]))].sort().reverse();
  const dateStr = dates[0];
  const isoDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;

  // Try to parse the label ("Cases Filed On or After…")
  const labelMatch = html.match(/Cases Filed On or After[^<"]{5,60}/i);
  const label = labelMatch ? labelMatch[0].trim() : `Cases Filed On or After ${isoDate}`;

  const baseUrl = `https://www.justice.gov/ust/eo/bapcpa/${dateStr}/bci_data`;
  log(`  Detected: ${isoDate} — "${label}"`);
  log(`  Base URL: ${baseUrl}`);

  return { dateStr, isoDate, label, baseUrl };
}

// ── Step 2: State median income ───────────────────────────────────────────────

interface StateMedianData {
  medians: Record<string, [number, number, number, number]>;
  incrementOver4: number;
}

async function fetchStateMedians(baseUrl: string): Promise<StateMedianData> {
  log("\n[2/5] Fetching state median income table…");
  const html = await fetchText(`${baseUrl}/median_income_table.htm`);

  const STATE_ABBREVS: Record<string, string> = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "District of Columbia": "DC", "Florida": "FL", "Georgia": "GA", "Hawaii": "HI",
    "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
    "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME",
    "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
    "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE",
    "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
    "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
    "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI",
    "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX",
    "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
    "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
  };

  const medians: Record<string, [number, number, number, number]> = {};
  let incrementOver4 = 11100; // default if not found

  for (const row of tableRows(html)) {
    const cells = parseRow(row);
    if (cells.length < 5) continue;

    const stateName = cells[0].replace(/\*/g, "").trim();
    const abbr = STATE_ABBREVS[stateName];
    if (!abbr) continue;

    const vals: [number, number, number, number] = [
      parseDollar(cells[1]),
      parseDollar(cells[2]),
      parseDollar(cells[3]),
      parseDollar(cells[4]),
    ];
    if (vals.every(v => v > 0)) {
      medians[abbr] = vals;
    }
  }

  // Try to parse per-person increment for HH > 4
  const incrementMatch = html.match(/\$?([\d,]+)\s*(?:per person|for each additional)/i);
  if (incrementMatch) {
    incrementOver4 = parseDollar(incrementMatch[1]);
  }

  log(`  Parsed ${Object.keys(medians).length} states. Per-person increment over 4: $${incrementOver4}`);
  return { medians, incrementOver4 };
}

// ── Step 3: National expense standards ───────────────────────────────────────

interface NationalStandardsData {
  foodClothing: Record<number, number>;
  foodClothingPerPersonOver4: number;
  healthcareUnder65: number;
  healthcare65Plus: number;
  telecomAllowance: number;
}

async function fetchNationalStandards(baseUrl: string): Promise<NationalStandardsData> {
  log("\n[3/5] Fetching IRS national expense standards…");
  const html = await fetchText(`${baseUrl}/national_expense_standards.htm`);

  const foodClothing: Record<number, number> = {};
  let foodClothingPerPersonOver4 = 275;
  let healthcareUnder65 = 84;
  let healthcare65Plus = 149;
  let telecomAllowance = 195;

  // Food & clothing table: rows have household size + amounts
  for (const row of tableRows(html)) {
    const cells = parseRow(row);
    if (cells.length < 2) continue;

    // Look for rows like "1 Person | $545" or "One Person | $545"
    const sizeMatch = cells[0].match(/(\d+)\s*(?:person|people)/i) ||
                      cells[0].match(/^(one|two|three|four)/i);
    if (sizeMatch) {
      const sizeMap: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };
      const size = parseInt(sizeMatch[1]) || sizeMap[sizeMatch[1]?.toLowerCase()] || 0;
      if (size >= 1 && size <= 4) {
        const amount = parseDollar(cells[1]);
        if (amount > 0) foodClothing[size] = amount;
      }
      // "Additional person" increment
      if (/additional/i.test(cells[0])) {
        const inc = parseDollar(cells[1]);
        if (inc > 0) foodClothingPerPersonOver4 = inc;
      }
    }

    // Healthcare: look for "Under 65" and "65 and over" rows
    if (/under\s*65/i.test(cells[0])) {
      const v = parseDollar(cells[1]);
      if (v > 0) healthcareUnder65 = v;
    }
    if (/65\s*and\s*over|65\s*or\s*older/i.test(cells[0])) {
      const v = parseDollar(cells[1]);
      if (v > 0) healthcare65Plus = v;
    }

    // Telecom
    if (/telecom|telephone|internet/i.test(cells[0])) {
      const v = parseDollar(cells[1]);
      if (v > 0) telecomAllowance = v;
    }
  }

  log(`  Food & clothing: ${JSON.stringify(foodClothing)}, +$${foodClothingPerPersonOver4}/person over 4`);
  log(`  Healthcare: under-65=$${healthcareUnder65}, 65+=$${healthcare65Plus}`);
  log(`  Telecom: $${telecomAllowance}`);

  return { foodClothing, foodClothingPerPersonOver4, healthcareUnder65, healthcare65Plus, telecomAllowance };
}

// ── Step 4: Transportation standards ─────────────────────────────────────────

interface TransportData {
  ownership1Car: number;
  ownership2Car: number;
  publicTransit: number;
  // Parsing regional/MSA operating costs from existing structure is complex;
  // transport page structure varies — we capture ownership/public transit and
  // flag when the regional costs table changes.
  rawHtml: string;
}

async function fetchTransportStandards(baseUrl: string): Promise<TransportData> {
  log("\n[4/5] Fetching IRS local transportation standards…");
  const html = await fetchText(`${baseUrl}/transportstandards.htm`);

  let ownership1Car = 662;
  let ownership2Car = 1324;
  let publicTransit = 244;

  for (const row of tableRows(html)) {
    const cells = parseRow(row);
    if (cells.length < 2) continue;

    // Ownership costs
    if (/ownership.*one|one.*vehicle|1.*vehicle/i.test(cells[0])) {
      const v = parseDollar(cells[1]);
      if (v > 0) ownership1Car = v;
    }
    if (/ownership.*two|two.*vehicle|2.*vehicle/i.test(cells[0])) {
      const v = parseDollar(cells[1]);
      if (v > 0) ownership2Car = v;
    }
    // Public transit
    if (/public\s+transit|no\s+vehicle|public\s+transportation/i.test(cells[0])) {
      const v = parseDollar(cells[1]);
      if (v > 0) publicTransit = v;
    }
  }

  log(`  Ownership: 1 car=$${ownership1Car}, 2 cars=$${ownership2Car}`);
  log(`  Public transit: $${publicTransit}`);

  return { ownership1Car, ownership2Car, publicTransit, rawHtml: html };
}

// ── Step 5: Housing standards ─────────────────────────────────────────────────

interface StateHousingData {
  utility: [number, number, number, number, number];   // [1p, 2p, 3p, 4p, 5+p]
  mortgage: [number, number, number, number, number];
}

async function fetchHousingStandards(
  baseUrl: string
): Promise<Record<string, StateHousingData>> {
  log("\n[5/5] Fetching IRS housing & utilities local standards…");

  const STATE_CODES = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
    "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
    "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
    "VT","VA","WA","WV","WI","WY",
  ];

  const results: Record<string, StateHousingData> = {};
  let fetched = 0;
  let failed = 0;

  // Try both common URL patterns DOJ uses
  const urlPatterns = [
    (state: string) => `${baseUrl}/housing_charts/${state.toLowerCase()}.htm`,
    (state: string) => `${baseUrl}/housing_charts/${state}.htm`,
    (state: string) => `${baseUrl}/housing_util/${state.toLowerCase()}.htm`,
  ];

  for (const state of STATE_CODES) {
    let html: string | null = null;

    for (const pattern of urlPatterns) {
      try {
        html = await fetchText(pattern(state));
        break;
      } catch {
        // try next pattern
      }
    }

    if (!html) {
      warn(`  Could not fetch housing data for ${state} — will use embedded defaults`);
      failed++;
      continue;
    }

    // Parse housing table rows
    // Columns vary by state but typical: County | 1-2 persons | 3 persons | 4 persons | 5+ persons | Utilities
    // We need both mortgage/rent AND utility components
    // Some pages have separate tables for each; others combine them.
    const rows = tableRows(html);
    let stateUtility = 0;
    let stateMortgage = 0;
    let stateCount = 0;

    for (const row of rows) {
      const cells = parseRow(row);
      if (cells.length < 3) continue;

      // Skip header rows
      if (/county|state|area|jurisdiction/i.test(cells[0])) continue;

      // Try to identify utility vs. mortgage columns
      // DOJ housing charts typically have: County, Non-Mortgage (utility), Mortgage
      // or combined: County, 1-2p, 3p, 4p, 5+p (with separate utility section)
      if (cells.length >= 3) {
        const utility = parseDollar(cells[cells.length - 1]); // last column often utilities
        const mortgage = parseDollar(cells[1]); // second column often mortgage/rent

        if (utility > 100 && utility < 2000 && mortgage > 200 && mortgage < 5000) {
          stateUtility += utility;
          stateMortgage += mortgage;
          stateCount++;
        }
      }
    }

    if (stateCount > 0) {
      const avgUtility = Math.round(stateUtility / stateCount);
      const avgMortgage = Math.round(stateMortgage / stateCount);

      // Build household-size scaled values
      const u1 = avgUtility;
      const m1 = avgMortgage;
      results[state] = {
        utility: [u1, Math.round(u1*1.17), Math.round(u1*1.31), Math.round(u1*1.44), Math.round(u1*1.56)],
        mortgage: [m1, Math.round(m1*1.17), Math.round(m1*1.31), Math.round(m1*1.44), Math.round(m1*1.56)],
      };
      fetched++;
      log(`  ${state}: utility=$${avgUtility}/mo, mortgage cap=$${avgMortgage}/mo (avg of ${stateCount} areas)`);
    } else {
      warn(`  ${state}: could not parse housing table`);
      failed++;
    }
  }

  log(`  Done: ${fetched} states fetched, ${failed} using embedded defaults`);
  return results;
}

// ── Diff helper ───────────────────────────────────────────────────────────────

function diffSummary(current: string, updated: string): string[] {
  const changes: string[] = [];

  // Extract key constants and compare
  const patterns = [
    /export const EFFECTIVE_DATE = "([^"]+)"/,
    /export const INCOME_INCREMENT_PER_PERSON_OVER_4 = (\d+)/,
    /TRANSPORT_OWNERSHIP_1_CAR = (\d+)/,
    /TRANSPORT_OWNERSHIP_2_CAR = (\d+)/,
    /TRANSPORT_PUBLIC = (\d+)/,
    /TELECOM_ALLOWANCE = (\d+)/,
    /HEALTHCARE_STANDARD_UNDER_65 = (\d+)/,
    /HEALTHCARE_STANDARD_65_AND_OVER = (\d+)/,
  ];

  for (const pattern of patterns) {
    const curMatch = current.match(pattern);
    const newMatch = updated.match(pattern);
    if (curMatch && newMatch && curMatch[1] !== newMatch[1]) {
      changes.push(`  ${pattern.source.split("=")[0].trim()}: ${curMatch[1]} → ${newMatch[1]}`);
    }
  }

  // Check median income changes for a few states
  const stateCheck = ["CA", "TX", "NY", "FL", "IL"];
  for (const st of stateCheck) {
    const pattern = new RegExp(`${st}: \\[([\\d, ]+)\\]`);
    const curMatch = current.match(pattern);
    const newMatch = updated.match(pattern);
    if (curMatch && newMatch && curMatch[1] !== newMatch[1]) {
      changes.push(`  STATE_MEDIAN_INCOME[${st}]: [${curMatch[1]}] → [${newMatch[1]}]`);
    }
  }

  return changes;
}

// ── Code generation ───────────────────────────────────────────────────────────

function generateMedianBlock(
  medians: Record<string, [number, number, number, number]>,
  incrementOver4: number
): string {
  const states = Object.keys(medians).sort();
  const rows = states.map(st => {
    const v = medians[st];
    return `  ${st}: [${v.map(n => String(n).padStart(6)).join(", ")}],`;
  });
  return `export const INCOME_INCREMENT_PER_PERSON_OVER_4 = ${incrementOver4}; // annual

export const STATE_MEDIAN_INCOME: Record<string, [number, number, number, number]> = {
  // [1 person, 2 people, 3 people, 4 people]
${rows.join("\n")}
};`;
}

function generateNationalBlock(data: NationalStandardsData): string {
  const fc = data.foodClothing;
  return `// Form 122A-2 Line 6: Food, clothing & other items (bankruptcy standard)
export const NATIONAL_FOOD_CLOTHING: Record<number, number> = {
  1: ${fc[1] ?? 545},
  2: ${fc[2] ?? 977},
  3: ${fc[3] ?? 1164},
  4: ${fc[4] ?? 1443},
};
export const NATIONAL_FOOD_CLOTHING_PER_PERSON_OVER_4 = ${data.foodClothingPerPersonOver4};

// Form 122A-2 Line 7: Out-of-pocket healthcare (per person per month)
export const HEALTHCARE_STANDARD_UNDER_65 = ${data.healthcareUnder65};
export const HEALTHCARE_STANDARD_65_AND_OVER = ${data.healthcare65Plus};

// Form 122A-2 Line 22: Telecommunications (phone, internet, fax)
export const TELECOM_ALLOWANCE = ${data.telecomAllowance};`;
}

function generateTransportOwnershipBlock(data: TransportData): string {
  return `export const TRANSPORT_OWNERSHIP_1_CAR = ${data.ownership1Car};
export const TRANSPORT_OWNERSHIP_2_CAR = ${data.ownership2Car};
export const TRANSPORT_PUBLIC = ${data.publicTransit}; // no vehicle — public transit allowance`;
}

function generateHousingBlock(fetched: Record<string, StateHousingData>): string {
  // The embedded defaults in the data file — if fetch succeeded, override them
  const STATE_CODES = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
    "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
    "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
    "VT","VA","WA","WV","WI","WY",
  ];

  // Embedded defaults (same as hardcoded in meansTestData.ts)
  const EMBEDDED: Record<string, [number, number]> = {
    AL:[362,843],AK:[489,1208],AZ:[424,1092],AR:[319,767],CA:[636,1693],
    CO:[475,1378],CT:[536,1311],DE:[465,1047],DC:[697,1903],FL:[427,1209],
    GA:[377,1059],HI:[680,1815],ID:[388,1024],IL:[441,1134],IN:[377,883],
    IA:[368,887],KS:[371,883],KY:[348,847],LA:[356,849],ME:[413,1007],
    MD:[531,1386],MA:[558,1549],MI:[407,997],MN:[435,1159],MS:[325,733],
    MO:[372,885],MT:[371,1039],NE:[381,897],NV:[435,1083],NH:[507,1249],
    NJ:[580,1438],NM:[354,858],NY:[600,1361],NC:[375,1005],ND:[363,893],
    OH:[392,921],OK:[352,803],OR:[473,1278],PA:[427,1083],RI:[508,1298],
    SC:[369,949],SD:[350,895],TN:[370,965],TX:[403,1066],UT:[444,1145],
    VT:[469,1038],VA:[485,1276],WA:[506,1379],WV:[331,783],WI:[396,965],WY:[357,959],
  };

  const rows: string[] = [];
  for (const st of STATE_CODES) {
    const live = fetched[st];
    if (live) {
      // Use live fetched data
      rows.push(`  ${st}: hh(${live.utility[0]}, ${live.mortgage[0]}),  // live`);
    } else {
      // Fall back to embedded defaults
      const [u, m] = EMBEDDED[st] ?? [400, 950];
      rows.push(`  ${st}: hh(${u}, ${m}),`);
    }
  }

  return `export const HOUSING_STANDARDS: Record<string, HousingStandard> = {\n${rows.join("\n")}\n};`;
}

// ── Patch existing file ───────────────────────────────────────────────────────

function patchFile(
  source: string,
  effectiveDate: EffectiveDateInfo,
  medianData: StateMedianData | null,
  nationalData: NationalStandardsData | null,
  transportData: TransportData | null,
  housingData: Record<string, StateHousingData> | null
): string {
  let out = source;

  // Update effective date + period label
  out = out.replace(
    /export const EFFECTIVE_DATE = "[^"]+";/,
    `export const EFFECTIVE_DATE = "${effectiveDate.isoDate}";`
  );
  out = out.replace(
    /export const PERIOD_LABEL = "[^"]+";/,
    `export const PERIOD_LABEL = "${effectiveDate.label}";`
  );

  if (medianData) {
    // Replace INCOME_INCREMENT + STATE_MEDIAN_INCOME block
    out = out.replace(
      /export const INCOME_INCREMENT_PER_PERSON_OVER_4[\s\S]*?^};/m,
      generateMedianBlock(medianData.medians, medianData.incrementOver4)
    );
  }

  if (nationalData) {
    // Replace food/clothing + healthcare + telecom constants
    out = out.replace(
      /\/\/ Form 122A-2 Line 6[\s\S]*?export const TELECOM_ALLOWANCE = \d+;/,
      generateNationalBlock(nationalData)
    );
  }

  if (transportData) {
    out = out.replace(
      /export const TRANSPORT_OWNERSHIP_1_CAR = \d+;[\s\S]*?export const TRANSPORT_PUBLIC = \d+;[^\n]*/,
      generateTransportOwnershipBlock(transportData)
    );
  }

  if (housingData && Object.keys(housingData).length > 0) {
    // Replace HOUSING_STANDARDS block
    out = out.replace(
      /export const HOUSING_STANDARDS: Record<string, HousingStandard> = \{[\s\S]*?^};/m,
      generateHousingBlock(housingData)
    );
  }

  return out;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log("=".repeat(60));
  log("  DOJ/UST Means Test Data Collector");
  log(`  Mode: ${DRY_RUN ? "CHECK (dry-run)" : "UPDATE"}`);
  log(`  Section: ${SECTION}`);
  log("=".repeat(60));

  // Read current data file
  let currentSource: string;
  try {
    currentSource = readFileSync(DATA_FILE, "utf-8");
  } catch {
    err(`Cannot read data file: ${DATA_FILE}`);
    return;
  }

  // Detect effective date
  let dateInfo: EffectiveDateInfo;
  try {
    dateInfo = await detectEffectiveDate();
  } catch (e) {
    err(`Failed to detect effective date: ${(e as Error).message}`);
    return;
  }

  // Check if already up to date
  const currentDateMatch = currentSource.match(/export const EFFECTIVE_DATE = "([^"]+)"/);
  const currentDate = currentDateMatch?.[1];
  if (currentDate === dateInfo.isoDate && SECTION === "all" && !DRY_RUN) {
    log(`\nData is already current (${currentDate}). Use --check to compare anyway.`);
    return;
  }
  if (currentDate !== dateInfo.isoDate) {
    log(`\n  Update available: ${currentDate} → ${dateInfo.isoDate}`);
  }

  // Fetch each section
  const shouldFetch = (section: string) => SECTION === "all" || SECTION === section;

  let medianData: StateMedianData | null = null;
  let nationalData: NationalStandardsData | null = null;
  let transportData: TransportData | null = null;
  let housingData: Record<string, StateHousingData> | null = null;

  try {
    if (shouldFetch("medians")) {
      medianData = await fetchStateMedians(dateInfo.baseUrl);
    }
  } catch (e) {
    warn(`State medians fetch failed: ${(e as Error).message}`);
  }

  try {
    if (shouldFetch("national")) {
      nationalData = await fetchNationalStandards(dateInfo.baseUrl);
    }
  } catch (e) {
    warn(`National standards fetch failed: ${(e as Error).message}`);
  }

  try {
    if (shouldFetch("transport")) {
      transportData = await fetchTransportStandards(dateInfo.baseUrl);
    }
  } catch (e) {
    warn(`Transport standards fetch failed: ${(e as Error).message}`);
  }

  try {
    if (shouldFetch("housing")) {
      housingData = await fetchHousingStandards(dateInfo.baseUrl);
    }
  } catch (e) {
    warn(`Housing standards fetch failed: ${(e as Error).message}`);
  }

  // Generate updated source
  const updatedSource = patchFile(
    currentSource,
    dateInfo,
    medianData,
    nationalData,
    transportData,
    housingData
  );

  // Show diff summary
  log("\n── Change Summary ─────────────────────────────────────────");
  const changes = diffSummary(currentSource, updatedSource);
  if (changes.length === 0) {
    log("  No changes detected in key constants.");
  } else {
    for (const c of changes) log(c);
  }
  log("──────────────────────────────────────────────────────────");

  if (DRY_RUN) {
    log("\n[DRY RUN] File not modified. Remove --check to apply changes.");
    return;
  }

  // Write updated file
  try {
    writeFileSync(DATA_FILE, updatedSource, "utf-8");
    log(`\nUpdated: ${DATA_FILE}`);
    log("Run 'npm run build' to verify the updated data compiles correctly.");
  } catch (e) {
    err(`Failed to write data file: ${(e as Error).message}`);
  }

  log("\nDone.");
}

main().catch(e => {
  process.stderr.write(`Fatal: ${e.message}\n${e.stack}\n`);
  process.exit(1);
});
