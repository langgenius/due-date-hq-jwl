# 2026-05-27 — Inbox popover: drop blue background tint on unread items

Branch: `design/audit-drain-pass-1`

## Yuqi's ask

> why is all the inbox notification in blue? i know they belong to
> Unread. but they don't have to be in blue background? can you
> polish the inbox design?

The notifications-bell popover painted every unread row with a
heavy lavender bg tint (`bg-state-accent-hover-alt/40`) — three
redundant unread cues (bg + bold + right dot) competing for the
eye and shouting "everything is urgent."

## What shipped

`apps/app/src/components/patterns/pulse-notifications-bell.tsx`

Rewrote `NotificationItem` so the unread signal is layered, not
stacked-on-top-of-itself:

1. **Left accent dot** (NEW position) — small `size-2 rounded-full
   bg-state-accent-solid` dot in a fixed column before the icon.
   Reading the popover top-down, the eye scans the leftmost column
   to triage what's new. iOS Mail / Linear / Slack canonical
   pattern.
2. **Title typography** — `font-medium text-text-primary` for
   unread, `text-text-secondary` for read. Bold-vs-regular is the
   primary unread signal.
3. **Icon tone** — `text-text-primary` for unread, `text-text-
   tertiary` for read. Subtle weight bump without color.

Dropped:

- `bg-state-accent-hover-alt/40` whole-row background tint. Read
  AND unread now share the same neutral surface; hover
  (`bg-background-default-hover`) is the only color event in the
  resting row, so hover reads honestly as "I'm hovering this"
  instead of fighting an already-blue state.
- Right-side dot. Moved to the left as the canonical position.

## Why

The popover used THREE simultaneous cues for the same fact ("this
is unread"): heavy bg tint, bold title, right dot. That's the
classic "stack every signal" anti-pattern — each layer competes
with the others, and the loudest one (the bg) wins regardless of
intent.

Trimming to ONE primary cue (left dot) + TWO supporting cues
(bold title, slightly darker icon) gives the same scanning power
with a calmer visual. Read items lose all accent treatment and
sit as past context, which is what they are.

The full /notifications page (`features/notifications/notifications-
page.tsx`) was already using a clean left-accent-bar pattern with
no bg tint — the popover was the lone offender. Both surfaces now
agree in spirit: unread = a subtle left-side mark, never a
saturated background.

## Verification

- `pnpm --filter=app exec tsc --noEmit` — clean
- Manual: open bell popover, two unread items show `• [icon] Title
  bold` on white bg; hover paints the row in `background-default-
  hover`; clicking marks read, the dot disappears and the title
  fades to secondary text in the same rerender.

## Not changed (intentional)

- The full /notifications page — already clean (3px left-accent
  border on unread cards, no bg tint).
- The unread-count chip on the bell trigger (red badge with
  count). That's a "summons" not a "list state," so it stays
  prominent.
