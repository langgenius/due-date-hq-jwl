# Page-feedback polish — Daily Brief, Actions table, /alerts, sidebar

Date: 2026-06-08

Batch of Yuqi page-feedback items across /today, /alerts, and the sidebar.

## Daily Brief (`daily-brief-card.tsx`)
- **Lighter card:** blue `bg-state-accent-hover` + accent border → white
  `bg-background-default` + neutral hairline (pull colored region back per the
  surface model).
- **Removed the inline "Refresh":** the outdated state is a plain amber
  "Outdated" label again; the right-side icon-only regenerate button handles refresh.
- **FAILED state:** dropped the red left dot; the regenerate moved to an inline
  retry icon right after "FAILED" (and the right-side regenerate hides while
  failed) — calmer, less alarming when a brief fails.

## Actions table (`actions-list.tsx`)
- **Fixed the right-end artifact:** the status-group header was `colSpan={7}` but
  the row has 8 cells (the hover Review column) — the 8th showed white. Now `colSpan={8}`.
- **Lighter row text:** the action verb `text-text-primary` → `text-text-secondary`.
- **Fixed a React key warning:** the `rows.map` returned a keyless `<>` fragment
  (key was on the inner row) → `<Fragment key={row.obligationId}>`.

## /alerts (`AlertsListPage.tsx`, `PulseAlertRow.tsx`)
- **Filter row on one line:** search width capped (`sm:w-[200px]`, was up to 260)
  so Search · List/Map · (spacer gap) · the dropdowns · Sort all fit one line at 1512.
- **Subtle date-group header:** dropped the gray `bg-background-subtle` band and
  lightened the label (12px semibold secondary → 11px medium tertiary); keeps the
  `px-5` inset matching the alert rows.

## Sidebar (`packages/ui/.../sidebar.tsx`)
- Menu items more spaced out (`gap-0.5` → `gap-1`) and more icon↔label breathing
  room (`gap-2.5` → `gap-3`).

Verify: tsgo clean; verified at 1512×861 on /today and /alerts.
