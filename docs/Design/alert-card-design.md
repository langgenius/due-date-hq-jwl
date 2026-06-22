# Alert card design — canonical spec

> Source of truth for the alert card on `/rules/pulse` (the list-row
> `PulseAlertCard`) and on `/today` (the summary tile
> `NeedsAttentionCard`). Both surfaces serve the same alert data
> (`PulseAlertPublic`) and must share the meta-row vocabulary so a CPA
> who learns one card reads the other instantly.
>
> Companion: [pulse-vocabulary.md](./pulse-vocabulary.md) — the noun /
> verb / nav-label spec for the Pulse engine surface labels.

## 1. Canonical structure

Both cards open with the **same top meta row**, then diverge below
based on the surface's role (list row vs summary tile).

```
┌──────────────────────────────────────────────────────────────┐
│ ▢ HIGH IMPACT  FL DOR Bulletin · 1mo ago    ▢ Needs Action │   ← top meta
│                                                              │
│ ▢ FL flag│FL   Title text — alert headline here     Open   │   ← title row
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ WHAT CHANGED      AFFECTING       PUBLISHED         │ │   ← facts panel
│ │ Deadline shifted  Form 1065 (2 more)    2026-05-28  │ │   (alerts-only)
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ 👥 4 clients · 1 federal_1065 affected  [Review→]   [snz][arch][dsm] │
│                                  hover-revealed   hover-revealed     │
└──────────────────────────────────────────────────────────────┘
```

### Top meta row

- **Severity pill** — `inline-flex h-6 rounded-[4px] px-1.5 text-[11px]
font-semibold tracking-[0.8px]`. Color fill from
  `severityFromConfidence()` in `pulse-alert-chrome.ts`:
  - `high` → `#FEE4E2` bg / `#9F1239` text
  - `medium` → `#FEF3C7` bg / `#92400E` text
  - `low` → `#D1FADF` bg / `#054F31` text
- **Source caption** — `text-[13px] font-medium text-text-secondary`
  on /alerts; same 13px on /today via `PulseSourceMeta`.
- **Timestamp** — `text-sm font-medium text-text-tertiary` via
  `formatRelativeTime()`.
- **Action pill** — `rounded-full px-3 py-1.5 text-xs font-medium`,
  color from `actionPillFromAlert()` (Needs Action = destructive red,
  Needs Review / Closed / Snoozed = neutral gray).

### Title row — encapsulated state pill + title + Open

The state pill wraps **both** the StateBadge SVG flag AND the
two-letter code in a single container. Yuqi feedback (2026-06-04 round
39): _"state badge 和 State abbreviation 是 encapsulated 在一个 badge
里满的"_.

```jsx
<span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-[4px] bg-background-section px-1.5">
  <StateBadge code={alert.jurisdiction} size="xs" />
  <span className="text-[10px] font-semibold tracking-[0.4px] text-text-secondary uppercase">
    {alert.jurisdiction}
  </span>
</span>
```

The pill has no border — visual weight comes from the `bg-background-section`
(gray-50) fill, equal-weight to the colored severity pill alongside.

The h3 title is `text-[18px] leading-[1.25] font-semibold tracking-[-0.2px]
text-text-primary line-clamp-1`. The muted "Open"/"Snoozed" status sits
**inline after the title** (not pushed to the far right) — a `flex-1`
spacer follows so the right-edge tail of the card stays empty at rest.

### Facts panel (alerts-only)

The 3-column grid panel (Pencil **R2kul**) lives between the title row
and the impact row on `/alerts` only. `/today` summary tiles omit it
because they're 3-column densely-packed dashboard cards.

```
grid grid-cols-[5fr_5fr_3fr] rounded-[8px] bg-background-section
```

Each cell: `px-3 py-2` with a `text-[10px] font-semibold tracking-[0.6px]
text-text-muted uppercase` label + `text-xs font-medium text-text-secondary`
value. The three cells: **What changed** → `changeKindLabel`; **Affecting**
→ the first parsed form (human label via `formatTaxCode`) + an `(N more)` overflow,
falling back to `—` when the alert carries no form scope; **Published** →
the source bulletin's publish date (absolute `formatDate(publishedAt)`; the
meta row above carries the relative "Nmo ago"). 2026-06-05: `forms` now rides
on `PulseAlertPublic`, so Affecting renders from the list payload; the former
First Application + Transition placeholder cells were dropped.

### Impact row

`pt-1 pb-0.5` (tight top padding — `pt-1` per Yuqi 2026-06-04 round 36
closing-c). Layout:

```
[👥 N clients · Form] [Review→]              [PulseAlertActionsRow]
                       ↑                                  ↑
              hover-revealed                     hover-revealed
              follows clients line               flex-1 spacer pushes right
```

The Review button uses `text-xs font-semibold text-text-accent
hover:underline`. The actions row (Snooze / Archive / Dismiss) uses
ghost-variant icon buttons (`variant="ghost" size-7`, icon `size-3`,
ghost text/bg tints) — no border chrome, no fill at rest.

## 2. Card chrome

```
outer:    rounded-2xl px-5 py-3  bg-background-default  cursor-pointer
resting:  bg #ffffff white
hover:    +ring-1 ring-inset ring-divider-regular  (subtle 8%-alpha gray edge)
active:   bg-state-accent-hover #eff4ff + shadow-[inset_0_0_0_1px_state-accent-active-alt]
focus:    ring-2 ring-state-accent-active-alt
```

- **No border** — Pencil ZkXFr disables stroke; the card defines its
  edge against the gray page wash via the white fill.
- **No shadow** — Yuqi: _"remove shadow. hate them"_.
- **Hover never changes bg color**. Three earlier attempts at hover-bg
  tints all failed: `bg-background-subtle` (gray-100) was 2 RGB units
  off the page wash (invisible); `bg-state-accent-hover` (light blue)
  read as a "click-state preview" (loud). Final answer: an inset ring
  appears as a subtle edge cue, the bg stays white.
- **Active uses a deeper blue tint + accent ring** to signal "this row
  is open in the panel" — the ring is the primary cue, the bg-tint is
  a quiet wash behind it.

## 3. Surface-specific behaviors

### `PulseAlertCard` (`/rules/pulse` list rows)

- Renders the full structure including facts panel.
- Hover-reveals Review + PulseAlertActionsRow on the impact row.
- Active state when `alert.id === openAlertId`.
- Inter-card gap on the list: `gap-2` (8px).

### `NeedsAttentionCard` (`/today` summary tiles)

- Omits the facts panel and the impact row (no clients-affected line,
  no actions row, no Review button).
- Replaces the title-row trailing "Open" status with an Eye icon at
  the far right of the meta row (the affordance is "view this alert's
  details in the drawer", not "navigate forward").
- Renders in a 1/2/3-column grid driven by the parent
  `NeedsAttentionSection` based on alert count + viewport.
- Card padding `p-4` (vs `/alerts` `px-5 py-3`) because the dashboard
  tile is a less-dense scan surface.

## 4. Cross-surface consistency rules

These MUST stay aligned across `/today` and `/alerts`:

| Token                     | Spec                                                                  |
| ------------------------- | --------------------------------------------------------------------- |
| Severity pill chrome      | `h-6 rounded-[4px] px-1.5 text-[11px] font-semibold tracking-[0.8px]` |
| State pill chrome         | `h-6 rounded-[4px] gap-1 px-1.5 bg-background-section`                |
| State pill contents       | `<StateBadge size="xs">` + 2-letter code `text-[10px]` uppercase      |
| Source size               | `text-[13px]`                                                         |
| Card resting bg           | `bg-background-default` (white)                                       |
| Card hover behavior       | inset gray ring, no bg color change                                   |
| Card corner               | `rounded-2xl`                                                         |
| StateBadge size for cards | `xs` (20px)                                                           |

When changing any of these, change BOTH cards together.

## 5. Page-level chrome (for context)

- `/today` and `/alerts` both use the canonical `<PageHeader>` primitive.
- Both pages: `md:px-16` horizontal padding, `gap-8` (32px) between
  top-level sections.
- Both action clusters use `<Button variant="outline" size="sm">`.
- Headers differ in title composition (intentional): `/today` has the
  date inline; `/alerts` has the monitoring chip + N urgent + PulsingDot.

## 6. Deferred (not yet shipped)

- **Pencil tgX5T** — when the right-side detail panel is open, the
  left-side `PulseAlertCard` collapses to compact mode: title +
  impact + time + state + Open/Snoozed only (no severity pill, no
  source, no facts panel, no actions row).
- **Pencil n9m9B** — right-side detail panel exact recreation.

## 7. 2026-06-08 amendment — two-color discipline (Yuqi /today)

Feedback on the dashboard `NeedsAttentionCard`: "reduce the colour variety
here to two." The card had drifted to red + accent-blue + success-green + a
3-tone client-avatar rainbow. Reduced to **neutral + red**:

- **Red** is the card's single signal color, reserved for the **High impact**
  pill (and only renders on high-impact alerts). A typical card therefore reads
  fully neutral and recedes in the scan — color appears only when it matters.
- Client avatars collapse to one neutral tone (`bg-background-subtle` /
  `text-text-secondary`); the overlapping initials carry identity, not hue.
- Change-kind label ("DEADLINE SHIFTED") and confidence ("conf 94%") go neutral
  (tertiary / secondary). Change-kind is a category, not an alarm.

This mirrors the app-wide red discipline (red = urgency/lateness only) already
applied to the /today Actions table due-countdown.

---

## 4-surface rendering contract (2026-06-11 same-entity audit)

The same alert renders on FOUR surfaces — /today card (`needs-attention-card`),
/alerts row (`PulseAlertRow`), detail rail item (`AlertListRail`), detail
header (`AlertDetailDrawer`). One entity, one look; the table below is the
contract. **Unified (accidental drift fixed 2026-06-11):**

| Facet               | Contract                                                                                                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HIGH IMPACT pill    | `h-[20px] rounded-lg border border-state-destructive-border bg-state-destructive-hover px-1.5 text-xs font-semibold tracking-[0.3px] uppercase` — identical on card/row/drawer (drawer previously used inline severity hexes; card used a borderless 4px-radius variant) |
| Form chip           | `TaxCodeBadge className="rounded-lg"` on row AND rail                                                                                                                                                                                                                    |
| External link       | text first, trailing `ExternalLinkIcon size-3`; interactive ONLY when `sourceUrl` exists (card + rail used to `window.open(null)`)                                                                                                                                       |
| Zero impact         | "No client impact", muted, no icon — verbatim on card/row/rail                                                                                                                                                                                                           |
| Confidence read-out | "{N}% conf" word order everywhere it appears                                                                                                                                                                                                                             |
| Change-kind label   | caption-xs/medium/muted CAPS on row + rail                                                                                                                                                                                                                               |

**Deliberate divergences (do NOT "fix"):**

- /today card: count-only "N clients" (Yuqi ask), hover-revealed confidence,
  no ACTIVE badge (queue mechanics are /alerts-local), StateBadge seal +
  code (vs the row's plain bordered code chip).
- Drawer header: mono accent change-kind chip (identity register),
  `JurisdictionLabel` with full state name.
- Title sizes ramp by surface density (lg row / base rail / 22px drawer) —
  same family, different altitude. **Exception (2026-06-12 critique): the
  /today dashboard card title is 14/500 (`text-base font-medium`), NOT
  `text-item-title` (16/600)** — first demoted to 14 (three 16px-semibold
  news headlines were the heaviest text mass on /today while the Priorities
  client names sat at 14px), then to weight 500 the same day (Yuqi: "so many
  bold things, people lost focus" — /today's 600 budget is page + section
  titles + the red late countdown only). On /alerts, where alerts ARE the
  work, the larger sizes stand.
- /today demotes zero-impact alerts (`matchedCount + needsReviewCount === 0`)
  from cards to quiet one-line rows (`NeedsAttentionQuietRow`, 2026-06-12): a
  ~150px card whose own footer says "No client impact" hasn't earned card
  height. The row keeps jurisdiction + title + time + the canonical "No
  client impact" phrase and opens the same drawer.
- /today card grid is responsive (2026-06-12): `grid-cols-1` base,
  `md:grid-cols-2` for 2+ cards, `xl:grid-cols-3` for 3+ — same xl baseline
  as the /alerts responsive contract. A hard-coded 3-up squeezed cards to
  ~200px at tablet (titles cut mid-word, source links reduced to a bare ↗).
  The loading skeleton mirrors the same breakpoints. The /today footer
  client count ("N clients") is `font-medium` — it is the card's key datum.
- /today card micro-interactions (2026-06-12, Yuqi feedback #3):
  `active:scale-[0.99]` press acknowledgment (the bucket-chip recipe) + an
  ↗ `ArrowUpRightIcon` that fades in top-right on hover/focus with a
  diagonal nudge — the whole-card click target gets its own "this opens the
  alert" hint, distinct from the footer's source link. Motion on glyphs and
  scale only, never shadows; `motion-reduce` zeroes both.
- /today card click → `/alerts?alert=<id>` (DrawerProvider navigates when
  off-route). The /alerts list shows both triage zones at once (no mode to
  sync — see the triage section below), so opening an alert just scrolls the
  rail selection into view (`scrollIntoView block:'start'` on first paint).

---

## /alerts list: two-zone triage (2026-06-21, replaces the Review/Active toggle)

The `/alerts` list is a single unified triage view — no Review/Active mode
toggle. The split that toggle encoded (`actionMode`) was a taxonomy of the
_alert_, not the _CPA's_ workflow, and it forced a mode choice before you saw
anything. The list now organizes itself around the job:

```
[⚡] Needs action  4                         ← sibling zone header (warm badge)
    Review and apply to affected clients     ← purpose subtitle (first-land orient)
    <full-weight rows, ordered by client reach>
    …
▾ [👁] For your awareness  5                  ← same skeleton, neutral (collapsible)
    No action needed — monitored updates      ← purpose subtitle
    MAY 20, 2026                               ← digest keeps the day bands
    <FYI rows, no suggested-action line>
    …
```

**Zone-header skeleton (2026-06-22, supersedes the standalone warm pill).**
Both zones share ONE header: `[icon badge] · label · count · purpose
subtitle`, differentiated only by **temperature**. Needs action = warm
(`bg-state-warning-hover` badge + Zap `text-text-warning`, warm count chip);
For your awareness = the same skeleton neutral (`bg-background-subtle` badge —
the day-band gray, so the square reads as clearly as the warm one on the
white list — + Eye `text-text-tertiary`), keeping its collapse chevron +
Dismiss-all. Shared shape → kinship (two tiers of one feed, not two tables);
temperature → act-vs-read; the **purpose subtitle** is the first-land
orientation the bare label never gave. (An intermediate warm-pill-only step
was rejected in `/design-critique`: framing one zone and not the other
_widened_ the perceived gap.)

- **Needs action** = a priority QUEUE. Membership = `alertNeedsAction()`
  (`pulse-alert-chrome.ts`): the `isActiveAlert` set (applies a date change OR
  touches clients) PLUS protective-claim windows, which close for good on
  their deadline even with no client matched yet. The predicate **errs toward
  action** — hiding real work is the one failure the model can't afford. Rows
  are flat (no day bands), ordered by reach (`matchedCount + needsReviewCount`)
  then recency.
- **For your awareness** = a chronological DIGEST. The FYI remainder. Demoted,
  **collapsible** (chevron + count — the optional "focus" that replaces the
  toggle), keeps the day-group bands, and FYI rows drop the
  suggested-action line.
- **Empty action zone** → "You're caught up — nothing needs action" + the
  digest still shows (never a blank page).
- **Consistency**: the detail rail + the map navigator both order action-first
  (`triageOrdered = [...actionAlerts, ...awarenessAlerts]`); the rail drops a
  "For your awareness" divider where the digest begins.
- **Deep-link back-compat**: `?queue=active` → land focused (digest collapsed);
  anything else (incl. /today's `?queue=review`) → land with everything open.

Supersedes `006bc09d` ("Review is the default queue"). Decision record:
`docs/dev-log/_alerts-feedback-triage-2026-06-21.md`.

---

## Detail drawer: one home per fact (2026-06-11 de-duplication pass)

Yuqi's page feedback on the alert detail ("aren't these repetitions? no
highlights, hard to digest") — the Extracted-facts card restated header
chrome and the Source & confidence card quoted the summary (usually the
title verbatim) while a second lookalike quote box below the fact grid held
the real excerpt. Contract now:

**Each fact has exactly ONE home in the drawer body:**

| Fact               | Home                                           | What was removed                                                                   |
| ------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| Source / authority | header meta link + S&C citation line           | grid "Authority" cell                                                              |
| Publish date       | S&C citation line                              | grid "Published" cell                                                              |
| Jurisdiction       | header `JurisdictionLabel` chip                | grid "Jurisdiction" cell (counties keep a cell — no other home)                    |
| Verbatim excerpt   | S&C quote box (with copy affordance)           | excerpt block at the bottom of Extracted facts; S&C's summary-quote (title repeat) |
| AI confidence      | S&C confidence row                             | DeadlineChangeCard meta row                                                        |
| Summary / dek      | header (gated `summary ≠ title`)               | DeadlineChangeCard body paragraph                                                  |
| Audit note         | footer "Every decision captured…"              | DeadlineChangeCard "Every change logged…"                                          |
| Effective date     | fact-grid cell (computed from `effectiveFrom`) | DeadlineChangeCard's hardcoded "Effective immediately"                             |

**Highlight grammar** — exactly one hero block per card, sharing one recipe
(gray `bg-background-subtle` box, big mono date, amber accents):

- deadline-shift → `DeadlineChangeCard` (old strike → new 18/700 + signed
  day delta).
- protective-claim → action-deadline hero: `CalendarClockIcon` + amber
  ACTION DEADLINE label + mono date + derived countdown ("N days left" amber
  / "N days past" destructive), with the evidence-to-gather checklist as a
  hairline sub-row (do-what-by-when in one block).

**One grid, not two** — protective/deadline-shift AI facts (affected years /
tax acts / authority refs / relief type / deadline types / opt-in) merge
into the single hairline fact grid instead of stacking a second lookalike
label/value box. Empty values drop their cell (no "—" renting a slot).
Legal uncertainty stays a quiet `bg-background-soft` prose note below.
