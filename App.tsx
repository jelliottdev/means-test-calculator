import { useState } from "react";
import { STATE_NAMES } from "./data/meansTestData";
import { runMeansTest, type MeansTestInput, type MeansTestResult } from "./engine/meansTest";
import "./index.css";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const INCOME_TYPES = ["Wages/Salary", "Self-Employment", "Rental Income", "Pension/Retirement", "Other Income"];

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
  monthlyHealthInsurance: 0,
  monthlyChildcare: 0,
  monthlySupportObligations: 0,
  monthlyOtherSecuredDebt: 0,
  totalUnsecuredDebt: 0,
  debtType: "consumer",
  isDisabledVeteran: false,
  isActiveReservist: false,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section">
      <h3 className="section-title">{title}</h3>
      <div className="section-body">{children}</div>
    </div>
  );
}

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">
        {label}
        {note && <span className="field-note">{note}</span>}
      </label>
      {children}
    </div>
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="input-wrap">
      <span className="input-prefix">$</span>
      <input
        type="number"
        className="num-input"
        value={value || ""}
        min={0}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        placeholder="0"
      />
    </div>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`stat-card${highlight ? " stat-highlight" : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function ResultView({ result, input, onReset }: { result: MeansTestResult; input: MeansTestInput; onReset: () => void }) {
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
        <button className="reset-btn" onClick={onReset}>← New Calculation</button>
      </div>
    );
  }

  if (result.outcome === "BELOW_MEDIAN") {
    return (
      <div className="result-wrap">
        <div className="verdict verdict-pass">
          <div className="verdict-icon">✓</div>
          <div className="verdict-text">
            <div className="verdict-label">PASS — Below Median</div>
            <div className="verdict-sub">Eligible for Chapter 7</div>
          </div>
        </div>
        <div className="result-grid">
          <StatCard label="Annual CMI" value={fmt(result.annualizedCmi)} sub="Current monthly income × 12" />
          <StatCard label="State Median" value={fmt(result.stateMedian)} sub={`${STATE_NAMES[input.state]}, HH size ${input.householdSize}`} />
          <StatCard label="Below Median By" value={fmt(result.stateMedian - result.annualizedCmi)} sub="No further analysis required" highlight />
        </div>
        <div className="result-note">
          Income is below the state median — debtor automatically passes. Form 122A-2 not required.
        </div>
        <button className="reset-btn" onClick={onReset}>← New Calculation</button>
      </div>
    );
  }

  const r = result as Extract<MeansTestResult, { outcome: "PASS" | "FAIL" | "BORDERLINE" }>;
  const verdictClass = r.outcome === "PASS" ? "verdict-pass" : r.outcome === "FAIL" ? "verdict-fail" : "verdict-border";
  const verdictLabel =
    r.outcome === "PASS" ? "PASS — Eligible for Chapter 7" :
    r.outcome === "FAIL" ? "FAIL — Presumption of Abuse" :
    "BORDERLINE — Attorney Review Required";

  return (
    <div className="result-wrap">
      <div className={`verdict ${verdictClass}`}>
        <div className="verdict-icon">{r.outcome === "PASS" ? "✓" : r.outcome === "FAIL" ? "✗" : "⚠"}</div>
        <div className="verdict-text">
          <div className="verdict-label">{verdictLabel}</div>
          <div className="verdict-sub">Above-median analysis — Form 122A-2</div>
        </div>
      </div>

      <div className="result-grid">
        <StatCard label="Monthly CMI" value={fmt(r.cmi)} sub="6-month average" />
        <StatCard label="State Median / mo" value={fmt(r.stateMedian / 12)} sub="Annualized ÷ 12" />
        <StatCard label="Above Median By" value={fmt(r.annualizedCmi - r.stateMedian)} sub="Annualized" />
        <StatCard label="Total Deductions" value={fmt(r.totalDeductions)} sub="All allowed expenses" />
        <StatCard label="Monthly Disposable" value={fmt(r.monthlyDisposable)} sub="CMI minus deductions" />
        <StatCard label="60-Month Projection" value={fmt(r.projected60Month)} sub="Disposable × 60" highlight />
      </div>

      <div className="deductions-table">
        <h4 className="table-title">Allowed Expense Deductions (Form 122A-2)</h4>
        <table>
          <thead>
            <tr>
              <th>Expense</th>
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
                <td><span className={`badge badge-${d.source}`}>{d.source}</span></td>
                <td className="line-col">{d.formLine}</td>
                <td className="right mono">{fmt(d.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={3}>Total Monthly Deductions</td>
              <td className="right mono">{fmt(r.totalDeductions)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="threshold-analysis">
        <h4>Threshold Analysis (§707(b)(2))</h4>
        <div className="threshold-grid">
          <div className="threshold-item">
            <span className="threshold-label">60-Month Disposable</span>
            <span className="threshold-val mono">{fmt(r.projected60Month)}</span>
          </div>
          <div className="threshold-item">
            <span className="threshold-label">Low Threshold</span>
            <span className="threshold-val mono">$9,075</span>
          </div>
          <div className="threshold-item">
            <span className="threshold-label">High Threshold</span>
            <span className="threshold-val mono">$15,150</span>
          </div>
          <div className="threshold-item">
            <span className="threshold-label">25% of Unsecured Debt</span>
            <span className="threshold-val mono">{fmt(r.threshold25Pct)}</span>
          </div>
        </div>
        {r.presumptionOfAbuse && (
          <div className="abuse-warning">
            ⚠ Presumption of abuse triggered — debtor must rebut or convert to Chapter 13.
          </div>
        )}
      </div>

      <div className="result-note">
        <strong>Note:</strong> Housing allowances use approximate state averages. Replace with real IRS county-level data from <code>justice.gov/ust/means-testing</code> for production use.
      </div>

      <button className="reset-btn" onClick={onReset}>← New Calculation</button>
    </div>
  );
}

export default function App() {
  const [input, setInput] = useState<MeansTestInput>(DEFAULT_INPUT);
  const [result, setResult] = useState<MeansTestResult | null>(null);
  const [step, setStep] = useState(0);

  const set = <K extends keyof MeansTestInput>(key: K, val: MeansTestInput[K]) =>
    setInput(prev => ({ ...prev, [key]: val }));

  const addIncome = () =>
    set("incomeSources", [...input.incomeSources, { type: "Other Income", monthlyAmount: 0 }]);

  const removeIncome = (i: number) =>
    set("incomeSources", input.incomeSources.filter((_, idx) => idx !== i));

  const updateIncome = (i: number, field: "type" | "monthlyAmount", val: string | number) =>
    set("incomeSources", input.incomeSources.map((src, idx) => idx === i ? { ...src, [field]: val } : src));

  const calculate = () => {
    try {
      setResult(runMeansTest(input));
      setStep(1);
    } catch (e) {
      alert("Error: " + (e as Error).message);
    }
  };

  const reset = () => { setInput(DEFAULT_INPUT); setResult(null); setStep(0); };

  const totalCMI = input.incomeSources.reduce((s, src) => s + src.monthlyAmount, 0);

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-mark">§</span>
            <div>
              <div className="logo-title">MeansTest</div>
              <div className="logo-sub">Chapter 7 Bankruptcy Qualification</div>
            </div>
          </div>
          <div className="header-badge">DOJ/UST · Nov 2025 Standards</div>
        </div>
      </header>

      <main className="main">
        {step === 0 && (
          <form className="form" onSubmit={e => { e.preventDefault(); calculate(); }}>
            <Section title="Case Information">
              <div className="grid-2">
                <Field label="Filing Date">
                  <input type="date" className="text-input" value={input.filingDate}
                    onChange={e => set("filingDate", e.target.value)} />
                </Field>
                <Field label="State">
                  <select className="text-input" value={input.state}
                    onChange={e => set("state", e.target.value)} required>
                    <option value="">Select state…</option>
                    {Object.entries(STATE_NAMES).sort(([,a],[,b]) => a.localeCompare(b)).map(([k,v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </Field>
                <Field label="County" note="For local transport standards">
                  <input type="text" className="text-input" value={input.county}
                    onChange={e => set("county", e.target.value)} placeholder="e.g. Fulton" />
                </Field>
                <Field label="Household Size">
                  <select className="text-input" value={input.householdSize}
                    onChange={e => set("householdSize", parseInt(e.target.value))}>
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n} {n===1?"person":"people"}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="checkbox-row">
                <label className="check-label">
                  <input type="checkbox" checked={input.isJointFiling}
                    onChange={e => set("isJointFiling", e.target.checked)} />
                  Joint filing
                </label>
                <label className="check-label">
                  <input type="checkbox" checked={input.isDisabledVeteran}
                    onChange={e => set("isDisabledVeteran", e.target.checked)} />
                  Disabled veteran
                </label>
                <label className="check-label">
                  <input type="checkbox" checked={input.isActiveReservist}
                    onChange={e => set("isActiveReservist", e.target.checked)} />
                  Active duty / reservist
                </label>
              </div>
              <Field label="Debt Type">
                <select className="text-input" value={input.debtType}
                  onChange={e => set("debtType", e.target.value as MeansTestInput["debtType"])}>
                  <option value="consumer">Consumer debts</option>
                  <option value="business">Business debts (exempt)</option>
                  <option value="mixed">Mixed</option>
                </select>
              </Field>
            </Section>

            <Section title="Income (6-Month Average)">
              <p className="section-note">Average monthly income over 6 months prior to filing. Exclude Social Security.</p>
              {input.incomeSources.map((src, i) => (
                <div key={i} className="income-row">
                  <select className="text-input income-type" value={src.type}
                    onChange={e => updateIncome(i, "type", e.target.value)}>
                    {INCOME_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <NumInput value={src.monthlyAmount} onChange={v => updateIncome(i, "monthlyAmount", v)} />
                  {input.incomeSources.length > 1 && (
                    <button type="button" className="remove-btn" onClick={() => removeIncome(i)}>×</button>
                  )}
                </div>
              ))}
              <button type="button" className="add-btn" onClick={addIncome}>+ Add income source</button>
              <div className="cmi-display">
                <span>Current Monthly Income (CMI)</span>
                <span className="cmi-value">{fmt(totalCMI)}/mo · {fmt(totalCMI * 12)}/yr</span>
              </div>
              <div className="checkbox-row">
                <label className="check-label">
                  <input type="checkbox" checked={input.primaryOver65}
                    onChange={e => set("primaryOver65", e.target.checked)} />
                  Primary debtor 65+
                </label>
                {input.isJointFiling && (
                  <label className="check-label">
                    <input type="checkbox" checked={input.spouseOver65}
                      onChange={e => set("spouseOver65", e.target.checked)} />
                    Spouse 65+
                  </label>
                )}
              </div>
            </Section>

            <Section title="Transportation">
              <div className="grid-2">
                <Field label="Number of Vehicles">
                  <select className="text-input" value={input.numVehicles}
                    onChange={e => set("numVehicles", parseInt(e.target.value) as 0|1|2)}>
                    <option value={0}>0 — no vehicle</option>
                    <option value={1}>1 vehicle</option>
                    <option value={2}>2+ vehicles</option>
                  </select>
                </Field>
                {input.numVehicles > 0 && (
                  <Field label="Car Payment">
                    <select className="text-input" value={input.hasCarPayment ? "yes" : "no"}
                      onChange={e => set("hasCarPayment", e.target.value === "yes")}>
                      <option value="no">No loan/lease</option>
                      <option value="yes">Has loan/lease</option>
                    </select>
                  </Field>
                )}
                {input.numVehicles > 0 && input.hasCarPayment && (
                  <Field label="Monthly Car Payment">
                    <NumInput value={input.monthlyCarPayment} onChange={v => set("monthlyCarPayment", v)} />
                  </Field>
                )}
              </div>
            </Section>

            <Section title="Monthly Expenses">
              <p className="section-note">Only needed if above state median. Enter actual monthly amounts.</p>
              <div className="grid-2">
                <Field label="Mortgage or Rent">
                  <NumInput value={input.monthlyMortgageRent} onChange={v => set("monthlyMortgageRent", v)} />
                </Field>
                <Field label="Taxes" note="Payroll + income">
                  <NumInput value={input.monthlyTaxes} onChange={v => set("monthlyTaxes", v)} />
                </Field>
                <Field label="Health Insurance Premiums">
                  <NumInput value={input.monthlyHealthInsurance} onChange={v => set("monthlyHealthInsurance", v)} />
                </Field>
                <Field label="Childcare">
                  <NumInput value={input.monthlyChildcare} onChange={v => set("monthlyChildcare", v)} />
                </Field>
                <Field label="Court-Ordered Support Paid">
                  <NumInput value={input.monthlySupportObligations} onChange={v => set("monthlySupportObligations", v)} />
                </Field>
                <Field label="Other Secured Debt Payments">
                  <NumInput value={input.monthlyOtherSecuredDebt} onChange={v => set("monthlyOtherSecuredDebt", v)} />
                </Field>
              </div>
            </Section>

            <Section title="Debt Summary">
              <Field label="Total Unsecured Debt" note="Credit cards, medical bills, personal loans">
                <NumInput value={input.totalUnsecuredDebt} onChange={v => set("totalUnsecuredDebt", v)} />
              </Field>
            </Section>

            <div className="form-footer">
              <button type="submit" className="calc-btn" disabled={!input.state}>
                Run Means Test →
              </button>
            </div>
          </form>
        )}

        {step === 1 && result && (
          <ResultView result={result} input={input} onReset={reset} />
        )}
      </main>

      <footer className="footer">
        <p>For informational purposes only · Not legal advice · Verify with current DOJ/UST data before filing</p>
      </footer>
    </div>
  );
}
