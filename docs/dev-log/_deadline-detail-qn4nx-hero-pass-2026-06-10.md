# Deadline detail — Qn4nX hero pass (2026-06-10)

Yuqi: "this deadline detail is so ugly. have you looked at the Node ID: Qn4nX".
The page had been built from rzzww/ne4Fd; this pass aligns the hero to **Qn4nX**.
(The washed-out look in the report was the DevTools selection overlay, not the
real render — the live hero was structurally off, not tinted.)

Tab structure stays at the **locked 4 tabs** (Status·Materials·Record·Audit,
Status first). Qn4nX's 3-tab / Materials-first bar is treated as a stale mock —
we match its *visual styling*, not its tab set (per Yuqi's call).

## Changes (`ObligationQueueDetailDrawer.tsx`, page mode)

1. **Removed the "Last activity {time}" line** from the hero. Qn4nX's eyebrow is
   only "Tax year · period"; the activity story lives in the Status tab's Recent
   activity card + the Audit tab.
2. **Title 22 → 26px**, weight 600, tracking −0.6 (collapsed stays 16px / −0.3),
   matching the Qn4nX title (Geist 26/600/−0.6).
3. **Meta strip now leads with the status pill** → jurisdiction seal → client
   chip (was client-first, which buried the status). Matches Qn4nX's
   `StatusPill · FED · client` order.

## Verified

`tsgo --noEmit` clean (drawer + app). Live (`/deadlines/000000000003`): hero
title large/dark, meta strip leads with the IN REVIEW pill, no "Last activity"
line, 4 tabs intact, hero white over the gray tab body.

## Not in this pass (tracked)

Extension fold into Status (#7), rail-follows-table sort/filter (#10), full
responsive contract (#11).
