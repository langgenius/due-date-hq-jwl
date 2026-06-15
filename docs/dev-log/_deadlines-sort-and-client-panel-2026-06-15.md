# Deadlines: visible sort, by-client rail clustering, client-detail filing panel

_2026-06-15 · design polish on top of the production recreation (see
`deadlines-production-recreation-2026-06-09.md`)_

Four related gaps surfaced while walking the "find a client's filing" flow.
All four are now closed.

## 1. Main list — visible "Sort by" control (incl. by client)

The list could already cluster by `client`/`filing`/`urgency` via the
`group` query param, but the only way to change it was the View → Group-by
submenu. The main page looked sort-less.

- Added a toolbar **`Sort by {Due date|Urgency|Client|Filing}`** pill
  (`FilterTrigger` + `LayersIcon`) in the right cluster, before View.
- It names the active ordering and drives the same `group` param via
  `setObligationQueueQuery`, so it stays in sync with the View submenu.
- `Client` clusters rows under client group headers
  ("● ARBOR & VALE LLC · 3 DEADLINES · 1 LATE").
- File: `apps/app/src/routes/obligations.tsx`. Commit `77b0c88b`.

## 2. Detail-page rail — show it's sorted BY CLIENT

On `/deadlines/:ref` the navigator rail re-orders to match the list's sort,
but by-client order was indistinguishable from any other order.

- `DeadlineNavigatorRail` now renders a sticky client-name header before the
  first row of each client cluster **only when `sortKey === 'client'`**
  (`showClientHeader = index === 0 || prev.clientName !== row.clientName`).
- Pairs with the existing "Sorted by {label}" dropdown.
- File: `apps/app/src/features/obligations/detail/DeadlineNavigatorRail.tsx`.
  Commit `73594b1d`.

## 3. Client detail — filing opens an in-page side panel (was: navigate away)

Clicking a filing on `/clients/:id` used to navigate to the firm-wide
`/deadlines/:ref` page, yanking the user out of client context and dropping
the client filter. Validated via `/design-critique` (context preservation,
nav cost, consistency with how `/deadlines` + `/alerts` use in-place panels) —
decision: slide-in panel, keep the user anchored.

- Filing click now calls `openDrawer(id)` (in-page panel) instead of
  navigate/inline-expand. The right `<aside>` animates rail → ~60% width and
  mounts `ObligationPanelDispatcher`.
- `cmd/ctrl-click` on the title is the escape hatch to the full
  `/deadlines/:ref` page (deep-link / shareable URL preserved).
- Below `xl` the panel takes full width (narrow fallback).
- `DeadlineRow` + `ClientWorkPlanPanel` gained a `compact` prop that drops the
  OFFICIAL DUE + OWNER columns when the panel squeezes the list, fixing the
  fixed-grid column collision.
- Files: `ClientDetailWorkspace.tsx`, `ClientWorkPlanPanel.tsx`,
  `DeadlineRow.tsx`. Commit `d240fec2`.

## 4. nuGN9 (HeroCard banner) — already present, confirmed

Pencil `nuGN9` is the editorial banner (eyebrow date + headline + metric
line). It already ships on the main list. The frame's sub-line carries
`$7,890 penalty exposure` and `est. 3h focus` — both deliberately **omitted**
(penalty UI hidden in `ea886787`; ETA/dollar figures are on the no-fiction
banned list). The live metric line is the factual subset:
`28 filings tracked · across 10 entities`. No change needed.
