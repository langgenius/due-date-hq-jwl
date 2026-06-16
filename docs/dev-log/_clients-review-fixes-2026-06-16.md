# Clients flow — exhaustive-review fixes (2026-06-16)

Ran a multi-agent review of the whole clients flow (9 dimensions, each
finding refuted-by-default through 3 independent verifiers). 38 raised, 16
adversarially-confirmed (≥2/3). Acting on the confirmed set in clusters.
(Many verifiers hit transient rate-limiting, so several raised findings were
dropped unverified — investigating those correctness ones separately.)

## Cluster 1 — Summary strip truthfulness under load

- **Fake zeros while loading [P1]**: the route skeleton gated only on
  `clientQuery.isLoading`, so once the client resolved the hero rendered
  Blocked 0 / Open 0 / Filed 0 with calm "None blocked / Nothing open"
  subtitles for the whole `obligations.listByClient` fetch. Threaded
  `isLoading={obligationsQuery.isLoading}` → `ClientSummaryStrip` →
  `StatBand loading` (the primitive's skeleton, already used by the list
  strip). The hero now shows a band skeleton, not false calm.
- **"Filed YTD" → "Filed" [P2]**: the stat is a status-based count
  (done/completed/paid) with no year-to-date window — the sibling /clients
  table column was deliberately renamed to "Filed" for exactly this reason,
  and the detail strip still said "YTD". Now both surfaces match. (This
  corrects my own earlier critique, which wrongly read these as two
  different metrics.)
- **Skeleton 3 tiles → 1 band [P2]**: the route skeleton rendered three
  `min-w-44` tiles while the real strip is a single full-width 5-column
  hairline band — a reflow jolt on paint. Replaced with the band-shaped
  `h-[100px] w-full` skeleton matching StatBand's own `loading` state, so
  skeleton→content doesn't reshape.

tsgo clean; "Filed" verified live on the detail strip.

## Cluster 2 — copy + accessibility

- **Reclassification mislabel [P1]** (ClassificationImpactDialog): the one
  dialog serves both reason kinds, but always said "Apply reclassification"
  / "Reclassified" / "Couldn't apply reclassification" — wrong for a
  data-entry correction. Branched the action copy on `reason.kind` (already
  in scope): corrections get "Apply change" / "Entity type updated" /
  "Couldn't update entity type."
- **Notes card nested interactive [P1 a11y]** (ClientNotesStrip): the whole
  card is `role="button"` and contained a focusable Edit `<Button>` — invalid
  nested-interactive content (two tab stops, ambiguous AT). The edit button
  opened the same editor as the card, so demoted the pencil to a decorative
  `aria-hidden` cue; the card stays the single control. Dropped the now-unused
  Button import.
- **Tax-attribute chips color-only [P2 a11y]** (ClientCompliancePosturePanel):
  on/off differed only by color + an aria-hidden check, so AT heard
  "Payroll", "Sales tax"… identically in both states. Added an `sr-only`
  ": active" / ": inactive" suffix (WCAG 1.4.1).
- **"(s)" plural hack [P3]** (ClientDetailWorkspace Setup-tab badge): the
  title/aria-label `${n} required fact(s) missing` was the only user-facing
  "(s)" in the app (a screen reader voices "open-paren s"). Replaced with a
  count ternary — not `plural()`, which crashes in a string prop (lingui
  footgun).
- **Phantom "Fix-now" [P3]** (FixNeedsFactsSheet): copy said "re-open
  Fix-now" but the real control is the "Fix now" button. Dropped the hyphen.

tsgo clean; detail page verified live.

## Cluster 3 — master/detail row feedback + empty state

- **Opened row had no selected state [P1]**: clicking a filing row opens the
  obligation in the side panel (`activeObligationId`), but that id was never
  threaded into `DeadlineRow`, so `isActive` stayed false and nothing showed
  which row produced the open panel. Threaded `activeObligationId` →
  `ClientWorkPlanPanel` → `FilingPlanYearSection` → `DeadlineRow isActive`
  (the accent fill already existed) and added `aria-current="true"` on the
  active row. Verified live: the open row now carries the accent + announces
  as current.
- **Filing-plan empty state de-jargoned [P1]**: "Run migration or generate
  rules…" (engineering verbs, no next step) → "Add this client's filing
  state and entity type in Setup, and the rule library generates its
  deadlines automatically" — CPA-facing, points to the Setup tab.

Deferred (scoped follow-ups, need DeadlineRow keyboard/aria rework or
panel-level handling, riskier than warranted here):

- The inline-expand disclosure chevron never rotates on this surface (the
  row opens a panel, not inline content) — now cosmetically a static "open"
  affordance; a proper open-in-panel glyph / mode is a follow-up. `isActive`
  - `aria-current` resolve the core "no feedback" problem.
- Keyboard Escape on a focused row doesn't close the panel it opened (best
  fixed at the panel level — Escape-to-close on the obligation aside).
- Filing-plan tab count (unbounded) vs rows (capped 100) — only diverges at
  > 100 deadlines/client (documented rare edge); add "showing N of M" later.

Cohort decisions flagged, NOT changed (would fork app-wide conventions):

- Filing-plan column legend `font-bold` (700) uppercase micro-label — the
  identical class is the convention on /alerts + ~15 surfaces; changing one
  line forks the cohort. Type-weight cap vs convention is an app-wide call.
- Four Setup section frames hand-roll `rounded-lg border p-4` rather than the
  Card primitive — but Card adds `shadow-xs`; the shadowless inset-frame is
  the app-wide inset-section pattern, so converting would add unwanted lift.

Note: ClientWorkPlanPanel also carries the prior (stopped) session's
floating-bar scroll-clearance change (complete, builds on the earlier
TabSection refactor) — included here since it's clients work in a file this
pass owns.

tsgo clean; master/detail highlight verified live on Meridian.

## Cluster 4 — "the design looks ugly": density + redundancy
Yuqi (with screenshot): "a lot of random spacing, inconsistent gaps, random
things… hard to read." Root cause: the page always used the 1440px expanded
width "so the 600px obligation panel fits" — but at rest (panel closed, the
common case) that stretched the 5-stat band thin (each value stranded in a
~210px flex-1 cell), spread the filing table, and dwarfed the 320px rail.

- **Cap the content to 1100px (centered) at rest; expand to 1440 only when
  the panel is open.** `ClientDetailWorkspace` root: `!panelOpen && mx-auto
  w-full xl:max-w-page-wide`. Clusters the stat band, balances the rail,
  keeps the wide master/detail layout when actually working an obligation.
- **Filing table compact at rest (was: only when the panel squeezed it).**
  Drops the OFFICIAL DUE column (duplicates INTERNAL DUE unless an extension
  shifts it — full dates live in the row's obligation panel) and the OWNER
  column (uniform per client — already in the page header). That gives the
  DEADLINE column room (form names no longer clip at the capped width) and
  removes two redundant columns. Reads as a clean form-left / status-due-
  right list.

Verified live both states (rest = capped/tight band + 3-col table; open =
expanded master/detail with the active row highlighted). tsgo clean.

## Cluster 5 — cohesion with /deadlines + /alerts detail (supersedes Cluster 4)
Yuqi reviewed Cluster 4 and steered: bring back OFFICIAL DUE + OWNER, the
centering is off, fix the in-row gap, fix section gaps + text hierarchy, and
"look at the deadlines detail panel and alerts detail panel … ensure the
three are cohesive and in the same design system."

Studied both reference surfaces live. Their shared language: eyebrow → large
title → chips → **bordered fact-cards** (rounded-lg + divider-subtle border,
CAPS-label / bold value / caption sub) → underline tabs, full-width, generous
gaps. The /clients detail diverged by using the borderless StatBand — which
is exactly *why* its facts looked stranded.

- **Reverted Cluster 4** — dropped the 1100px centered cap (back to full-width
  like the references) and the always-compact table (OFFICIAL DUE + OWNER are
  back at rest; compact only when the panel squeezes the column).
- **Summary → bordered fact-cards** (`ClientSummaryStrip`): the 5 facts
  (Jurisdictions/Blocked/Open/Filed/Next due) now render as the same fact-card
  the /deadlines + /alerts detail use, in a responsive grid (2 / 3 / 5 cols).
  The borders make the spacing read as intentional card padding, not random
  gaps, and the three detail surfaces now share one fact-card grammar.
  Skeleton = 5 card-shaped placeholders (keeps the no-fake-zeros fix).

Trade-off: the detail summary no longer uses the shared StatBand (the list +
sources + library still do) — accepted because the explicit goal was
cohesion with the /deadlines + /alerts DETAIL surfaces, which use fact-cards.

tsgo clean; verified live. Residual: the filing table still has some DEADLINE
slack at full width (single-client tables have few columns) — minor, can
tighten if needed.

## Cluster 6 — match Pencil VtC73 (supersedes the Cluster 5 card shape)
Yuqi pointed at Pencil `VtC73` ("/clients/hudson-wells — detail · master-detail
REBUILD", 1440px) as the canonical client-detail design, and said the page is
ugly + "why is max-w 1100 not 1440." Pulled VtC73 and read its tokens.

VtC73's fact strip is NOT separate cards (Cluster 5) and NOT a borderless band
(original) — it's **one `bg-subtle` rounded-2xl panel** with the facts as
hairline-divider cells: label 10/700/+0.8 `text-muted`, value a **JetBrains
Mono 24/700 color-coded number** (jurisdiction = `bg-section` chips). Rebuilt
`ClientSummaryStrip` to that exactly. Zero counts dim to tertiary so an empty
count doesn't shout.

Width: already reverted off the 1100 cap last cluster → full-width = the
route's `max-w-page-expanded` (1440), matching VtC73.

## Cluster 7 — in-client obligation panel matches /deadlines detail
Yuqi: "the opened deadline details inside client detail is wrong and ugly —
why is this different to the deadline detail panel?"

Root cause: `ObligationQueueDetailDrawer` renders `PrimaryDeadlineStrip` with
`variant="cards"` in PAGE mode (/deadlines — framed cards, pretty dates,
icons, rich subs) but `variant="flat"` in the BODY for panel/sheet mode
(borderless, ISO dates). The /clients obligation panel got the flat one.

Fix: panel mode now uses `variant="cards"` too (sheet/mobile keeps flat). The
in-client panel's key-date strip is now identical to the /deadlines detail —
framed cards, "May 12, 2026", "No buffer — same as filing", "$135,000 owed".
Verified live side-by-side.

Still to do (noted): VtC73 title is 36/600 (page ~28); hero/tabs full-width
rules + 40px gutter; filing-table DEADLINE-column slack.

## Cluster 8 — design-system cohesion audit + cleanup
Yuqi (frustrated, with a Lone Star Ventures screenshot): the client detail is
messy, the tabs are cramped, a chip overlaps a form name; demanded a real
cross-referenced audit ("padding, rounded corners, borders, gaps, margins,
text sizes/styles, colours all following the design system"). Ran a token-
level audit of the client detail vs the /deadlines + /alerts detail + the
token files, then fixed:

- **Tabs seam (the cramped culprit):** the client TabsList had NO `border-b`
  and a `-mt-4` hack jamming it under the strip. Added `border-b
  border-divider-subtle h-11 gap-4 text-sm` (matching both reference tab
  bars), dropped the `-mt-4`, triggers → `px-0` + active `font-semibold`, and
  moved the active motion underline to `-bottom-px` so it covers the seam (no
  double line). Section gaps gap-4 → gap-6.
- **Chip/form-name collision:** the inline-expand DEADLINE cell's fixed
  104px badge slot had no `overflow-hidden`, so a long code ("TX Franchise
  Report") bled over the form name. Added `overflow-hidden` + made
  `TaxCodeBadge` truncate its label via an inner block span (full code stays
  on the tooltip). Fixes the overlap app-wide.
- **Off-scale radius:** summary strip `rounded-2xl` (16) → `rounded-xl` (12);
  freelance label `text-caption-xs font-bold tracking-[0.8px]` → the
  canonical `text-column-label` token.
- **Cross-page parity:** page gutter `md:px-6` → `md:px-8` (matches
  /deadlines); year-header bar `px-3` → `px-5` (aligns with the column
  legend + rows); load skeleton synced to the real strip shape (h-[84px]
  rounded-xl).
- **Token fix:** the jurisdictions warning border used a badge-bg token
  (`components-badge-bg-warning-soft`) → real `border-state-warning-active-alt`.

Kept the 12/8 card-radius split (rail standalone cards = 12, inset frames =
8) — that's the documented two-tier system, not drift. tsgo clean; collision
+ tab seam verified live on Lone Star Ventures.

## Cluster 9 — VtC73 layout: full-width header + rail beside content + 36px title
Yuqi (with VtC73 + the cramped-tabs/collision screenshot): match VtC73 — the
header should be full-width with the rail top-aligned to the tab content
(keeping the panel's push-everything-left behavior); title per VtC73.

Restructured `ClientDetailWorkspace`:
- The PageHeader + summary strip + tabs are now FULL-WIDTH (a single page
  column), with a body split below: `[filing-plan tabs | per-client rail]`.
  The rail (Notes/Contacts/Alerts) now aligns with the tab content, below the
  header — was running from the top beside the header.
- The obligation panel is now its own `<aside>` sibling of the page column —
  0-width at rest (so the header is truly full-width), animating to 60% when
  an obligation opens, pushing the whole column (header + strip + body) left.
  The per-client rail collapses while the panel is open (the panel owns the
  right side). Push-left behavior preserved exactly, verified live.
- Title → 36/600 `text-display-large` + `tracking-display` (VtC73) via a new
  `titleClassName` override on the shared PageHeader (default page title
  stays 28px). `display-large` is registered in `cn()` so it isn't stripped.

Verified live both states on Meridian + Lone Star: rest = full-width header +
rail beside the tab content; panel-open = everything pushed left, rail
collapsed, framed obligation cards on the right. tsgo clean.
