# 2026-06-04 — Alert card rounds 70–85 (long-tail polish + cross-surface unification)

> Continuation of the `/today` + `/rules/pulse` UX polish session covering
> 16 feedback rounds. Builds on the round 36–44 entry and the round 45–63
> work (some of which lived in commits without a dev-log entry; this
> entry retroactively documents 70–85).

## Scope

This phase shifted from "match this specific Pencil node" to "make every
alert-shaped surface render from one canonical recipe". Rounds 70–84
each touched specific cells. Round 85 closed the audit-followups +
formalized the recipe as a code comment.

## Headline changes

### Reverted `/alerts` row to ZkXFr structure (round 72) after a vi3aw experiment (round 70)

Round 70 rewrote `PulseAlertRow` to mirror the `/today` `NeedsAttentionCard`
vi3aw shape (vertical card, no time rail, no KeyChange inset). Round 72
reverted that direction per "your work on Alert page is diverging from
the rest of the style. please revert and rework them. reference to Node
ID: ZkXFr but should keep the same as anywhere else when the alert card
appears." Net: `/alerts` rows are back to ZkXFr horizontal layout (time
rail + main column + KeyChange + bottom row); `/today` keeps vi3aw
(vertical card). The two surfaces share **primitives + tokens** (state
pill, form pill, severity, action pill, color tokens), not layout.

### Cross-surface primitive unification

Across all 5 surfaces that render an alert (`NeedsAttentionCard`,
`PulseAlertRow`, `PulseAlertCard`, `PulseDetailDrawer` hero,
`AffectedClientsTable`):

- **Form chip**: `<TaxCodeBadge>` everywhere. `/deadlines` Filing column
  was the lone holdout on `<TaxCodeLabel>` (plain text); switched in
  round 81.
- **State chip**: circular `<StateBadge>` motif (16px via inline style
  override) + Geist Mono 12/700 code + Tooltip with full state name.
  No bg, no padding — the motif and the code carry the chip identity.
  `/deadlines` Status column is a documented intentional divergence
  (per the 2026-05-29 "remove state icon everywhere on tables"
  decision).
- **Severity pill**: HIGH-only, `h-[22px] rounded-[4px] px-2 text-[11px]
  font-bold tracking-[0.7px] uppercase`, colors from
  `severityFromConfidence`. LOW / MEDIUM render nothing — absence is
  the signal (round 66).
- **Action pill (change-action amber)**: `bg #FFFBEB`, `color #92400E`,
  `rounded-md px-[10px] py-[4px]`, mono ACTION label 10/700 + body
  12/500 (same amber).

### Canonical table guideline codified (round 84)

`apps/app/src/features/pulse/components/pulse-alert-chrome.ts` now opens
with a guideline comment block covering:

1. Outer card frame: `rounded-[12px] border border-divider-regular
   bg-background-default`
2. Subgroup divider band / day-group header: `bg-background-subtle
   px-5 py-2 text-[12px] font-semibold tracking-[0.5px] text-text-secondary
   uppercase`
3. Row body: `px-5 py-3` cells, body 13px (with documented per-surface
   exemptions)
4. Pill primitives recipe
5. Hover/focus tokens
6. **The rule:** any divergence MUST be documented inline with a `Round
   NN intentional divergence:` comment so future audits can tell signal
   from noise.

`/today` `ActionsTable` subgroup divider was lifted from `text-[11px]
text-text-tertiary` to the readable `text-[12px] text-text-secondary`
to match the `/alerts` day header (round 79 readability fix pushed
back UP).

### `PulseAlertList` outer frame (round 73 + round 84)

`rounded-2xl border-divider-subtle` → `rounded-[12px] border-divider-regular`
(canonical, round 73). `overflow-hidden` removed (round 84 per Yuqi
"remove the overflow:hidden property") — was clipping anything that
wanted to escape. Rounded radius + inner row borders carry the visual
boundary.

### `PulseAlertRow` content rebuilt (rounds 70 → 72 → 75 → 79 → 83)

- Pill order: severity → state → form → source-status (change-kind)
  (final order after rounds 75 + 83 #12)
- Source caption: 12/medium tracking-[-0.1px] text-tertiary +
  `<ExternalLinkIcon>` prefix (round 83 #13), pixel-identical to
  NeedsAttentionCard
- Title: 15/medium leading-[1.25] tracking-[-0.25px] (round 76,
  matches `/today` NeedsAttentionCard exactly)
- Bottom row: `<Building2>` (matches /today) + "N clients" + `·` +
  `conf %` in **Geist sans** (round 83 #10 dropped mono)
- Top border `border-t border-divider-subtle pt-2` restored on bottom
  row (round 75 #7)
- Hover-revealed action cluster: Snooze + Dismiss + Review
- Review button is the canonical `<Button size="xs">` (default filled
  primary, round 83 #14)
- Snooze + Dismiss **wired to real `dismissAlertMutation` /
  `snoozeAlertMutation`** via `setReasonState` (round 77). Suppressed
  in `historyMode` (round 82).
- KeyChange section: date diff + Action pill only. Effective + Form-
  revised sub-row dropped (round 79 #1 "this is for any action changes.
  not the time info"). `<CornerDownRightIcon>` bullet leads the Action
  pill (round 75 #9).
- Time rail unmounted in `compact` mode (when detail panel is open) to
  reclaim ~110px for the main column. Relative time tooltip-only in
  the head row right cluster (round 74).
- Row bg now conditional: `impacted > 0` → `bg-background-section`
  (slightly darker), else `bg-background-default` (round 83 #11, matches
  /today round 80).

### `NeedsAttentionCard` polish (rounds 71 → 85)

- Form pill: `<TaxCodeBadge>` with muted text override (only on /today;
  /alerts uses canonical text-secondary per round 75 #1)
- State pill: circular motif 16px (round 80 #2 "smaller") + 14/700 code
  text (round 81 #5 "+1-2px bigger")
- Right cluster: relative time only; absolute time on tooltip hover
  (round 81 #1 "remove time here"). Geist (not mono) matching /alerts
  time rail (round 80 #3).
- Title: dedupes a leading source-name prefix via `dedupeTitleSource()`
  (round 81 #4 "avoid writing the source e.g. FL DOR again"). Round 85
  hardened the edge cases (title === source + punctuation-only
  remainder) and added 8 unit tests.
- Source line: `<ExternalLinkIcon>` prefix, tighter tracking (round 80
  + 81)
- Outer card: conditional `bg-background-section` when impacted > 0
  (round 80 #1)
- Bottom row icon + text both at `text-text-muted` for visual unity
  (round 72 + 80)

### Filter row reorder + chrome (rounds 71 → 83)

Final order: `Search · ViewToggle ‖ TimeRange · Severity · ChangeType ·
Status · State · Reset · Sort by` (round 83 #8). Filter triggers
shrunk: `h-10 → h-9 px-4 → px-3 text-[13px] → text-[12px]` (round 83
#16 "delicate"). Sort by has fixed `w-[200px] justify-start text-left`
(rounds 83 #18 + 84 #2) so the trigger doesn't reflow on selection
change. Filter labels humanized (round 83 #20 — `'needs_action'` →
"Needs action" via `impactFilterLabel` / `changeKindFilterLabel` /
`statusFilterText`). State filter label "Any state" → "State". When
the right detail panel is open, every filter except Search collapses
(round 68).

### `/rules/pulse` page header (round 83)

- Badge order: `[Alerts] [N urgent] [Monitoring…]` (was `[Alerts]
  [Monitoring…] [N urgent]`). Matches /today section header.
- Count chip variant: `secondary` → `outline` (gray, neutral; round 83
  #6 + /today round 81 #3)
- Monitoring chip `gap-1.5` so PulsingDot breathes against the text
- Sources + Alert history buttons: variant outline at default size
  (h-9, matches the filter triggers)

### `/rules/pulse-history` actions (round 82)

Was an empty actions cluster. Now has `Active alerts` (`<ArrowLeftIcon>`
+ link to /rules/pulse) + Sources. Self-referential "Alert history"
omitted, "My morning sweep" omitted (triage tool for active alerts only).
Added `wide` flag so the page caps at 1440 like /rules/pulse (round 81).

### `/rules/sources` (round 81)

- Breadcrumb parent flipped from "Rule library" → "Alerts" so the user
  who entered Sources via the /alerts Sources button has a one-click
  back path.
- Added `wide` flag (1440) for chrome consistency with sibling rules
  pages.

### `PulseDetailDrawer` (rounds 68 + 77 + 78)

- Impact pill gated HIGH-only (round 68)
- State badge rebuilt to circular motif + code (round 68 + 77)
- Source-status uses the canonical `changeKindLabel` (round 68 — fixed
  the "different on alert card vs detail panel" inconsistency)
- AI extraction notice collapsed from a 48px inline banner into a 14px
  `<Astroid>` icon next to the "Extracted facts" eyebrow (round 68)
- Title 28 → 22px (round 68 "alert detail title can be slightly
  smaller")
- Hero gap 16 → 8 (round 68 "do not waste space")
- Eyebrow scale unified: every `text-[10-11px] tracking-[0.6-0.8px]`
  outlier collapsed to canonical `text-[11px] font-semibold tracking-
  [0.5px]` (rounds 77 + 78)
- `<FactCard>` + `<AffectedClientsTable>` outer frames: `rounded-md`
  → `rounded-[12px]` (round 78)

### `PulseAlertCard` (round 77 + 84)

State pill chrome aligned to the round-75 canonical (no bg, no
padding, 16px motif, 12px code). Severity pill chrome aligned to
PulseAlertRow's `h-[22px] rounded-[4px] px-2 text-[11px] font-bold
tracking-[0.7px] uppercase` (round 84). Same primitives across map
view + list view + drawer hero.

### `PulseAlertsMap` (round 78 audit)

- Federal tile radius `rounded-lg` → `rounded-md` (matches state grid)
- Legend swatch radius `rounded-sm` → `rounded-[3px]` (proportional to
  tile radius)
- Tile font/labels kept Geist (data-grid context exemption) —
  documented inline

### `formatRelativeTime` (round 68)

Past dates beyond the 1-week mark now switch to absolute "Jun 4" (same
year) or "Jun 4, 2025" (different year). Relative format only inside
the human-meaningful window. Future dates keep relative — "in 3 months"
is still useful as a forward plan.

### `SkeletonList` rebuilt (round 85)

Was 56px hairline rows that bore no resemblance to the round-72+ rows
— page visibly "jumped" on first load. Now mirrors the actual shape:
rounded-[12px] frame + day-header band + 3 skeleton rows with time-
rail + meta-strip + title + bottom-shelf placeholders.

### MorningSweep panel (rounds 50 → 83)

`CoffeeIcon` while brewing flips to `SparklesIcon` once the briefing
arrives (round 83 #21). Underlying briefing remains the single-line
strip (round 54).

### "Synced just now" gray (round 80)

Color: `text-text-success` → `text-text-tertiary`. The freshness
stamp is informational, not a success state.

### `/deadlines` Filing cell (round 81)

`<TaxCodeLabel tooltip={false}>` (plain text) → `<TaxCodeBadge>`
(canonical chip). Other columns kept (state column = bordered Badge
per the 2026-05-29 "remove state icon everywhere on tables" decision;
status column = interactive `<ObligationQueueStatusControl>` not the
read-only `<ObligationStatusReadBadge>`; body 14px due to the dense-
queue exemption).

## Tests

- `apps/app/src/features/dashboard/needs-attention-card.test.ts` —
  8 tests covering `dedupeTitleSource`. **All pass.**
- Workspace typecheck passes throughout.

## What was NOT changed (intentional)

- `/deadlines` state column chrome (2026-05-29 cross-route decision)
- `/deadlines` body text 14px (dense-queue exemption)
- Map tile state code typography (data-grid context exemption)
- Detail panel `<FactCard>` h3 weight/size (nested-in-drawer
  exemption)

## Known unresolved

- "Alert cannot scroll" bug (round 83 #17). Layout chain inspected
  without finding the cause; needs a live repro.
- View toggle alignment with list rows (round 83 #19) — claimed
  resolved by the round-83 reorder but not visually verified.
- Form + Action merge-vs-keep on /today ActionsTable — open question
  awaiting user pick.

## Files touched

```
apps/app/src/components/patterns/filter-trigger.tsx
apps/app/src/features/dashboard/actions-list.tsx
apps/app/src/features/dashboard/needs-attention-card.tsx
apps/app/src/features/dashboard/needs-attention-card.test.ts (new)
apps/app/src/features/dashboard/needs-attention-section.tsx
apps/app/src/features/pulse/AlertsListPage.tsx
apps/app/src/features/pulse/MorningSweepDialog.tsx
apps/app/src/features/pulse/PulseDetailDrawer.tsx
apps/app/src/features/pulse/components/PulseAlertCard.tsx
apps/app/src/features/pulse/components/PulseAlertRow.tsx
apps/app/src/features/pulse/components/PulseAlertsMap.tsx
apps/app/src/features/pulse/components/PulseStructuredFields.tsx
apps/app/src/features/pulse/components/AffectedClientsTable.tsx
apps/app/src/features/pulse/components/pulse-alert-chrome.ts
apps/app/src/features/obligations/CreateObligationDialog.tsx
apps/app/src/lib/utils.ts
apps/app/src/routes/dashboard.tsx
apps/app/src/routes/obligations.tsx
apps/app/src/routes/rules.pulse.tsx
apps/app/src/routes/rules.pulse-history.tsx
apps/app/src/routes/rules.sources.tsx
```
