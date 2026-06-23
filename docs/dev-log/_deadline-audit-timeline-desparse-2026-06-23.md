# Deadline Audit-trail timeline — de-sparse the future tail

**Date:** 2026-06-23
**Surface:** `apps/app/src/features/obligations/timeline.tsx`

Pinning down Yuqi's "tab-content left empty looking ugly" on `/deadlines/[id]`.
The four "tabs" (Status / Materials / Record / Audit) are **scroll-spy section
anchors**, not switched panels — one long scroll. Status + Materials render full;
the sparse one is the **Audit** section's `ObligationTimeline`.

It draws the 6-state lifecycle (pending → completed) as a vertical journal.
Untouched FUTURE states rendered as a bare ghosted label with an **empty right
side** and generous `pb-4` spacing, so an early-stage deadline ("Not started")
showed five empty rows trailing down — the "empty looking ugly".

## Fix

- Header row → `justify-between`, so the right edge carries a marker instead of
  being empty.
- **Current** row keeps its "Current" badge (now right-aligned).
- The **immediate next** milestone gets a quiet uppercase **"Up next"** marker
  (computed in the parent via `findIndex` on the v2 lifecycle order) so the
  ghosted tail reads as _the road ahead_, not empty placeholders.
- Untouched future rows **tighten** (`pb-4` → `pb-2.5`) into a compact list.

No fiction: touched milestones still carry their real event cards; future rows
stay honestly ghosted, just compact + framed by the Up-next marker.

## Not changed (honest gaps)

The Record section's empty **Workpapers** ("No workpapers attached") is a genuine
empty state — file storage isn't backed yet (see record-tab storage gap). Left
honest rather than faked.

## Verify

`tsgo` app clean; `vp run @duedatehq/app#build` clean; one new string ("Up next")
extracted, zh-CN translated (接下来), `i18n:compile --strict` passes (0 missing).
Verified live on `/deadlines/000000000003` Audit section: rows now read
"Not started · CURRENT", "Waiting on client · UP NEXT", then a compact ghosted
tail. Pushed `HEAD:main`.
