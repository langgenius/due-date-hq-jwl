# /clients audit pass + cross-route consistency cleanup

**Date:** 2026-05-27
**Branch:** `design/audit-drain-pass-1`
**Source:** `docs/Design/clients-critique-2026-05-27-audit-pass.md` + cross-route consistency items (Detail-1..3, List-1..3) + page-width / responsive sweep.

## Shipped

### Critical (P0 from live pass)

- **L2** `FixNeedsFactsSheet` counter "0 of  fixed · 1" — broken `Plural` interpolation. Replaced with `<Trans>{fixedCount} of {totalCount} fixed</Trans>` and dropped the now-unused `Plural` import.
- **L4** UUID leak in AI Next-step copy — `clientRiskFallback(clientId)` was embedding the raw client UUID into a CPA-facing instruction. Dropped the suffix; helper now takes zero args.
- **L1 / P0-peek cluster** — documented as intentional hybrid behavior in
  `docs/Design/page-family-canonical.md` (new "Peek vs full-nav contract" section). `/clients` is the home page; opening a drawer over its own list is redundant, so `ClientDrawerProvider.openDrawer` no-ops on `pathname === '/clients'`. The Quick peek menu item and ⌘-click affordances resolve to full nav as a documented side effect.

### High-impact (P1)

- **L10** Obligation panel header conflicting status signals — for `'paid'` rows the panel was rendering "FILING DEADLINE green (Filed)" beside "INTERNAL TARGET 72 DAYS OVERDUE" (red). Root cause: `internalPast` gated on `!isTerminal` while `isTerminal` covers `'done'/'completed'` and `filingSatisfied` covers `'done'/'paid'/'completed'`. Switched the gate to `!filingSatisfied`.
- **L10 follow-up** 72-vs-73 day-count off-by-one between panel and row — panel used `Math.round(midnight - midnight)` and the row used the canonical `paymentOverdueDays(obligation, Date.now())` with `Math.ceil(real-now - midnight)`. Routed both through `paymentOverdueDays`.
- **L9** Right-panel layout squeeze — when the obligation panel opens it cramps the left column to ~40% width. Added a `compact` mode driven by `panelOpen = activeObligationId !== null`:
  - `ClientDetailTabTrigger` accepts `compact` → hides text labels via `[&_[data-tab-label]]:sr-only` so the strip becomes icon-only without losing screen-reader announcement.
  - `ClientSummaryStrip` accepts `compact` → switches from `flex-wrap` to `flex-nowrap overflow-x-auto`.
  - `CreateObligationDialog` accepts a custom `trigger`; pass an `icon-sm` plus button when compact.
- **L11** Workpapers empty state — added "Add workpaper" stub button to the Evidence-tab Workpapers section. Click fires a sonner `toast.info("Workpaper upload is coming soon")` until ingest lands.

### Medium / polish (P2 + L#)

- **L3** Filing plan rows → real `<table>` — `FilingPlanYearSection` body was nested `<div>`s. Converted to `<table className="w-full min-w-[520px] table-fixed">` with `<thead>`/`<tbody>`/`<tr>`/`<td>`. Outer `overflow-x-auto` wrapper handles narrow viewports so the 5 columns don't collide on mobile. Per-row click + nested-button stopPropagation pattern preserved.
- **L5** Title switcher dropdown — "Arbor & Vale LLCCA · llc" → "Arbor & Vale LLC" / "CA · LLC". Wired `useEntityLabels()` for the canonical label map and fixed the missing whitespace via `[entry.state, entityLabels[entry.entityType]].join(' · ')`.
- **L6** `?tab=discover` → `?tab=opportunities` — finished the rename. `parseAsStringLiteral`, hotkey, click handler, value props, and the `ClientDetailTabKey` union all updated. No backwards-compat shim; legacy deeplinks fall through to the default Work tab.
- **L8** "At risk" tile → "Blocked" — the SummaryStrip tile's count included blocked + efile-rejected + payment-overdue + past-due-non-terminal, but the click destination filtered `?status=blocked` only. Narrowed the count to `o.status === 'blocked'` and relabeled the tile so count and destination agree.
- **L13** "Explain Risk" button on Work tab — verified not reproducing. Base UI `Tabs.Panel` only mounts the active panel; no dead DOM nodes.
- **P2-1 / §2-Q3** "Next due" tile shows form code → label renamed "Next filing" so value (form code) matches label.

### Cross-route consistency batch (Detail-1..3, List-1..3)

- **Detail-1** `ClientSummaryStrip.TileShell` → canonical `StatTile`. Added `muted` tone to `StatTile` (text-tertiary) for always-rendered slots whose value is empty. Dropped dead `subline`/`sublineTone`/`warning` code (~80 lines).
- **Detail-2** `InfoBanner` — already used consistently on both surfaces; no change.
- **Detail-3** LLC entity chip — investigated, intentional variation per surface density.
- **List-1** `ClientsActionStrip` needs-facts banner — chrome aligned to canonical `InfoBanner` shape (rounded-md, subtle bg, divider-subtle border). Kept AlertTriangle + destructive-primary button to differentiate "warning + action" from "tip + dismiss."
- **List-2** `ClientFilingStateChips` → canonical `JurisdictionCode` chips from `rules-console-primitives`.
- **List-3** `ClientAssigneeAvatar` → delegates assigned-name case to canonical `AssigneeAvatar`. Only the null-name silhouette stays local (different unassigned IA per surface).

### Page-width unification (earlier in session)

Migrated drift sites to canonical Tailwind tokens (`max-w-page-narrow` / `wide` / `expanded`):
- `/workload`, `/settings`, `/readiness`, `/billing/checkout`, `/migration.new` — to tokens
- `/clients`, `/clients/[id]`, `/rules/pulse` — unified at `max-w-page-expanded` (1440)

### Responsive sweep (375 / 768 / 1280 / 1440 / 1920)

Two regressions found while auditing, fixed in-flight:
1. Filing plan table overflowed on mobile (375) — wrapped in `overflow-x-auto` + `min-w-[520px]`.
2. Tab strip clipped last tab on mobile — added `overflow-x-auto` to `TabsList`.

## Tradeoffs

- Peek strategy (P0-1/2/3 + L1) — chose "hybrid + docs" over consolidation. Documents the intentional behavior in `page-family-canonical.md`. Doesn't fix the silent `⌘-click` no-op on `/clients`, by design.
- L8 "At risk" → "Blocked" — narrows the tile semantics to match the destination filter. Loses the broader at-risk signal (payment-overdue, efile-rejected) from the tile, but those rows still have row-level chips in the filing plan.
- L9 compact mode is binary on `panelOpen` regardless of viewport; at 1920px+ the tabs could fit labels with the panel open, but the binary keeps the implementation simple.
- L6 rename — no backwards-compat for `?tab=discover` deeplinks; they fall to the default Work tab.

## Files changed

```
apps/app/src/components/patterns/stat-tile.tsx
apps/app/src/features/clients/ClientFactsWorkspace.tsx
apps/app/src/features/clients/ClientSummaryStrip.tsx
apps/app/src/features/clients/ClientTitleSwitcher.tsx
apps/app/src/features/clients/FixNeedsFactsSheet.tsx
apps/app/src/features/workload/workload-page.tsx
apps/app/src/routes/billing.checkout.tsx
apps/app/src/routes/clients.$clientId.tsx
apps/app/src/routes/clients.tsx
apps/app/src/routes/migration.new.tsx
apps/app/src/routes/obligations.tsx
apps/app/src/routes/readiness.tsx
apps/app/src/routes/rules.pulse.tsx
apps/app/src/routes/settings.tsx
apps/server/src/procedures/clients/index.ts
docs/Design/page-family-canonical.md
```

Net: 16 files, +466 / −722.

## Outstanding (deferred)

From the audit doc, NOT done this pass:
- **P1-1** Split `ClientFactsWorkspace.tsx` (5,672 lines) into list / detail / work-plan / fact-panels files
- **P1-3** Lazy-gate `riskSummary` / `pulseHistory` / `audit` queries on `activeTab === 'activity'`
- **P1-4** Replace N+1 pulse-detail queries with server-side `pulse.getDetailsBatch` endpoint
- **L7** Two surfaces named "Opportunities" — per-client tab should likely be "Suggested forms"
- **L12** "Forms catalog 8 applicable · 8 gap" header copy clarity
- **Q5** Extract `useClientNextDue(clientId)` hook to dedupe next-due math across drawer / hover / page
- **P2-2** "Client info" tab count "(1)" lacks tooltip
- **P2-4** Eyebrow back-link uses hand-rolled `<Link>` instead of canonical `breadcrumbs` prop
- **P3-2/3/5** General cleanup (unused props, dead imports, Eye-icon focus/tab order)
