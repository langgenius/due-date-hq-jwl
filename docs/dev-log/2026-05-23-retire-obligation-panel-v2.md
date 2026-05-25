---
title: 'Retire ObligationPanelV2 — fold into the current canonical panel'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# One canonical obligation panel again

V2 was always a comparison prototype (`?panel=v2`) — a slimmer
alternate shape mounted next to the polished V1 so Yuqi could flip
between them. Over today's commit pass V1 absorbed every UX
improvement V2 was supposed to demonstrate (column-aligned stage
timeline, tabs-belong-to-content, padding/affordance polish on the
checklist, full-page right rail). V2 stopped being a comparison —
it was just an older version with placeholders.

The earlier commit (`cc56d79`) wired real stage actions into V2 so
its `CURRENT STAGE` card stopped pointing at "the original panel
for now." Yuqi's clarification: those wirings belong **in the
current canonical panel** (V1), not in V2. V1 already covers them
via `ActiveStageDetailCard`, with deeper sub-status pipelines + past-
stage history on top.

So V2 retires.

## Removed

- `apps/app/src/features/obligations/ObligationPanelV2.tsx` (~580
  LOC including the just-added mutation wiring).
- `apps/app/src/features/obligations/use-obligation-panel-version.ts`
  (the nuqs-backed `?panel=v1|v2` selector).
- The "Try the new panel shape →" toggle button inside
  `ObligationPanelDispatcher`.
- The matching "← Back to original panel" toggle button inside V2.
- 17 i18n strings that lived only in V2 (cleaned by extraction):
  V2 deadlines section, copy-link button, panel toggle copy,
  every stage's contextual headline, "Mark obligation complete",
  "Confirm authority acceptance", "Record authority rejection",
  etc.

## Kept

- `ObligationPanelDispatcher.tsx` as a thin pass-through. It now
  just renders `ObligationQueueDetailDrawer` in `mode="panel"`.
  Call sites (the obligations queue page, the client detail page)
  reference the dispatcher by name, so keeping the component
  preserves their imports while making the file a one-liner. If
  someone reads the dispatcher and thinks "why does this exist?"
  the explanation lives in the file header.
- The `?panel=` URL param now does nothing — nuqs ignores params
  it doesn't read, so any stale bookmarks (`?panel=v2`) just open
  the canonical panel. Acceptable degradation.

## Have all previous comments been resolved?

Yes — all 10 items from the latest /clients/[id] critique panel.

| #   | Item                                       | Where it landed      |
| --- | ------------------------------------------ | -------------------- |
| 1   | Remove ObligationDrawerStatusActions       | Commit G (`f621abf`) |
| 2   | PathToFilingSummary stage-column alignment | Commit I (`67f5c45`) |
| 3   | "love this"                                | No action needed     |
| 4   | TabsList belongs to following content      | Commit I (`67f5c45`) |
| 5   | ChecklistItemRow padding                   | Commit H (`e3ae250`) |
| 6   | "Is this a note?" on description line      | Commit H (`e3ae250`) |
| 7   | Stronger "Mark received" affordance        | Commit H (`e3ae250`) |
| 8   | ReadinessOverview spacing                  | Commit H (`e3ae250`) |
| 9   | Full-page obligation right rail            | Commit J (`5dc4516`) |
| 10  | Remove ClientCycleArrows                   | Commit G (`f621abf`) |

Plus follow-on: "bring in the new panel" → wire V2 actions
(`cc56d79`), then "into the current one" → retire V2 entirely
(this commit).

## Files touched

- `apps/app/src/features/obligations/ObligationPanelDispatcher.tsx`
  — rewritten as a thin pass-through.
- `apps/app/src/features/obligations/ObligationPanelV2.tsx` —
  deleted.
- `apps/app/src/features/obligations/use-obligation-panel-version.ts`
  — deleted.
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po` — 17 strings
  cleaned by extraction.
