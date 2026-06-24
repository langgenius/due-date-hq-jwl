# Rules review — decision rail "be more different" (finished)

**Date:** 2026-06-23 · **Surface:** `apps/app/src/features/rules/rule-detail-drawer.tsx`

Closes the one deferred item from the rules review-panel polish (both this
session and the parallel session held it for the same reason — the dev-server
HMR was stale all session, so the rail couldn't be iterated live). The preview
is now stable, so it was done with live iteration in the NY rule review modal.

## Problem

The split-rail Accept-rule modal (`splitRail`) is a two-pane: LEFT = white
"Verify the facts" reference column; RIGHT = the "Your decision" commit rail.
The two read as near-symmetric — the rail was the same faint gray
(`bg-background-section` / gray-50), a hairline `divider-regular` seam, and a
"Your decision" eyebrow styled identically to the left's "Verify the facts". So
the act-here side didn't announce itself.

## Change

The rail now reads as a distinct "act here" panel without flattening the
left's eyebrow→title hierarchy:

- **Deeper surface** — `bg-background-section` → `bg-background-subtle` (gray-50 →
  gray-100), so the rail is a clearly separate plane from the white facts column
  and the inner white "Before you accept" card / textarea pop more.
- **Firmer seam** — `border-divider-regular` → `border-divider-deep`.
- **Accent header** — the "Your decision" eyebrow goes navy (`text-text-accent`)
  vs the neutral-tertiary "Verify the facts" on the left, marking which side is
  the decision (navy = the product's primary-action accent).

## Verify

`tsgo` app clean; `vp run @duedatehq/app#build` clean. Verified live in the NY
"individual income tax return applicability" review modal: rail bg `#f2f4f7`
(gray-100), left seam `divider-deep`, header navy `#22488c`. Pushed `HEAD:main`.
