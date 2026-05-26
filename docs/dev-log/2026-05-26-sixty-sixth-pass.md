# Sixty-sixth pass — row-switch jump + deferred-item cleanup

**Date:** 2026-05-26
**Branch:** `design/filed-strip-dedup`
**Scope:** Yuqi's latest round on /deadlines: the new "switch row →
table jumps" report + a final cleanup of the 5 deferred items
flagged in the previous summary.

## 1. Row-switch table jump (root cause)

When the drawer was open and the user clicked a different row, the
queue table visibly collapsed to full-width for ~300ms and then
snapped back. Root cause: the panel's outer `motion.div` was keyed
by `obligation-panel-${activeDetailId}`. AnimatePresence treated
every row change as a fresh element — it ran the EXIT animation
(width: 600 → 0) on the old panel and the ENTER animation (width: 0
→ 600) on the new one back-to-back. The table reflowed into the
~300ms gap.

**Fix:** key the `motion.div` with the stable string
`"obligation-panel"`. AnimatePresence now keeps the same DOM
mounted across row changes; only the inner
`<ObligationPanelDispatcher>` swaps its `obligationId` prop. No
width animation fires on row switch, so the table holds its
geometry.

## 2. Five deferred items (all closed)

### 2.1 Unassigned `?` clickable picker (inset-followup E lands)

The `?` in the Owner column is now a real `DropdownMenu` trigger.
Selecting a teammate calls `clients.bulkUpdateAssignee` with a
single-id payload. The reason this couldn't ship earlier: the
obligation schema doesn't carry a per-row assignee — assignment
lives on the CLIENT, so picking a teammate here propagates to
every deadline for that client. A footer line in the picker
spells that scope out so it isn't a surprise:
"Assigns every deadline for {clientName}."

The shared `bulkAssigneeMutation` is reused. It now switches
behavior based on `clientIds.length` — single-id treated as a
quick-assign (preserves row-checkbox selection, emits the
"Owner assigned" / "Owner cleared" toast variants); multi-id keeps
the bulk-bar behavior (clears selection, "Owners updated" toast).

### 2.2 Cell middle alignment (C — defensive pass)

`<TableCell>` primitive already sets `align-middle` on the td.
Reinforced it at the call site in the queue's row renderer so it
can't be overridden by `meta.cellClassName` on Tailwind specificity.
This is belt-and-suspenders against future column metas that
inadvertently land an `align-top` ancestor class.

### 2.3 BlockedByChip "same gray icon" (#3)

The `LinkIcon` was sitting at `text-text-tertiary` while the
label was at `text-text-secondary`. Yuqi: "same gray icon." Aligned
both to `text-text-secondary` so icon + label read as one
navigation token.

### 2.4 Select dropdown interaction (#4)

The Sort-by Select was converted to DropdownMenu in
inset-followups D — that addressed the original complaint. The
two remaining Base UI `<Select>` usages in obligations.tsx are
form-style selectors inside dialogs:

- Line 3719: Export modal client picker (legitimate filter-from-many
  control inside a form column)
- Line 5897: Tax year type calendar/fiscal toggle inside the drawer's
  Tax year profile disclosure (form control inside a settings
  surface)

Both belong to the form-control family — converting them to
DropdownMenu would mismatch the surrounding Inputs. Left as
Select, intentionally.

### 2.5 RejectionChip shadow + icon (#5)

Already addressed in the sixty-fifth pass follow-up #5: full chip
dropped `shadow-sm` and `AlertTriangleIcon`. The icon remains ONLY
in the compact variant (icon-only 20×20 chip used in narrow
viewports when the panel is open) — verified that's the
intentional behavior since compact mode has no other content to
read as the rejection signal.

## 3. Materials tab "scattered" (#13) — section framing

The Materials/readiness tab body had a mix of:

- ReadinessOverview (top, self-framed)
- Inline warning chip (no section frame)
- Materials checklist (`<h3>` header pattern)
- Sent request panel (bordered card, NO header)
- Tax year profile (settings disclosure)

The Sent request panel without a section header read as orphaned
debris below the checklist. Wrapped it in `<section>` with the
canonical `<h3 className="text-sm font-semibold">Client request</h3>`
header (matches Materials checklist + Evidence Workpapers +
Extension Rule reference). Dropped the panel's own border —
inner `bg-background-subtle` is enough framing on a white tab
surface.

Bumped the tab's outer `grid gap-3` → `gap-4` so each top-level
block has cleaner air around it.

## 4. Cross-tab visual unity (#4 "tab content visually different")

Section heading style was diverging across tabs:

- Summary — self-framed components
- Materials — `text-sm font-semibold text-text-primary`
- Extension — `rounded-lg border border-divider-regular p-3` cards
  with `text-sm font-medium`
- Evidence — `text-xs uppercase tracking-wider text-text-tertiary`
  kicker style

Aligned all 4 to the Materials canonical (`text-sm font-semibold
text-text-primary` for the heading, optional count chip in
`text-xs tabular-nums`):

- Extension's "Example" → renamed to "Rule reference" + dropped the
  bordered card wrapper.
- Evidence's "Workpapers" heading → swapped from kicker to canonical;
  count chip swapped from `Plural one="# item"` to a bare digit
  (matches Materials checklist + Outstanding/Received).

## Verification

- `pnpm check` — 0 errors, 9 pre-existing warnings (unchanged).

## 5. Follow-up — Adjacent client rows

Yuqi flagged a manual create case where the same client generated two
deadlines. In the default Date sort, the queue repeated the client
name on both adjacent rows, which made the pair read as unrelated
rows.

Changed the adjacency grouping back on for any sort mode: when rows
for the same client are consecutive, the first row shows the client
name and following rows render as continuation rows. Continuations
hide the repeated client name, show a small connector in the Client
cell, and indent the checkbox plus subsequent cells slightly so the
second deadline reads as part of the same client cluster.

Verification:

- `pnpm --filter @duedatehq/app exec tsc --noEmit`
- `pnpm format`
- Browser validation on `http://localhost:5173/deadlines`: two JHX
  rows render with `JHX` only on the first row; the second row is
  indented and keeps its own Form 1120/status cells.

## What I need from Yuqi

Two items I could only partially confirm without a screenshot:

1. **C (cell middle alignment)** — the defensive `align-middle` is
   in, but if there's a specific cell still misaligned, a
   DevTools highlight would let me target the actual element
   rather than reinforcing what was already there.
2. **F (white border)** — left untouched per Yuqi's earlier
   "leave for now."
