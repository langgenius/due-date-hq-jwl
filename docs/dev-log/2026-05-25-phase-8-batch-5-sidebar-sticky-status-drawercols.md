# 2026-05-25 — Phase 8 (batch 5): sidebar bell + sticky filter + status colors + drawer-aware columns

## Why

Four Yuqi review items closed in one cluster — small, low-risk UI
tweaks that all reduce visual noise or surface affordances closer
to where the eye expects them.

## Shipped (4 items)

### Today #28 — Bell to sidebar top

Bell moved from sidebar BOTTOM (next to user menu + Settings) to
sidebar TOP, sitting on the firm-switcher row to the right of the
firm chip. Yuqi's note: "信息放在左下角不是很合适" — alerts in the
bottom-left fail the eye's expectation. Gmail / Linear / Notion all
park notifications near the top of the chrome.

The user menu stays at the bottom alongside Settings — account-level
controls belong together. The firm-switcher row gets a `flex
items-center gap-2` layout so the bell sits to the firm chip's
right without the chip losing its truncation behavior (`min-w-0
flex-1` on the chip wrapper).

Updated `app-shell.tsx` and added a dated comment block at the new
mount site explaining why bottom-left was wrong and what's been
preserved (user menu + Settings at the bottom).

Earlier I'd documented this as a "design decision: keep
sidebar-bottom" in batch 3. Yuqi pushed back on that call —
revisited and reversed. Logged here because future audits will see
the conflicting prior log and need the context.

### Deadlines #9 — Filter row sticky on scroll

The status-scope tabs + filter chips row scrolled away with the
table, so once a CPA scrolled past row 30 they couldn't see what
filters were active or switch tabs without scrolling back up. Made
the filter row `sticky top-0 z-10` with
`bg-background-default/95 backdrop-blur-sm` so it pins to the top
of the main scroll container during table scroll.

The `/95` opacity + backdrop blur is intentional — pure opacity
made the rows underneath read through too cleanly; the blur sells
that the bar is sitting above the table.

### Deadlines #10 — Status color collisions

Two collisions in the status palette surfaced during the row audit:

1. `extended` used the same blue (`variant="info"` + `tone="normal"`
   dot) as `in_progress`. These are semantically different —
   `in_progress` means "we are actively working", `extended` means
   "deadline got pushed via an extension filing." Different intent,
   same color = real bug.

   Fixed: `extended` now renders as `variant="secondary"` (gray
   pill) + `tone="normal"` (blue dot). Distinct from `in_progress`
   (blue pill + blue dot) and from `pending` (gray pill + gray
   dot). Reads as "still active work, but a quieter shade."

2. `done` / `paid` / `completed` all render as green. **Kept
   intentional** — they are all "settled" lifecycle states and the
   eye doesn't need to distinguish them at scan time. The label
   text ("Filed" / "Paid" / "Completed") carries the granular
   meaning when the row is read. Documented in `status-control.tsx`
   so future audits don't accidentally split the cluster.

### Deadlines #11 — Hide more columns when drawer open

When the obligation detail panel is open, the queue gets ~700px on
a 1280px page. The 2026-05-21 panel-fit pass already auto-hid
`clientState / clientCounty / taxType / assigneeName /
evidenceCount` (redundant with the panel header). Yuqi pushed this
further: while reading the drawer, the queue only needs to support
row-to-row navigation — name + when-it's-due.

Widened `PANEL_OPEN_AUTO_HIDDEN_COLUMN_IDS` to also include
`smartPriority`, `daysUntilDue`, and `status`. All three repeat
information the drawer header / body already surfaces for the
focused obligation. On close, the user's saved column choices come
back because `onColumnVisibilityChange` strips the auto-hidden set
from the saved `hidden` URL state before persisting.

End result: drawer open → queue shows `select / Client / Internal
Due` (3 columns, scannable as a navigator). Drawer closed → user's
saved column set returns.

## Verification

- `pnpm exec tsc --noEmit` clean (apps/app)
- `vp lint` 0/0 on changed files

## Closes Yuqi review items

- Today: **#28** (bell to top)
- Deadlines: **#9** (sticky filter), **#10** (status color audit),
  **#11** (drawer-aware columns)

Combined with prior commits the review is at **65 / 89**.

## Still open (24 items)

- Today (dialog): **#42-#45** (Field/Dialog primitive audit — next
  cluster)
- Alerts: **#9** (US map filter — building next)
- Deadlines: **#6** (multi-deadline grouping), **#16** (drawer
  alignment — viewport replay), **#23, #24, #25**
  (PathToFilingSummary skipped/upcoming dates — designed-as-is),
  **#30** (Summary tab — building next)
- Wizard: **#37** (modal style audit — next cluster), **#40, #41**
  (copy audit / viewport)
