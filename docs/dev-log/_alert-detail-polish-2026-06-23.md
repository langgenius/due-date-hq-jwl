# Alert detail — drawer polish (search, jurisdiction frame, footer, advance)

**Date:** 2026-06-23
**Surface:** `apps/app/src/features/alerts/AlertDetailDrawer.tsx`,
`apps/app/src/components/primitives/state-badge.tsx`,
`apps/app/src/components/primitives/search-input.tsx`

Page-feedback batch on the alert detail page. What shipped here:

- **#1 Rail search dimmed at rest.** The compact (sidebar-rail) `SearchInput`
  placeholder was `text-secondary` even when empty + unfocused. Now `text-tertiary`
  at rest, brightening to `text-secondary` on `group-focus-within` (matching the
  icon's existing rest→focus darkening) — an empty filter no longer reads active.

- **#3 Jurisdiction is a framed chip.** `JurisdictionLabel` (seal + code + name)
  was loose inline text. Added a hairline frame + soft fill
  (`rounded-lg border border-divider-subtle bg-background-subtle px-2`) so it
  reads as one bounded unit, like the list's state pills. ("FEDFederal" was just
  the run-on textContent — visually it's spaced; the frame makes the unit clear.)

- **#6 Footer no longer a white bar.** The sticky decision footer was
  `bg-background-default` (white) against the gray document body. Now
  `bg-background-section` — still opaque so it masks the document scrolling under
  it, but matches the body instead of reading as a white bar.

- **#6 Dismiss advances to the next alert.** `markReviewed` already advanced
  (`onNext` is wired) + toasted; **dismiss** only closed. Made it consistent:
  dismiss now advances to the next rail alert (or closes when last) and the toast
  names where it went ("Moved to Alert history.").

## Findings (not bugs / deferred)

- **#2 "Needs your decision" never appeared.** Not a bug — the eyebrow is
  correctly hidden for *resolved* alerts. The reported alert (`…3020`) is already
  **dismissed**; on a pending alert (e.g. `…3003`) the eyebrow shows (verified
  live), and the stepper reads ✓✓✓ · ● Your decision · ○ Applied. Open question:
  cyan vs the current navy-accent — left navy for now (consistent with the other
  hero pills); easy to switch if cyan is wanted.
- **#4 Hero** verified good on a pending alert (eyebrow + framed jurisdiction +
  correct stepper + de-whited footer).
- **#5 Section-nav now a full-width white masthead** (done). Yuqi clarified: the
  nav should "occupy the full width of the right side… white background." It was
  a child of the 880-constrained content column, so its white bg only spanned the
  centered 880 band. Moved it OUT to a direct child of the scroll container,
  between the hero and the content column: `sticky top-0 bg-background-default
  px-6 xl:px-12` (full-width white) with an inner `mx-auto max-w-[880px]` tab row.
  Now nav width == hero width (1186px live), both white → one continuous
  masthead; tabs stay aligned to the 880 content column. Scroll-spy + the
  shared-layout underline unchanged. Content column got `pt-6` for spacing.
- **#6 "apply product-wide" + "audit all post-action behaviour".** The
  advance-to-next + toast pattern is now consistent within the alert drawer;
  extending + auditing it across every action button product-wide is a separate
  focused pass (proposed, not done here).
