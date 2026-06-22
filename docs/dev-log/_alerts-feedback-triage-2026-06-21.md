# /alerts feedback pass + triage redesign (2026-06-21)

Yuqi's live page-feedback on `/alerts` (two batches, 7 items) plus the
headline rethink: replacing the Review/Active mode-toggle with a unified
two-zone triage list. Verified live on a worktree dev server; 117 alerts
unit tests + tsc green.

## Headline: Review/Active toggle → unified triage list

Feedback #1 ("can the user not touch the toggle and read about all? think
about all use cases"). The Review/Active toggle was a taxonomy of the
_alert_ (`actionMode`), not a workflow for the _CPA_, and it forced you to
pick a mode before seeing anything — defaulting (oddly) into the FYI bucket.

`/alerts` is now ONE list that triages itself (no mode toggle). See
`docs/Design/alert-card-design.md` (triage section) + the
`project_alerts_triage_model` memory.

- **Needs action** — a priority QUEUE. `alertNeedsAction()` (new, in
  `pulse-alert-chrome.ts`): the `isActiveAlert` set PLUS protective-claim
  windows. Full-weight rows, ordered by client reach. Always visible.
- **For your awareness** — a chronological DIGEST. Demoted, collapsible
  (the optional "focus" replacing the toggle), keeps the day bands, FYI
  rows drop the suggested-action line.
- Empty action zone → "You're caught up — nothing needs action" + the
  digest still shows. `?queue=active` → land focused (digest collapsed);
  `?queue=review` / `/today` link → land open (no broken links).
- The detail **rail** + the **map** navigator both order action-first
  (`triageOrdered`), the rail drops a "For your awareness" divider where the
  digest begins. The Review/Active sync effect + `workQueueCounts` are gone.

**Trust bug the deep-UX pass caught:** the naive `isActiveAlert` split filed
the protective-claim window (closing in 19 days, no client matched yet) into
_awareness_ — a closing legal window demoted to FYI. `alertNeedsAction`
errs toward action and pulls it into the queue (count 3→4). Hiding real work
is the one failure a triage model can't afford.

This REVERSES the `006bc09d` "Review is the default queue" decision; the
"defaults to Review first" test + the `selectActiveQueue` helper were
rewritten for the zones.

## The other six

- **#2 Filters popover** — titled "Filters" header with a _persistent_
  "Clear all" (was a stray bottom link); the four facets separated by
  full-width hairlines (`divide-y`, the clear-sections-not-boxes pattern);
  widened 264→280px so "Individual income" / "Franchise & fees" stop
  wrapping.
- **#3 Sort button** — the value sits in a fixed 56px slot so the trigger
  no longer resizes (and nudges the view toggle) as it flips
  Newest↔Oldest↔Impact.
- **#4 Map list** — compact (navigator) rows trimmed: dropped the form
  chip, source link, low-confidence pill, deadline tag, suggested-action
  line, and the "Why?" affordance — state/urgency · change-kind · title ·
  date only. Rail header "ACTIVE ALERTS" → "ALERTS" (it collided with the
  Active tab — read "ACTIVE ALERTS 5" while on the Review queue).
- **#5 Header alignment** — the `MonitoringChip` analytics wrapper was a
  bare `display:inline` span, so the "LIVE" chip aligned to the text
  baseline instead of the flex cross-center the count pill sits on.
  `inline-flex items-center` → both chips center on the title (measured all
  three at mid = 50px).
- **#6 Source placement** — the source link left the left identity cluster
  and parks on the RIGHT, just before the timestamp; the head now reads
  "<kind of change>" left, "<from where> · <when>" right. Reverses the
  2026-06-15 "source into the left cluster" decision.
- **#7 Day band** — was `text-xs` (12px) / eyebrow-tracking; `/today`'s
  `ActionsTable` header is the canonical `text-column-label` token (11px /
  600 / +0.5px). Switched so the two group bands read identically. (Colour
  already matched: `bg-background-subtle` + `text-text-tertiary`.)

## Files

`routes/alerts.tsx` · `AlertsListPage.tsx` · `PulseAlertRow.tsx` ·
`AlertListRail.tsx` · `pulse-alert-chrome.ts` · `AlertsListPage.test.tsx`.

## Open / follow-ups

- Action-zone intra-sort is by client reach, so the protective-claim window
  (reach 0, 19d deadline) ranks _last_ in the queue despite being most
  time-urgent. Deliberate; revisit if deadline urgency should outrank reach.
- Day-grouping stays in the awareness digest only; the action queue is flat.
- Visual polish pass (zone band weight, density, motion) is ongoing.

## Visual polish — framed "Needs action" pill (2026-06-22)

Yuqi: the zone title "needs to live in a pill or something to be framed."
The hero queue's "Needs action" label was floating text (Zap + label +
neutral count chip) — it didn't read as a contained zone. It's now one
framed pill: soft warning family (`bg-state-warning-hover` 50 / `border-
state-warning-hover-alt` 100 / `text-text-warning`, the same chrome as the
`PulseAlertsMap` cluster chips and the `alert()` warning container), with
the count nested as a deeper 100-tint step — tonal, no solid-red jump, so it
never double-highlights. The "For your awareness" band stays quiet text:
asymmetric attention — the hero zone is framed/prominent, the digest demoted.
