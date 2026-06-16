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

## Cluster 10 — Kill the filing-table redundancy + strip typography (6-dimension re-audit)
Yuqi (frustrated, with a stale-bundle screenshot): "can't see your work here. it
still looks ugly and you are ignoring my comments. do not skip or miss any my
feedbacks." Root cause split two ways: (a) the screenshot was a stale browser
bundle — the full-width-header restructure WAS live; (b) real, live defects
remained in the filing table + strip.

Ran an exhaustive 6-dimension audit (table / rail / header / cross-surface
cohesion / token compliance / feedback-completeness), each finding adversarially
verified, then synthesized into one ordered plan. Implemented:

TIER 1 — the visible "混乱" (one home per fact):
- The tax-code badge duplicated the deadline NAME on the client surface
  ("Form 1065" badge beside "Form 1065" name; clipped "TX Franchi…" beside
  "TX Franchise Report"). Added an opt-in `display='label'|'jurisdiction'` prop
  to the SHARED TaxCodeBadge (not mutating its ~15 call sites); DeadlineRow's
  inline-expand branch now passes `display="jurisdiction"` so the chip shows
  "Federal" / "Texas" — the form name is the single home for "what form," the
  chip the single home for "which jurisdiction." Dropped the now-redundant
  `clientState` sub-label. The 104px clip is gone as a side effect (jurisdiction
  names are short); slot trimmed to 92px. /deadlines (navigate mode, where the
  sub-line is the CLIENT name) is untouched.
- Removed the triple-TX: dropped <ClientFilingStateChips> from the identity meta
  row — jurisdiction now lives once, in ClientSummaryStrip's Jurisdictions cell.
- De-duplicated the email: removed it from the header meta row (filtered the
  'email' contact item); it now lives once in the rail Contacts card, upgraded to
  a mailto link (the actionable affordance the header used to carry).

TIER 2 — summary strip = one calm instrument panel:
- Unified all numeric weights to font-semibold (counts were font-bold, next-due
  was already semibold); gave Next Due the mono face + tabular-nums; demoted the
  cell labels from text-column-label (11/600) to text-caption-xs/font-medium/
  tracking-eyebrow (10/500) so labels recede and the mono numbers read.

TIER 3 — 4-based spacing-scale compliance (half-step sweep): year-header
py-2.5→py-3 + gap-y-1→gap-y-2; column-header py-2→py-2.5 (now matches the row);
Contacts card gap-3.5→gap-4 + row gap-2.5→gap-3; alerts header py-2.5→py-3; tab
trigger py-2.5→py-3 + gap-1.5→gap-2; HistoryCard footer gap-1.5→gap-2 +
py-1.5→py-2; notes card gap-1.5→gap-2; strip chip gap-1.5→gap-2 + py-0.5→py-1 +
cell-button -my-1/py-1 → -my-2/py-2.

TIER 4 — cohesion with /deadlines + /alerts: tab-body section rhythm gap-6→gap-8
(all three TabsContent); Setup-tab cards p-4 → px-5 py-4; TabSection outer
gap-3 → gap-4.

Deferred (noted, not skipped): Activity-tab HistoryCard → DetailSectionCard
tone='reference' (#17) — the riskiest, lowest-visibility item (secondary tab,
needs a footer-slot relocation); held for its own pass to avoid a regression.

Verified live (Lone Star, demo-login): no clipping anywhere in the rows
(measured scrollWidth==clientWidth); rows read [Texas] PIR/OIR / [Texas] TX
Franchise Report / [Federal] Form 1065; header meta = "LLC · Priya Pro" only;
strip label computed weight 500 + next-due font-mono; no console errors;
panel-open still pushes the column left and renders the obligation detail
matching /deadlines, compact rows keep their jurisdiction chips. tsgo clean.

## Cluster 11 — In-client obligation panel parity (white surface + quieter overdue banner)
Yuqi (screenshot of the in-client Form 1120 panel): "looking ugly. far from the
Deadline detail page penl." Investigation: the in-client panel and the
/deadlines detail PAGE share one component (ObligationQueueDetailDrawer) and
render nearly identically — the real divergences were (a) the panel sat on a
warm-gray surface while the page is white, and (b) the loud full-bleed red
"Past deadline" banner. Asked which to bring over; Yuqi picked **white surface**
+ **quieter overdue banner** (not centering, not the status chip).

Changes:
- White surface (panel mode only; the mobile Sheet keeps warm canvas): flipped
  the panel container (the `panelLayout` aside else-branch),
  the sticky key-date strip, and the footer from `bg-background-canvas-warm` →
  `bg-background-default`. Kept the panel's left border as the column divider
  against the filing table. Page mode was already white; the divergence is gone.
- Quieter overdue banner: added a `subtle` prop to DetailStatusBanner that drops
  the colored band (keeps the tone's icon + text color on white, border-b carries
  the edge) — the same calm treatment the `pending` tone already uses. The
  overdue (danger) banner now passes `subtle`, so it reads as a white line with
  red icon + "Past deadline · N days overdue" text instead of a loud red bar.
  Applies in both page + panel modes (shared component); the alert detail's
  danger banners are untouched (the global `danger` tone is unchanged).

Verified live: page-mode overdue banner bg = rgb(255,255,255), text =
rgb(217,45,32) (red) — calm white line; in-client panel aside bg =
rgb(255,255,255), no `canvas-warm` remaining; panel reads clean on white (cards
hold via borders). tsgo clean.

Scope note (flagged, not done): only the OVERDUE (danger) banner was quieted per
Yuqi's explicit pick; the warning/success status bands still show their tint.
Can quiet those too for full consistency if wanted.

Out-of-scope observation: routes/obligations.tsx (another session's uncommitted
WIP) throws `MapPinIcon`/`ClockIcon is not defined` in ObligationFiltersPopover —
a missing-import crash in the /deadlines Filter popover. Left untouched (foreign
WIP); flagged for that session.

## Cluster 12 — Summary strip: align to canonical StatBand (kills collision + wrap + slashed zeros)
Yuqi (screenshot of the fact strip): "so ugly." Three concrete bugs: (1) the
"JURISDICTIONS" label overflowed into "BLOCKED" (read as one run); (2) "May 12"
wrapped to two lines in NEXT DUE; (3) the 0s rendered as slashed zeros (Ø-like).

Root cause: the bespoke ClientSummaryStrip had drifted off the canonical
`StatBand` primitive (which its own docstring lists as the /clients/[id] summary).
StatBand uses sans `text-stat-value` (24px) tabular-nums values + truncating
columns; my strip used `font-mono text-2xl` (28px) with `min-w-0` cells — the
mono → slashed zeros, the 28px → "May 12" too wide to fit (wrap), and `min-w-0`
→ the long label shrank below its width and overflowed.

Fixes (brought the strip in line with StatBand while keeping the VtC73 grouped
bg-subtle panel container Yuqi chose):
- Values: `font-mono text-2xl` → `text-stat-value` (24px) sans semibold
  tabular-nums + `whitespace-nowrap`. Sans = no slashed zero; 24px matches the
  StatBand on /clients, sources, rules, alerts; nowrap = no date wrap.
- Cells: dropped `min-w-0` so each cell sizes to ≥ its content (label + value);
  flex-1 distributes the rest. Labels get `whitespace-nowrap`. No more overflow.

Also fixed a related clip in the filing table: the jurisdiction badge slot
(w-[92px], set in Cluster 10) clipped "California"/"Washington" (~95px chips) →
bumped to w-[104px]. Verified "California" no longer truncates.

Verified live (Lone Star + the exact Meridian NY/May-12 case): value font =
-apple-system (sans, not mono), size 24px; strip = one 75px row with zero
overflow; "May 12" single line; "California" badge clipped=false. tsgo clean.

## Cluster 13 — In-client obligation panel renders EXACTLY like the /deadlines detail
Yuqi (VtC73): "the client detail page at least need to look like this … VtC73 has
the deadline detail panel EXACTLY the same as the deadline detail right panel."
VtC73 (REBUILD · master-detail) = lean client master (left) + the standalone
deadline detail (right). So the in-client `panel` mode must render identically to
the `page` mode.

Mapped every divergent branch in the shared ObligationQueueDetailDrawer
(~4900 lines, three modes: sheet/panel/page) and converged panel→page on the
DOCUMENT-LAYOUT branches (`isPageMode` → `panelLayout`), while keeping the
page-EXCLUSIVE chrome page-only (prev/next pager, back-strip, hero
collapse-on-scroll, Esc-to-close, the F hotkey). Specifically: panel now uses the
page's flex-column header+body shell (OuterWrapper), white centered 760px measure
(header + body + footer), the framed `cards` key-date strip + the section-nav tab
bar hosted in the header (not the body), gap-8/gap-4 rhythm, flush per-section
padding, the flat Status-tab workspace, and the single centered footer. Dropped
the panel's duplicate status chip + the Ownership/Linked-from 2-up (page already
de-dupes them), and surfaced the Extension card in panel (it was unreachable —
the locked-4 tab set drops the Extension tab in panel too).

PARALLEL-SESSION NOTE: midway, another session committed its own drawer refactor
(2c1e2a67 "detail tabs -> scroll-spy") which shared the working tree and swept in
most of these convergence edits; three (nav surface, body key-date strip gate,
body nav gate) got clobbered and were re-applied as a clean 3-line delta on top.
The push-everything-left panel behavior + the filing table's OFFICIAL DUE + OWNER
columns are kept (Yuqi's explicit choice).

Verified live (Meridian Form 1120, overdue): exactly ONE key-date strip + ONE
section nav in the panel (duplicate gone); white surface; quiet overdue banner;
3 fact cards + tabs in the header; Materials body; footer — matching the page.
tsgo clean.

## Cluster 14 — Client tabs keep full labels when the obligation panel is open
Yuqi: "tabs 不要 abbreviate 缩起来，当右边 panel 打开的时候" — don't collapse the
client tabs to icon-only when the right obligation panel opens. Dropped
`compact={panelOpen}` from the three ClientDetailTabTrigger calls (Filing plan /
Setup / History) and removed the `!panelOpen` gate on the Filing-plan count
badge, so the tabs keep their labels + count even while the panel pushes the
client column left. Verified live (Meridian, panel open): all three labels
visible (none sr-only), count "4" shows. tsgo clean.

## Cluster 15 — Client-detail review batch 1 (strip + tabs + sort hint + title)
Yuqi (big /clients review). Batch 1 (client files):
- Summary strip: Next Due date dropped from stat-value (24) to text-xl (18) — it's
  a date, not a KPI count (Yuqi "May 12 smaller"); strip labels aligned to the
  canonical StatBand grammar (caption-xs/600/tertiary) so the band matches the
  card summary on /clients, sources, rules, alerts (Yuqi "follow the card summary
  on other pages"). The bg-subtle panel is kept (Yuqi "good, has the background").
- Tabs: bigger spacing between tab names — client TabsList gap-4 → gap-6 (Yuqi
  "bigger spacing between the tab names"). (Panel section-nav gap-6/8 is in the
  drawer working tree, uncommitted — see note.)
- Title: drops from 36 (display-large) to 28 (text-2xl) when the obligation panel
  is open — 36 is too big for the squeezed master (Yuqi "on right panel open, the
  client name drops size"). Verified live: 36 at rest, 28 with the panel open.
- Sort hint: "Latest first" moved out of the standalone line above the table INTO
  the year-group header bar, right-aligned (ml-auto) (Yuqi "Latest first can be
  put in the header, right most").

PARALLEL-SESSION NOTE: the drawer (ObligationQueueDetailDrawer) carries another
session's uncommitted change (panel body bg-default → bg-background-subtle, the
NrQaI "avoid being too white" gray-body model) — which conflicts with Yuqi's
earlier "white surface" pick for the in-client panel. Left the drawer uncommitted
(my panel-tab-gap edit rides with their next commit) to avoid sweeping their WIP.
Flag the white-vs-gray panel-body direction to reconcile.

Deferred (next batches): route padding restructure (#3/#9 — remove weird top pad +
right pad so the panel goes edge-to-edge, padding on inner content); panel
breadcrumb header above the banner (#5); PrimaryDeadlineStrip simplify (#7);
sticky footer visibility (#8); tab underline ↔ divider alignment; buttons bigger
rounded corners (app-wide); ClientCycleArrows + C-corp/owner-pill primitive
unification (#3/#4); fixed-width table columns; keep OFFICIAL DUE + OWNER with the
panel open.

## Cluster 16 — Client-detail review batch 2 (route padding restructure + table columns)
Yuqi /clients review #3/#9 + "keep OFFICIAL DUE + OWNER" + "fixed-width columns":
- Route section padding restructured: the `clients.$clientId` container now carries
  NO padding; the workspace's left column (px-4/8 + a tighter pt-5/6, was pt-6/8)
  and each loading/error state carry their own gutter + top space. Result: the
  weird top padding is gone (#3) and the obligation panel reaches the right edge
  edge-to-edge — padding lives on the content, not the whole section (#9).
- Filing table keeps OFFICIAL DUE + OWNER even when the panel is open (dropped the
  compact gating). The column-header + rows now share a horizontal-scroll frame
  (overflow-x-auto + min-w-[720px]) so the full fixed-width column set scrolls
  together below the min width instead of dropping columns — at rest the column is
  wide so no scrollbar shows. Verified live (Meridian, panel open): scroller
  clientW 486 / scrollW 720 / scrolls true; OFFICIAL DUE + OWNER present; panel
  edge-to-edge; title 28; top padding tightened.

## Cluster 17 — Tab underline alignment + bigger button radius (app-wide)
Yuqi /clients review:
- Tab underline ↔ divider: the active-tab underline floated a few px above the
  TabsList border-b. Dropped the list's fixed `h-11` (tab-bar height is now
  driven by the trigger's `py-3`) so the triggers reach the border; the underline
  at `-bottom-px` now lands on the section divider. Verified visually.
- Buttons rounder app-wide (Yuqi "should have bigger rounded corners"): bumped
  the Button primitive one radius tier — sm/xs/icon-sm/icon-xs 8→12 (rounded-xl),
  default/lg/icon/icon-lg 12→16 (rounded-2xl). Verified ("Add deadline" sm now
  12px). Affects every button in the app.

## Cluster 18 — Summary-strip numbers made consistent
Yuqi: "why are the numbers inconsistent? are these sizes used anywhere else?"
The band mixed sizes (counts 24px, Next-Due date 18px) AND four colours (0 gray,
2 dark, 3 green, May 12 red). Unified:
- All values now the canonical `text-stat-value` 24px (the date was a one-off
  18px, off the StatBand scale — now matches the counts + every other StatBand).
- Counts share ONE neutral colour (dropped the per-count amber/green tone); a
  zero still dims to tertiary. The band's single chromatic accent is the overdue
  Next Due date (red). Verified live: 0 gray-24, 2 dark-24, 3 dark-24, May-12
  red-24 — uniform size + weight, one accent.

Investigated but no change — header buttons: the kebab (outline) and the accent
"+" are measured IDENTICAL (32×32, radius 12, 1px border, 16px icon). The "+"
reads slightly smaller because a dark-navy FILL optically recedes vs a
white OUTLINE of equal size — not an actual size difference. Left as-is (a nudge
would break the icon-button size system); flagged for Yuqi.

## Cluster 19 — Summary-strip numbers → 16px
Yuqi "change to 16px": the strip KPI values dropped from text-stat-value (24) to
text-lg (16) — a compact, low-key band (closer to VtC73's inline stats). Still
uniform: all 16px, counts neutral (0 dims to tertiary), overdue Next Due red.
Verified live (Meridian): 0/3/0 + May 12 all 16px.

## Cluster 20 — Remaining review items (key-date icons, owner pill, panel breadcrumb, footer)
Yuqi "do all" — the 4 carried-over items (planned via a parallel fan-out, then
applied + curated):
- #7 key-date cards simplified: dropped the decorative leading icons
  (CalendarX/Target/Wallet) from DeadlineDateCard — label / date / clock / meta,
  keeping the subtle border frame. Affects the panel + the /deadlines page.
- Unify (#3/#4): ClientCycleArrows already used the canonical Button (no change);
  the C-corp Badge + AssigneeAvatar are already canonical. The ONE hand-rolled
  control — ClientOwnerHeaderPill's <button> trigger — converted to the canonical
  Button (variant=ghost, h-7 rounded-full, +text-xs to hold the 12px meta scale).
- #5 panel breadcrumb: panel mode now renders a slim breadcrumb header
  ("Deadlines › {client} › {form}") ABOVE the status banner (page mode keeps its
  DeadlineCrumbBar; panel keeps its own close-X).
- #8 faint footer: the docked footer went border-transparent (invisible on the
  gray NrQaI body, blending with the white cards above). Flipped the float→dock
  border logic — DOCKED now shows a divider-regular top border (floating keeps the
  drop-shadow), so the action bar is clearly separated. Kept the footer white.

Verified live (Meridian panel): breadcrumb above banner; key-date cards icon-less;
owner pill is a Button (h-7); footer border. tsgo clean (my files).

FOLLOW-UP flagged: at panel-open (squeezed left column) the summary strip wraps
"NEXT DUE" onto a 2nd line under JURISDICTIONS (orphaned). Needs a no-wrap /
scroll or responsive-grid pass on the strip for the squeezed state.

## Cluster 21 — Strip no-wrap at panel-open (fixes orphaned NEXT DUE)
The summary strip used flex-wrap, so at panel-open (squeezed left column) the
NEXT DUE cell wrapped onto a 2nd line under JURISDICTIONS (orphaned). Switched
the strip to `flex overflow-x-auto` (no wrap): the cells stay on one row and the
band scrolls horizontally if the squeezed column can't fit all five — never
orphaning a cell. At rest (wide) it fills one row, no scrollbar. tsgo clean.
