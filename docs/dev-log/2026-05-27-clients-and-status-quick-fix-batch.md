# 2026-05-27 Clients And Status Quick-Fix Batch

## Context

Yuqi flagged a batch of UX issues on `/clients` and the status pill family while
running a polish pass on the design-system surfaces:

- `/clients` table rows had no visible dividers between rows (looked like one
  gray slab against the `bg-background-default/50` body).
- The States column was 220px wide to fit `"[icon] California"` style pills,
  but `/deadlines` renders the same data as `"[icon] CA"` — two surfaces, two
  different state-cell vocabularies.
- The `/clients` table header said `Owner`, while every other workbench table
  (`/deadlines`, audit-log table, migration mapping target labels) says
  `Assignee`. Same data point, two labels.
- The obligation status pill rendered with a tinted icon (e.g. blue
  `text-text-accent`) on top of a gray-text Badge variant (`secondary` or
  `outline`). Most visible on the v2-collapsed `extended` status, which
  displays as "In review" but uses `secondary` chrome — gray text + blue icon.

## Changes

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
  - Dropped the `[&_tr]:border-b-0` override on the table body so rows now
    inherit the primitive's `border-b-divider-subtle`. Applied to both the
    live table and the loading-skeleton table.
  - State cell adopted the `/deadlines` pattern exactly — bare `StateBadge`
    SVG + 2-letter postal code, full jurisdiction name moved into the
    `title` tooltip. Column meta narrowed `220px → 140px`.
  - Column header renamed `Owner → Assignee`; toolbar filter label and the
    `FactCheckRow` data label followed for consistency. Empty / search
    placeholders updated to "No assignees" / "Search assignees".
- `apps/app/src/features/clients/CreateClientDialog.tsx` — field label
  `Owner → Assignee`.
- `apps/app/src/features/obligations/status-control.tsx` — `STATUS_ICON_COLOR_ON_PILL`
  overrides the icon tone for the four gray-text variants (`secondary` /
  `outline`) so icon and text now share one color. Tinted variants
  (`info` / `success` / `destructive`) keep their colored icons because
  the pill's text tone already matches.
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po` — `i18n:extract` after
  the source-string rename; manually translated `No assignees → 暂无经办人`
  and `Search assignees → 搜索经办人` to match the existing `Assignee → 经办人`
  catalog entry.

## Out of scope (filed for follow-up)

- `/today` "changes since last visit" hide — no such section exists in
  `apps/app/src/features/dashboard/`. Skipped; reported back to Yuqi.
- `/today` `NeedsAttentionSection` full-width — both `NeedsAttentionSection`
  and the actions-list section are direct children of the same
  `flex flex-col` container at `max-w-page-wide` (1100px), so they inherit
  identical widths. No constraint to remove; skipped pending screenshot.
- `/deadlines` row-divider audit — the table primitive's default
  `border-b-divider-subtle` was already in effect (no `[&_tr]:border-b-0`
  override on its `TableBody`); the divider issue was `/clients`-only.

## Verification

- `pnpm --filter @duedatehq/app exec vp check` → 0 errors, 3 pre-existing
  warnings (none in touched files).
- `pnpm --filter @duedatehq/app i18n:extract` → en 2759, zh-CN 2759, 0 missing.
