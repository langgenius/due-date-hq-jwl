---
title: 'Obligation lifecycle v2: slice 1c — Timeline tab scaffold'
date: 2026-05-19
author: 'Claude'
area: obligations
---

# Obligation lifecycle v2: slice 1c — Timeline tab scaffold

## Context

Third slice of the lifecycle v2 migration. Slices 1a (schema additions) and 1b (queue vocabulary swap) shipped earlier today. This slice delivers the Timeline view promised in the brief: when `?lifecycle=v2` is on, the obligation detail drawer's Audit tab relabels to "Timeline" and renders the 6 milestones vertically with existing audit events grouped under them.

## Decision: option 1 from the three proposed

Three options were proposed in the previous turn. Picked **option 1** — rename the existing Audit tab to Timeline + group existing audit events by milestone. Rationale: lowest risk, reuses the live `auditEvents` data, no backend changes. Options 2 (rename Evidence tab) and 3 (add a 7th tab) carried more change for the same near-term value.

## Change

### New component `apps/app/src/features/obligations/timeline.tsx`

Renders 6 milestone nodes vertically (`not_started · waiting_on_client · blocked · in_review · filed · completed`) with:

- Filled accent dot + "Current" pill on the current state milestone
- Filled muted dot + connecting line for milestones the row has passed through (per audit events)
- Outline dot for untouched milestones
- Audit events grouped under each milestone (parsed from `event.afterJson.status`)
- "Other activity" footer for audit events whose status change doesn't map to a v2 milestone (legacy `in_progress`, `extended`, `not_applicable`)

Status mapping handled by `MILESTONE_MAP` — legacy values fold where the brief specifies:

- `paid` → `completed` milestone
- `in_progress`, `extended`, `not_applicable` → Other activity (no milestone)
- All v2 statuses → their own milestone

### Wire-up in `apps/app/src/routes/obligations.tsx`

- Drawer reads `useLifecycleV2()` and `useLifecycleV2StatusLabels()`
- TabsTrigger value=`audit` shows "Timeline" label when v2 is on (Audit otherwise)
- TabsContent value=`audit` renders `ObligationTimeline` when v2; flat audit list when off
- Empty state copy when v2 is on: `"No activity yet. The first transition will log a note here."` — pulled verbatim from the brief

## What you see at `?lifecycle=v2`

Open any obligation drawer, click the rightmost tab (now labeled **Timeline**):

```
●  Not started
│
●  Waiting on client
│   Sarah Martinez · 04-05  Asked for W-2s
│
●  Blocked                        [empty]
│
●  In review                      [Current]
│   Jordan Lee · 04-12  Ready for partner review
│
○  Filed
│
○  Completed
```

(Filled dots = touched milestones; outline dots = untouched; "Current" pill marks the active state.)

Visit without the flag: the Audit tab stays a flat list — identical to before.

## What's not in this slice

- **Adding milestone notes manually** (the editable text input the brief promises) — slice 2.
- **Evidence files inlined into milestones** — slice 2/3 (requires correlating `obligationEvidence` with audit timestamps).
- **System notes vs human notes visually distinguished** — currently all events look the same; styling pass in slice 2.
- **Auto-transitions writing system notes** (readiness flag → blocked, e-file → filed, parent → unblock) — slice 2.
- **Keyboard navigation within the Timeline** — slice 2.

## Verification

- `pnpm check` — 0 errors, 0 warnings.
- `pnpm -F @duedatehq/app test --run` — 203/203 pass.
