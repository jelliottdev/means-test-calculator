# means-test-calculator

Chapter 7 bankruptcy means test calculator. Implements the full 122A-1 and 122A-2 analysis per DOJ/UST standards.

Built as a standalone proof-of-concept for integration into VeriDocket.

---

## What it does

- **Part 1 (122A-1):** CMI vs state median comparison
- **Part 2 (122A-2):** Above-median allowed expense deductions
- **Exemptions:** Business debt, disabled veteran, active reservist
- **Threshold analysis:** §707(b)(2) low/high + 25% unsecured debt rule
- **Deduction line items:** National / local / actual — tagged by source and form line

## Data (Cases Filed On or After Nov 1, 2025)

| Dataset | Status |
|---|---|
| State Median Income (50 states + DC + territories) | ✅ Full |
| IRS National Standards (Food/Clothing) | ✅ Full |
| IRS Healthcare Standards | ✅ Full |
| IRS Local Transport — all 4 regions + 20 MSAs | ✅ Full |
| IRS Local Housing & Utilities | ⚠️ Stubbed (state averages) |
| Admin Expense Multipliers | 🔜 Planned |

### Housing stub
Replace `getHousingAllowance()` in `src/data/meansTestData.ts` with the real IRS county table (XLSX from justice.gov/ust/means-testing).

## Update Schedule

DOJ publishes new data ~May 15 and ~November 1 each year. URL pattern:
```
https://www.justice.gov/ust/eo/bapcpa/{YYYYMMDD}/bci_data/median_income_table.htm
```

## Stack
React + TypeScript (Vite) · Tailwind CSS v4 · Zero runtime deps beyond React

## Getting Started
```bash
npm install
npm run dev
```

## Structure
```
src/
├── data/meansTestData.ts    # All DOJ/IRS seed data + lookup helpers
├── engine/meansTest.ts      # Core 122A-1 + 122A-2 calculation logic
└── App.tsx                  # Form + results UI
```

## VeriDocket Integration

The engine is UI-decoupled. To integrate:
1. Import `runMeansTest(input)` from `src/engine/meansTest.ts`
2. Map extracted intake data to `MeansTestInput`
3. Feed `result` output to the 122A-1/122A-2 PDF form-fill pipeline

## Disclaimer
For informational purposes only. Not legal advice. Housing uses approximate state averages — replace with IRS county-level data before production use.
