# 2026-05-24 — Microcopy + dead-chip honesty (clarify)

## Why

Critique flagged a cluster of P1 microcopy + dead-affordance issues:

1. State chips in H1 cluster (CA, NY, +2) used the same `Badge`
   treatment as the live owner pill they sit next to — first-timer
   CPAs waste ~30s trying to click them. They're not clickable
   today; the maintainer mutation doesn't exist yet.
2. "Internal Deadline" vs "Official Deadline" column headers had no
   tooltip — many firms use both terms but with conflicting meanings.
3. "Activity scope" section header was coined jargon — chips below
   read clearer than the label.
4. At-risk tile subline said "Blocked or overdue" with no form codes
   — the page had the data in memory, the tile was just teasing.

## What changed

### `ClientFactsWorkspace.tsx`

**`ClientFilingStateChips`** — demoted to plain monospace tokens:

- Was: `<Badge variant="secondary">` (looks tappable)
- Now: `<span className="font-mono uppercase text-text-secondary">`
  joined by middots, with a single `title` tooltip listing all states
- Live chips in the cluster (owner, readiness, add-state) keep their
  badge treatment so live-vs-dead distinction reads instantly

**Column header tooltips** — added `title` to Internal Deadline and
Official Deadline columns:

- Internal: "The firm-side soft target — when this filing should be
  ready internally for the deadline window"
- Official: "The IRS / state statutory due date — the hard deadline
  the filing must be submitted by"

### `ClientCompliancePosturePanel.tsx`

- "Activity scope" → "Filing activity" (verbal form CPAs use)

### `ClientSummaryStrip.tsx`

**At-risk subline** rewritten to name names:

- 1 form: "1120-S blocked or overdue"
- 2 forms: "1120-S, 1065 blocked or overdue"
- 3+ forms: "1120-S, 1065 + 1 more"
- Pulls `formatTaxCode` from `@/lib/tax-codes` (already used by the
  Next-due tile via `TaxCodeLabel`)
- Added `useMemo` for the at-risk list so we can slice the codes
  without re-filtering

`FilingPlanYearSection` gained `useLingui()` because the new tooltip
strings use the `t` macro.

## Verification

- tsc clean
- lint 0/0
- 17/17 client feature tests pass

## Caveat

The new at-risk subline includes interpolated tax codes (e.g.
"`${codes[0]} blocked or overdue`"). The Lingui catalog will need a
re-extract on the next i18n pass, but the strings are valid Lingui
macros and will be picked up automatically.
