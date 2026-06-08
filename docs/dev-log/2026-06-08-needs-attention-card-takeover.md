# /today alert card — take over needs-attention-card.tsx

Date: 2026-06-08

Both sessions had been editing `needs-attention-card.tsx`, so fixes kept
reverting (date size flip-flopped, cursors, border). Per Yuqi, taking ownership
and committing it so the fixes stick. This commit folds in the concurrent
rewrite of the card that was on disk **plus** the accumulated Yuqi fixes:

- **Cursor: not all `?`** — removed `cursor-help` from the card's own chips
  (CA jurisdiction, the date, the client avatars). Tooltips still open on hover;
  the cursor no longer reads as `?` across the card. (`Form 1065` keeps the help
  cursor because it comes from the shared `TaxCodeBadge`, which is consistent
  app-wide and carries a real form-description tooltip.)
- **Date** stays at `text-xs` (11px) — small, matching the other meta chips
  (it had been getting re-enlarged by the parallel edits).
- Prior accrued fixes now locked in: no card border (gray fill only), source
  link with no arrow (lighter gray → darker on hover), title at 14px, and the
  CA label without its boxy frame.

## Verify

tsgo clean; computed cursors on CA / date / avatar = `default`, date `11px`;
source link `pointer`. Page renders cleanly at 1512×861.
