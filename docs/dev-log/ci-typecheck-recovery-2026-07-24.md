# CI type-error recovery — 2026-07-24

The interaction-audit batch (commit `658528d8c` and the marketing hero pass) shipped
three real `tsgo` type errors that a stale local typecheck missed; the remote `CI`
job failed on them once the earlier format failure was cleared and `vp check` reached
the typecheck stage. Fixed here so `vp check` is `0 errors`.

## Errors fixed

1. **`AlertDetailDrawer.tsx:1702`** — the reduced-motion refactor's sed replacement
   garbled the call site into
   `document.getElementById(scrollIntoViewMotionSafe(activeSection), { block })`
   (TS2345 `string` not assignable to `Element`, TS2554 wrong arity). Corrected to
   `scrollIntoViewMotionSafe(document.getElementById(activeSection), { block: 'start' })`.

2. **`EvidenceDrawerProvider.tsx:175,695`** (TS2375, `exactOptionalPropertyTypes`) —
   the new error-state branch passes the timelines' `onRetry?: (() => void) | undefined`
   and `retrying?: boolean | undefined` into `QueryErrorState`, whose props were
   declared as bare optionals and so rejected an explicit `undefined`. Widened the
   primitive to `onRetry?: (() => void) | undefined` / `retrying?: boolean | undefined`
   and made `onRetry` genuinely optional — the Retry control now renders only when a
   handler is supplied (`{onRetry && (…)}`), so consumers without a refetch get a clean
   error card instead of a dead button.

3. **`scripts/social-manual.mjs:307,329`** (`no-unused-vars`, error-level) — dropped the
   dead `const soon` and renamed the unused `years0(d)` parameter to `_d`. This is
   another session's generator that entered scope via the earlier format pass.

## Verification

- `apps/app` and `apps/marketing` `tsgo --noEmit` both exit `0`.
- Full `vp check` (format + oxlint + tsgo, 998 files): **0 errors, 8 warnings**
  (`no-array-sort`, `no-await-in-loop`, `no-unsafe-type-assertion`,
  `no-unnecessary-boolean-literal-compare`, `no-unnecessary-template-expression`) —
  all non-blocking and left untouched to avoid altering another session's generator
  logic and pre-existing marketing/motion code.

## E2E regression from the narrow-card column ladder (audit #1)

`obligations.spec.ts › hides columns and bulk updates rows` failed:
`setColumnVisible('Assignee', false)` no longer wrote `?hide=…assigneeName` to
the URL. Root cause: audit #1's `NARROW_CARD_AUTO_HIDDEN_COLUMN_IDS` overlay
auto-hides `assigneeName` (and the other secondary columns) when the table card
is under 1300px. At the 1440px E2E viewport with the sidebar expanded, the card
drops below that, so the column was **already** auto-hidden — its menu checkbox
read unchecked, the helper saw "already in desired state", and the toggle never
fired. The same wart hit real users: the Columns checkbox lied about what you'd
hidden, and re-hiding an auto-hidden column was impossible.

Fix (`routes/obligations.tsx`): bind the Columns-menu checkbox to the user's
`hide` intent (the URL param), not the rendered `column.getIsVisible()`. Toggling
now writes `hide` directly, so it is immune to the layout overlay — and it drops
the panel-strip dance in `onColumnVisibilityChange`, since user intent never
contains an overlay-hidden column. The narrow/panel ladders still drive what's
_rendered_; they no longer masquerade as user column preferences.

## The threshold was also wrong (the deeper fix)

With the menu decoupled, the test advanced to line 183 and failed differently:
after a bulk owner-assign it asserts the `Assignee` cell is visible, but the
column simply wasn't rendered at 1440px. Measured in the browser at 1440×900
(sidebar collapsed, 92px): the table card is **1282px** — and audit #1 hid the
secondary columns below **1300px**, so a plain mainstream-laptop window lost
Assignee, State, and Official due, dropping the queue to four columns.

Measured the real floor instead of guessing it: the default-visible set floors
around **1092px** of min-content and only overflows the overflow-clip card below
that. Crucially, at 1282px the card overflows its `scrollWidth` by ~9px, but the
STATUS pills themselves sit at x≈1239–1395 inside a card whose right edge is
1407 — the 9px is trailing cell padding, not cropped status. Lowered
`NARROW_CARD_WIDTH_PX` from 1300 to **1120** (just above the floor). Verified
live: 1440px → 8 columns incl. Assignee, status pills fully visible; 1080px
(card 922) → laddered to the four-column row anchor with every status pill still
inside the card.

Note the ResizeObserver width only re-measures on load/observed resize, so
_resizing the window without reloading_ can leave a stale column set until the
next paint — the E2E is unaffected because every `goto()` is a fresh load.

## Lesson

Trust the remote `CI` typecheck over a backgrounded local one that may have been
cancelled mid-run. A garbled mechanical edit can pass a partial check and only surface
once the full pipeline runs.
