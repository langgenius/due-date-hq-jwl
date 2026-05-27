# /rules/pulse container width unification — 2026-05-26

Closes audit P0 #10 / per-surface P1 — "/rules/pulse splits its
container width between `max-w-page-wide` (no panel) and
`max-w-[1440px]` (panel open). Layout jumps left ~80 px when an
alert is clicked. Use a stable container, let the panel column grow."

## What shipped

### 1 · `AlertsListPage` container width unified

`apps/app/src/features/pulse/AlertsListPage.tsx:287-308`

```diff
- panelOpen
-   ? 'mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6'
-   : 'mx-auto flex w-full max-w-page-wide flex-col gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6'
+ panelOpen
+   ? 'mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6'
+   : 'mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6'
```

The only diff: list-only branch's `max-w-page-wide` (1100 px) →
`max-w-[1440px]`. Both states now sit at the same width tier; the
`mx-auto` no longer recenters around a different cap when an alert
is clicked.

Height handling intentionally NOT unified:

- **Panel-open**: keeps `h-full min-h-0` (split-column wrapper owns
  scroll inside its own bounds).
- **List-only**: stays auto-height so the route shell owns the
  natural scroll (no need for fixed-height when there's no second
  column to manage).

The audit's recommended fix included "Always `min-h-0 h-full`" as
a secondary part — that would change scroll behavior on list-only
beyond what the core complaint asked for. Deferred unless / until
there's a separate reason to lock the list-only height.

### 2 · DESIGN.md §5.5 grew a "宽度档" (width-tier) section

New subsection codifies the two width tiers and the rule that a
single route can't switch between them:

| Tier              | Value                     | Routes                                                               |
| ----------------- | ------------------------- | -------------------------------------------------------------------- |
| **Standard**      | `max-w-page-wide` (≈1100) | dashboard, /clients, /clients/[id], /opportunities                   |
| **Wide (opt-in)** | `max-w-[1440px]`          | /deadlines, /rules/library (via `RulesPageShell.wide`), /rules/pulse |

The rule: **one route picks one tier; no mid-route swapping**. Pulse
was the exception (1100 ↔ 1440 toggle) that motivated the audit
finding; it now lives in the Wide tier.

The "禁止值" list also picked up an entry banning the mid-route
width swap, so the next contributor can't reintroduce it without
hitting the canon.

## Trade-off acknowledged

List-only state now renders at 1440 px instead of 1100 px. Alert
cards have natural max-widths (~600–800 px) so the visual difference
on list-only is **extra horizontal whitespace around the centered
card stack**, not stretched cards. That's the cost — slightly more
white space on either side of the cards in the list-only view.

The cost is constant. The cost of the OLD layout was a ~80 px
left-shift **every time** an alert was clicked or closed — that's
interaction friction, far worse than a static layout choice. Audit's
explicit recommendation: take the static-layout cost.

## Verification

```bash
CI=true pnpm exec vp check
# Expected: 0 errors, pre-existing warnings unchanged
```

Manual:

- Open `/rules/pulse`. Page renders at `max-w-[1440px]` (1440 px on
  wide viewports, full-width on narrower).
- Click an alert. Panel slides in from the right. **Page edges
  should not shift horizontally**. List column shrinks to ~40% of
  1440 = ~576 px; panel takes ~60% = ~864 px.
- Close the alert. Panel slides out. **Page edges should not shift
  horizontally**. List re-expands to full width within the 1440 cap.

## Out-of-scope follow-ups

- **`/rules/library` `wide` prop unification.** Currently a per-call
  opt-in (`RulesPageShell.wide={true}`). With three routes now in
  the Wide tier (/deadlines, /rules/library, /rules/pulse), it's
  worth promoting "Wide" to a first-class container variant rather
  than a per-shell prop. Defer until the next surface needs it.
- **List-only height handling on /rules/pulse.** Audit suggested
  always-fixed-height; deferred (see §1 above).
