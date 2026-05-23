---
title: 'Entity badge consistency + readiness label + date format + Team tile (items 2, 3, 8, 10)'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Four cross-cutting consistency fixes

## #2 — Entity badge uses `outline`, not `info`

The H1 row's `LLC` chip was the only place in the app rendering entity
type as a blue (`variant="info"`) badge. Every other consumer —
`ClientPeekHoverCard`, `ClientDetailDrawer`, the obligations queue
filter chip, `CreateClientDialog` — uses `variant="outline"`. Entity
type is a static identity fact, not a status; the colored treatment
gave it accidental signal weight. Quieted to match the rest.

## #3 — Setup framing on the "Needs filing state" badge

Before: a destructive badge in the H1 row reading "Needs filing
state". Critique: "What is the status for? it is unclear if this is
for the Client as a whole, or for the client's obligation."

The badge is about CLIENT SETUP (the rule library can't generate
deadlines until the client has a filing state). Two changes to
disambiguate:

- New `MissingFactsActionLabel` used on the header badge — uses
  imperative copy: "Add filing state" / "Add client facts". Reads as
  a call-to-action, not as a status descriptor. The other consumer
  of `MissingFactsLabel` (compact readiness chip in the client peek
  card) still uses the descriptor form ("Needs filing state" /
  "Needs facts") because there it IS describing state, not
  prompting an action.
- `SettingsIcon` prefix on the badge — visually anchors the chip as
  configuration, not in-flight work. The dot pattern used for
  in-flight signals (`BadgeStatusDot`) stays reserved for those.

## #8 — Date format unified across surfaces

`ClientSummaryStrip` was rendering the next-due-in-days as a raw
`${days}d` token (e.g. `-17d` for overdue). Reads as math, not as a
deadline. The same component family in `ClientDetailDrawer` and
`ClientPeekHoverCard` already uses the canonical form:

- past: `5d late`
- today: `due today`
- future: `due in 12d`

Unified the strip to that pattern. Single mental model for the same
piece of data across the three surfaces a CPA hits this client from.

## #10 — Third summary tile: Team

The earlier audit dropped the original Team tile because it just
showed a count of unique `reviewerUserId`s — a number of nameless
IDs isn't useful signal. This rebuild does it properly.

Logic:

- Collect the set of distinct `reviewerUserId`s on this client's
  open obligations (excluding terminal statuses).
- Resolve to names via `orpc.members.listAssignable` (cached query,
  shared with the obligations queue + CreateClientDialog — usually a
  cache read, no extra network hit).
- Render up to 3 24px initialed avatars with a stable per-name color
  hash, plus `+N` overflow if more. Single-reviewer case also
  surfaces the full name next to the avatar so the lone-owner case
  reads as cleanly as possible.
- Empty state: "Unassigned" muted, no click target.

New `TeamAvatarStack` component lives inside `ClientSummaryStrip.tsx`
alongside `TileShell`. Color palette is the same 6-bucket muted
palette the file-row assignee avatar already uses (different file
but same `state-base-hover-alt / state-warning-hover / ...`
recipe). Two members never look identical.

Grid bumped from `sm:grid-cols-2` to `sm:grid-cols-2 lg:grid-cols-3`
so the new tile gets its own column on wide viewports without
forcing a three-up on narrow ones.

## i18n

4 new strings added with zh-CN translations:

- `Add filing state` → `添加申报州`
- `Add client facts` → `补充客户信息`
- `No one assigned` → `无负责人`
- `{0} on this client` → `{0} 人参与该客户`

## Files touched

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`:
  - Entity badge `info` → `outline`.
  - Readiness badge gets `SettingsIcon` prefix + uses new
    `MissingFactsActionLabel` ("Add filing state" / "Add client
    facts").
  - New `MissingFactsActionLabel` helper added; original
    `MissingFactsLabel` kept for the descriptor-form consumer.
  - `SettingsIcon` added to lucide imports.
- `apps/app/src/features/clients/ClientSummaryStrip.tsx`:
  - Days-from-today format: `${days}d` → `5d late` / `due today` /
    `due in 12d`.
  - New `TeamAvatarStack` component (avatar overflow + name for
    solo case) and the Team tile that renders it.
  - `members.listAssignable` query for name lookup.
  - Grid switches to 3-column on lg+ viewports.
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po`.
