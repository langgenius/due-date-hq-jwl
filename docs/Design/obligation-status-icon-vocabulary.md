# Obligation status icon vocabulary

> Canonical map from `ObligationStatus` to its lucide icon + tinted
> color class. Sets the visual grammar for every surface that
> renders a status — pills, dropdowns, filter tabs, status reads.
> Established 2026-05-25 to replace the abstract status-dot
> (`BadgeStatusDot`) with recognizable glyphs.

## Anchor

- Implementation: [`apps/app/src/features/obligations/status-control.tsx`](../../apps/app/src/features/obligations/status-control.tsx) — `STATUS_ICON` + `STATUS_ICON_COLOR` exports
- Lifecycle brief (canonical state model): [`obligation-lifecycle-design-brief.md`](./obligation-lifecycle-design-brief.md)
- Label collapse map (10 → 6 states): same module, `useLifecycleV2StatusLabels`

## Why

The pre-2026-05-25 status pill was variant + dot + label
(`<Badge variant="warning">·dot· In review</Badge>`). The dot
carried tone (info / warning / success), but didn't carry _which_
status — every blue dot looked alike, every green dot looked
alike. CPAs scanning a queue learned the labels, not the marks.

Replacing the dot with a specific lucide glyph per status:

1. Makes the status legible at icon-size before the label is
   read. Scan speed goes up.
2. Gives the deadline filter tabs and the row pills a shared
   visual hook — same glyph in the same color, in both places.
3. Reuses lucide's existing semantics so the icon meaning
   doesn't have to be invented (hourglass = waiting, barrier =
   blocked, message = active review).

## The map

The icon + color follow the 6-state v2 collapse — every legacy
10-state value maps to the same glyph its v2 label collapses to.

| Status (DB enum)    | v2 label          | Icon                | Color class             | Hex semantic |
| ------------------- | ----------------- | ------------------- | ----------------------- | ------------ |
| `pending`           | Not started       | `Loader`            | `text-text-tertiary`    | Gray         |
| `not_applicable`    | Not started       | `Loader`            | `text-text-tertiary`    | Gray         |
| `waiting_on_client` | Waiting on client | `Hourglass`         | `text-text-warning`     | Amber        |
| `blocked`           | Blocked           | `Construction`      | `text-text-destructive` | Red          |
| `in_progress`       | In review         | `MessageSquareText` | `text-text-accent`      | Blue         |
| `review`            | In review         | `MessageSquareText` | `text-text-accent`      | Blue         |
| `extended`          | In review         | `MessageSquareText` | `text-text-accent`      | Blue         |
| `done`              | Filed             | `FileCheck`         | `text-text-success`     | Green        |
| `paid`              | Filed             | `FileCheck`         | `text-text-success`     | Green        |
| `completed`         | Completed         | `CircleCheck`       | `text-text-success`     | Green        |

### Why each glyph

- **`Loader`** (gray) — the 8-radial-line spinner, frozen mid-
  state. Reads as "nothing has resolved here yet." Not a true
  loading indicator; it's a glyph for the "nothing has happened"
  starting state.
- **`Hourglass`** (amber) — the canonical "waiting on someone
  else" mark. The two-bulb hourglass has been the "time
  pending" glyph since the Mac OS 6 wait cursor. Pairs with
  amber to read as "soft urgency, externally blocked."
- **`Construction`** (red) — striped traffic barrier. Reads as
  "cannot proceed." Differentiates from a stop sign (which
  reads as "user must take action") — barrier is environmental.
- **`MessageSquareText`** (blue) — speech bubble with horizontal
  text lines. Reads as "actively under discussion / review."
  The text inside the bubble distinguishes it from the plain
  message square (which reads as "open conversation").
- **`FileCheck`** (green) — document with a check mark. Reads
  as "the filing is in the can." The document shape ties
  specifically to filing-track obligations.
- **`CircleCheck`** (green) — pure check inside a circle.
  Reads as "completed, no qualifier" — distinct from `FileCheck`
  because Completed is a stronger terminal state than Filed
  (Filed can still get rejected; Completed is closed for good).

### Done / Filed share green by design

The `Filed` and `Completed` glyphs share the success-green color
even though they're different icons. This is intentional:

- The eye scans color first; both states are "settled" lifecycle
  states, so they cluster correctly under one green.
- The icon discriminates at the next zoom level: `FileCheck`
  says "filed with paperwork," `CircleCheck` says "closed."
- The label is the final disambiguator at reading time.

A CPA shouldn't have to distinguish Filed from Completed at
scan speed — the underlying difference (Filed = awaiting
acceptance; Completed = closed for good) is rarely actionable
during triage.

## Where it renders

The map is consumed by:

1. **`ObligationStatusReadBadge`** — the canonical read-only
   status pill. Used everywhere a row's status is shown.
2. **`ObligationQueueStatusControl`** — the interactive pill +
   dropdown on the deadlines queue + drawer header. Both
   trigger and dropdown items render the icon.
3. **`ObligationQueueScopeTab`** — the deadline filter tabs at
   the top of `/deadlines`. The 6 v2 scope tabs each lead with
   the same icon used on the row pill for that status.
4. **Any new surface** that renders a status: pull
   `STATUS_ICON[status]` + `STATUS_ICON_COLOR[status]` from
   `@/features/obligations/status-control`. Do not invent a
   new mark.

## When NOT to use

- The Pulse alert tone (red / amber / green badge on a Pulse
  alert) is a separate vocabulary — those alerts aren't
  obligation statuses. They use `PulsingDot` + the canonical
  `pulseAlertTone()` helper. See
  [`pulse-vocabulary.md`](./pulse-vocabulary.md).
- The `DueDaysPill` (the "25 days late" badge in the Internal
  Due column) carries urgency, not status — keep its own
  treatment. See [`obligation-drawer-ux-audit-2026-05-21.md`](./obligation-drawer-ux-audit-2026-05-21.md).

## Migration notes

- `BadgeStatusDot` is no longer imported from `status-control.tsx`
  itself. It still exists in `@duedatehq/ui` for non-status
  contexts (e.g. the Internal Due `DueDaysPill` urgency dot).
- Surfaces that previously spelled out
  `<Badge variant={STATUS_VARIANT[s]}><BadgeStatusDot tone={STATUS_DOT[s]} />{label}</Badge>`
  manually should migrate to
  `<ObligationStatusReadBadge status={s} />` — the badge now
  renders the icon end-to-end.
- The `STATUS_DOT` map is kept exported for any consumer that
  still wants tone-only (no icon). New surfaces should NOT use
  it.

## Verification across surfaces

When changing a status's icon or color, verify it propagates to:

- [`apps/app/src/routes/obligations.tsx`](../../apps/app/src/routes/obligations.tsx) — deadline queue row pill + filter tabs
- [`apps/app/src/features/dashboard/actions-list.tsx`](../../apps/app/src/features/dashboard/actions-list.tsx) — Today expanded-row pill
- [`apps/app/src/features/clients/`](../../apps/app/src/features/clients) — client detail filing-plan pill
- Obligation drawer header pill (same `ObligationQueueStatusControl`)

If any of these still render the old dot-based pill, fix in
place — the icon vocabulary should be uniform across the app.
