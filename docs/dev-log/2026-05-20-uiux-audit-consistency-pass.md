# UIUX audit — consistency pass on design/preview-integration

Branch: `design/uiux-audit` (forked from `design/preview-integration`).

## Scope

Visual + interaction audit across every protected route and the shared
primitives that compose them. Goals from the brief:

1. Same elements ⇒ same components (so future maintenance edits the token,
   not 11 call sites).
2. DESIGN.md tokens applied consistently — typography, radii, surface tones,
   table chrome, drawer widths.
3. Sidebar destinations all reach somewhere real — no command-palette or
   nav dead-ends.

## Changes

### 1. Shared `PageHeader` primitive

Created `apps/app/src/components/patterns/page-header.tsx`. Single source
of truth for: optional eyebrow (label typography 11px / 0.08em uppercase),
h1 (text-2xl leading-7 semibold text-text-primary), optional description
(text-[13px] leading-5 text-text-secondary, max-w 1080px), and right-side
actions cluster that wraps under the title on `<lg` viewports.

The dashboard "Today" hero stays outside this component — it is
intentionally the larger surface (text-3xl) and the only one with a
day-stamp adornment.

### 2. Page header drift, normalized

| Route         | Before                                             | After                                                |
| ------------- | -------------------------------------------------- | ---------------------------------------------------- |
| obligations   | `text-2xl ... leading-tight` · `text-md` (invalid) | `text-2xl leading-7` · `text-[13px] leading-5`       |
| clients       | `text-xl ... text-sm`                              | `text-2xl leading-7` · `text-[13px] leading-5`       |
| opportunities | `text-xl ... text-sm`                              | `text-2xl leading-7` · `text-[13px] leading-5`       |
| members       | `text-2xl leading-[30px]` · `text-base`            | `text-2xl leading-7` · `text-[13px] leading-5`       |
| practice      | `text-2xl leading-tight` · `text-sm`               | `text-2xl leading-7` · `text-[13px] leading-5`       |
| audit         | `text-2xl leading-tight` · `text-md`               | `text-2xl leading-7` · `text-[13px] leading-5`       |
| notifications | h1 only, no description                            | h1 + description, with consistent actions slot       |
| reminders     | `text-2xl leading-tight` · `text-sm`               | `text-2xl leading-7` · `text-[13px] leading-5`       |
| calendar      | **no h1 at all**                                   | `Calendar sync` h1 + description + back-link cluster |
| workload      | **no h1 at all**                                   | `Team workload` h1 + description + Refresh cluster   |

### 3. Drawer width caps + rounded inside edge

Per DESIGN.md §3.2 ("workflow drawers may scale from 720px to 880px") and
§3.3 (`rounded.lg` is reserved for drawers, modals, command palette).

- Obligation detail drawer: 1120–1180px → **880px**.
- Rule detail drawer: 920px → **880px**.
- Shared `Sheet` primitive: right-side drawers now apply `rounded-l-lg`
  (top-left + bottom-left where the drawer meets the dimmed backdrop).
  Left / top / bottom side variants get the symmetric treatment.

### 4. Table primitive — Coverage parity

The Coverage / Sources / Rule library / Temporary tables were the visual
reference. Every other workbench table was missing the `bg-background-subtle`
header tone. Instead of patching ~10 call sites, baked it into the shared
`<TableHeader>` primitive, plus suppressed the default row-hover on header
rows (`[&_tr]:hover:bg-transparent`). The existing explicit overrides in
Coverage / Sources / Rule library / Temporary still win (cn() append order).

Also tightened `<TableHead>` letter-spacing from `tracking-wider` (≈0.05em)
to `tracking-[0.08em]` to match DESIGN.md `typography.label` (11px / 500 /
0.08em).

### 5. Command palette dead-end removed

`apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx`
previously rendered an "Ask DueDateHQ" entry in its own `ask` group with a
`Coming soon` badge and a no-op `onSelect`. Removed the entry, the `ask`
group, and the corresponding `BotIcon` import. The palette's own input is
the natural fast-find affordance until the assistant lands.

## Verification

- `pnpm check` — 0 errors, 4 pre-existing warnings (unrelated to this PR;
  all in `coverage-tab.tsx`).
- `pnpm test` — 461 passing, 2 pre-existing nuqs-adapter failures in
  `coverage-tab.test.tsx` (unrelated; that file wasn't touched).
- Preview (port 5183, parallel to the running 5177): verified Dashboard /
  Obligations / Clients / Workload / Calendar / command palette render
  with the expected typography, drawer width, and table-header tone.

## Part 2 — same-element-same-component + state surfaces

The first pass landed shared typography but kept the chrome inline.
Part 2 migrates every route to the shared `PageHeader` component (so a
future spec change edits one file, not 11), introduces a shared
`EmptyState` for the empty / no-data surfaces, and replaces the one
plain-text "Loading…" leak on the Rule library page with skeleton lines.

### 6. PageHeader adoption

Every route except Dashboard (intentional hero) and Practice profile
(monogram-tile + role badge variant) now renders its header via the
shared `PageHeader`:

- routes: obligations.tsx · clients.tsx
- features: opportunities, audit, members, notifications, reminders,
  calendar, workload
- rules: `RulesPageHeader` (in rules-console-primitives.tsx) is now a
  thin adapter that forwards string title/description through `PageHeader`,
  so Coverage / Rule library / Pulse / Sources / Temporary / Preview all
  inherit the same chrome too.

The cluster on the right gets the same `flex shrink-0 flex-wrap items-center
gap-2 lg:justify-end` wrapper from `PageHeader`, so action buttons no
longer drift in placement between routes.

### 7. EmptyState primitive

Created `apps/app/src/components/patterns/empty-state.tsx` with the
canonical chrome (dashed-border, centered column, optional icon + title

- description + CTA). Adopted in:

* `routes/obligations.tsx` — private `EmptyState` rewritten as a thin
  adapter around the shared one; the "filtered vs genuinely empty" branch
  logic stays at the call site (the only thing that varies between
  surfaces) while the chrome unifies.
* `features/opportunities/opportunities-page.tsx` — inline 12-line empty
  block collapsed to a 9-line `<EmptyState …>`.
* `features/notifications/notifications-page.tsx` — same.

The dashboard's `EmptyDashboard` and pulse's `EmptyState` / `FilteredEmptyState`
are still local because their CTAs are stacked vertically and span the
full Card width — but they now have a documented shared baseline to
migrate to when those surfaces get their next touch.

### 8. Rule library loading-state

`routes/rules.library.tsx:209` previously rendered a plain
`<Trans>Loading…</Trans>` span for the Coverage / Sources strips. Replaced
with three `<Skeleton>` shapes so the loading surface matches every other
async surface in the app. Trans import dropped (no other strings in the
file used it).

## Files (cumulative)

- new: `apps/app/src/components/patterns/page-header.tsx`
- new: `apps/app/src/components/patterns/empty-state.tsx`
- new: `docs/dev-log/2026-05-20-uiux-audit-consistency-pass.md`
- new: launch config entry `app-5183` (parallel preview port)
- edited: `apps/app/src/routes/{obligations,clients,practice,rules.library}.tsx`
- edited: `apps/app/src/features/{audit,calendar,members,notifications,opportunities,reminders,workload}/*-page.tsx`
- edited: `apps/app/src/features/rules/rules-console-primitives.tsx` (RulesPageHeader → PageHeader)
- edited: `apps/app/src/features/rules/rule-detail-drawer.tsx`
- edited: `apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx`
- edited: `packages/ui/src/components/ui/sheet.tsx`
- edited: `packages/ui/src/components/ui/table.tsx`

## Known still-open follow-ups

These items came out of the second-pass survey but were deferred:

- **Drawer header DRY**: Each of the 7 drawers still rolls its own
  `<SheetHeader>` content. A shared `DrawerHeader` accepting
  `{ eyebrow, title, subtitle, originBreadcrumb, crossLink, actions }`
  would collapse them, but each drawer has bespoke metadata badges that
  need conversion. Not a one-shot fix.
- **OriginBreadcrumb in obligation drawer**: The commit message
  "wire OriginBreadcrumb, kill obligation-drawer dead-end" wired the
  "Open client detail" cross-link but did _not_ wire a from-where origin
  breadcrumb. Worth a follow-up if Pulse / Dashboard deep-links into the
  drawer become common.
- **Practice profile header**: Still uses its own monogram-tile + role-
  badge layout. Could be modeled as `PageHeader leading={...}` if the
  pattern repeats, but right now it's a sample size of 1.
- **Dashboard `EmptyDashboard`**: Local component, could migrate to
  `EmptyState` once the dashboard CTA cluster is stabilized.
