# 87th pass · Layer E — information architecture

Date: 2026-05-26
Branch: `design/eighty-seventh-pass-cluster`

## Goal

Layer E in the A→L audit covers structural IA: tab placement, primary
CTA position, page-header pattern, filter-trigger placement. The
question: do surfaces agree on where things live, or does each page
invent its own chrome?

## TL;DR

**Layer E is largely clean.** No migrations ship in this pass; the
audit confirms the previous several months of "lift to PageHeader"
work has reached its target.

Findings below.

## E1 — `PageHeader` primitive coverage — CLEAN

- 28 `<PageHeader>` instances across the app (counted by grep).
- 1 `<RulesPageHeader>` instance — but this is a **thin string-typed
  adapter over `PageHeader`**, not a parallel primitive. The wrapper's
  own comment documents the choice: "Kept for the string-based call
  sites in `rules.{coverage,library,sources,pulse,temporary,preview}.tsx`
  — the shared primitive accepts ReactNode, but rules pages still pass
  plain strings through their loaders." Both ultimately render the
  same `PageHeader`.

PageHeader API surface (canonical):

| Prop           | Use                                                          |
| -------------- | ------------------------------------------------------------ |
| `breadcrumbs`  | Path back to parent IA — renders in eyebrow slot             |
| `eyebrow`      | Fallback eyebrow when no breadcrumbs                         |
| `eyebrowAside` | Right-side eyebrow content (status pill, archive button)     |
| `title`        | Page subject (24px / 600)                                    |
| `description`  | Sub-title body (13px / 400, max 1080px)                      |
| `actions`      | Right-aligned CTA cluster on lg+; wraps below title on small |

Routes that **don't** render a PageHeader and the reason each is
legit:

| Route               | Why no PageHeader                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `migration.new.tsx` | Immersive wizard with its own `WizardShell` step chrome                                     |
| `readiness.tsx`     | Customer-facing portal — different visual language (CPA's client fills it out, not the CPA) |
| `route-title.tsx`   | Not a page — utility for `document.title`                                                   |
| `rules.tsx`         | Pure redirect — no UI                                                                       |
| `two-factor.tsx`    | Immersive auth flow — minimal chrome                                                        |

No drift in this dimension.

## E2 — Tab primitives — INTENTIONALLY MINIMAL

- 2 files import the Base UI `Tabs` primitive
  (`ClientFactsWorkspace.tsx`, `obligations.tsx`).
- 2 files use the project-specific `TabSection` primitive (used for
  _section-frame_ layout within a tab, not for tab UI itself).
- 10 total `<Tabs>` JSX mentions across the app.

Most surfaces (deadlines, clients-list, rules-library, alerts,
calendar, audit, members, opportunities, dashboard, notifications,
practice, billing) are intentionally **single-canvas** — no tabs.
Client-detail is the lone tabbed surface (Work / Client info /
Opportunities / Activity, restructured in task #131). Obligations
uses tabs internally in the drawer.

No drift — tabs are rare by design.

## E3 — Filter-trigger placement — SEMANTIC DIVERGENCE, not drift

`FilterTrigger` primitive lives at `components/patterns/filter-trigger.tsx`.
Its current consumers:

- `/deadlines` (`routes/obligations.tsx`) — 4 instances
- `/alerts` (`features/pulse/AlertsListPage.tsx`)
- `components/patterns/table-header-filter.tsx` (the primitive that
  wraps FilterTrigger for in-table column filters)

`/clients` and `/rules/library` don't use FilterTrigger because their
filter affordances are **structurally different**:

- `/clients` filters on multi-faceted "client facts" (state list,
  entity type, owner, source, pulse-needs-review) — exposed as a
  vertical filter panel inside `ClientFactsWorkspace`, not a toolbar
  popover.
- `/rules/library` uses an active-filter banner above the table +
  per-state-row inline filtering; the filter affordance is the table
  itself.

Each surface has a deliberate filter shape; no clear migration to a
single primitive. Logged here for awareness — if a future pass adds
a "uniform list-page filter bar", this is the inventory.

## E4 — Primary-CTA position — CONSISTENT

All page-level primary CTAs flow through `PageHeader`'s `actions`
slot. Right-aligned on lg+, wraps below title on small viewports.
This is the canonical pattern; no rogue header-action implementations
found outside PageHeader.

Floating action bars (bulk-select toolbars on /deadlines and
/rules/library) live below the page and are deliberately a _different_
primitive (`patterns/floating-action-bar.tsx`) — they only show when
the user has selected rows.

## Deferred patterns flagged for future passes

Not migrations for this pass, but worth surfacing:

- **`RulesPageShell` (5 instances)**: rules-family page shell that
  adds rules-specific chrome (active-filter banner, sub-page tabs).
  Not a competing PageHeader replacement, but the abstraction
  boundary between "page chrome via PageHeader" and "section chrome
  via RulesPageShell" could be made more explicit in the design doc.

- **Filter affordance unification**: deferred per E3 above. If
  Layers F–H surface broader content / state-pattern drift on these
  list pages, a unified `<ListPageShell>` primitive might land
  together with that work.

## Verification

No code changes ship this pass — pure audit. `pnpm exec tsc --noEmit`
state unchanged.

## Cumulative tally (Layers A → E)

| Layer            | What snapped to a token / primitive    | Sites                                               |
| ---------------- | -------------------------------------- | --------------------------------------------------- |
| A (app)          | `tracking-eyebrow`                     | 33                                                  |
| A (ui+marketing) | `tracking-eyebrow`                     | 4                                                   |
| A-tight          | `tracking-eyebrow-tight` (new token)   | 8                                                   |
| B1 (app)         | `disabled:opacity-50`                  | 4                                                   |
| B1 (ui)          | `data-disabled:opacity-50`             | 1                                                   |
| B2 (app)         | `focus-visible:ring-…`                 | 7                                                   |
| B2 (marketing)   | `focus-visible:ring-…`                 | 16                                                  |
| C1               | `PulseConfidencePill` (extracted)      | 2 files / 5 pill blocks                             |
| D-ease           | `ease-apple` (new token)               | 5                                                   |
| E                | _(audit only — clean state confirmed)_ | 0                                                   |
| **Total**        |                                        | **80 sites · 5 pill blocks deduped · 2 new tokens** |
