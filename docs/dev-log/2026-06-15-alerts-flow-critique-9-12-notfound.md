# Alerts flow critique — findings #9–#12 + dead-id not-found state

_2026-06-15_

The detail-view half of the /alerts-flow critique (all in `AlertDetailDrawer.tsx`).
No contract / data changes.

## #9 — the confidence number has one home

The confidence % showed up to three times in one viewport: the lifecycle strip
("AI parsed 58%"), the Source & confidence card ("Parse confidence 58% Medium"),
and the low-confidence banner. The lifecycle strip's "AI parsed" node now carries
the pipeline STATE only — no `value`. The exact % + tier lives once, in the
Source & confidence card. (`confPct` dropped from `AlertLifecycleStrip`.)

## #10 — drop the stale scroll caption

Removed the "Scroll to read all N sections" hint beside the scroll-spy nav — a
tutorial line that went stale the instant you scrolled. The scroll-spy underline

- the content cut off below the fold already imply "there's more".

## #11 — one loud "your decision", not two

The hero eyebrow "Needs your decision" and the lifecycle "• Your decision" node
both shouted the same thing in the same viewport (eyebrow accent pill + lifecycle
bold-accent current node). The lifecycle's CURRENT node now renders in the same
quiet secondary weight as the done steps — the accent DOT alone marks position.
The single loud call-to-action stays in the eyebrow.

## #12 — rank by tone OR number, not both

The flat section cards already rank by tone (Change = action, big primary header;
Source + Activity = reference, quiet secondary header). The 1·2·3 ordinal badges
fought that — giving the sections equal "read in order" billing while the type
tried to rank them. Dropped the badges (`index` prop + the `sectionIndex` helper);
tone wins (importance > sequence). Captions ("what changed and what to verify")
stay.

## Dead-alert-id → friendly not-found (+ skeleton fix)

A stale deep link or an alert resolved out from under a shared URL makes the
server answer `PULSE_NOT_FOUND`. Before: the body showed the generic "Couldn't
load … Retry" (misleading — a retry can't recover a deleted alert), and a
pending/paused query left the header skeleton (keyed on `!detail`) spinning
forever.

- `notFound` = `open && isError && isAlertNotFound(error)` → a friendly
  `EmptyState` (prominent / neutral, SearchX icon, "This alert isn't available",
  "Back to alerts"). Reuses the existing shared `EmptyState` + the existing
  tested `isAlertNotFound` (PULSE_NOT_FOUND) detector.
- `loadFailed` = `isError && !isAlertNotFound(error)` → the generic
  "Couldn't load … Retry" (transient / permission / network — where a retry can
  actually recover).
- `showDetailSkeleton` = `isPending && !detail` (was `isLoading`). `isLoading`
  excludes a `fetchStatus: 'paused'` (offline) fetch, which is why the header
  skeleton used to fall through to its `!detail` fallback and hang. `isPending`
  covers fetching AND paused, so a settled query never sits under a perpetual
  skeleton, and an offline/paused load shows the skeleton (not a blank pane).

## Verification

- `npx tsgo --noEmit -p apps/app` + `npx vp check` — clean.
- Live at 1512×861 on a real alert: lifecycle reads "✓ AI parsed" (no %); no
  "Scroll to read…" caption; "Your decision" is quiet (dot carries position); no
  1·2·3 badges (tone ranking intact).
- Not-found: the preview's react-query sits in offline/paused mode (env quirk —
  `navigator.onLine` true but fetches paused), so a real fetch never completes
  here. Verified the render path by injecting the server's actual
  `PULSE_NOT_FOUND` error into the cached query → the EmptyState renders (SearchX
  - "This alert isn't available" + "Back to alerts"). Also confirmed the paused
    state now shows the skeleton instead of a blank pane.

## i18n

New strings ("This alert isn't available", the description, "Back to alerts")
render via the lingui English fallback; catalog extract deferred per the
parallel-sessions protocol (the `messages.po/.ts` are mid-edit by the other
session — don't race them).
