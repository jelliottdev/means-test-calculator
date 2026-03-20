import { useState, useEffect, useCallback } from "react";
import { STATE_NAMES, EFFECTIVE_DATE, PERIOD_LABEL, getHousingAllowance } from "./data/meansTestData";
import { runMeansTest, type MeansTestInput, type MeansTestResult } from "./engine/meansTest";
import "./index.css";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const INCOME_TYPES = [
  "Wages/Salary",
  "Self-Employment",
  "Rental Income",
  "Pension/Retirement",
  "Unemployment",
  "Other Income",
];

const SESSION_KEY = "meanstest_v2";

// ── Default State ─────────────────────────────────────────────────────────────

const DEFAULT_INPUT: MeansTestInput = {
  filingDate: new Date().toISOString().split("T")[0],
  state: "",
  county: "",
  householdSize: 1,
  isJointFiling: false,
  incomeSources: [{ type: "Wages/Salary", monthlyAmount: 0 }],
  primaryOver65: false,
  spouseOver65: false,
  numVehicles: 1,
  hasCarPayment: false,
  monthlyCarPayment: 0,
  monthlyMortgageRent: 0,
  monthlyTaxes: 0,
  monthlyInvoluntaryDeductions: 0,
  monthlyTermLifeInsurance: 0,
  monthlyEducationEmployment: 0,
  monthlyTelecom: 0,
  monthlyHealthInsurance: 0,
  monthlyChildcare: 0,
  monthlyChronicHealthcare: 0,
  monthlyDependentChildEducation: 0,
  monthlySpecialDietFood: 0,
  monthlySupportObligations: 0,
  monthlyPriorityDebts: 0,
  monthlyOtherSecuredDebt: 0,
  totalUnsecuredDebt: 0,
  debtType: "consumer",
  isDisabledVeteran: false,
  isActiveReservist: false,
};

// ── UI Components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section">
      <h3 className="section-title">{title}</h3>
      <div className="section-body">{children}</div>
    </div>
  );
}

function Field({
  label,
  note,
  error,
  children,
}: {
  label: string;
  note?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label">
        {label}
        {note && <span className="field-note">{note}</span>}
      </label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  hasError,
}: {
  value: number;
  onChange: (v: number) => void;
  hasError?: boolean;
}) {
  return (
    <div className={`input-wrap${hasError ? " error" : ""}`}>
      <span className="input-prefix">$</span>
      <input
        type="number"
        className={`num-input${hasError ? " error" : ""}`}
        value={value || ""}
        min={0}
        step="0.01"
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        placeholder="0"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className={`stat-card${highlight ? " stat-highlight" : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

// ── Result View ───────────────────────────────────────────────────────────────

function ResultView({
  result,
  input,
  onReset,
}: {
  result: MeansTestResult;
  input: MeansTestInput;
  onReset: () => void;
}) {
  const stateName = STATE_NAMES[input.state] ?? input.state;

  if (result.outcome === "EXEMPT") {
    return (
      <div className="result-wrap">
        <div className="verdict verdict-pass">
          <div className="verdict-icon">✓</div>
          <div className="verdict-text">
            <div className="verdict-label">EXEMPT</div>
            <div className="verdict-sub">Means test not required</div>
          </div>
        </div>
        <p className="exempt-reason">{result.reason}</p>
        <div className="result-actions">
          <button className="reset-btn" onClick={onReset}>← New Calculation</button>
          <button className="print-btn" onClick={() => window.print()}>Print / PDF</button>
        </div>
      </div>
    );
  }

  if (result.outcome === "BELOW_MEDIAN") {
    return (
      <div className="result-wrap">
        <div className="verdict verdict-pass">
          <div className="verdict-icon">✓</div>
          <div className="verdict-text">
            <div className="verdict-label">PASS — Below Median Income</div>
            <div className="verdict-sub">Eligible for Chapter 7 — Form 122A-2 not required</div>
          </div>
        </div>
        <div className="result-grid">
          <StatCard
            label="Annual CMI"
            value={fmt(result.annualizedCmi)}
            sub="Current monthly income × 12"
          />
          <StatCard
            label="State Median"
            value={fmt(result.stateMedian)}
            sub={`${stateName}, HH size ${input.householdSize}`}
          />
          <StatCard
            label="Below Median By"
            value={fmt(result.stateMedian - result.annualizedCmi)}
            sub="No further analysis required"
            highlight
          />
        </div>
        <div className="result-note">
          Debtor's annualized Current Monthly Income ({fmt(result.annualizedCmi)}) does not exceed the
          applicable state median ({fmt(result.stateMedian)}) — automatic pass under 11 U.S.C. §
          707(b)(7). Form 122A-2 not required.
        </div>
        <div className="result-actions">
          <button className="reset-btn" onClick={onReset}>← New Calculation</button>
          <button className="print-btn" onClick={() => window.print()}>Print / PDF</button>
        </div>
      </div>
    );
  }

  const r = result as Extract<MeansTestResult, { outcome: "PASS" | "FAIL" | "BORDERLINE" }>;
  const verdictClass =
    r.outcome === "PASS" ? "verdict-pass" : r.outcome === "FAIL" ? "verdict-fail" : "verdict-border";
  const verdictLabel =
    r.outcome === "PASS"
      ? "PASS — Eligible for Chapter 7"
      : r.outcome === "FAIL"
      ? "FAIL — Presumption of Abuse"
      : "BORDERLINE — Attorney Review Required";
  const verdictIcon = r.outcome === "PASS" ? "✓" : r.outcome === "FAIL" ? "✗" : "⚠";

  return (
    <div className="result-wrap">
      <div className={`verdict ${verdictClass}`}>
        <div className="verdict-icon">{verdictIcon}</div>
        <div className="verdict-text">
          <div className="verdict-label">{verdictLabel}</div>
          <div className="verdict-sub">Above-median income — Form 122A-2 analysis complete</div>
        </div>
      </div>

      <div className="result-grid">
        <StatCard label="Monthly CMI" value={fmt(r.cmi)} sub="6-month average" />
        <StatCard
          label="State Median / mo"
          value={fmt(r.stateMedian / 12)}
          sub={`${stateName} annualized ÷ 12`}
        />
        <StatCard
          label="Above Median By"
          value={fmt(r.annualizedCmi - r.stateMedian)}
          sub="Annual CMI vs. state median"
        />
        <StatCard label="Total Deductions" value={fmt(r.totalDeductions)} sub="All allowed 122A-2 expenses" />
        <StatCard
          label="Monthly Disposable"
          value={fmt(r.monthlyDisposable)}
          sub="CMI minus total deductions"
        />
        <StatCard
          label="60-Month Projection"
          value={fmt(r.projected60Month)}
          sub="Monthly disposable × 60"
          highlight
        />
      </div>

      <div className="deductions-table">
        <h4 className="table-title">Allowed Expense Deductions — Form 122A-2</h4>
        <table>
          <thead>
            <tr>
              <th>Expense Item</th>
              <th>Source</th>
              <th>Line</th>
              <th className="right">Monthly</th>
            </tr>
          </thead>
          <tbody>
            {r.deductions.map((d, i) => (
              <tr key={i}>
                <td>
                  {d.label}
                  {d.note && <div className="deduction-note">{d.note}</div>}
                </td>
                <td>
                  <span className={`badge badge-${d.source}`}>{d.source}</span>
                </td>
                <td className="line-col">{d.formLine}</td>
                <td className="right mono">{fmt(d.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={3}>Total Monthly Deductions (Line 34)</td>
              <td className="right mono">{fmt(r.totalDeductions)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="threshold-analysis">
        <h4>Threshold Analysis — §707(b)(2)</h4>
        <div className="threshold-grid">
          <div className="threshold-item">
            <span className="threshold-label">60-Month Disposable Income</span>
            <span className="threshold-val mono">{fmt(r.projected60Month)}</span>
          </div>
          <div className="threshold-item">
            <span className="threshold-label">Low Threshold (no presumption)</span>
            <span className="threshold-val mono">$9,075</span>
          </div>
          <div className="threshold-item">
            <span className="threshold-label">25% of Unsecured Debt</span>
            <span className="threshold-val mono">{fmt(r.threshold25Pct)}</span>
          </div>
          <div className="threshold-item">
            <span className="threshold-label">High Threshold (presumption)</span>
            <span className="threshold-val mono">$15,150</span>
          </div>
        </div>
        {r.presumptionOfAbuse && (
          <div className="abuse-warning">
            ⚠ Presumption of abuse triggered — debtor must rebut under §707(b)(2)(B) or convert to
            Chapter 13.
          </div>
        )}
      </div>

      <div className="result-note">
        <strong>Data effective:</strong> {PERIOD_LABEL}. Housing allowances are IRS Local Standards
        (state average; MSA-specific where applicable). Run{" "}
        <code>npm run update-data</code> to refresh from DOJ/UST.
      </div>

      <div className="result-actions">
        <button className="reset-btn" onClick={onReset}>← New Calculation</button>
        <button className="print-btn" onClick={() => window.print()}>Print / PDF</button>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  // Load from session storage on first render
  const [input, setInput] = useState<MeansTestInput>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) return { ...DEFAULT_INPUT, ...JSON.parse(saved) } as MeansTestInput;
    } catch {
      // ignore
    }
    return DEFAULT_INPUT;
  });

  const [result, setResult] = useState<MeansTestResult | null>(null);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  // Persist to session storage whenever input changes
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(input));
    } catch {
      // ignore quota errors
    }
  }, [input]);

  const set = useCallback(<K extends keyof MeansTestInput>(key: K, val: MeansTestInput[K]) => {
    setInput(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }, []);

  const addIncome = () =>
    set("incomeSources", [...input.incomeSources, { type: "Other Income", monthlyAmount: 0 }]);

  const removeIncome = (i: number) =>
    set("incomeSources", input.incomeSources.filter((_, idx) => idx !== i));

  const updateIncome = (i: number, field: "type" | "monthlyAmount", val: string | number) =>
    set(
      "incomeSources",
      input.incomeSources.map((src, idx) => (idx === i ? { ...src, [field]: val } : src))
    );

  const validate = (): boolean => {
    const errs: Partial<Record<string, string>> = {};
    if (!input.state) errs.state = "State is required";
    if (input.householdSize < 1) errs.householdSize = "Must be at least 1";
    if (input.totalUnsecuredDebt < 0) errs.totalUnsecuredDebt = "Cannot be negative";
    if (input.monthlyMortgageRent < 0) errs.monthlyMortgageRent = "Cannot be negative";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return false;
    }
    return true;
  };

  const calculate = () => {
    if (!validate()) return;
    try {
      setResult(runMeansTest(input));
    } catch (e) {
      setErrors({ state: (e as Error).message });
    }
  };

  const reset = () => {
    setInput(DEFAULT_INPUT);
    setResult(null);
    setErrors({});
    sessionStorage.removeItem(SESSION_KEY);
  };

  const totalCMI = input.incomeSources.reduce((s, src) => s + src.monthlyAmount, 0);

  // Housing allowance preview (shows as user fills in state/county/household)
  const housingPreview =
    input.state
      ? getHousingAllowance(input.state, input.county, input.householdSize)
      : null;

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-mark">§</span>
            <div>
              <div className="logo-title">MeansTest</div>
              <div className="logo-sub">Chapter 7 Bankruptcy Qualification Calculator</div>
            </div>
          </div>
          <div className="header-badges">
            <span className="header-badge">DOJ/UST · {EFFECTIVE_DATE}</span>
            <span className="header-badge">Form 122A-1 &amp; 122A-2 · 11 U.S.C. § 707(b)</span>
          </div>
        </div>
      </header>

      <main className="main">
        {result ? (
          <ResultView result={result} input={input} onReset={reset} />
        ) : (
          <form className="form" onSubmit={e => { e.preventDefault(); calculate(); }}>

            {/* ── Case Information ─────────────────────────────────────── */}
            <Section title="Case Information">
              <div className="grid-2">
                <Field label="Filing Date">
                  <input
                    type="date"
                    className="text-input"
                    value={input.filingDate}
                    onChange={e => set("filingDate", e.target.value)}
                  />
                </Field>
                <Field label="State" error={errors.state}>
                  <select
                    className={`text-input${errors.state ? " error" : ""}`}
                    value={input.state}
                    onChange={e => set("state", e.target.value)}
                    required
                  >
                    <option value="">Select state…</option>
                    {Object.entries(STATE_NAMES)
                      .sort(([, a], [, b]) => a.localeCompare(b))
                      .map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                  </select>
                </Field>
                <Field label="County" note="For local transport &amp; housing standards">
                  <input
                    type="text"
                    className="text-input"
                    value={input.county}
                    onChange={e => set("county", e.target.value)}
                    placeholder="e.g. Fulton"
                  />
                </Field>
                <Field label="Household Size">
                  <select
                    className="text-input"
                    value={input.householdSize}
                    onChange={e => set("householdSize", parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Housing standard preview */}
              {housingPreview && (
                <div className="housing-hint">
                  <div>
                    <div className="housing-hint-label">IRS Housing Allowance (Line 8a + 8b)</div>
                    <div>
                      <span className="housing-hint-val">{fmt(housingPreview.utility)}/mo utility</span>
                      {" + "}
                      <span className="housing-hint-val">{fmt(housingPreview.mortgageCap)}/mo mortgage cap</span>
                      {" = "}
                      <span className="housing-hint-val">
                        {fmt(housingPreview.utility + housingPreview.mortgageCap)}/mo total cap
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="checkbox-row">
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={input.isJointFiling}
                    onChange={e => set("isJointFiling", e.target.checked)}
                  />
                  Joint filing (spouse included)
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={input.isDisabledVeteran}
                    onChange={e => set("isDisabledVeteran", e.target.checked)}
                  />
                  Disabled veteran
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={input.isActiveReservist}
                    onChange={e => set("isActiveReservist", e.target.checked)}
                  />
                  Active duty / reservist
                </label>
              </div>

              <Field label="Debt Type">
                <select
                  className="text-input"
                  value={input.debtType}
                  onChange={e => set("debtType", e.target.value as MeansTestInput["debtType"])}
                >
                  <option value="consumer">Consumer debts (credit cards, medical, personal loans)</option>
                  <option value="business">Business debts — means test not required</option>
                  <option value="mixed">Mixed consumer &amp; business</option>
                </select>
              </Field>
            </Section>

            {/* ── Income ───────────────────────────────────────────────── */}
            <Section title="Income — 6-Month Average (Form 122A-1)">
              <p className="section-note">
                Average monthly income for the 6 calendar months before filing. Exclude Social
                Security benefits (11 U.S.C. § 101(10A)).
              </p>
              {input.incomeSources.map((src, i) => (
                <div key={i} className="income-row">
                  <select
                    className="text-input income-type"
                    value={src.type}
                    onChange={e => updateIncome(i, "type", e.target.value)}
                  >
                    {INCOME_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <NumInput
                    value={src.monthlyAmount}
                    onChange={v => updateIncome(i, "monthlyAmount", v)}
                  />
                  {input.incomeSources.length > 1 && (
                    <button type="button" className="remove-btn" onClick={() => removeIncome(i)}>
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="add-btn" onClick={addIncome}>
                + Add income source
              </button>
              <div className="cmi-display">
                <span>Current Monthly Income (CMI)</span>
                <span className="cmi-value">
                  {fmt(totalCMI)}/mo · {fmt(totalCMI * 12)}/yr
                </span>
              </div>
              <div className="checkbox-row">
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={input.primaryOver65}
                    onChange={e => set("primaryOver65", e.target.checked)}
                  />
                  Primary debtor age 65+
                </label>
                {input.isJointFiling && (
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={input.spouseOver65}
                      onChange={e => set("spouseOver65", e.target.checked)}
                    />
                    Spouse age 65+
                  </label>
                )}
              </div>
            </Section>

            {/* ── Transportation ────────────────────────────────────────── */}
            <Section title="Transportation (Lines 12–14)">
              <div className="grid-2">
                <Field label="Number of Vehicles">
                  <select
                    className="text-input"
                    value={input.numVehicles}
                    onChange={e => set("numVehicles", parseInt(e.target.value) as 0 | 1 | 2)}
                  >
                    <option value={0}>0 — no vehicle</option>
                    <option value={1}>1 vehicle</option>
                    <option value={2}>2+ vehicles</option>
                  </select>
                </Field>
                {input.numVehicles > 0 && (
                  <Field label="Loan / Lease Payment">
                    <select
                      className="text-input"
                      value={input.hasCarPayment ? "yes" : "no"}
                      onChange={e => set("hasCarPayment", e.target.value === "yes")}
                    >
                      <option value="no">No loan or lease</option>
                      <option value="yes">Has car loan or lease</option>
                    </select>
                  </Field>
                )}
                {input.numVehicles > 0 && input.hasCarPayment && (
                  <Field label="Monthly Car Payment" note="Actual loan or lease amount">
                    <NumInput
                      value={input.monthlyCarPayment}
                      onChange={v => set("monthlyCarPayment", v)}
                    />
                  </Field>
                )}
              </div>
            </Section>

            {/* ── Expense Deductions ────────────────────────────────────── */}
            <Section title="Monthly Expense Deductions (Form 122A-2)">
              <p className="section-note">
                Only relevant if income is above state median. Enter actual monthly amounts.
                IRS standards apply where noted.
              </p>

              <h4 style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", margin: "0.5rem 0 0.25rem" }}>
                Housing (Lines 8a / 8b)
              </h4>
              <div className="grid-2">
                <Field
                  label="Monthly Mortgage or Rent"
                  note="Actual payment — capped at IRS local standard"
                  error={errors.monthlyMortgageRent}
                >
                  <NumInput
                    value={input.monthlyMortgageRent}
                    onChange={v => set("monthlyMortgageRent", v)}
                  />
                </Field>
              </div>

              <h4 style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", margin: "0.75rem 0 0.25rem" }}>
                Taxes &amp; Payroll (Lines 16–17)
              </h4>
              <div className="grid-2">
                <Field label="Taxes" note="Monthly payroll + income taxes withheld or paid">
                  <NumInput value={input.monthlyTaxes} onChange={v => set("monthlyTaxes", v)} />
                </Field>
                <Field
                  label="Involuntary Payroll Deductions"
                  note="Mandatory retirement contributions, union dues, uniform costs (Line 17)"
                >
                  <NumInput
                    value={input.monthlyInvoluntaryDeductions}
                    onChange={v => set("monthlyInvoluntaryDeductions", v)}
                  />
                </Field>
              </div>

              <h4 style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", margin: "0.75rem 0 0.25rem" }}>
                Insurance &amp; Benefits (Lines 18–22, 25a)
              </h4>
              <div className="grid-2">
                <Field label="Term Life Insurance Premiums" note="For debtor's dependents only (Line 18)">
                  <NumInput
                    value={input.monthlyTermLifeInsurance}
                    onChange={v => set("monthlyTermLifeInsurance", v)}
                  />
                </Field>
                <Field label="Health Insurance Premiums" note="Premiums paid, not reimbursed (Line 25a)">
                  <NumInput
                    value={input.monthlyHealthInsurance}
                    onChange={v => set("monthlyHealthInsurance", v)}
                  />
                </Field>
                <Field
                  label="Telecommunications"
                  note="Phone, internet, fax — capped at $195/mo IRS standard (Line 22)"
                >
                  <NumInput value={input.monthlyTelecom} onChange={v => set("monthlyTelecom", v)} />
                </Field>
              </div>

              <h4 style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", margin: "0.75rem 0 0.25rem" }}>
                Education &amp; Care (Lines 19–20, 25b)
              </h4>
              <div className="grid-2">
                <Field
                  label="Employment Education"
                  note="Tuition/fees legally required for current job (Line 19)"
                >
                  <NumInput
                    value={input.monthlyEducationEmployment}
                    onChange={v => set("monthlyEducationEmployment", v)}
                  />
                </Field>
                <Field label="Childcare" note="Actual monthly childcare costs (Line 20)">
                  <NumInput value={input.monthlyChildcare} onChange={v => set("monthlyChildcare", v)} />
                </Field>
              </div>

              <h4 style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", margin: "0.75rem 0 0.25rem" }}>
                Special Circumstances (Lines 21, 25c, 25d)
              </h4>
              <div className="grid-2">
                <Field
                  label="Additional Healthcare — Chronic Illness / Disability"
                  note="Ongoing treatment costs above the IRS national standard (Line 21)"
                >
                  <NumInput
                    value={input.monthlyChronicHealthcare}
                    onChange={v => set("monthlyChronicHealthcare", v)}
                  />
                </Field>
                <Field
                  label="Dependent Children's Education (K-12)"
                  note="Legally required tuition/fees for children under 18 (Line 25c)"
                >
                  <NumInput
                    value={input.monthlyDependentChildEducation}
                    onChange={v => set("monthlyDependentChildEducation", v)}
                  />
                </Field>
                <Field
                  label="Special Diet / Medical Food"
                  note="Additional food costs above national standard for disability or chronic illness (Line 25d)"
                >
                  <NumInput
                    value={input.monthlySpecialDietFood}
                    onChange={v => set("monthlySpecialDietFood", v)}
                  />
                </Field>
              </div>

              <h4 style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", margin: "0.75rem 0 0.25rem" }}>
                Court Orders &amp; Priority Debts (Lines 24–26, 25e)
              </h4>
              <div className="grid-2">
                <Field
                  label="Domestic Support Obligations"
                  note="Court-ordered support paid (Line 25e)"
                >
                  <NumInput
                    value={input.monthlySupportObligations}
                    onChange={v => set("monthlySupportObligations", v)}
                  />
                </Field>
                <Field
                  label="Priority Debt Payments"
                  note="Back taxes, support arrears (Lines 24–26) — also triggers 10% Ch.13 admin deduction"
                >
                  <NumInput
                    value={input.monthlyPriorityDebts}
                    onChange={v => set("monthlyPriorityDebts", v)}
                  />
                </Field>
              </div>

              <h4 style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", margin: "0.75rem 0 0.25rem" }}>
                Secured Debt (Line 33)
              </h4>
              <div className="grid-2">
                <Field
                  label="Other Secured Debt Payments"
                  note="Non-vehicle secured debt monthly payments (Line 33)"
                >
                  <NumInput
                    value={input.monthlyOtherSecuredDebt}
                    onChange={v => set("monthlyOtherSecuredDebt", v)}
                  />
                </Field>
              </div>
            </Section>

            {/* ── Debt Summary ──────────────────────────────────────────── */}
            <Section title="Debt Summary">
              <div className="grid-2">
                <Field
                  label="Total Unsecured Debt"
                  note="Credit cards, medical bills, personal loans, student loans"
                  error={errors.totalUnsecuredDebt}
                >
                  <NumInput
                    value={input.totalUnsecuredDebt}
                    onChange={v => set("totalUnsecuredDebt", v)}
                    hasError={!!errors.totalUnsecuredDebt}
                  />
                </Field>
              </div>
            </Section>

            <div className="form-footer">
              <span className="form-footer-note">
                Data effective: {PERIOD_LABEL}
              </span>
              <button type="submit" className="calc-btn" disabled={!input.state}>
                Run Means Test →
              </button>
            </div>
          </form>
        )}
      </main>

      <footer className="footer">
        <p>For informational purposes only · Not legal advice · Verify results with a licensed bankruptcy attorney</p>
        <p>Data source: United States Trustee Program · justice.gov/ust/means-testing · Effective {EFFECTIVE_DATE}</p>
      </footer>
    </div>
  );
}
