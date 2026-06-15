# Delete dead `PenaltyExposureCard`

_2026-06-16_

Removed `features/obligations/detail/PenaltyExposureCard.tsx` — dead code with
zero live importers or renderers.

## Why

Penalty-exposure UI was intentionally hidden across the app (commits `ea886787`
"hide all penalty-exposure UI" and `f3b93751` "scrub penalty-exposure dollar
figure"). The card component survived that scrub but was never re-wired in — a
repo-wide grep for `PenaltyExposureCard` / `detail/PenaltyExposure` found only:

1. the file's own `export function` declaration, and
2. one **comment** reference in `rules/rule-detail-drawer.tsx` citing it as an
   example of the canonical bar-header card chrome.

No JSX usage, no import statement. The dollar-figure exposure render (`formatCents`
on `estimatedExposureCents` / `accruedPenaltyCents`) is exactly the kind of UI the
two prior commits set out to suppress, so reviving it isn't desired either.

## What changed

- **Deleted** `apps/app/src/features/obligations/detail/PenaltyExposureCard.tsx`.
- **`rule-detail-drawer.tsx`** — dropped the now-dangling `` / `PenaltyExposureCard` ``
  mention from the `DisclosureCard` doc comment. The remaining "same chrome as the
  deadline-detail cards" still anchors the chrome description without pointing at a
  file that no longer exists.

## Verified

- `npx tsgo --noEmit -p apps/app` — clean (nothing imported the deleted file).
- `npx vp check` — my touched files introduce no new formatting issues (the one
  pre-existing `rule-detail-drawer.tsx` formatting hit at lines 638/2017 predates
  this change and is shared with ~36 unrelated dev-log files; left untouched to
  keep the commit surgical and avoid racing the parallel session).
