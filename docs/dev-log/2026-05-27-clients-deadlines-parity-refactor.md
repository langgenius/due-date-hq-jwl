# /clients ↔ /deadlines structural-parity refactor

## Context

Yuqi (product designer) flagged that `/clients` looked materially
weaker than `/deadlines` and asked for a refactor that brings the
Clients directory up to the same structural quality bar:

> "you should refactor and restructure this Client page based on
> Deadline page, because the Deadline page just looks much better."

Both surfaces already shared the canonical page chrome (PageHeader +
count chip + bordered table-card frame + responsive page-size hook

- pagination footer). The drift that read as "less polish" lived
  inside the `<Table>` block itself.

## Audit — what /deadlines does that /clients didn't

| Concern               | `/deadlines` (route obligations.tsx)                                                                 | `/clients` (pre-refactor)                                               | Fix                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Row dividers          | Inherits Table primitive default `border-b border-divider-subtle`                                    | Overrode with `[&_tr]:border-b-0` on `<TableBody>`                      | Dropped the override — primitive default restored                           |
| Header typography     | Wraps every `<TableHead>` with `text-sm font-medium normal-case tracking-normal text-text-secondary` | Only passed `meta.headerClassName` — non-sortable headers drifted       | Apply canonical class on every `<TableHead>` via `cn()` merge               |
| Header row hover      | `hover:bg-transparent` on header `<TableRow>` so only data rows respond                              | Inherited the primitive's `hover:bg-state-base-hover` on header         | Header row now `hover:bg-transparent`                                       |
| Body cell typography  | `[&_td]:text-sm` on `<TableBody>` so all cells inherit sm scan-size                                  | Missing — cells inherited the table-default `text-xs`                   | Added `[&_td]:text-sm`                                                      |
| Row hover tone        | Body-level `[&_tr]:hover:!bg-state-accent-hover` (accent tint = future selected state)               | Per-row `hover:bg-state-base-hover` (base tint, less differentiated)    | Move to body-level accent-hover; per-row class no longer overrides          |
| Body background       | `bg-background-default` on `<TableBody>` so solid white stacks over outer card's alpha-white         | None — fell back to primitive `bg-background-default/50` only           | Added `bg-background-default`                                               |
| State cell motif      | `[StateBadge] [2-letter code]` in `text-text-secondary` — `w-[90px]` cell                            | Custom rounded-full pill `[StateBadge] [Full state name]` — `w-[220px]` | Adopt /deadlines motif; widen to `w-[120px]` only to fit "+N" overflow chip |
| Column header label   | "Assignee" (line 2022)                                                                               | "Owner"                                                                 | Rename column header to "Assignee" for cross-table consistency              |
| Skeleton row dividers | N/A (skeleton uses TableRow primitive default)                                                       | Overrode with `[&_tr]:border-b-0`                                       | Dropped the override + applied header typography parity                     |

## Changes

All edits are in `apps/app/src/features/clients/ClientFactsWorkspace.tsx`.

1. **State cell** — `[StateBadge] [code]` matches the `clientState`
   cell at `routes/obligations.tsx` ~line 2100. Empty cell falls
   back to the same bare `—` tertiary text /deadlines uses. The
   compact form means the column meta drops from `w-[220px]` to
   `w-[120px]` — closer to /deadlines' `w-[90px]` but kept slightly
   wider here because /clients can surface up to 2 additional-state
   SVG badges + a "+N" overflow chip on the same row, which
   /deadlines doesn't.

2. **Column header "Owner" → "Assignee"** — only the column header
   copy changed. The underlying RPC field stays `assigneeName`; the
   client-detail page's editable Owner pill, the toolbar Owner
   filter, and the bulk-update "Owner assigned" toast are all
   different surfaces and out of scope for this column-parity refactor.

3. **`<TableHeader>` row** — `<TableRow>` now carries
   `hover:bg-transparent` so the header band doesn't react to mouse
   movement.

4. **`<TableHead>` typography** — every cell is now wrapped with
   `cn('text-sm font-medium normal-case tracking-normal text-text-secondary',
header.column.columnDef.meta?.headerClassName)`. The non-sortable
   "Assignee", "Opp.", and sr-only "Row actions" headers now share the
   sortable headers' family.

5. **`<TableBody>` class** — replaced `[&_tr]:border-b-0 [&_td]:py-2`
   with the /deadlines canonical:
   `bg-background-default [&_td]:py-2 [&_td]:text-sm [&_tr]:hover:!bg-state-accent-hover`.
   This is the single most load-bearing change — it restores the
   primitive's row hairlines (Yuqi's top callout) and shifts hover to
   the accent tone.

6. **Per-row class** — dropped the explicit
   `hover:bg-state-base-hover` so the body-level accent-hover wins.
   `focus-visible:bg-state-base-hover` stays so keyboard navigation
   reads as a distinct state from mouse hover.

7. **`ClientTableSkeleton`** — applied (3) + (4) parity, dropped
   `[&_tr]:border-b-0`, and tightened the states column skeleton from
   `w-[220px]` to `w-[120px]` in lockstep with the live table so the
   loading shimmer doesn't shift layout when real rows mount.

## Out of scope

- `apps/app/src/features/migration/*` — separate wizard work
- `apps/app/src/features/pulse/PulseDetailDrawer.tsx` — already a
  reference for Yuqi
- `apps/app/src/routes/obligations.tsx` — the reference quality bar;
  zero edits
- Toolbar "Owner" filter label, client-detail "Owner" pill, "Owner
  assigned" toast — these are non-table surfaces

## Verification

- `pnpm --filter @duedatehq/app exec vp check` — 0 errors, 2 pre-existing warnings
  unrelated to this refactor (`workload-page.tsx`, `notifications-page.tsx`)
- `pnpm exec vp test --run src/features/clients/` — 31 tests across 6 files pass
- `pnpm exec vp test --run src/routes/` — 72 tests across 6 files pass
- `pnpm --filter @duedatehq/app i18n:extract` — clean; "Assignee"
  string already existed (used by /deadlines) and now gains a
  `src/features/clients/ClientFactsWorkspace.tsx` reference, no new
  untranslated strings. zh-CN missing count unchanged.

## File touched

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
- `apps/app/src/i18n/locales/en/messages.po` (auto-extracted)
- `apps/app/src/i18n/locales/zh-CN/messages.po` (auto-extracted)
