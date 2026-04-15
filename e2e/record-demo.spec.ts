/**
 * Playwright script that records a demo of the means test calculator.
 *
 * Usage:
 *   1. Start the dev server:  npm run dev
 *   2. Run this script:       npx playwright test e2e/record-demo.ts
 *
 * Output: demo.mp4 in the project root.
 */
import { test } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";

// Helper: slow-scroll to a target element so the viewer can follow along
async function smoothScrollTo(page: import("@playwright/test").Page, selector: string) {
  await page.evaluate(async (sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // wait for the smooth scroll to settle
    await new Promise((r) => setTimeout(r, 800));
  }, selector);
}

test("record demo walkthrough", async ({ page }) => {
  // ── 1. Navigate — show the empty form and workspace overview ───────────
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // ── 2. Scroll to the demo button at the bottom of the form ─────────────
  await smoothScrollTo(page, '[data-testid="demo-btn"]');
  await page.waitForTimeout(1000);

  // ── 3. Click the demo button to load pre-filled data ───────────────────
  const demoBtn = page.getByTestId("demo-btn");
  await demoBtn.click();
  await page.waitForTimeout(1500);

  // ── 4. Scroll back to top to show filled overview/preflight ────────────
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(2000);

  // ── 5. Scroll through each section with pauses ─────────────────────────
  // Case Information
  await smoothScrollTo(page, ".section:nth-of-type(1)");
  await page.waitForTimeout(1500);

  // Income section
  await smoothScrollTo(page, ".section:nth-of-type(2)");
  await page.waitForTimeout(1500);

  // Transportation section
  await smoothScrollTo(page, ".section:nth-of-type(3)");
  await page.waitForTimeout(1500);

  // Expense Deductions section
  await smoothScrollTo(page, ".section:nth-of-type(4)");
  await page.waitForTimeout(1500);

  // Debt Summary section
  await smoothScrollTo(page, ".section:nth-of-type(5)");
  await page.waitForTimeout(1500);

  // ── 6. Scroll to the Run Means Test button ─────────────────────────────
  await smoothScrollTo(page, ".calc-btn");
  await page.waitForTimeout(1000);

  // ── 7. Click "Run Means Test" ──────────────────────────────────────────
  await page.click(".calc-btn");
  await page.waitForTimeout(2000);

  // ── 8. Scroll through the results ──────────────────────────────────────
  // Verdict
  await smoothScrollTo(page, ".verdict");
  await page.waitForTimeout(2000);

  // Stats grid
  await smoothScrollTo(page, ".result-grid");
  await page.waitForTimeout(2000);

  // Deductions table
  await smoothScrollTo(page, ".deductions-table");
  await page.waitForTimeout(2000);

  // Threshold analysis
  await smoothScrollTo(page, ".threshold-analysis");
  await page.waitForTimeout(2000);

  // Audit panel
  await smoothScrollTo(page, ".audit-panel");
  await page.waitForTimeout(2000);

  // ── 9. Scroll back to verdict for a final look ─────────────────────────
  await smoothScrollTo(page, ".verdict");
  await page.waitForTimeout(2000);
});
