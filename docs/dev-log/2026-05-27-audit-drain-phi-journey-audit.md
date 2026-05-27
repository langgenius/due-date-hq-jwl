# 2026-05-27 — audit-drain phi: journey audit (J1-J6)

Agent φ (phi-journey-audit), wave-6 drain pass.

Methodology shift from prior surface-by-surface audits (ρ, σ, τ, υ):
walk real CPA journeys end to end, identify drift between "what the
user needs to see" and "what the product surfaces."

Six journeys walked. Full walk + drift table in
[docs/Design/journey-audit.md](../Design/journey-audit.md).

## Shipped (11 of ≤18 cap)

All driven by **J1 — "I filed but haven't paid yet"** — the
journey that broke the 71-day-overdue payment Yuqi flagged as
"buried 4 layers deep."

| #   | Drift ID | Journey | File                               | One-liner                                                                                                                                                   |
| --- | -------- | ------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | D1       | J1, J3  | `ClientSummaryStrip.tsx`           | `isAtRisk` now picks up payment-overdue rows (no longer filtered out by `TERMINAL_STATUSES.has('done')`)                                                    |
| 2   | D2       | J1      | `ClientPeekHoverCard.tsx`          | New "Payment overdue on N filings" line in identity subtitle                                                                                                |
| 3   | D3       | J1      | `ClientDetailDrawer.tsx`           | Same payment-overdue line in the legacy drawer peek                                                                                                         |
| 4   | D4       | J1, J3  | `ClientFactsWorkspace.tsx`         | Header pill gains new `filed-payment-overdue` priority slot (destructive tone, ahead of `extension-payment-due` and `extended`)                             |
| 5   | D5       | J1, J3  | `ClientFactsWorkspace.tsx`         | Filing-plan row carries inline red "Payment Nd late" chip next to the Filed status pill                                                                     |
| 6   | D6       | J1      | `routes/obligations.tsx`           | `/deadlines` queue Status cell adds a red "Payment Nd late" Badge alongside the status pill                                                                 |
| 7   | D7       | J1      | `routes/obligations.tsx`           | Drawer header chip cluster gains "Payment N day(s) late" chip when paymentDueDate has slipped, regardless of lifecycle status                               |
| 8   | D8       | J1      | `routes/obligations.tsx`           | `PrimaryDeadlineStrip` no longer collapses to compact-terminal when payment is overdue — falls through to the 3-tile strip so the Payment tile can light up |
| 9   | D9       | J1      | `routes/obligations.tsx`           | Payment tile in the 3-tile strip now paints `tone="destructive"` (red surface, not just red value) when overdue                                             |
| 10  | D10      | J1      | `client-detail-model.ts` (+ tests) | New `findFiledWithoutPaymentObligations` helper + `filedPaymentOverdueCount` on `ClientWorkPlanSummary` — backs D4                                          |
| 11  | D11      | J1, J3  | `ClientSummaryStrip.tsx`           | At-risk subline copy switches "blocked or overdue" → "payment overdue" when every at-risk row is payment-overdue specifically                               |

## Deferred (7)

| #   | Drift ID | Journey | Reason                                                                                                                                   |
| --- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 12  | D12      | J1      | `DashboardTopRow` schema lacks `paymentDueDate` — fix requires contract change (`packages/contracts/src/dashboard.ts`), out of phi scope |
| 13  | D13      | J1      | Calendar iCal feed inclusion logic lives server-side; out of scope (`apps/server`)                                                       |
| 14  | D14      | J1      | Audit-log "missed payment deadline" event is a new feature — deferred to wave 7                                                          |
| 15  | D15      | J1      | Notification trigger on payment-date slip is a new feature — deferred to wave 7                                                          |
| 16  | D16      | J3      | asOfDate threading through ClientSummaryStrip + filing-plan rows is the same drift as prior-audit #83 — deferred                         |
| 17  | D17      | J5      | "Changes since last visit" surface is a new feature — deferred to wave 7                                                                 |
| 18  | D18      | J2      | Dashboard 17-element above-the-fold density at 60-client firms — UX call, not a fixable drift this pass                                  |

## Test results

- `pnpm exec tsc --noEmit` — clean
- `pnpm i18n:compile --strict` — strict-pass (zh-CN: 10 new strings translated)
- `pnpm test --run src/features/clients src/features/dashboard` — 33/33 pass (includes 2 new `client-detail-model.test.ts` cases for Lakeview J1 fixture)
- `pnpm test --run src/routes/obligations.test` — 41/41 pass

## Design pattern that emerged

Two rules for any future drain pass that touches obligation status:

1. **`status` and `paymentDueDate` are independent.** Don't conflate
   "filing leg closed" with "obligation closed." Any helper named
   `TERMINAL_STATUSES` should be scoped to one of the two legs.
   `'completed'` and `'not_applicable'` are the only statuses that
   close every leg.
2. **A buried signal is invisible.** Yuqi's framing — "71 days
   overdue, buried 4 layers deep" — is the right test. Every live
   signal (red tone, date-past, AI alert) must surface at the
   shallowest scan distance where the user CAN act on it.

## Branch + commit

- Branch: `design/audit-drain-phi-journey-audit`
- Commit: see git log (latest)
