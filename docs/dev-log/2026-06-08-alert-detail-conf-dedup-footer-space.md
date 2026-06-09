# /alerts detail — dedup confidence + footer spacing

Date: 2026-06-08

Yuqi (low-conf alert review):

1. "the banner and the AI confidence 46% below — same thing?" → yes, both render
   `alert.confidence`. Deduped: dropped "conf X%" from the top status banner; the
   confidence now lives only in the dedicated "AI confidence" block (which for
   low-confidence alerts is the prominent actionable warning). The banner keeps
   status + due-date timing. Removed the now-unused `confPct` in DecisionBanners.
2. "space between the description and actions" → SheetFooter `gap-4` → `gap-8` so
   the kbd-hints/audit-ledger note doesn't butt against the first action button.
   Button styles confirmed correct (ghost secondary + filled primary CTA).

## Verify

tsgo clean; /alerts?alert=…3004 at 1512×861 — banner shows only "Pending your
review" (no conf), footer has clear note↔actions spacing.
