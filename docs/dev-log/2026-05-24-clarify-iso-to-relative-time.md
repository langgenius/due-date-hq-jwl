---
title: 'Inbox + Members surface relative time, keep ISO on tooltip (clarify)'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: app-shell
---

# ISO timestamps → relative time on daily-driver surfaces (critique P2)

## Why

CPAs scan the Inbox and the Members JOINED column for recency, not
precision. The current chrome was rendering both as
`2026-05-01 02:50:00 PDT` — engineering-precise, scannable in two
seconds rather than zero. The critique flagged it as one of the
ways the product chrome reads "engineering tool" instead of
"deadline workbench."

The exact second is still useful when a CPA's looking for a
specific event. The fix is to lead with the relative answer
("3w ago") and keep the precise answer one hover away.

## What changed

### `apps/app/src/lib/utils.ts`

New `formatRelativeTime(value, now?)` helper alongside the existing
`formatDateTimeWithTimezone`. Bucketed output:

| Δ      | Output               |
| ------ | -------------------- |
| < 45s  | `just now`           |
| < 60m  | `Nm ago` / `in Nm`   |
| < 24h  | `Nh ago` / `in Nh`   |
| < 7d   | `Nd ago` / `in Nd`   |
| < 30d  | `Nw ago` / `in Nw`   |
| < 365d | `Nmo ago` / `in Nmo` |
| else   | `Ny ago` / `in Ny`   |

Future tense supported because some surfaces (invitations, snooze
expiry) render forward-looking timestamps. Compact suffixes (`m`,
`h`, `d`, `w`, `mo`, `y`) instead of "minutes" / "weeks" so the
column stays narrow on tables.

### `apps/app/src/components/primitives/relative-time.tsx` (new)

Canonical `<RelativeTime value timeZone />` component that pairs
the relative string with the absolute formatted value on the
`title` attribute. Renders as a semantic `<time dateTime={value}>`.
Surfaces that need precision should keep calling
`formatDateTimeWithTimezone` directly.

### `apps/app/src/features/notifications/notifications-page.tsx`

Replaced the per-card absolute timestamp with `<RelativeTime>`.
Hover the timestamp to read the full `2026-05-01 02:50:00 PDT`.

### `apps/app/src/features/members/members-page.tsx`

JOINED column now reads "3w ago" via `<RelativeTime>`. Also dropped
the `font-mono` treatment on JOINED + LAST ACTIVE cells (per the
typeset pass that just landed for the Pulse/Inbox surfaces — these
are recency labels, not codes).

## What was deliberately left as ISO

- **Audit log table** (`audit-log-table.tsx`,
  `audit-event-drawer.tsx`) keeps `formatDateTimeWithTimezone`.
  Audit readers WANT the second; that's the entire value
  proposition of the surface.
- **Evidence chain** timestamps — same reason.
- The `formatMemberDate`/`formatInvitationDate` helpers in
  `member-model.ts` still exist (they're used downstream by
  `members-page.tsx` for the invitations card sublines, where the
  ISO format reads fine in a sentence: "Sent 2026-05-01 …").
  Could absorb a relative wrapper later if needed.

## How to verify

`/notifications` — each card timestamp reads `3w ago` (hover →
`2026-05-01 02:50:00 PDT`).

`/members` — JOINED column reads `3w ago` per row.

## Out of scope

- Refreshing the relative string as time passes — for the inbox /
  members "JOINED" use cases the page is unlikely to be open long
  enough for "3w ago" to drift to "4w ago" within a single
  session. Add a refresh interval later if a long-lived dashboard
  surface adopts the helper.
- Replacing ISO in the obligation drawer "Last updated" line —
  separate concern, left for the next pass.

## Files touched

- M `apps/app/src/lib/utils.ts`
- A `apps/app/src/components/primitives/relative-time.tsx`
- M `apps/app/src/features/notifications/notifications-page.tsx`
- M `apps/app/src/features/members/members-page.tsx`
