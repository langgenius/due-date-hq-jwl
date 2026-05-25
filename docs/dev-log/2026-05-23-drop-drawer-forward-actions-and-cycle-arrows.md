---
title: 'Drop obligation-drawer forward actions + ClientCycleArrows (items 1 + 10)'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Two more "remove this" calls

The second 10-item critique panel led with two unambiguous removals.

## #1 — Drop ObligationDrawerStatusActions from the drawer header

The obligation drawer header had two layered controls for the same
job:

1. `ObligationQueueStatusControl` — interactive status pill that
   opens a dropdown of every legal next status (Start / Waiting /
   Blocked / Review / Filed / etc.). Same control the queue row
   uses, same canonical transitions, full keyboard a11y.
2. `ObligationDrawerStatusActions` — a row of contextual primary
   buttons ("Start preparation" / "Mark filed" / "Confirm authority
   acceptance" / "Record authority rejection") that surfaced one
   opinionated forward step per status.

The forward-action row was originally designed as a shortcut so
CPAs wouldn't have to translate "what's the canonical next step?"
into a dropdown pick. In practice it created the same duplicate-
affordance problem as the FilingPlanRowQuickAction did last commit
— two buttons pointing at the same status transition.

Same pattern as Commit D from earlier today: collapse to a single
canonical control. The interactive status pill is that control.

Removed:

- The render block in `ObligationQueueDetailDrawer`'s header.
- `ObligationDrawerStatusActions` component (~140 LOC including the
  popover for the "record authority rejection" confirmation).
- `DrawerForwardAction` type definition.

Kept:

- `markAcceptedMutation` + `markFiledRejectedMutation` hooks. These
  still drive `ActiveStageDetailCard`'s done/paid stage actions
  (where stage-specific copy + audit semantics actually matter and
  the surface IS the canonical control). Different surface, kept.

8 obsolete strings cleaned by i18n extraction.

## #10 — Remove ClientCycleArrows entirely

Earlier today's Commit C moved `ClientCycleArrows` from the action
cluster into `PageHeader.eyebrowAside` (page-level navigation
position). Critique panel says "remove first" — drop it entirely
this round.

The control was prev/next chevrons + position counter (`3 / 12`)
for cycling through the previously-filtered client list without
revisiting `/clients`. Real workflow value was thin: CPAs going
through batches usually want the list-view affordances (group by
client, sort by next due, bulk actions) which require the list
anyway; one-off cycle through hand-picked clients was an edge case.

Removed the import + render block in `ClientFactsWorkspace.tsx`.
Left the `ClientCycleArrows.tsx` file in place — its keyboard `j/k`
plumbing is self-contained and we may revive it on a different
surface (peek dropdown, maybe). No keyboard regression to worry
about: the keyboard handlers mount inside the component, so they
naturally disappear when the component doesn't render.

`PageHeader.eyebrowAside` slot stays on the primitive — it's
generally useful for any page that wants navigation-tier content
on the right of the eyebrow row, even though no consumer needs it
right now.

## Files touched

- `apps/app/src/routes/obligations.tsx` — render block + component
  definition + type definition removed. ~140 LOC.
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` —
  removed import + `eyebrowAside={<ClientCycleArrows ... />}`.
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po` — 8 strings
  cleaned by `i18n:extract`.

## Followups still on the list

This commit knocks off items 1 + 10. Eight items remain in the
critique panel:

- **#2** PathToFilingSummary stage-column alignment
- **#3** "love this" — no action
- **#4** Tab list ownership clarity
- **#5** Checklist row vertical padding
- **#6** "Is this a note?" — description copy
- **#7** Stronger Mark-received affordance
- **#8** ReadinessOverview spacing
- **#9** Make obligation panel a true full-page right rail

Going into subsequent commits.
