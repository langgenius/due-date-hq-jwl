# Page feedback: import naming/history + /today polish

_2026-06-22_

Surgical fixes from a /today feedback pass.

## Import history crash (bug)

`features/migration/ImportHistoryDrawer.tsx` — opening **Import history from inside
the migration wizard** crashed. The drawer called `useSidebar()` (to auto-collapse
the rail), which **throws** when no `SidebarProvider` is in scope. The wizard is
rendered by `MigrationWizardProvider`, which wraps **above** `AppShell` (where the
`SidebarProvider` lives) — so in the wizard there is no sidebar in scope and the
hook threw. (`/clients` mounts the same drawer inside `AppShell`, so it worked
there — masking the bug.) Fix: switch to the non-throwing `useOptionalSidebar` and
guard the call (`sidebar?.setAutoCollapsed(...)`) — works in both contexts, just
skips the auto-collapse in the wizard (which already owns the viewport).

## "Import data" → "Import clients"

`features/dashboard/add-menu.tsx` — the `+` menu said "Import data" (vague). Renamed
to **"Import clients"**, matching every other entry point (create-choice-cards,
ClientsEmptyState, the deadlines empty state). Reuses the existing catalog string.

## /today polish

- **Segmented sliding indicator** (`packages/ui/segmented.tsx`) — the active fill
  used to snap between options; now a measured indicator **slides** (`transition-
[left,width] 200ms`). CSS-only (packages/ui carries no motion lib): a
  `useLayoutEffect` measures the active button's `offsetLeft`/`offsetWidth` and a
  `ResizeObserver` re-measures on label/count width changes; buttons sit above via
  `relative z-10` with a transparent border for stable sizing. Verified pixel-exact
  live (indicator tracks the active option's box and animates between). Covers both
  the Priorities window filter and the View-scope toggle.
- **Daily-brief action pill** (`daily-brief-card.tsx`) — hover now tints to the
  accent (`bg-state-accent-hover` + accent border) instead of the neutral section bg.
- **Shortcut help dialog width** (`ShortcutHelpDialog.tsx`) — `1100px` was far too
  wide (sparse rows); tightened to `720px`.

## Client-name link + tooltip (item #1)

The Priorities **client name** was a plain span. Per the user's call, it's now its
OWN link to the client page (`clientDetailPath`) with a hover/focus underline and a
`View {client}` tooltip (the polished, centralized `TooltipContent`). Because the
row itself opens the _deadline_, the link stops propagation on click + Enter/Space
so the two targets never fire together. (The Tooltip primitive was already polished

- centralized — every real tooltip shares it — so "have you polished the tooltip
  elsewhere" was already yes.)

## Verification

tsgo app + ui 0 · i18n extract 0 (zh-CN Missing 0; net −1 string) · compile --strict
0 · build green · app tests 550 passed / 2 skipped.
