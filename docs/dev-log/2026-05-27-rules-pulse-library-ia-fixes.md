# /rules/pulse and /rules/library IA fixes

**Date:** 2026-05-27
**Scope:** `apps/app/src/routes/rules.pulse.tsx`, `apps/app/src/routes/rules.library.tsx`

## Yuqi feedback

Five separate UX clarifications on the two top-level Rules surfaces:

1. `/rules/pulse` — "the relationship between Monitoring x sources? and the
   4 alerts?" The two sibling chips in the page header read as peers but
   communicate different things (passive surveillance vs active queue).
2. `/rules/pulse` — "needs a source button?" No way to navigate to
   `/rules/sources` from the alerts page.
3. `/rules/library` — "how to better differentiate State - NEEDS REVIEW
   rows vs State - ACTIVE rows? Currently they are mashed all together."
4. `/rules/library` — Entity chip filter "does not look the filter is
   functioning" when applied.
5. `/rules/library` — "how to convey the premises and concept of the Rule
   Library better and more obvious? to 'push' to action?"

## Fixes

### 1. Pulse — disambiguate Monitoring chip vs alert count chip

The alert count pill in the page header was a bare `"4"` next to the
`"Monitoring 4 sources"` chip — same shape (rounded-full px-2 py-0.5),
adjacent placement, but radically different meanings. The eye couldn't
tell which number was which signal.

Fix: the alert pill now reads `N active` with the literal word, keeping
its destructive tone but gaining explicit text scope. The Monitoring chip
stays neutral with its pulsing green dot. Two visually distinct chips =
two distinct meanings:

- Monitoring chip (neutral grey, dot, "Monitoring N sources") — passive
  watcher signal, always present when sources exist.
- Alert chip (destructive-toned, "N active") — actionable queue, only
  present when work is waiting.

### 2. Pulse — add Sources button to header actions

Added a `<Button variant="outline" size="sm">` linking to `/rules/sources`
with the `RadioTowerIcon` (the same icon `/rules/library` uses for its
Sources button — token consistency). Sits before "Alert history" since
"what we're watching" is upstream of "what we surfaced."

### 3. Rule library — NEEDS REVIEW vs ACTIVE row differentiation

The status group section header already declared the group ("NEEDS REVIEW"
vs "ACTIVE") but the rows themselves were visually identical. In a long
expanded jurisdiction the visual boundary between groups disappeared.

Fix: rows whose status maps to the `needs_review` group now carry a subtle
warning surface tint (`bg-state-warning-hover/40`). Light enough to stay
calm, distinct enough to scan past at a glance. No border-left stripe —
those are banned per the design system. Hover still keys to
`hover:bg-state-base-hover` so the interactive affordance is preserved
from the tinted resting state.

### 4. Rule library — entity chip active state

The chip's active style was `bg-text-primary text-text-inverted` — a heavy
dark fill that read as "primary action" more than "filter engaged."
Retuned to the canonical accent tone pattern used elsewhere in the app
for selected filter chips: `bg-state-accent-hover-alt`,
`border-state-accent-solid`, `text-text-accent`, `font-medium`. The
destructive "missing" sub-pill simplified to plain destructive text
since the active chip is no longer dark. `aria-pressed={isActive}` was
already present and remains.

### 5. Rule library — push-to-action framing

Added a small two-element strip between PageHeader and RuleReviewProgressBar:

- Left: one-sentence framing line — "These are the deadline rules that
  drive your client deadlines. Review and approve new rules before they
  trigger reminders." Stays inline (`text-description`, secondary text)
  so it doesn't read as a banner.
- Right (only when `totalPendingReview > 0`): warning-toned status chip
  reading "N rules need review" — clickable, sets the scope query param
  to `review` to switch the table to the needs-review filter. When the
  queue is empty the chip collapses and the framing line stands alone.

No dismiss control, no welcome modal, no big banner — keeps the page
chrome calm per `.impeccable.md` ("calm · capable · sharp").

## Tokens used

- `bg-state-base-hover` / `text-text-secondary` — Monitoring chip pill
  (unchanged, preserved canonical).
- `bg-state-destructive-hover` / `text-text-destructive` — alert chip
  (unchanged, only added "active" word).
- `bg-state-warning-hover/40` — needs-review row tint.
- `border-state-accent-solid` / `bg-state-accent-hover-alt` /
  `text-text-accent` — active entity chip.
- `border-state-warning-hover-alt` / `bg-state-warning-hover` /
  `text-text-warning` / `bg-state-warning-solid` — push-to-action
  status chip.
- `RadioTowerIcon` — Sources button icon (matches `/rules/library`).

## i18n

Four new English strings extracted:

- `{totalPendingReview, plural, one {# rule needs review} other {# rules need review}}`
- `active` (also used by rules.library segment label; translation shared)
- `Show rules needing review`
- `These are the deadline rules that drive your client deadlines. Review
  and approve new rules before they trigger reminders.`

All four translated to zh-CN (CPA / tax-domain Mandarin):

- `{totalPendingReview, plural, one {# 条规则待审} other {# 条规则待审}}`
- `活跃`
- `查看待审规则`
- `这些规则驱动您客户的截止日期。新规则在触发提醒前需要您审核并通过。`

`Sources` already translated as `来源` from existing reference in
`rules.sources.tsx` / `rules.library.tsx` — the new `rules.pulse.tsx`
reference shares the catalog entry.

## Validation

- `pnpm --filter @duedatehq/app exec vp check` — 0 errors, 2 warnings
  (both pre-existing in unrelated files).
- `pnpm --filter @duedatehq/app i18n:extract` — 159 missing zh-CN
  (pre-existing; my four new strings all translated).
- `pnpm --filter @duedatehq/app exec vp test src/routes/rules.library.test.tsx`
  — 14 / 14 passing.

## Not done

- No visual walkthrough — local demo-login flow not run.
- Tree intentionally left dirty per task instructions (no commit).
