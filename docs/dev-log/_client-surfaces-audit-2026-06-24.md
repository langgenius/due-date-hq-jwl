# Client surfaces design audit (/clients, /clients/[id], filing detail)

**Date:** 2026-06-24 · **Surface:** `apps/app/src/features/clients/ClientSummaryStrip.tsx`

Audited /clients, the client detail, and the filing (deadline) detail through the
design-system / visual-hierarchy / spacing / bolder lenses. Foundation is solid:
tokens-only (no raw hex), canonical radii, `Button`/pill/avatar primitives.

## Fixed

- **Client-detail filed-progress label.** The filed-of-total footer (img-080)
  rendered a bare `0/4` next to its green bar — an orphaned fraction with no
  word. Now reads **`0/4 filed`** (a quiet tertiary label naming what the bar
  measures), respecting the footer's "subtle, doesn't disturb the cells" intent.

## Audited — already deliberate design, left as-is (with receipts)

The other three audit findings turned out to be intentional, documented
decisions, so changing them would degrade or reverse them:

- **"At risk" emphasis (/clients stat band).** Already follows the StatBand
  **von-Restorff color budget** (`stat-band.tsx` doctrine): the value stays
  neutral, the amber `need attention` sub *is* the signal. Coloring the value
  would violate the budget — not changed.
- **Registry table width (/clients).** The full-width `table-fixed` layout is a
  deliberate **cross-table consistency** choice ("follow Deadline's table" — it
  mirrors /deadlines + /rules workbench tables). Capping just /clients would
  fragment the family — not changed.
- **Three same-date cards (filing detail).** The Internal-target card omits a
  meta line when internal == filing **by Yuqi's own 2026-06-16 decision**
  (`panels.tsx`: _"when the internal target IS the filing date there's nothing to
  say… Drop the redundant 'No buffer — same as filing' line"_). Re-adding it
  would undo that call — not changed.

## Verify

`tsgo` app clean; `vp run @duedatehq/app#build` clean; i18n 0-missing /
`compile --strict` ("filed" already in catalog). Verified live on the Meridian
client detail: the footer reads "0/4 filed".
