---
title: 'Pulse + Inbox source labels read as text, not dev tokens (typeset)'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: pulse
---

# Drop `font-mono` from source and type labels (critique P2 — typeset)

## Why

The critique flagged a recurring tonal mismatch: alert sources
("IRS Disaster Relief", "CA FTB Newsroom") and inbox type labels
("Deadline reminder", "Overdue", "Audit package") rendered in
`font-mono` — making sentence-case English copy look like
developer-console tokens to a CPA. The product is a deadline
workbench for CPAs, not a tool for engineers; the chrome shouldn't
read like a build log.

`font-mono` belongs on tabular numbers (counts, dates), code, IDs.
It does NOT belong on labels the user reads as words.

## What changed

### `PulseAlertCard.tsx`

- Removed `font-mono tabular-nums` from `<span>{alert.source}</span>`
  in the card header. "IRS Disaster Relief" now reads as sentence
  case, same weight/colour as the surrounding metadata.
- Removed `font-mono` from the `changeKindLabel(...)` outline Badge
  ("Deadline" / "Filing" / "Scope" / "Form" / "Source" / "New rule"
  / "Other"). These are sentence-case English, not symbols.
- Numeric counts (`# client`, `# need review`) kept their `font-mono
tabular-nums` — those are numbers, deserve tabular alignment.

### `PulseSourceBadge.tsx`

The compact "source ↗" link chip shared between the banner card
and the detail header. Removed `font-mono tabular-nums` from the
wrapping Badge — same reasoning as `PulseAlertCard`. The
`ExternalLinkIcon` and outline border still make the affordance
read as a tappable source link.

### `notifications-page.tsx`

Removed `font-mono` from the per-notification type-label span
(`Deadline reminder`, `Overdue`, `Audit package`). These are
readable English, no different from the title or body text in the
same card.

## What was intentionally left as `font-mono`

- Tabular numbers inside structured fields (county lists, form
  codes, rule IDs) in `PulseStructuredFields.tsx`. Those are
  identifiers and codes — `font-mono` reads correctly there.
- Numeric counts inside alert cards (impacted-client count,
  needs-review count). Numbers, alignment matters.
- The penalty / exposure tabular cells (`AffectedClientsTable.tsx`).
- Rule version / hash badges. Those are genuine identifiers.

## How to verify

`/rules/pulse` page:

- Source label in each card header reads in normal sans-serif.
- Footer source chip (the one with the ↗ arrow) reads the same.
- "Deadline" chip on the right of each header reads in normal sans
  too.

`/notifications` page:

- The small label under each notification (`Deadline reminder` etc.)
  reads in normal sans-serif.

## Out of scope

- Full audit of every `font-mono` in `apps/app/src`. The remaining
  uses are either tabular numbers, identifiers, or code blocks —
  appropriate. Could come back as a future `/typeset` sweep if any
  new ones land that fail the "is this code or copy?" test.

## Files touched

- M `apps/app/src/features/pulse/components/PulseAlertCard.tsx`
- M `apps/app/src/features/pulse/components/PulseSourceBadge.tsx`
- M `apps/app/src/features/notifications/notifications-page.tsx`
