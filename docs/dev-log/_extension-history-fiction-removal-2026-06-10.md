# Remove fictional "Extension history" table from panel-mode Extension tab (2026-06-10)

Yuqi: the legacy Extension tab (`<TabsContent value="extension">`, panel/sheet
mode used by /clients) in `ObligationQueueDetailDrawer.tsx` still rendered an
"Extension history" `<section>` — a static design placeholder with hardcoded
sample prior-year rows (2024/2023/2022, fake form numbers, filer names,
results). The obligation payload carries this year's extension decision only;
there is no cross-year filing-history collection, so the table was pure fiction
and violated the no-fiction-on-canvas rule.

Removed the entire `<section>` (the comment cluster `Ls3vb > muzOr` through the
closing `</section>`), leaving the rule card IIFE + apply-extension form intact.
The extension `TabsContent`'s inner `<div className="grid gap-4">` now contains
just those two, and the `</div></motion.div></TabsContent>` closers stay balanced.

This is the KNOWN FOLLOW-UP flagged in `_deadline-extension-fold-2026-06-10.md`:
the real extension flow was already folded into the Status tab (page mode) in
commit 2adfcf5e, so this is purely deleting dead fiction from the panel-mode tab.

`tsgo --noEmit -p tsconfig.json` clean; `vp fmt --write` on the file.
