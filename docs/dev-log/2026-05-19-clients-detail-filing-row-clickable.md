---
title: 'Clients detail — filing rows open obligation drawer + interactive audit'
date: 2026-05-19
area: app
---

# Clients detail — filing rows click-through

The Filings & deadlines table looked tappable but did nothing on click.
This change wires the rows to the existing obligation detail drawer,
and audits every other interactive surface on the page to confirm
nothing else is a dead end.

## Filing rows are now clickable

Wired `TableRow` in `ClientWorkPlanPanel` to navigate to
`/obligations?id={obligationId}&drawer=obligation` — the URL contract
that the Obligations queue route uses to open its detail drawer
(see `apps/app/src/routes/obligations.tsx` line ~285 for the param
parsers and line ~946 for the drawer-open condition).

Specifically:

- Added `obligationDrawerHref(obligationId)` helper (local to the file
  to mirror the in-file pattern in
  `apps/app/src/features/rules/generation-preview-tab.tsx`).
- Used `useNavigate()` from react-router. Click → `navigate(href)`.
  Cmd/middle-click would currently fall through; if we want to support
  open-in-new-tab on the rows we'd switch to `Link` rendering.
- Made the row keyboard-accessible: `role="link"`, `tabIndex={0}`, and
  Enter/Space handlers that mirror the click.
- `aria-label` reads "{taxType} — {dueDate}" so screen readers
  announce the row's identity.
- Visual: `cursor-pointer` + `hover:bg-state-base-hover` +
  `focus-visible:bg-state-base-hover` (no outline; the bg signals
  focus alongside Tab nav).

## Interactive audit — everything else

Ran an audit across `ClientDetailWorkspace` and its sub-components
(alerts band rows, jurisdiction panel, risk inputs, AI risk summary,
fact checklist, activity log, opportunities card, Sheet header, full-
page route). All interactive surfaces are wired:

- **"Open full view"** (Sheet header) → `/clients/{id}` ✓
- **"Back to clients"** (full page header) → `/clients` ✓
- **Filing row click** → `/obligations?id=X&drawer=obligation` ✓ (new)
- **Alerts band — Radar row "View on Radar"** → `/rules/pulse` ✓
- **Alerts band — Missing facts "Add facts"** → `/clients/{id}` ✓
  (lands on this same page; deep-link into Filing jurisdictions edit
  mode is a future polish)
- **Alerts band — Extension/payment row**: no CTA (intentional; the
  obligations table immediately below shows the affected rows)
- **AI Risk Summary "Refresh"** → `clients.requestRiskSummaryRefresh`
  mutation ✓
- **Filing jurisdictions "Edit"** → local edit-mode toggle ✓
- **Filing jurisdictions "Save"** → `clients.replaceFilingProfiles`
  mutation ✓
- **Risk inputs "Save"** → `clients.updateRiskProfile` mutation ✓
- **DetailSection triggers** → built-in Collapsible state ✓
- **Source / Readiness / Radar / entity / state chips** — display-only,
  no handlers (intentional; they're status badges, not affordances)
- **Activity log entries** — display-only (intentional; this is an
  audit trail)

No dead ends detected.

## Known follow-ups (not wired today)

- **Missing facts "Add facts"** could deep-link to
  `?section=jurisdictions&edit=true` once we add section anchors +
  an edit-from-url affordance.
- **Radar pill in the identity strip** is read-only — it could link
  to `/rules/pulse` when we want it clickable.
- **Filing row open-in-new-tab** — switch `TableRow` to a `<Link>`-
  rendered wrapper if Cmd/middle-click support is wanted.

## Files

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`:
  - Added `useNavigate` import.
  - Added `obligationDrawerHref()` helper.
  - Wrapped each `TableRow` in click + keyboard handlers + a11y attrs.

## Validation

- `pnpm check` clean (579 files, 0 warnings, 0 errors).
- `pnpm --filter @duedatehq/app test -- --run` — 40 files, 209 tests.
- Manual: hard-refresh `http://localhost:5178/clients/<id>`. Hover a
  filing row → background highlights. Click → navigates to
  `/obligations?id=...&drawer=obligation` and the obligation drawer
  opens. Tab to a row + Enter → same behavior.
