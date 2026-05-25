# Inset-surface followups — A through H batch

**Date:** 2026-05-26
**Branch:** `design/inset-followups`
**Scope:** Items deferred during the inset-surface PR stack; this batch closes the open follow-ups + bumps the table-header canonical into the UI primitive.

## What changed

### 0. Filed dedup (one-liner, big visual payoff)

Dropped the "Filed" word from the hero strip on the obligation drawer. Header pill `[Filed]` already carries the textual label; the green checkmark + green chip tone in the hero is the visual state cue. Hero is now `✓ 2026-03-16 · 70 days ago` — date is the actual data; the panel has ONE textual "Filed" mention instead of two (was three before previous round).

### A. Drawer padding tightening

- Header `px-12 py-6` → `px-8 py-5` — the obligation drawer is a "data panel" not a "paper document"; 32×40 reads comfortable without the Pulse-style roominess.
- Body `px-12 pt-6 pb-24` → `px-8 pt-0 pb-24` — pt-0 because the header's bottom border + py-5 already gives the separator; no need for an extra top buffer.
- Sticky inner section heading dropped `bg-background-subtle border-b` — the gray bg was framing the deadline strip as a separate "card" inside the body. Now just sticky position + bleed (`-mx-8 px-8`), no extra visual weight.
- Sticky footer `px-12 py-4` → `px-8 py-4` to match the new horizontal rhythm.

### B. Past due / Due this week mutex

These two chips operate on the same date axis (past = days < 0; this week = 0 ≤ days ≤ 7) — combining them is meaningless. Clicking one now clears the other. Needs evidence stays orthogonal (audit completeness axis, not date), so `Past due + Needs evidence` is still a valid combination.

### D. Sort by → DropdownMenu (was Base UI Select)

The Sort-by trigger had Base UI `<Select>` interaction (different click/keyboard model than every other dropdown in the product). Converted to `<DropdownMenu>` with `<DropdownMenuRadioGroup>`, putting it in the same interaction family as the Columns dropdown beside it. Trigger chrome unchanged (single "Sort by X" label).

### E. Unassigned `?` clickability

Marked as a TODO in code. The avatar already advertises clickability (cursor + hover) and bubbles the click to the row → opens the drawer. Building a standalone Popover-based assignee picker needs `orpc.obligations.assign` (or equivalent) on the server — that mutation doesn't exist yet. `orpc.members.listAssignable` covers the member list but no setter. Drawer assignment is the only assignment surface until backend lands.

### G. Smooth scope-tab underline

Scope tab active-underline switched from per-tab `border-b-2` to a shared `motion.span` with `layoutId="scope-tab-underline"`. Framer Motion smoothly slides the underline between tabs on selection — no more jumpy "underline disappears here, reappears there." Spring tuned to `stiffness: 500, damping: 38` (snappy without bounce).

### H. Table-header canonical → primitive

The `<TableHead>` primitive in `@duedatehq/ui` previously defaulted to small-caps caption style (`text-xs uppercase tracking-[0.08em] text-text-tertiary`). Updated to the /deadlines canonical (`text-sm font-medium normal-case text-text-secondary`). Every table in the product inherits the new default automatically; any consumer that wants the old style can pass `className` to override.

This propagates the design-system canonical without per-table edits. Tables that may visually change:

- /clients list
- /opportunities list
- Rule library (matrix view)
- Audit Activity tab
- Member list
- Any other shadcn-style table consumer

Smoke test all of them after the merge.

## Deferred (not in this PR)

- **C — Cell not middle aligned** — still need a DevTools-highlight screenshot to pinpoint which cell.
- **F — White border investigation** — user said "leave for now."

## Verification

- `tsc -p tsconfig.json --noEmit` — clean
- `vp lint` — 0 errors, 8 pre-existing warnings (unchanged from main)
