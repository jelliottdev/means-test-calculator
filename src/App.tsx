import { useState, useEffect, useCallback } from "react";
import { STATE_NAMES, EFFECTIVE_DATE, getHousingAllowanceDetails } from "./data/meansTestData";
import { EMBEDDED_MIN_SUPPORTED_FILING_DATE, getEmbeddedDatasetBundle, getEmbeddedDatasetSupport } from "./datasets/embedded";
import { buildAuditPacket, downloadAuditPacket, getAuditReviewStatus, getReviewerSignoffReasons, isReviewerSignoffRequired, normalizeAuditReview } from "./auditPacket";
import { type MeansTestInput } from "./engine/meansTest";
import { normalizeLegacyInput } from "./engine/v2/normalize";
import { runMeansTestV2 } from "./engine/v2/meansTestV2";
import type { DatasetVersionMeta, MeansTestResultV2 } from "./engine/v2/types";
import { formatLookbackMonth, getMeansTestLookbackMonths } from "./lib/filingDate";
import { getMeansTestPreflightAssessment } from "./lib/preflight";
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
const MIN_SUPPORTED_FILING_DATE = EMBEDDED_MIN_SUPPORTED_FILING_DATE;


// ── Default State ─────────────────────────────────────────────────────────────

const DEFAULT_INPUT: MeansTestInput = {
  filingDate: MIN_SUPPORTED_FILING_DATE,
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
  hasSecondCarPayment: false,
  monthlySecondCarPayment: 0,
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

function FilingDateBindingBanner({
  filingDate,
  datasetEntries,
  supported,
  supportReason,
}: {
  filingDate: string;
  datasetEntries: Array<[string, DatasetVersionMeta]>;
  supported: boolean;
  supportReason?: string;
}) {
  const lookbackMonths = getMeansTestLookbackMonths(filingDate);

  return (
    <div className={`binding-banner${supported ? "" : " binding-banner-warn"}`}>
      <div className="binding-banner-header">
        <div>
          <div className="binding-banner-title">Filing-date binding</div>
          <div className="binding-banner-sub">
            This result is tied to the selected filing date, statutory six-month lookback window, and resolved dataset effective dates.
          </div>
        </div>
        <span className={`binding-badge${supported ? "" : " binding-badge-warn"}`}>
          {supported ? "Supported filing date" : "Unsupported filing date"}
        </span>
      </div>

      <div className="binding-grid">
        <div className="binding-card">
          <div className="binding-label">Filing date</div>
          <div className="binding-value">{filingDate || "Not selected"}</div>
        </div>
        <div className="binding-card">
          <div className="binding-label">CMI lookback window</div>
          <div className="binding-months">
            {lookbackMonths.length > 0 ? lookbackMonths.map((month) => (
              <span key={month} className="binding-month-chip">{formatLookbackMonth(month)}</span>
            )) : <span className="binding-empty">Enter a filing date to bind the six-month window.</span>}
          </div>
        </div>
      </div>

      <div className="binding-datasets">
        {datasetEntries.map(([key, meta]) => (
          <div key={key} className="binding-dataset">
            <span className="binding-dataset-key">{key.replaceAll("_", " ")}</span>
            <span className="binding-dataset-date">{meta.effectiveDate}</span>
          </div>
        ))}
      </div>

      {!supported && supportReason && <div className="binding-warning">{supportReason}</div>}
    </div>
  );
}

function WorkspaceOverview({
  filingDate,
  supported,
  supportReason,
  state,
  county,
  housingPreview,
  totalCMI,
  totalUnsecuredDebt,
  preflight,
}: {
  filingDate: string;
  supported: boolean;
  supportReason?: string;
  state: string;
  county: string;
  housingPreview: ReturnType<typeof getHousingAllowanceDetails> | null;
  totalCMI: number;
  totalUnsecuredDebt: number;
  preflight: ReturnType<typeof getMeansTestPreflightAssessment>;
}) {
  const lookbackMonths = getMeansTestLookbackMonths(filingDate);
  const geographyStatus =
    !state ? "Select a state to load the correct median-income table." :
    !county ? "Add a county to improve housing and transportation accuracy." :
    housingPreview?.matched === "county_exact" ? `Using exact county housing for ${housingPreview.matchedName}.` :
    housingPreview?.matched === "msa" ? `Using grouped ${housingPreview.matchedName} housing override; attorney review recommended.` :
    housingPreview?.matched === "state_default" ? "Using statewide housing default until an exact county row is confirmed." :
    "County mapping will be validated once jurisdiction details are complete.";

  const geographyTone =
    housingPreview?.matched === "county_exact" ? "good" :
    state && county ? "warn" :
    "neutral";

  const workflowSteps = [
    { label: "Case setup", done: Boolean(filingDate && state), note: filingDate && state ? "Filing date and state selected." : "Choose filing date and state." },
    { label: "Income", done: totalCMI > 0, note: totalCMI > 0 ? `${fmt(totalCMI)}/mo CMI entered.` : "Enter six-month average income." },
    { label: "Geography", done: Boolean(state && county), note: county ? county : "County not entered yet." },
    { label: "Debt review", done: totalUnsecuredDebt > 0, note: totalUnsecuredDebt > 0 ? `${fmt(totalUnsecuredDebt)} unsecured debt captured.` : "Add unsecured debt to complete threshold review." },
  ];

  return (
    <section className="overview-panel">
      <div className="overview-header">
        <div>
          <div className="overview-eyebrow">Professional intake workspace</div>
          <h2 className="overview-title">Prepare the case before you calculate.</h2>
          <p className="overview-copy">
            This dashboard surfaces the filing-period binding, geography quality, and intake completeness so attorneys and staff can catch issues before relying on the result.
          </p>
        </div>
      </div>

      <div className="overview-grid">
        <div className="overview-card">
          <div className="overview-card-label">Filing support</div>
          <div className="overview-card-value">{supported ? "Ready" : "Unsupported"}</div>
          <p className="overview-card-copy">
            {supported ? `Embedded datasets support the selected filing date ${filingDate}.` : supportReason}
          </p>
        </div>
        <div className="overview-card">
          <div className="overview-card-label">Lookback window</div>
          <div className="overview-card-value">{lookbackMonths.length} months</div>
          <p className="overview-card-copy">
            {lookbackMonths.length > 0 ? lookbackMonths.map(formatLookbackMonth).join(" · ") : "Choose a filing date to bind the statutory six-month window."}
          </p>
        </div>
        <div className={`overview-card overview-card-${geographyTone}`}>
          <div className="overview-card-label">Geography quality</div>
          <div className="overview-card-value">
            {housingPreview?.matched === "county_exact" ? "Exact county" : county ? "Needs review" : "Incomplete"}
          </div>
          <p className="overview-card-copy">{geographyStatus}</p>
        </div>
        <div className="overview-card">
          <div className="overview-card-label">Financial snapshot</div>
          <div className="overview-card-value">{fmt(totalCMI * 12)}</div>
          <p className="overview-card-copy">
            Annualized CMI from entered income; unsecured debt currently {fmt(totalUnsecuredDebt)}.
          </p>
        </div>
      </div>

      <div className={`preflight-panel preflight-${preflight.status}`}>
        <div>
          <div className="preflight-label">Live median-income preflight</div>
          <div className="preflight-value">
            {preflight.status === "below_median" ? "Likely below median" :
             preflight.status === "above_median" ? "Above median review likely" :
             preflight.status === "business_debts_exempt" ? "Likely exempt path" :
             preflight.status === "unsupported_filing_date" ? "Unsupported filing date" :
             "Need more inputs"}
          </div>
        </div>
        <div className="preflight-metrics">
          <div className="preflight-metric">
            <span className="preflight-metric-label">Annualized CMI</span>
            <span className="preflight-metric-value">{fmt(preflight.annualizedCmi)}</span>
          </div>
          <div className="preflight-metric">
            <span className="preflight-metric-label">State median</span>
            <span className="preflight-metric-value">{preflight.stateMedian ? fmt(preflight.stateMedian) : "—"}</span>
          </div>
          <div className="preflight-metric">
            <span className="preflight-metric-label">Delta</span>
            <span className="preflight-metric-value">
              {typeof preflight.deltaFromMedian === "number"
                ? `${preflight.deltaFromMedian >= 0 ? "+" : "−"}${fmt(Math.abs(preflight.deltaFromMedian))}`
                : "—"}
            </span>
          </div>
        </div>
        <p className="preflight-copy">{preflight.summary}</p>
      </div>

      <div className="workflow-strip">
        {workflowSteps.map((step) => (
          <div key={step.label} className={`workflow-step${step.done ? " done" : ""}`}>
            <div className="workflow-step-label">{step.label}</div>
            <div className="workflow-step-note">{step.note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AuditPanel({
  result,
}: {
  result: MeansTestResultV2;
}) {
  const datasetEntries = Object.entries(result.audit.datasets) as Array<[string, DatasetVersionMeta]>;

  return (
    <div className="audit-panel">
      <div className="audit-section">
        <h4 className="audit-title">Dataset Provenance</h4>
        <div className="audit-grid">
          {datasetEntries.map(([key, meta]) => (
            <div key={key} className="audit-card">
              <div className="audit-card-label">{key.replaceAll("_", " ")}</div>
              <div className="audit-card-date">{meta.effectiveDate}</div>
              <div className="audit-card-sub">{meta.periodLabel}</div>
              <div className="audit-card-sub"><a href={meta.sourceUrl} target="_blank" rel="noreferrer">Official source</a></div>
              {meta.sourceHash && <div className="audit-card-sub">Snapshot: <code>{meta.sourceHash.slice(0, 28)}…</code></div>}
              {meta.notes?.map((note, idx) => <div key={idx} className="audit-card-sub">Note: {note}</div>)}
            </div>
          ))}
        </div>
      </div>

      {result.audit.warnings.length > 0 && (
        <div className="audit-section">
          <h4 className="audit-title">Warnings</h4>
          <ul className="audit-list audit-list-warn">
            {result.audit.warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {result.audit.assumptions.length > 0 && (
        <div className="audit-section">
          <h4 className="audit-title">Assumptions Used</h4>
          <ul className="audit-list audit-list-note">
            {result.audit.assumptions.map((assumption, idx) => (
              <li key={idx}>{assumption}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


function ReviewerSignoffSection({
  reviewerName,
  reviewerNotes,
  reasons,
  required,
  reviewBlockers,
  readyForExport,
  onReviewerNameChange,
  onReviewerNotesChange,
}: {
  reviewerName: string;
  reviewerNotes: string;
  reasons?: string[];
  required?: boolean;
  reviewBlockers?: string[];
  readyForExport?: boolean;
  onReviewerNameChange: (value: string) => void;
  onReviewerNotesChange: (value: string) => void;
}) {
  return (
    <div className="section">
      <h3 className="section-title">Reviewer Signoff {required ? "(required for export)" : "(optional)"}</h3>
      <div className="section-body">
        {required && (
          <>
            <p className="section-note">Reviewer signoff is required before exporting this result.</p>
            <ul className="audit-list audit-list-note">
              {(reasons ?? []).map((reason, idx) => <li key={idx}>{reason}</li>)}
            </ul>
            {readyForExport ? (
              <p className="section-note">Export status: ready. Required reviewer fields are complete.</p>
            ) : (
              <>
                <p className="section-note">Export status: blocked until required review fields are completed.</p>
                <ul className="audit-list audit-list-warn">
                  {(reviewBlockers ?? []).map((blocker, idx) => <li key={idx}>{blocker}</li>)}
                </ul>
              </>
            )}
          </>
        )}
        <div className="grid-2">
          <Field label="Reviewer Name">
            <input
              type="text"
              className="text-input"
              value={reviewerName}
              onChange={e => onReviewerNameChange(e.target.value)}
              placeholder="Attorney / paralegal name"
            />
          </Field>
          <Field label="Reviewer Notes" note="Included in the exported audit packet">
            <input
              type="text"
              className="text-input"
              value={reviewerNotes}
              onChange={e => onReviewerNotesChange(e.target.value)}
              placeholder="Review notes, exceptions, or follow-up items"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ── Result View ───────────────────────────────────────────────────────────────

function ResultView({
  result,
  input,
  onReset,
}: {
  result: MeansTestResultV2;
  input: MeansTestInput;
  onReset: () => void;
}) {
  const stateName = STATE_NAMES[input.state] ?? input.state;
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const filingDateSupport = getEmbeddedDatasetSupport(input.filingDate);
  const datasetEntries = Object.entries(result.audit.datasets) as Array<[string, DatasetVersionMeta]>;
  const reviewerRequiredForExport = isReviewerSignoffRequired(result);
  const reviewerSignoffReasons = getReviewerSignoffReasons(result);
  const reviewDraft = normalizeAuditReview(reviewerName || reviewerNotes ? { reviewerName, reviewerNotes } : undefined);
  const reviewStatus = getAuditReviewStatus(result, reviewDraft);
  const exportAuditPacket = () => {
    const reviewedAt = new Date().toISOString();
    downloadAuditPacket(buildAuditPacket(
      input,
      result,
      reviewedAt,
      reviewDraft
        ? {
            ...reviewDraft,
            reviewedAt,
          }
        : undefined,
    ));
  };

  if (result.outcome === "EXEMPT") {
    return (
      <div className="result-wrap">
        <FilingDateBindingBanner
          filingDate={input.filingDate}
          datasetEntries={datasetEntries}
          supported={filingDateSupport.supported}
          supportReason={filingDateSupport.reason}
        />
        <div className="verdict verdict-pass">
          <div className="verdict-icon">✓</div>
          <div className="verdict-text">
            <div className="verdict-label">EXEMPT</div>
            <div className="verdict-sub">Means test not required</div>
          </div>
        </div>
        <p className="exempt-reason">{result.reason}</p>
        <ReviewerSignoffSection
          reviewerName={reviewerName}
          reviewerNotes={reviewerNotes}
          reasons={reviewerSignoffReasons}
          reviewBlockers={reviewStatus.blockers}
          readyForExport={reviewStatus.readyForExport}
          onReviewerNameChange={setReviewerName}
          required={reviewerRequiredForExport}
          onReviewerNotesChange={setReviewerNotes}
        />
        <AuditPanel result={result} />
        <div className="result-actions">
          <button className="reset-btn" onClick={onReset}>← New Calculation</button>
          <button className="print-btn" onClick={exportAuditPacket} disabled={!reviewStatus.readyForExport} title={!reviewStatus.readyForExport ? reviewStatus.blockers.join(" ") : undefined}>Export Audit JSON</button>
          <button className="print-btn" onClick={() => window.print()}>Print / PDF</button>
        </div>
      </div>
    );
  }

  if (result.outcome === "BELOW_MEDIAN") {
    return (
      <div className="result-wrap">
        <FilingDateBindingBanner
          filingDate={input.filingDate}
          datasetEntries={datasetEntries}
          supported={filingDateSupport.supported}
          supportReason={filingDateSupport.reason}
        />
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

        <ReviewerSignoffSection
          reviewerName={reviewerName}
          reviewerNotes={reviewerNotes}
          reasons={reviewerSignoffReasons}
          reviewBlockers={reviewStatus.blockers}
          readyForExport={reviewStatus.readyForExport}
          onReviewerNameChange={setReviewerName}
          required={reviewerRequiredForExport}
          onReviewerNotesChange={setReviewerNotes}
        />
        <AuditPanel result={result} />
        <div className="result-actions">
          <button className="reset-btn" onClick={onReset}>← New Calculation</button>
          <button className="print-btn" onClick={exportAuditPacket} disabled={!reviewStatus.readyForExport} title={!reviewStatus.readyForExport ? reviewStatus.blockers.join(" ") : undefined}>Export Audit JSON</button>
          <button className="print-btn" onClick={() => window.print()}>Print / PDF</button>
        </div>
      </div>
    );
  }

  const r = result as Extract<MeansTestResultV2, { outcome: "PASS" | "FAIL" | "BORDERLINE" }>;
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
      <FilingDateBindingBanner
        filingDate={input.filingDate}
        datasetEntries={datasetEntries}
        supported={filingDateSupport.supported}
        supportReason={filingDateSupport.reason}
      />
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
            {r.deductions.map((d: (typeof r.deductions)[number], i: number) => (
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
              <td colSpan={3}>Total Deductions (Line 38)</td>
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
            <span className="threshold-val mono">{fmt(r.abuseThresholdLow)}</span>
          </div>
          <div className="threshold-item">
            <span className="threshold-label">25% of Unsecured Debt</span>
            <span className="threshold-val mono">{fmt(r.threshold25Pct)}</span>
          </div>
          <div className="threshold-item">
            <span className="threshold-label">High Threshold (presumption)</span>
            <span className="threshold-val mono">{fmt(r.abuseThresholdHigh)}</span>
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
        County omissions, grouped geographic matches, and zeroed actual-expense entries can change the legal result. Review the filing-date binding banner, threshold values, and audit warnings before relying on this output.
      </div>

      
        <ReviewerSignoffSection
          reviewerName={reviewerName}
          reviewerNotes={reviewerNotes}
          reasons={reviewerSignoffReasons}
          reviewBlockers={reviewStatus.blockers}
          readyForExport={reviewStatus.readyForExport}
          onReviewerNameChange={setReviewerName}
          required={reviewerRequiredForExport}
          onReviewerNotesChange={setReviewerNotes}
        />

      <AuditPanel result={result} />

      <div className="result-actions">
        <button className="reset-btn" onClick={onReset}>← New Calculation</button>
        <button className="print-btn" onClick={exportAuditPacket} disabled={!reviewStatus.readyForExport} title={!reviewStatus.readyForExport ? reviewStatus.blockers.join(" ") : undefined}>Export Audit JSON</button>
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

  const [result, setResult] = useState<MeansTestResultV2 | null>(null);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [reviewAcknowledged, setReviewAcknowledged] = useState(false);
  const filingDateSupport = getEmbeddedDatasetSupport(input.filingDate);
  const embeddedBundle = filingDateSupport.supported ? getEmbeddedDatasetBundle(input.filingDate) : undefined;
  const previewDatasetEntries: Array<[string, DatasetVersionMeta]> =
    filingDateSupport.supported
      ? Object.entries(embeddedBundle!).flatMap(([key, value]) => {
          if (key === "filing_date") return [];
          return [[key, {
            key: value.kind,
            effectiveDate: value.effective_date,
            periodLabel: value.coverage ?? value.effective_date,
            sourceUrl: value.source_url,
            sourceHash: value.source_hash,
            fetchedAt: value.fetched_at,
            notes: value.warnings,
          }]];
        }) as Array<[string, DatasetVersionMeta]>
      : [];

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
    if (key === "state" || key === "county" || key === "householdSize") {
      setReviewAcknowledged(false);
    }
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
    if (!input.filingDate) errs.filingDate = "Filing date is required";
    if (!filingDateSupport.supported) {
      errs.filingDate = filingDateSupport.reason ?? `This build only supports cases filed on or after ${MIN_SUPPORTED_FILING_DATE}`;
    }
    if (input.householdSize < 1) errs.householdSize = "Must be at least 1";
    if (input.totalUnsecuredDebt < 0) errs.totalUnsecuredDebt = "Cannot be negative";
    if (input.monthlyMortgageRent < 0) errs.monthlyMortgageRent = "Cannot be negative";
    if (housingPreview && housingPreview.matched !== "county_exact" && !reviewAcknowledged) {
      errs.reviewAcknowledged = "Review acknowledgment is required when housing is not using an exact county row";
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return false;
    }
    return true;
  };

  const calculate = () => {
    if (!validate()) return;
    try {
      setResult(runMeansTestV2(normalizeLegacyInput(input)));
    } catch (e) {
      setErrors({ state: (e as Error).message });
    }
  };

  const reset = () => {
    setInput(DEFAULT_INPUT);
    setResult(null);
    setErrors({});
    setReviewAcknowledged(false);
    sessionStorage.removeItem(SESSION_KEY);
  };

  const totalCMI = input.incomeSources.reduce((s, src) => s + src.monthlyAmount, 0);
  const preflight = getMeansTestPreflightAssessment({
    bundle: embeddedBundle,
    supportedFilingDate: filingDateSupport.supported,
    state: input.state,
    householdSize: input.householdSize,
    totalCmi: totalCMI,
    debtType: input.debtType,
  });

  // Housing allowance preview (shows as user fills in state/county/household)
  const housingPreview =
    input.state
      ? getHousingAllowanceDetails(input.state, input.county, input.householdSize)
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
            <FilingDateBindingBanner
              filingDate={input.filingDate}
              datasetEntries={previewDatasetEntries}
              supported={filingDateSupport.supported}
              supportReason={filingDateSupport.reason ?? `This UI only supports cases filed on or after ${MIN_SUPPORTED_FILING_DATE}.`}
            />
            <WorkspaceOverview
              filingDate={input.filingDate}
              supported={filingDateSupport.supported}
              supportReason={filingDateSupport.reason}
              state={input.state}
              county={input.county}
              housingPreview={housingPreview}
              totalCMI={totalCMI}
              totalUnsecuredDebt={input.totalUnsecuredDebt}
              preflight={preflight}
            />

            {/* ── Case Information ─────────────────────────────────────── */}
            <Section title="Case Information">
              <div className="grid-2">
                <Field label="Filing Date" error={errors.filingDate}>
                  <input
                    type="date"
                    className={`text-input${errors.filingDate ? " error" : ""}`}
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

              {!filingDateSupport.supported && (
                <div className="housing-hint-warning">
                  Unsupported filing date: {filingDateSupport.reason}
                </div>
              )}
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
                    <div className="housing-hint-meta">
                      Housing source:{" "}
                      <strong>
                        {housingPreview.matched === "county_exact"
                          ? `Exact county row (${housingPreview.matchedName})`
                          : housingPreview.matched === "msa"
                          ? `Grouped ${housingPreview.matchedName} override`
                          : housingPreview.matched === "state_default"
                          ? "Statewide default"
                          : "Emergency fallback"}
                      </strong>
                    </div>
                    {housingPreview.matched !== "county_exact" && (
                      <div className="housing-hint-warning">
                        Review required: this preview is not using an exact county row from the U.S. Trustee chart.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {housingPreview && housingPreview.matched !== "county_exact" && (
                <Field
                  label="Reviewer acknowledgment"
                  error={errors.reviewAcknowledged}
                  note="Required whenever housing uses grouped MSA, statewide default, or fallback data"
                >
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={reviewAcknowledged}
                      onChange={e => {
                        setReviewAcknowledged(e.target.checked);
                        setErrors(prev => ({ ...prev, reviewAcknowledged: undefined }));
                      }}
                    />
                    I understand this housing amount must be verified against the current official county chart before relying on the result.
                  </label>
                </Field>
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
                {input.numVehicles > 1 && (
                  <Field label="Second Vehicle Loan / Lease">
                    <select
                      className="text-input"
                      value={input.hasSecondCarPayment ? "yes" : "no"}
                      onChange={e => set("hasSecondCarPayment", e.target.value === "yes")}
                    >
                      <option value="no">No second vehicle loan or lease</option>
                      <option value="yes">Has second vehicle loan or lease</option>
                    </select>
                  </Field>
                )}
                {input.numVehicles > 0 && input.hasCarPayment && (
                  <Field label="Monthly Car Payment — Vehicle 1" note="Used as the line 13b average monthly debt payment for Vehicle 1">
                    <NumInput
                      value={input.monthlyCarPayment}
                      onChange={v => set("monthlyCarPayment", v)}
                    />
                  </Field>
                )}
                {input.numVehicles > 1 && input.hasSecondCarPayment && (
                  <Field label="Monthly Car Payment — Vehicle 2" note="Used as the line 13e average monthly debt payment for Vehicle 2">
                    <NumInput
                      value={input.monthlySecondCarPayment ?? 0}
                      onChange={v => set("monthlySecondCarPayment", v)}
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
                Insurance &amp; Benefits (Lines 18, 22–23, 25)
              </h4>
              <div className="grid-2">
                <Field label="Term Life Insurance Premiums" note="For debtor's dependents only (Line 18)">
                  <NumInput
                    value={input.monthlyTermLifeInsurance}
                    onChange={v => set("monthlyTermLifeInsurance", v)}
                  />
                </Field>
                <Field label="Health / Disability Insurance + HSA" note="Enter the total actually spent for line 25 items (Line 25)">
                  <NumInput
                    value={input.monthlyHealthInsurance}
                    onChange={v => set("monthlyHealthInsurance", v)}
                  />
                </Field>
                <Field
                  label="Optional Telephones and Telephone Services"
                  note="Only optional services; do not include basic home phone, internet, or basic cell service (Line 23)"
                >
                  <NumInput value={input.monthlyTelecom} onChange={v => set("monthlyTelecom", v)} />
                </Field>
              </div>

              <h4 style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", margin: "0.75rem 0 0.25rem" }}>
                Court Orders, Education &amp; Care (Lines 19–21)
              </h4>
              <div className="grid-2">
                <Field
                  label="Court-Ordered Payments"
                  note="Current monthly payments required by a court or administrative order (Line 19)"
                >
                  <NumInput
                    value={input.monthlySupportObligations}
                    onChange={v => set("monthlySupportObligations", v)}
                  />
                </Field>
                <Field label="Education" note="Only education allowed by Official Form 122A-2 line 20">
                  <NumInput value={input.monthlyEducationEmployment} onChange={v => set("monthlyEducationEmployment", v)} />
                </Field>
              </div>

              <h4 style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", margin: "0.75rem 0 0.25rem" }}>
                Childcare & Special Circumstances (Lines 21–22, 29–30)
              </h4>
              <div className="grid-2">
                <Field
                  label="Childcare"
                  note="Actual monthly childcare costs (Line 21)"
                >
                  <NumInput
                    value={input.monthlyChildcare}
                    onChange={v => set("monthlyChildcare", v)}
                  />
                </Field>
                <Field
                  label="Additional Healthcare — Excluding Insurance Costs"
                  note="Only the amount above the IRS out-of-pocket standard on line 7 (Line 22)"
                >
                  <NumInput
                    value={input.monthlyChronicHealthcare}
                    onChange={v => set("monthlyChronicHealthcare", v)}
                  />
                </Field>
                <Field
                  label="Education Expenses for Dependent Children Under 18"
                  note="Verify the current per-child cap and documentation requirements (Line 29)"
                >
                  <NumInput
                    value={input.monthlyDependentChildEducation}
                    onChange={v => set("monthlyDependentChildEducation", v)}
                  />
                </Field>
                <Field
                  label="Additional Food and Clothing Expense"
                  note="Subject to the line 30 5% cap and documentation requirements"
                >
                  <NumInput
                    value={input.monthlySpecialDietFood}
                    onChange={v => set("monthlySpecialDietFood", v)}
                  />
                </Field>
              </div>

              <h4 style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", margin: "0.75rem 0 0.25rem" }}>
                Priority Claims & Chapter 13 Admin (Lines 35–36)
              </h4>
              <div className="grid-2">
                <Field
                  label="Past-Due Priority Claims"
                  note="Past-due priority claims only; also drives the line 36 Chapter 13 admin deduction"
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
                Housing / median / thresholds effective: {EFFECTIVE_DATE} · Transportation effective: 2026-04-01 · Supported filing dates: {MIN_SUPPORTED_FILING_DATE} and later
              </span>
              <button type="submit" className="calc-btn" disabled={!input.state}>
                Run Means Test →
              </button>
            </div>
          </form>
        )}
      </main>

      <footer className="footer">
        <p>
          Bankruptcy means-test outcomes are legally sensitive. This app now surfaces dataset provenance,
          warnings, and assumptions, but it is still not a substitute for attorney review.
        </p>
        <p>
          Supported scope: cases filed on or after {MIN_SUPPORTED_FILING_DATE} because the embedded transportation dataset begins on 2026-04-01 even though several other embedded datasets begin on 2025-11-01.
        </p>
        <p>Data source: United States Trustee Program · justice.gov/ust/means-testing · Housing / median / thresholds effective {EFFECTIVE_DATE}; transportation effective 2026-04-01.</p>
      </footer>
    </div>
  );
}
