---
title: 'Tier 4 minor fixes — Billing math, avatar a11y, +N overflow tile'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: app-shell
---

# Three minor fixes (critique P2 batch)

## Why

Three independent micro-issues from the critique, each one a one-
file fix. Batched because each is small and they share a review
scope.

| #   | Issue                                                                                                                                                                             | Surface     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Billing read "**2 of 1 active practices**" when the owner had two firms on a 1-practice plan — math that reads as a bug                                                           | `/billing`  |
| 2   | Avatar wrapper in MemberIdentity didn't have `aria-hidden`, causing screen readers to announce the single-letter initial as a separate sentence (`"S, Sarah Martinez"`)           | `/members`  |
| 3   | Dashboard "+N" overflow card on the Alerts strip rendered as a full-width tile, same border + size as alert cards — CPAs were trying to click into it as if it were a third alert | `/` (Today) |

## What changed

### 1. `routes/billing.tsx` — over-limit string

When `activeFirmCount > activeFirmLimit`, the label used to read
`2 of 1 active practices` which looks like broken arithmetic.

Detect the over-limit case explicitly and switch the formatting:

```
2 active · 1 on this plan
```

Same numbers, but no longer reads "2 of 1." Within-limit case is
unchanged (`X of Y active practices`).

### 2. `features/members/members-page.tsx` — avatar decorative

`MemberIdentity` renders the avatar circle and the full name next
to it. The full name is the source of truth for "who is this row?";
the avatar is decorative. Wrapping `<span aria-hidden>` around the
avatar block tells screen readers to skip both the `<img alt="">`
(already silent) AND the single-letter initial fallback (was being
announced as `"S, Sarah Martinez (You)"`).

### 3. `features/dashboard/needs-attention-card.tsx` — quieter overflow tile

Was: a same-size tile with `+N` at 24px / `ALERTS` underneath in
uppercase. Read as a _third content card_ — multiple critique
testers tried to click into it expecting alert content.

Now: a slimmer self-stretched button with a single line
`View N more →`, no big numeric headline, no shouted `ALERTS`
suffix. Still keyboard-focusable, still tappable, but visually
signals "open the full list" rather than "this is a tile."

## What was deliberately not changed in this batch

### Snooze inconsistency on Alerts page

The critique flagged "Snooze missing on 1 of 4 alerts." Looking at
`AlertsListPage.tsx`, both Snooze and Dismiss are gated on
`alert.status === 'matched'` — alerts in other statuses
(`needs_match`, `applied`, `dismissed`, `snoozed`) intentionally
don't expose those actions because they'd be no-ops. The "CA FTB
Newsroom" alert in the screenshot must have been in one of those
non-matched states. Logic is correct as-is. No change.

### Deadlines table orphan row

The critique flagged a `Magnolia Family Trust → FL Corporate
Income` row that appeared to be missing the CLIENT cell. This is a
TanStack Table virtualized-row visual artifact rather than a real
data bug — requires deeper investigation of the grouping logic,
deferred for `/polish` or a dedicated `/audit` pass.

## How to verify

- `/billing` (when owner has more practices than plan permits) →
  the metric reads `N active · M on this plan`, not `N of M active
practices` when N > M.
- `/members` → screen-reader audit no longer announces a stray
  single letter before the member's name.
- `/` (Today) Alerts strip with 3+ alerts → the overflow surface
  reads `View N more →` instead of `+N / ALERTS`.

## Files touched

- M `apps/app/src/routes/billing.tsx`
- M `apps/app/src/features/members/members-page.tsx`
- M `apps/app/src/features/dashboard/needs-attention-card.tsx`
