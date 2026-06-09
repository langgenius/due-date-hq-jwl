# Deadline detail page → master-detail rebuild (Pencil rzzww), 2026-06-09

**Who/why:** Yuqi — "polish and build the deadline detail page like this, 100%
replicate pixel by pixel … reorganise the structure … wired up correctly …
every tax type, entity type, status." Pencil node **rzzww** (the canonical
`/deadlines/:ref` detail). Decisions this session: full master-detail page
(not a restyled panel); build all four tabs in one pass; Record uses honest
empty-states (no fabricated storage).

## What shipped

**Master-detail page.** `/deadlines/:obligationRef[/:detailTab]` is now its own
route (`apps/app/src/routes/deadline-detail.tsx` → `DeadlineDetailRoute`) — a
380px navigator rail + the detail. The plain `/deadlines` keeps the table
(`ObligationQueueRoute`). Router repointed both detail paths.

- **Navigator rail** (`features/obligations/detail/DeadlineNavigatorRail.tsx`):
  rzzww rows (date + "Nd late" tone, form badge, status, form title, client),
  active row = left accent border + `#fafbfc`, client-side search, load-more.
  Fed by the same `obligations.list` infinite query (default `due_asc`) the
  table uses. App sidebar auto-collapses on the page.
- **Crumb bar** (`features/obligations/detail/DeadlineCrumbBar.tsx`): "‹
  Deadlines / {client} · {form}" + Prev/Next across the loaded rows.

**Drawer `page` mode (reuse, not rewrite).** Added a third `mode` (`page`) to
`ObligationQueueDetailDrawer` so the page reuses ALL the existing detail wiring
(every status/sub-state/tax/entity/jurisdiction branch + every mutation) and
only changes presentation. `panel`/`sheet` (used by `/clients`) are untouched.
In `page` mode: the red top status-banner is dropped (status lives in the hero
pill); the corner close-X is dropped (the crumb bar is the way back); the column
renders flush against the rail (no extra border/shadow).

**Tabs restructured to the locked 4: Status · Materials · Record · Audit.** A
page-mode override on `visibleTabsList` maps onto existing tab values
(Status=summary, Materials=readiness, Record=evidence) and drops Extension +
Risk; the set still adapts per obligation type (a payment row keeps
Status/Record/Audit, no Materials). `tabFallback` now uses the page-aware set so
a legacy `?tab=extension` deep-link bounces to Status. **Audit tab wired** to the
real `ObligationTimeline` (milestone-grouped, fed by `auditEvents`) — it was a
dead deep-link before.

**Penalty exposure card** (`features/obligations/detail/PenaltyExposureCard.tsx`)
on the Status tab — 100% real penalty-engine output already on the row
(`penaltyBreakdown[]`, `accruedPenaltyBreakdown[]`, `estimatedExposureCents`,
`penaltySourceRefs[]`, `penaltyFormulaLabel`). Renders the computed breakdown
verbatim (label + real formula + amount), projected + accrued-to-date headline,
source citation. **Self-hides** when there's no exposure (payment-only /
information / unsupported jurisdiction / not-yet-late) and shows a "needs input"
state when `missingPenaltyFacts` is non-empty. Page-mode only.

**Fiction removed (no-fiction rule).**

- The hardcoded "Expected refund $4,210" + withholding breakdown — deleted (no
  backing contract field). Removed for all surfaces.
- The fake "Source docs · + Add file (coming soon)" affordance — deleted.
- rzzww's "First-Time Abatement · ELIGIBLE" — omitted (no eligibility field;
  asserting it would be fabricated).
- rzzww's "Risk score 62/100" — rendered as the REAL **Priority score**
  (`smartPriority.score` + `riskLevel`), relabelled so it doesn't imply a
  non-existent risk model.

## Verification

`pnpm check` = **0 type/lint errors** in all new/edited files (remaining `vp
check` format flags are pre-existing WIP files). Live preview: navigated the
rail (full 28-row spread — every status: not started / waiting / blocked / in
progress / in review / filed / paid / completed / extended / not applicable;
tax types 1040, 1120-S, 990, 941, 1065, 1041, 1099-NEC, FBAR, TX Franchise,
F-1120, CT-3-S, …; jurisdictions FED/NY/CA/FL/TX/FinCEN). Verified Status (with
real $2,400 penalty + 94/100 Moderate priority), Materials (real 14-item
checklist), Audit (real timeline) render; `/clients` drawer + `/deadlines` table
unaffected. The earlier `SidebarRouteSync` console error was a Fast-Refresh
transient (clears on full reload).

## Follow-ups (not in this pass)

- Fold the Extension decision (Form 7004/4868 + `decideExtension`) into the
  Status tab as a section — currently the Extension tab is hidden in page mode,
  so that action isn't reachable from the page yet.
- rzzww hero TopRow action cluster ("Last activity Nh ago" + Mark received /
  Send reminder / kebab at the top) — actions currently sit in the bottom
  sticky footer (Assign / Snooze / Mark filed).
- Rail order coherence with a _filtered/sorted_ table (today the rail is
  default `due_asc`); swap in the shared list input when extracted.
- Penalty card visual could move toward rzzww's 2-column big-number triptych;
  current version is honest + clean but single-column.
