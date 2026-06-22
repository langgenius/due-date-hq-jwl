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

## Sibling zone headers — "one feed, two tiers" (2026-06-22)

A `/design-critique` pass named the core flaw: the two zones read as two
_unrelated tables_, and a first-time user can't tell what "Needs action" vs
"For your awareness" even mean. An intermediate step (framing the "Needs
action" title in a standalone warm pill while leaving awareness as plain
text) actually _widened_ the gap — the shape asymmetry made them look like
two different components, not two tiers of one feed.

The fix: **both zone headers share ONE skeleton** — `[icon badge] · label ·
count · purpose subtitle` — differentiated only by temperature.

- **Needs action** — warm badge (`bg-state-warning-hover` square + Zap in
  `text-text-warning`), warm count chip, subtitle "Review and apply to
  affected clients".
- **For your awareness** — same badge skeleton neutral (`bg-background-
  subtle` square — the day-band gray, so it reads as clearly as the warm
  badge on the white list, not a near-invisible outline — + Eye in
  `text-text-tertiary`), neutral count chip, subtitle "No action needed —
  monitored updates". Keeps its collapse chevron + Dismiss-all.

Why it works: the **shared shape** gives kinship (siblings, one feed); the
**temperature** gives the act-vs-read distinction; the **purpose subtitle**
is the first-land orientation the bare label never gave — it says what's in
the zone and what it asks of you. The summary line (4 + 4 = 8) was offered
but deferred; the subtitles carry the orientation for now.

Decisions (Yuqi): take the sibling-header rework (supersedes the standalone
pill); leave the awareness day-bands as-is.

## Calm the rows — merged action footer + tighter rhythm (2026-06-22)

Yuqi, after the headers landed: "still look messy." Diagnosed the row, not the
zone. A reading-measure cap was floated (the rows ran 1376px wide, source
floating ~400px right of the title) and **rejected** — Yuqi: keep the full
width (parity with /deadlines), the mess is the row internals. So the pass
stayed inside the row:

- **Merged action footer** — the suggested action and "Affects N clients" were
  two separate stacked lines; they're the "do this · who it hits" pair, so they
  now share ONE line (`⚡ Verify filing requirement applies · 👥 Affects 3
  clients`). Action+impact rows dropped 117px → 94px. Either half still stands
  alone (awareness rows carry impact with no action; some action rows touch no
  clients). This split the old `KeyChange` block: the date-diff card stays put,
  the action moved down to join impact; `showKeyChange` retired (date-diff gates
  on `showDateRow` directly now).
- **Tighter vertical rhythm** — main-column block gap 8px → 6px so the head /
  title / footer read as one unit, not loosely-spaced bands.
- **Quieter meta lane** — the change-kind text (the lane's only prose, the
  second-loudest read after the title) demoted secondary → tertiary, so the
  severity chip + title lead and the reference chips settle into one quiet
  supporting group.

Decisions (Yuqi): keep full width (no reading-measure cap); the calm comes from
row internals (merged footer, tighter rhythm, quieter meta).
