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

## One banded table — section headers get a background (2026-06-22)

Yuqi: "serious problem with sections — it is so loose now, visually the alert
table." The zone headers floated as text on the page wash while the rows sat in
a rounded card, and a `gap-4` split the two zones — so the page read as two
loose floating cards, not a table. Pulled it into one continuous banded table:

- **Banded section headers** — both zone headers ("Needs action" / "For your
  awareness") now wear the SAME chrome as the day bands (`bg-background-subtle`
  + `border-b border-divider-subtle`), so the page has one consistent
  header-band system (zone header → day band → rows). The awareness badge flips
  to a white (`bg-background-default`) tile so it stays crisp on the gray band.
- **Square rows** — the list frame dropped `rounded-xl`; the rounded card
  encapsulation was what put a rounded corner on the first/last row (and the
  active-row highlight). Now a flush square table. `overflow-clip` stays (sticky
  day bands need it).
- **Zones butt together** — `gap-4` → `gap-0`; the banded headers + row
  hairlines do the sectioning, so action rows flow straight into the awareness
  band as one table.
- **Full height** — the route shell's default `pb-5` is overridden to `pb-0` for
  /alerts (`contentClassName`), so the table runs to the viewport bottom instead
  of stranding the last rows above a gap.

Decisions (Yuqi): zone titles get header-band backgrounds like the day bands;
remove the per-row rounded corner; remove the bottom padding (full height).

## Content gutter + header hierarchy (2026-06-22)

Yuqi: "problem with hierarchy and padding on the left and right." Measured both:
the right cluster (source · time) sat FLUSH against the band edge — 0px right
gutter — while the left carried a ~28px inset (asymmetric, edge-jammed); and the
zone-header bands + day bands were the same gray, so the section hierarchy read
flat (a zone header and its day subgroups looked equal-weight).

- **Symmetric content gutter** — every list element (toolbar, zone headers, day
  headers, rows) takes back the `px-5` content inset (the /today ActionsTable
  gutter) that the earlier flush-with-title pass had zeroed. Verified 20px both
  sides. The band/row BGs still bleed full-width, so only the content insets —
  the bands stay edge-aligned with the title, the source just stops jamming the
  right edge.
- **Two-level header hierarchy** — the day headers ("MAY 16, 2026") drop their
  gray fill to white (`bg-background-default`); the gray `bg-background-subtle`
  band is now reserved for the ZONE headers (Needs action / For your awareness).
  So gray band = section, white uppercase label = day subgroup. White still
  occludes scrolling rows (sticky). This refines #7 (day bands were gray to match
  /today) now that the zone headers own the gray band.

Decisions (Yuqi): restore symmetric L/R content padding; differentiate the
section header (gray band) from the day subgroup (white label).

## Destructive action band + toolbar balance + deadline chip (2026-06-22)

A feedback batch; three items were live + actionable (the rest were stale — the
"Alert work queue" Segmented it cited is gone, replaced by the triage zones — or
already shipped the turn before: the px-5 content gutter, the white day bands).

- **#6 Destructive "Needs action" band** — the action zone header drops gray for
  a soft-red `bg-state-destructive-hover` band: the urgent queue gets the page's
  one chromatic section header. Badge → solid-red + `text-text-inverted` icon
  (the strong accent); count → white chip, red text; label stays primary ink
  (chromatic accent in containers, not text). This also tiers the headers
  unmistakably — red section (action) > gray section (awareness) > white label
  (day). Note: bends the "amber=action, red=urgent" canon at Yuqi's explicit ask;
  soft-red so it reads urgent, not alarming.
- **#3 Toolbar balance** (revised after a second pass — Yuqi: "the filter does
  not align or stick to anything, too loose; stick it right, something on the
  left"). First try pushed only the view toggle right, which left the filters
  floating left-of-center against a lone toggle — worse. Final: the WHOLE finding
  cluster (Filters · State · Sort · view) is an `ml-auto` group on the RIGHT, and
  the search becomes a permanent FIELD (`SearchInput`, `flex-1 max-w-[420px]`)
  anchoring the LEFT. Two real anchors span the toolbar instead of a lone icon +
  void. Reverses both the 2026-06-21 "controls flow from the left" call and the
  hover-collapse search canon HERE (that canon de-clutters a CROWDED toolbar;
  this one was too empty).
- **#5 Deadline chip** — the "Nd left" tag sat as bare mono text beside the
  source link's bare text (same gray, blended). It's now a discrete status chip
  (filled `bg-background-subtle` pill), so "how long left" is visibly its own
  thing, not part of the "from where" link. Stays neutral.

Decisions (Yuqi): destructive bg for the action section header; push the view
toggle right; make the deadline tag a distinct chip from the source link.

## Title-first rows + drop HIGH IMPACT + red→amber band (2026-06-22)

A `/design-critique` pass; Yuqi: "take all" three priority recommendations.

- **Title-first rows** — the headline (the one thing you read to triage) sat on
  line 2, under a lane of 4 chips. The row now LEADS with the title (severity
  pill prefixes it inline); jurisdiction · form · change-kind · source · time
  demote to a quiet meta row BELOW. Inverts the old "chip lane above the title"
  order. Same line count, content-first hierarchy. (The `HeadRow` split into a
  title row + a meta row; the title `<h3>` moved above the cluster.)
- **Drop HIGH IMPACT** — the gray "HIGH IMPACT" chip read as a severity grade but
  encoded a different axis (client reach), confusing next to the orange `HIGH`
  tier chip. Removed entirely (prop + `highImpactIds` memo + threading) — reach
  is already stated by "Affects N clients" in the footer. The leading chip now
  means exactly one thing: severity.
- **Red → amber band** — the "Needs action" destructive (red) band read as
  chronic-alarm and competed with the row `HIGH` chips. Softened to amber
  (`bg-state-warning-hover` + solid-amber badge), keeping the banded-section win
  while red stays reserved for true urgency (restores the canon).

Decisions (Yuqi, "take all"): lead rows with the title; remove the redundant
HIGH IMPACT chip; dial the action band from red to amber.

## Selection-first + band parity + flush align (2026-06-22)

A 7-item feedback batch:

- **Band size parity** (#1) — "For your awareness" measured 63px vs "Needs
  action" 55px; the collapse button's `py-1` (inside the band's `py-2`) added the
  8px. Dropped it → both 55px.
- **Flush-left** (#2) — the `px-5` content gutter (added two turns earlier) is
  removed from the toolbar, both zone bands, day bands, and rows, so content
  aligns to the table/title edge (x=313) instead of inset 20px. (Reverses the
  earlier "padding on left and right" pass at Yuqi's ask; the right cluster sits
  at the band edge again — accepted.)
- **Rounded section tops** (#3/#4) — both zone bands get `rounded-t-xl` (12px),
  so each section reads as a capped block.
- **Bottom padding** (#5) — `pb-6` INSIDE the scroll area (not the shell), so the
  last alert gets 24px breathing room when scrolled to the end without the
  always-visible outer gap the old shell `pb-5` left.
- **Checkboxes always visible** (#6) + **select-all** (#7) — row checkboxes, the
  per-day select-all, and the zone select-all all drop their hover-reveal
  (`opacity-0 group-hover…` → always on), so selection + "select all this zone"
  are discoverable at rest. Retired the now-dead `selectionActive` prop +
  threading.

Decisions (Yuqi): bands same size; remove L/R content padding (flush to table);
rounded section tops; bottom padding for readability; always show the checkboxes
(selection-first list).

## Restore the calm — synthesis of old + new (2026-06-22)

Yuqi shared a screenshot of the PRE-triage version: "the previous UI and user
experience was much better… pick out the pros of each version, update and
polish." The accumulated chrome (colored bands + always-on checkboxes + loud
impact footers + floating Dismiss/Review) had made the page busy vs the old's
calm. Agreed direction: **keep the new structure, restore the old's calm.**

Kept (the new wins): title-first rows, two-zone triage, amber Needs-action band,
always-on checkboxes, anchored toolbar. Restored from the old (Yuqi picked):

- **Source back inline** — the source link leaves the far-right edge and reads in
  the meta line after the change kind ("<change> · <from where>"), in context.
  Reverses the 2026-06-21 #6 "source rightmost" call — the old inline placement
  read calmer.
- **Quieter impact + clean right column** — "Affects N clients" demoted primary →
  tertiary (supporting fact, not headline); with the source gone from the right,
  the right column is just the time/deadline (airy, like the old version).
- **Hover cluster fixed** — Dismiss/Review floated transparent over the right
  column and overlapped the source/time (Yuqi "messy — where is the
  consistency"). Now a contained floating PILL (opaque white + hairline ring +
  soft shadow, Dismiss → ghost inside it) that cleanly occludes whatever's behind
  and reads as one deliberate lifted action group.

Decisions (Yuqi): keep triage zones + restore the calm; source inline; quieter
impact / clean right column.
