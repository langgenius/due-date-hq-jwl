# /deadlines sixty-fifth pass — follow-up round

**Date:** 2026-05-26
**Branch:** `design/inset-surface-system`
**Scope:** State cell, "Show all" bug, Sort-by dropdown chrome, page blink/jump

Four follow-up items from Yuqi after the sixty-fifth pass shipped:

## a. State cell — universal StateBadge representation

`apps/app/src/routes/obligations.tsx`:

Replaced the bare `info.getValue() ?? '—'` text render with the same `StateBadge` SVG + 2-letter code used on Alerts (state chip strip) and `/clients` (filing-states pill). The column now reads as the canonical "state" pattern — leading flag/seal motif + code — so a CPA recognises "your state" by glyph before reading the letters. Empty state stays "—" since a flag for "no state" would be more confusing than less.

## b. "Show all" button didn't clear hidden columns

The Columns dropdown's "Show all" affordance called `setObligationQueueQuery({ hide: null })`. The `hide` parser has a non-empty default (`DEFAULT_HIDDEN_COLUMN_IDS`), so passing `null` resolved BACK to that default — Yuqi clicked "Show all" and 3+ columns stayed hidden because the defaults kept re-applying. Fix: pass `hide: []` (empty array) explicitly. Combined with the parser's `clearOnDefault: false`, this preserves "no columns are hidden" in the URL.

## c. Sort-by dropdown didn't match the Pulse filter family

Yuqi's screenshot diff: the toolbar's "Sort by due ▼" rendered as `text-xs w-[164px]`, while every Pulse filter ("All impact ▼", "All sources ▼") is `text-sm` natural-width with the same `rounded-md border-divider-strong bg-default hover:bg-state-base-hover` chrome. Updated the SelectTrigger to match: text-sm, `whitespace-nowrap`, no fixed width, identical border + hover treatment. Now every dropdown trigger across Pulse + Deadlines reads as one family.

## d. Page blink/jump on tab / pill click

Every scope tab + action chip handler was sending `obligation: null, row: null` along with its filter change. When a detail panel was open, those clears closed it on every filter click — triggering the AnimatePresence width-collapse exit animation (280ms) + the queue column re-expanding to full width. That's the "blink and jump" Yuqi saw.

Fix: dropped the panel-clearing patches from:

- `ObligationQueueScopeTab` "All" + status tabs (Open / Filed / etc.)
- `ObligationQueueActionChip` Past due / Needs evidence (Due this week's helper already omitted them)

The detail panel now persists across filter changes. If the selected row is no longer in the filtered set, the user can close it explicitly via X / Esc / clicking another row. Filter clicks are now silent (just URL param change + table data update).

## Verification

- `tsc -p tsconfig.json --noEmit` — clean
- `vp lint` — 0 errors, 8 pre-existing warnings (underscore-dangle dead code + 2 type-assertion warnings on group=status cell, both unchanged)
