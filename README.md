# means-test-calculator

Chapter 7 bankruptcy means test calculator. Implements the complete 122A-1 and 122A-2 analysis per DOJ/UST standards effective November 1, 2025.

Built as a standalone tool for integration into VeriDocket.

---

## What it does

- **Form 122A-1:** CMI vs. state median comparison — automatic pass if below median
- **Form 122A-2:** Full above-median allowed expense deductions (all lines)
- **Exemptions:** Disabled veteran, active reservist, primarily business debts
- **Threshold analysis:** §707(b)(2) — low/high thresholds + 25% unsecured debt rule
- **Outcomes:** EXEMPT / BELOW_MEDIAN / PASS / FAIL / BORDERLINE

---

## Data status (Cases Filed On or After November 1, 2025)

| Dataset | Status | Coverage |
|---|---|---|
| State Median Income | ✅ Complete | All 50 states + DC, 4 household sizes, $11,100/person increment over 4 |
| IRS National Standards — Food & Clothing | ✅ Complete | Lines 6, household sizes 1–4+ |
| IRS National Standards — Healthcare | ✅ Complete | Line 7, under-65 ($84) and 65+ ($149) per person |
| IRS National Standards — Telecom | ✅ Complete | Line 22, $195/mo IRS cap |
| IRS Local Standards — Transportation | ✅ Complete | Lines 12–14, 4 regions + 20 MSAs with county lists |
| IRS Local Standards — Housing & Utilities | ✅ Complete | Lines 8a/8b, all 50 states + DC; 23 MSA overrides for major metros |
| §707(b)(2) Abuse Thresholds | ✅ Complete | Low $9,075 / High $15,150 (60-month) |
| Chapter 13 Admin Expense Multiplier | ✅ Complete | Line 27, 10% of priority debt payments |

**Housing data note:** State-level values are statewide averages from IRS Local Standards. County-specific values exist for thousands of counties — run `npm run update-data` to fetch the latest official county-level data from justice.gov/ust.

---

## Form 122A-2 deduction lines implemented

| Line | Deduction | Source |
|------|-----------|--------|
| 6 | Food, clothing & other items | National standard |
| 7 | Out-of-pocket healthcare | National standard (age-adjusted) |
| 8a | Housing — non-mortgage expenses (utilities) | IRS local standard |
| 8b | Housing — mortgage/rent cap | IRS local standard |
| 12 | Vehicle operating costs | IRS local standard (regional + MSA) |
| 13a | Vehicle ownership/lease costs | IRS local standard |
| 14 | Public transportation (if no vehicle) | National standard |
| 16 | Taxes (payroll + income) | Actual |
| 17 | Involuntary payroll deductions (mandatory retirement, union dues, uniforms) | Actual |
| 18 | Term life insurance premiums | Actual |
| 19 | Employment-related education | Actual |
| 20 | Childcare | Actual |
| 21 | Additional healthcare — chronically ill/disabled (above Line 7) | Actual |
| 22 | Telecommunications (capped at $195 IRS standard) | Actual |
| 24–26 | Priority debt payments (back taxes, support arrears) | Actual |
| 27 | Chapter 13 administrative expenses (10% of priority debts) | Calculated |
| 25a | Health insurance premiums | Actual |
| 25c | Dependent children's education — K-12 | Actual |
| 25d | Special diet / medical food (above Line 6 standard) | Actual |
| 25e | Domestic support obligations | Actual |
| 33 | Other secured debt payments | Actual |

---

## Keeping data current

DOJ/UST publishes updated standards approximately May 15 and November 1 each year.

```bash
# Dry-run: see what changed without updating the file
npm run check-data

# Apply all updates to src/data/meansTestData.ts
npm run update-data

# Update only one section
npm run update-data -- --section medians
npm run update-data -- --section national
npm run update-data -- --section transport
npm run update-data -- --section housing

# Verify the update compiled correctly
npm run build
```

The script (`scripts/fetch-data.ts`) fetches from:
- `justice.gov/ust/means-testing` — auto-detects current effective date
- State median income table
- IRS national expense standards (food, clothing, healthcare, telecom)
- IRS local transportation standards (regional + MSA operating costs)
- IRS housing & utilities charts (per-state, then per-county)

No external npm packages required — uses Node.js 18+ built-in `fetch`.

---

## Getting started

```bash
npm install
npm run dev       # start dev server
npm run build     # TypeScript check + production build
```

---

## Project structure

```
src/
├── data/meansTestData.ts    # All DOJ/IRS constants + lookup helpers
├── engine/meansTest.ts      # 122A-1 + 122A-2 calculation engine
├── App.tsx                  # Form UI + results display
└── index.css                # Styling (Tailwind v4 + custom)
scripts/
└── fetch-data.ts            # Repeatable data collection tool (DOJ/UST)
index.html                   # Vite entry point
```

---

## VeriDocket integration

The engine is fully UI-decoupled:

```ts
import { runMeansTest, type MeansTestInput } from "./src/engine/meansTest";

const result = runMeansTest(input); // MeansTestInput → MeansTestResult
```

Result includes every deduction line item with its form line number for direct 122A-1/122A-2 PDF form-fill mapping.

---

## Stack

React 19 + TypeScript (Vite 8) · Tailwind CSS v4 · Zero runtime dependencies beyond React

---

## Disclaimer

For informational purposes only. Not legal advice. Housing allowances reflect IRS Local Standards (state-level averages, with MSA overrides for 23 major metro areas). Run `npm run update-data` to fetch current county-level data. Verify results with a licensed bankruptcy attorney before filing.
