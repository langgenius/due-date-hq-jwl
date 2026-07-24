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

## Lesson

Trust the remote `CI` typecheck over a backgrounded local one that may have been
cancelled mid-run. A garbled mechanical edit can pass a partial check and only surface
once the full pipeline runs.
