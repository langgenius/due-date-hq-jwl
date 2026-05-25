---
title: 'Sidebar badge tones + client-detail header typographic rhythm'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Two follow-ups from the /clients UI evaluation

Critique panel (the one Yuqi ran after L-2 landed) flagged three
things that all read the same way once you saw them: **everything is
shouting the same volume.** Three concrete fixes here. The bigger
"the page feels pale and white" thread continues in the next commit.

## 1. Sidebar badge tones — urgent vs inventory

Before: every sidebar count rendered as the same warning-tinted pill,
regardless of whether the count was a call to action or a reference
fact. Clients and Deadlines (inventory counts — "you have 87 clients")
read with the same visual weight as Alerts or rule-library review
backlogs (urgent counts — "Pulse found 3 things, look at this").

Change: `SidebarMenuBadge` now takes a `tone` prop:

- `urgent` (default, for back-compat) — saturated warning pill:
  `bg-state-warning-hover` + `border-state-warning-border` +
  `text-text-warning`. This is Alerts, rule-library reviews,
  anything where the count _means_ something the CPA needs to act on.
- `inventory` — slim tertiary number, no pill, no border, just
  `text-text-tertiary` (escalates to `text-text-secondary` when its
  parent menu item is active/current-page). Same right-edge slot, no
  visual weight beyond the number itself.

Plumbed `badgeTone?: 'urgent' | 'inventory'` through `NavItem` in
`app-shell-nav.tsx`. Clients + Deadlines both pass `'inventory'`
(both v2 and legacy nav variants). Alerts intentionally stays default
(urgent). The render block reads `item.badgeTone ?? 'urgent'` so any
nav item that doesn't opt in keeps the old behavior.

Why this matters: a CPA glancing at the sidebar should be able to
read tone, not just count. Urgent = stop and look. Inventory = "yes
that's how many you have, carry on."

## 2. Eyebrow back-link vs section labels

Before: the `← Clients` back-link on `/clients/$clientId` rendered
through `PageHeader`'s eyebrow slot, which applies a
tracked-uppercase-11px-tertiary tag treatment. That's the same
treatment used for the in-tab section labels (`CONFIGURE`, `NOTES`,
etc.). Two different semantic intents — back-nav vs. section grouping
— were typographically identical, which created visual noise without
any actual hierarchy.

Change: the back-link Link inside the eyebrow slot now overrides the
default eyebrow style locally — `text-xs font-normal normal-case
tracking-normal text-text-secondary`. The section labels inside tabs
keep their tracked-uppercase tag style untouched. Two visually
distinct tiers, two different intents.

Kept it scoped to the back-link's own className rather than touching
the `PageHeader.eyebrow` slot itself, because other pages still use
the slot for true tag-style eyebrows.

## 3. Title row chip wrap

Before: the H1 + identity chip cluster lived in one
`flex flex-wrap items-center` row. On 1100-1280px viewports the
right-edge action cluster (Pin / Edit / Download / Move-to) would
collide with the chip cluster, and once chips wrapped, the second
line of chips left-aligned to the page edge instead of under the H1.

Change: title row is now `flex flex-col gap-y-2` by default — H1 on
its own line, chip cluster directly underneath, left-aligned with
the H1. On `xl:` (1280px+) it switches back to `flex-row flex-wrap`
where everything sits inline. The chip cluster reads as a single
group below the title on narrow viewports; on wide viewports the
behavior matches what the design intended originally.

## Followups (separate commit)

- "The whole page reads pale and white" — needs a tonal weight pass:
  stronger section header demarcation, subtler section bg tints,
  borders that actually delineate.
- Filing plan: drop the `Current tax year` chip, add a column legend
  (`FORM · DUE · STATUS · EST. TAX`) once above the first year's
  rows so the inner rhythm is legible without re-reading the
  prefixes per row.

## Files touched

- `packages/ui/src/components/ui/sidebar.tsx` — added `tone` to
  `SidebarMenuBadge` (default `urgent`, plus `inventory` variant).
- `apps/app/src/components/patterns/app-shell-nav.tsx` — added
  `badgeTone` to `NavItem`, set `'inventory'` on Clients + Deadlines
  in both v2 and legacy nav configs, passed through to render.
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — eyebrow
  back-link className override + title row vertical-then-horizontal
  flex behavior.
