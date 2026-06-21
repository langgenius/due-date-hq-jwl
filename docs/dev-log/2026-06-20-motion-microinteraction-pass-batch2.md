# App-wide motion / micro-interaction pass — batch 2

_2026-06-20 · continuation of [batch 1](2026-06-20-motion-microinteraction-pass.md)_

Next 7 from the [catalog](../Design/motion-microinteraction-catalog-2026-06-20.md)
backlog — the "entrance fades on conditional mounts" + a couple of state-change
transitions. All use the safe Tailwind `animate-in` recipe (no AnimatePresence
height-jank, no new imports) or a single `transition-*` utility, every one with the
`motion-reduce:*` guard, on-grammar (150ms).

## Shipped (7)

- **Alerts "Why?" reasons panel** (`PulseAlertRow.tsx`) — the smart-priority inset
  now fades + 1px-slides in when expanded instead of popping.
- **Alert detail "Ready to apply"** (`AlertDetailDrawer.tsx`) — the green
  affirmation section rises in (fade + 1px bottom-slide) when the apply gate clears.
- **Materials "All items received"** (`ObligationQueueDetailDrawer.tsx`) — the
  all-clear line fades in when the last outstanding item is received (a quiet
  acknowledgement of the batch action).
- **Deadlines inline-accordion body** (`DeadlineRow.tsx`) — the expanded workflow
  region fades in on open.
- **Rules AI-draft reveal** (`rule-detail-drawer.tsx`) — the generated draft fades
  in when it replaces the skeleton (the "Accept is unlocked" moment).
- **Deadlines table row selected-state** (`routes/obligations.tsx`) — added
  `transition-colors` so the selection accent fades rather than snaps.
- **Command-palette nav-item icon tile** (`CommandPalette.tsx`) — added
  `transition-colors` so the tile's text tone eases on keyboard-select (pairs with
  batch 1's ↵ enter-hint fade).

## Verification

tsgo 0; build green; no new i18n strings. These are trivial className additions
(the same `animate-in fade-in` / `transition-colors` recipes used across the app),
so they're build-validated; batch 1's heavier motion components were the ones that
needed (and got) live confirmation. Live command-palette open was flaky in the
preview harness (opens via ⌘K, not a synthetic click) — not a code issue.

## Remaining backlog

`layoutId` active-indicator slides (alert-detail scroll-spy, deadline-detail section
nav) and a few more state-change polish items remain in the catalog for batch 3 —
the medium-risk ones that warrant careful live verification.
