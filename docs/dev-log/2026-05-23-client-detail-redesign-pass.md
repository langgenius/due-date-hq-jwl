---
title: 'Client detail redesign — owner pill in header, Open Filing tile, filing plan splits Internal/Official deadlines'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# What changed

Yuqi shared a screenshot of the new client-detail layout. The deltas
across three structural changes:

## 1. Owner pill in the H1 chip cluster

The owner (`client.assigneeName`) was previously only surfaced inside
the Team tile on the summary strip. The new design lifts it into the
H1 row so the chip cluster answers "whose client?" in the same scan
as entity type and filing state.

New `<ClientOwnerHeaderPill>` component:

- **Unassigned**: person silhouette icon + "Unassigned" text inside a
  thin outline pill.
- **Assigned**: tiny (16px) stable-hashed initial avatar (same hash as
  the /clients OWNER column so the same person reads the same color
  across surfaces) + name.
- **isMine override**: assignee=current user gets the accent palette
  instead of the muted-bucket palette.

Sits inline next to the entity badge and before the filing-state
chips, so the chip cluster reads left → right as:

```
LLC · [👤 Unassigned] · FED · [Missing filing state +Add]
```

## 2. Summary strip — third tile becomes "Open Filing"

Because the owner moved into the header, the Team tile slot is free.
Repurposed as **Open Filing** — a count of non-terminal obligations
on this client. Matches the language used in the /clients table's
Open column and the year-section badge in the Filing plan below, so
the same word means the same thing across the three surfaces.

All three tiles also get a quiet **subline** under the value (this
was the other visible difference in the screenshot — each tile has a
second small line, not just a big number):

| Tile        | Value     | Subline                                             |
| ----------- | --------- | --------------------------------------------------- |
| Next due    | Form code | `N days late` (red) / `Due today` / `Due in N days` |
| At risk     | Count     | `Blocked or overdue` when non-zero                  |
| Open filing | Count     | `N forms in motion` / `Nothing open right now`      |

The subline tone follows the value tone — a late Next due tile tints
its subline red so the lateness signal lives in both the value
weight and the explainer.

Dropped the `TeamAvatarStack` helper + the team-tint palette + the
`members.listAssignable` query from this component. Lookup ID → name
is no longer needed since the owner identity moved to the header pill
(which reads directly from `client.assigneeName` on the client
record, no extra fetch).

## 3. Filing plan — split Due into Internal + Official deadline columns + light-blue year badge

Two structural changes on the filing plan table inside the Work tab:

**Column split.** Previously a single `Due` column showed
`currentDueDate` (the firm's working target). The design surfaces
two adjacent date columns — `Internal deadline` and `Official
deadline` — so the CPA can spot the gap between an extended internal
target and the statutory date without opening the drawer. Data was
already on the model (`obligation.currentDueDate` +
`obligation.filingDueDate`); just had to render both.

**Year section badge.** Year-section header used to render the open
count as plain text (`2026 · current year · 1 open`). Promoted to a
soft accent-tinted pill (`bg-state-accent-hover-alt`, `text-text-
accent`) so the count reads as a real signal that anchors the year
row — matches the screenshot's light-blue pill. Extended-count tail,
when present, stays as the quiet tertiary phrase since that's a
secondary tail signal.

## Files touched

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — added
  `ClientOwnerHeaderPill` component + wired it into the H1 chip
  cluster; threaded `useCurrentUserName()` into the workspace;
  filing-plan column legend + year badge updates; new "Official
  deadline" column cell.
- `apps/app/src/features/clients/ClientSummaryStrip.tsx` — replaced
  Team tile with Open Filing; added the `subline` + `sublineTone`
  props to `TileShell`; dropped `TeamAvatarStack` + team-tint
  helpers + the members.listAssignable query.
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po` — 14 new
  strings, all translated.

## Trade-offs and follow-ups

- The Open Filing count goes to `0` when all obligations are
  terminal, which leaves the tile sitting muted with "Nothing open
  right now". That's the right outcome — the page already says
  "everything is filed" in that case — but if the design wants a
  positive "All set" state we can adapt the subline copy later.
- Internal vs Official deadlines render at the same width (132px).
  In practice they're the same date on most rows; the column is
  most useful when an extension creates a gap. If the columns feel
  visually heavy in the empty-gap case we can tone Official down
  further or hide-when-identical, but the design call here is to
  keep both visible so the audit-defense signal stays explicit.
- `ClientOwnerHeaderPill` is local to `ClientFactsWorkspace.tsx`
  right now. If we surface owner pills on other pages (e.g. the
  clients list row hover, or the obligation drawer header), promote
  it out to `apps/app/src/features/clients/ClientOwnerPill.tsx`.
