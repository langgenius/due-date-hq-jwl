# 2026-05-27 — Audit drain (Agent ω, data plumbing)

Branch: `design/audit-drain-omega-data-plumbing`

Drains two items from φ's journey audit:

- **D12** — DashboardTopRow missing `paymentDueDate`; "Needs attention"
  dropped filed-but-payment-overdue rows because the dashboard treated
  `'done'` as terminal and never saw the payment due date in the first
  place. Anti-pattern #1 (filing extension ≠ payment extension) was
  invisible on the surface that users land on most often.
- **D16** — `ClientDetailDrawer`, `ClientPeekHoverCard`,
  `ClientSummaryStrip`, and `ClientFactsWorkspace`'s work-plan summary
  all called `Date.now()` directly. The day-math drifts whenever the
  firm's wall-clock (timezone) differs from the user's browser,
  flipping "Xd late" readings by a day.

## D12 — DashboardTopRow paymentDueDate

### Contract change

`packages/contracts/src/dashboard.ts` — `DashboardTopRowSchema` gains
`paymentDueDate: z.iso.date().nullable()`. Null when the obligation has
no payment side (info-only filings). The ports shape
(`packages/ports/src/dashboard.ts`) mirrors the change as
`paymentDueDate: Date | null` (the repo layer threads `Date` objects;
the server handler serializes to ISO strings via `toDateOnly`).

The repo layer already selected `paymentDueDate` off
`obligation_instance` (see `packages/db/src/repo/dashboard.ts` line 615) and `composeDashboardLoad` spreads the raw row into the top-row
draft — so the field flowed through automatically once the type was
widened. Added a focused passthrough test in
`packages/db/src/repo/dashboard.test.ts` that pins the behavior against
accidental refactors.

### Server handler

`apps/server/src/procedures/dashboard/index.ts` — `DashboardRepoTopRow`
interface gains `paymentDueDate: Date | null`. `toTopRow` serializes
via `toDateOnly` when present, null when absent. No PII or role-gate
implications (`paymentDueDate` is just a date; it doesn't carry dollar
amounts so the `hideDollars` mask doesn't touch it).

### Render layer

`apps/app/src/features/obligations/payment-overdue.ts` (new) — canonical
`isPaymentOverdue(paymentDueDate, asOfDate)` and
`paymentOverdueDays(paymentDueDate, asOfDate)` helpers. Falls back to
`Date.now()` when `asOfDate` is null. Test file alongside.

`apps/app/src/features/dashboard/actions-list.tsx` — `RowMeta` now
takes `paymentDueDate` + `asOfDate` and renders a destructive-tone
"Payment N days late" chip when payment is overdue, regardless of
filing status. Payment-late wins precedence over filing-late because a
filed row's "Xd late" is misleading — the action the CPA still has to
take is the payment, not the filing.

`DASHBOARD_TERMINAL_STATUSES` shed `'done'` — keeping only `'paid'`
and `'completed'` (which already cover both sides). This lets a
filed-but-payment-overdue row stay in the top-rows pipeline so the
"Needs attention" surface can render the new chip.

### Tests

- `packages/db/src/repo/dashboard.test.ts` — added paymentDueDate
  passthrough test (rows with and without payment dates).
- `apps/app/src/features/obligations/payment-overdue.test.ts` (new) —
  helper unit tests (parseability, fallback, plural edges).
- `apps/app/src/features/dashboard/actions-list.test.tsx` — added a
  filed-but-payment-overdue rendering test; updated existing fixtures
  to include `paymentDueDate: null`.
- `packages/contracts/src/contracts.test.ts` — updated DashboardLoad
  output fixtures to include `paymentDueDate: null`.

### Lingui

New msgid `{paymentLateDays, plural, one {Payment # day late} other {Payment # days late}}`.
Added zh-CN translation `付款逾期 # 天` (Chinese has no plural marker so both
forms render identically). `pnpm run i18n:compile` passes strict.

## D16 — asOfDate threading

### New hook

`apps/app/src/features/firm/use-firm-as-of-date.ts` — `useFirmAsOfDate()`
returns today's date in the firm's configured timezone, formatted as
`YYYY-MM-DD` via `en-CA` (matching the server's `dateInTimezone`
helper). Uses `usePracticeTimezone()` so the hook resolves the same
firm clock the rest of the app reads.

### Threaded surfaces

- `apps/app/src/features/clients/ClientDetailDrawer.tsx` — `NextDueLine`
  takes `asOfDate` prop, falls back to `Date.now()` for parseability
  failures.
- `apps/app/src/features/clients/ClientPeekHoverCard.tsx` — `PeekNextDue`
  takes `asOfDate` prop, same fallback.
- `apps/app/src/features/clients/ClientSummaryStrip.tsx` — `todayTs`
  derives from `asOfDate` (with a midnight-of-now fallback). Drives
  both `isAtRisk` and the "Xd late" / "in Xd" subline.
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — work-plan
  summary now anchors on `useFirmAsOfDate()` instead of
  `formatDate(new Date().toISOString())`.

`client-detail-model.ts` already took `asOfDate: string` — no changes
needed; the call sites just hand it the right value now.

### Tests

`apps/app/src/features/clients/client-detail-model.test.ts` already
exercised `asOfDate` thoroughly. All 39 client tests still pass.

## Verification

- `apps/app` tsc: clean
- `apps/server` tsc: clean
- `packages/contracts` tsc: clean
- `pnpm test --run` across `apps/app`, `apps/server`, `packages/db`,
  `packages/contracts`: all green (398 + 303 + 102 + 30 = 833 tests
  passing)
- `pnpm run i18n:compile --strict`: passes

## Why this matters (design rationale)

D12 fixes a class of "invisible work" — a filing extension lulls users
into thinking the obligation is done, but the IRS does NOT extend the
payment deadline. Today, once an obligation hits `done`, it drops out
of the dashboard. The CPA only catches the unpaid balance via the
client-detail page if they happen to look there. The new chip surfaces
"Payment 23 days late" on the dashboard's "Needs attention" cluster —
the surface CPAs land on first thing in the morning.

D16 is unglamorous plumbing — the "Xd late" readings on the dashboard
already anchored on `asOfDate`, but client surfaces drifted. A firm in
Pacific time looking at the app at 10pm PT would see different day
counts on the client page than on the dashboard, because the dashboard
used the firm clock while the client surfaces used the browser clock.
Threading the same `asOfDate` everywhere keeps the day-math
consistent — a small UX fix with no visual signal except "you stop
seeing day numbers that contradict each other."
