# Rule Library Overview → Pencil O0pyRO (2026-06-09)

Re-synced the `/rules/library` **Overview** (no jurisdiction selected, not
mid-search) to the current canonical Pencil mock `O0pyRO`. The page had drifted
from an earlier build of the same node; this pass makes the Overview match the
mock exactly while leaving the per-jurisdiction drill-down and rule search
untouched.

## What changed (`apps/app/src/routes/rules.library.tsx`)

The Overview is now the clean dashboard the mock shows — and **only** that:

1. **Header** — eyebrow now reads `● Live · Federal + N states · N sources
   monitored` (was `Federal + N states · N sources active`). Title is **Rule
   library** with a **"N rules across M jurisdictions"** subtitle (was "Rule
   library overview", no subtitle). Primary CTA relabeled **Add rule** (was "Add
   new rule"). Reuses the shared `PageHeader`.
2. **Stats band** (`OverviewStatsBand`, new) — replaces the bordered `KpiStrip`
   card with the mock's borderless 4-stat band framed by top+bottom hairlines.
   32px medium values; colored subs: Total `+N this month`/`N active` (accent),
   Jurisdictions `N% coverage` (success), Changed (30d) `N high-impact` (warning)
   /`Last 30 days`, Pending review `oldest …` (accent).
3. **Recent changes** (`OverviewRecentChangesCard`, rewritten) — now a flush
   full-width section (was a bordered card paired with a Status-coverage card).
   Rows: jurisdiction code pill · title + `form · effective date · by reviewer`
   meta · UPDATED/NEW/EFFECTIVE change pill · relative time · chevron. Header
   gains the `Last 30 days · N of M` sub and a `View all changes →` link to the
   audit log.

**Removed from the Overview** (per the mock, which ends after Recent changes):
the catalog-release banner, the blue review-queue ActionHero, the
Status-coverage card, the scope tabs, and the grouped all-jurisdictions table.
Drilling into a jurisdiction (or running a rule search) still swaps in the full
working console — scoped KPI strip, progress meter, scope tabs, entity/search
filters, and the rule table — unchanged.

## Data / no-fiction

All stat subs derive from already-wired queries (no new fetch, no invented
numbers): `coveragePct` from coverage rows, `highImpactChanged`/`newThisMonth`
from `ruleChangedAt` + `riskLevel`/`ruleChangeKind` over the trailing 30d,
`sourcesMonitored` from the sources query. The Recent-changes `N of M` sub
suppresses itself when the 30-day count would be smaller than the rows shown, so
demo data (0 changes in the window) reads `Last 30 days` instead of `5 of 0`.

## Tokens / reuse

No new theme tokens. Change-pill tones map onto existing `state-accent-hover`/
`state-success-hover`/`state-warning-hover` + matching text tokens; jurisdiction
pills reuse `jurisdictionPillClass` (FED slate, states bordered-gray). Title kept
at the canonical `PageHeader` 24px scale rather than the mock's 32px so every
protected surface shares one page-title size.

## Follow-ups

- The now-unused `GroupedRulesTable` / `RulesLibraryEmptyState` /
  `MissingRulesEmptyState` definitions remain in the file (dead, but the build is
  clean — `noUnusedLocals` is off). Removing them safely needs a lint pass to
  trace their route-local helper cascade.
- The Jurisdictions rail still uses lucide map-pin icons where the latest mock
  shows colored 2-letter state-code pills — left as-is pending a design call
  (the rail was deliberately set to icons in a prior O0pyRO pass).

Verified in the live app: Overview matches the mock; California drill-down shows
the full console; `tsgo` is clean for this file.

---

## Round 2 — empty state (`whr8M`) + selected-jurisdiction (`oJL8o`)

### Overview empty state — "You're all caught up" (`whr8M`)

New `OverviewCaughtUpCard`: a centered card on the subtle surface (success
check, headline, body, a real "Last rule reviewed …" meta line, and two links —
View past decisions → `/audit`, Monitor sources → `/rules/sources`). The Overview
body now branches three ways:

- loading → stats-band skeleton
- `totalPendingReview === 0` → caught-up card **above** the stats band (a clear
  queue reads as the reward, per the mock's order)
- otherwise → stats band above the Recent changes feed (`O0pyRO`)

The stats array was extracted to `overviewStats` so the band renders identically
in both orderings. (The demo tenant has 456 pending, so the card only shows for a
tenant whose queue is actually clear.)

### Selected jurisdiction — Alaska table (`oJL8o`)

Reworked the per-jurisdiction view (`jurisdiction-rule-table.tsx` +
the route's selected branch) to match the mock:

- **Header**: sync/coverage eyebrow + state name + mono **code pill** (`AK`) +
  **Export** + **Add `<state>` rule** (replaces the breadcrumb + status chips +
  New rule / Start review). Back nav is the rail's Overview row.
- **Table columns** rebuilt to `RULE NAME` (code badge + title + one-line
  `defaultTip`) · `TYPE` (tax-type pill, jurisdiction prefix stripped, truncated)
  · `EFFECTIVE` (mono `verifiedAt`) · `LAST MODIFIED` (`reviewedAt`, em-dash when
  never re-reviewed) · `SEVERITY` (`riskLevel` HIGH/MED/LOW pill) · `STATUS`
  (dot + label pill). Selected rows read accent-hover with a left accent bar.
- Dropped the completion **progress bar** from the selected view (the KPI strip
  already carries the breakdown, per the mock).

All values are wired rule fields — no fiction. `tsgo` clean. Verified: Alaska
drill-down renders the new header + KPI strip + table; Overview unchanged.

### Selected-jurisdiction filter bar (`oJL8o` `uxrVs`)

New `JurisdictionFilterBar` — the mock's filter row rebuilt **entirely from
existing design-system primitives** (no bespoke pills):

- **Status** → `Segmented` (`All / Active / Pending / Deprecated`), mapped onto
  the route's existing `scope` URL state (Pending = review, Deprecated =
  archived; the catalog-only "missing" scope is dropped here).
- **Search** → inline `SearchInput` ("Search `<state>` rules", 260px).
- **Type · Modified · Effective · Severity** → `FilterTrigger` pills + base
  `DropdownMenu` (the same chrome /deadlines + /alerts use). Type + Severity are
  multi-select checkboxes that filter; Modified + Effective set a single active
  sort (Newest / Oldest / Default). The chips show the active state + a count
  badge.

Wiring: ephemeral `tableFilter` state (`{types, severities, sort}`) in the route,
reset on jurisdiction change, applied in `jurisdictionTableRules` after
scope/entity/search. `formatRuleTypeLabel` is shared by the TYPE column + the
Type-filter options so they never drift. The old scope tabs + entity chips stay
for the global rule-search view only. Verified live: Type filter narrows Alaska
3 → 1 row and the chip reads "Type 1". `tsgo` clean for both files.

### Knowingly not matched (follow-ups)

- Status pills read "Needs review" (shared `STATUS_LABEL_SHORT`) where the mock
  says "Pending".

---

## Round 4 — type-scale + interaction polish audit

Element-by-element fidelity pass after a coworker flagged "missing detail
designs and interactions." Two systemic gaps:

1. **Type scale was undersized.** This app remaps Tailwind's named sizes
   (`text-xs`=11, `text-sm`=12, `text-base`=14, `text-lg`=16, `text-xl`=18,
   `text-2xl`=28). My round-1/2 components were authored with *default*-Tailwind
   assumptions (`text-sm`=14), so titles/meta/dates rendered one notch small vs
   the Pencil px. Fixed to the mock's literal px throughout: Recent-changes
   header 18→**20**, row title 12→**14**, meta/date 11→**12**; stats-band eyebrow
   10→**11**, sub 11→**12**; caught-up headline 16→**18**, body 12→**14**, meta
   11→**12**; jurisdiction table desc/effective/last-modified 11→**12**; header
   eyebrows 11→**13**; detail code pill 12→**14**.
2. **Missing hover micro-interactions.** Recent-changes rows had no `group`, so
   nothing reacted on hover. Added: row title → accent + chevron slides
   `translate-x-0.5` + brightens; "View all changes" and the caught-up links
   slide their arrow on hover; all on `transition` with `duration-150`.

Verified live via computed styles (title now 14px, header 20px, `group/row`
present, chevron transition wired) and screenshots.

### Sources moved off the rail → Overview header button

Dropped the **Sources** nav row from the Jurisdictions rail (`states-rail.tsx`:
removed the row, the `sources` prop, and the now-unused `RssIcon`/`PulsingDot`
imports). It's now an outline **Sources** button in the Overview header action
cluster (`[Sources ●397] [Export] [Add rule]`) — `RssIcon` + label + a live
health dot + monitored count, linking to `/rules/sources`. The rail keeps
Overview + Temporary rules + the jurisdiction list. `tsgo` clean.

---

## Round 5 — design-universe consistency audit (primary + secondary)

Inspected the Rule Library pages against the app's canonical page conventions
(/today, /deadlines, /clients, RulesPageShell) — structure, padding, title
position, text size.

**Primary (`/rules/library`)**
- **Eyebrow 13→11px.** Round 4 bumped the status eyebrow to 13px for Pencil
  fidelity, but /deadlines + /today status eyebrows are **11px** (they inherit
  PageHeader's `text-caption`, only overriding case/tracking). Reverted to 11px
  (`text-xs`) so the eyebrow reads like its siblings, not an outlier. Applies to
  both the Overview and the jurisdiction-detail header.
- **Title top position 32→24px.** The app standardized page titles to `pt-6`
  (24px) "at the same position across pages" (/today + /deadlines + every
  RulesPageShell page). The custom-built rule-library right panel **and** the
  jurisdiction rail were still on `md:pt-8` (32px) — 8px lower than everywhere
  else. Dropped `md:pt-8` from both so the title baseline lines up.
- Already canonical: `max-w-page-expanded`, `gap-8`, `md:px-8`, 28px PageHeader
  title.

**Secondary (`/rules/temporary`, `/rules/preview`)**
- Both used the **default** narrow shell (1100px / `gap-6` / `md:px-6`) while
  `/rules/sources`, `/rules/library`, and `/rules/pulse` are all `wide` (1440) +
  `gap-8` + `md:px-8`. Added `wide` + `contentClassName="gap-8 md:px-8"` to both,
  plus a "Rule library → …" breadcrumb on Temporary (it had no back-nav). They
  now match Sources exactly.

Verified live via computed styles: Overview eyebrow 11px, title 28px, container
`padding-top` 24px; Temporary now `max-w-page-expanded` / 32px padding / 24px
title baseline / breadcrumb. `tsgo` clean on all four touched files.

---

## Round 6 — review-panel component-reuse audit

Feedback on the `?rule=…` review panel: "audit … ensure it is reusing
previously-appeared components … replace elements used elsewhere with the
correct component … if the layout has appeared somewhere else, use the same
layout/token/component."

**Macro layout — centered Dialog → right-side `Sheet` drawer.** The rule detail
was the app's *only* centered modal; every other entity detail (Alert / Client /
Obligation / Audit-event / Evidence) opens as a right-side `Sheet`. Converted
`RuleDetailPanel` to the canonical flush `Sheet`:
- `<SheetContent side="right" flush>` with the same `w-[min(720/840/900px)]`
  width ramp the deadline-detail drawer (`ObligationQueueDetailDrawer`) uses;
  `flush` is the primitive's own `gap-0 overflow-hidden p-0` recipe.
- `SheetHeader` / `SheetTitle` / `SheetFooter` replace the hand-rolled
  Dialog header/footer; the Sheet's built-in close button replaces the manual one.
- Verified live: opens right-side, `data-side=right`, `flush`, 900px @ xl, full
  height. Review actions (Accept / Reject / Generate draft) preserved.

**Element reuse inside the panel.**
- **Effective-date banner**: bespoke amber strip (`border-l-[3px]` + hand-rolled
  text) → shared **`Alert` variant="warning"** — now the same callout component
  as the "Needs CPA review" `Alert` in the body, not a one-off.
- **Kicker chips**: the jurisdiction span + the three `RuleImpactPill` tint spans
  → shared **`Badge variant=… shape="square"`** (the badge's documented
  "jurisdiction kicker" eyebrow-chip treatment). Jurisdiction → `secondary`,
  impact high/med/low → `destructive`/`warning`/`secondary`.

`tsgo` clean. (Already-shared, left as-is: the body's `Alert`, `Badge`, evidence
cards.) Remaining bespoke chips on the *table/overview* — the oJL8o SEVERITY /
STATUS pills, the recent-changes change-kind pill — were intentionally matched to
the oJL8o mock; consolidating those onto `Badge shape="square"` too is a sensible
next step but changes mock-specified visuals, so flagged rather than changed
unilaterally.

---

## Round 7 — Jurisdictions rail unified with the canonical list rails

Feedback: "the state list should be 380px, just like alert/deadline detail
sidebar … ensure the sidebar is cohesive with the established ones."

`ObligationListRail`, `DeadlineNavigatorRail`, and `AlertListRail` share one
recipe: `flex h-full w-[380px] shrink-0 flex-col border-r border-divider-subtle
bg-background-default`, a single-row 15px head + `border-b`, a `border-b` search
row, and a scrollable body. The Jurisdictions rail was the outlier — `w-72`
(288px), `border-divider-regular`, a two-line eyebrow+title header, a standalone
`h-px` divider, and a rounded-pill footer. Unified it:

- **Width 288 → 380px**, border `divider-regular → divider-subtle`, added `h-full`.
- **Head**: dropped the "RULE LIBRARY" eyebrow; now a single `border-b` row with a
  15px `font-semibold` "Jurisdictions" title + the review-only filter toggle —
  the canonical head shape.
- **Search**: its own `border-b` row (same section rhythm), reusing the shared
  `SearchInput`.
- **Footer**: rounded-pill → quiet `border-t` strip.

Verified live: rail computed width 380px, right border `divider-subtle`, head
title 15px. `tsgo` clean.

---

## Round 8 — rule review summary-first card-stack (review-flow doc, Step 4d)

Per `docs/Design/rule-library-review-flow.md` + the amendments dev-log §3.4.
First grounded the brief: **`coverage-tab.tsx` is dead code** (nothing renders
it; `/rules/coverage` → `/rules/library`), so the doc's "right-column takeover in
coverage-tab" / "widen the Sheet" steps (4a/4b) are moot or already shipped (the
detail is already a URL-routed right-side `Sheet`). The live, aligned target is
**`RuleDetailCompact`** (renders in the batch-review modal + alerts reverify).

Built two pieces in `rule-detail-drawer.tsx`:

- **`DisclosureCard`** — the canonical bar-header card (`rounded-xl` /
  `divider-subtle` border / `bg-default` / `h-9` `bg-subtle` bar / 13/600 title +
  `ml-auto` meta slot — same chrome as the deadline-detail `PenaltyExposureCard`)
  plus the summary-first disclosure contract: `summary` shown by default, optional
  `detail` revealed by a trailing **Read more / Show less** toggle (chevron
  rotates). Independent per card.
- **`RuleDetailCompact` rebuilt** from flat always-expanded `DetailSection`s into
  a card-stack: **Applicability** (summary one-liner → full facts grid),
  **Due date** (humanized logic → extension policy), **Evidence** (primary source
  → remaining sources), **Activity** (current version → full audit timeline), then
  the always-expanded **Decision** footer (`CandidateReviewSection`, unchanged).
  Right-meta chips ("1 entity", "source defined calendar", "1 source", "v1") use
  the real wired counts.

Verified live in the batch-review modal: 4 disclosure cards render with the
canonical chrome; Read-more expands Applicability to its facts grid and flips to
Show less, independently. `tsgo` clean.

**Not done (flagged):** the main rule-detail **Sheet** still renders
`RuleDetailInline` (the fuller view with MatchedPulse / Needs-CPA-review Alert /
Provenance / Verification + a *sticky* decision footer). Swapping it to the
card-stack means a footer-dedup decision + dropping those extra sections, so it's
a deliberate follow-up rather than a silent change. Alert §1 / Deadline §2 from
the amendments brief are separate workstreams (schema/contract migrations, open
product decisions) — untouched.

---

## Round 9 — Pencil component scaffolding (amendments §1.5) + a latent token bug

Read the selected Pencil screen `b7fa5Y` (States · Interactive — primary/secondary
button hover→focus→active→disabled, composer empty→focused→typing, loading
skeletons, link-hover +2px) and the 8 reusable components (6 `AlertStatusChip`
variants, `RelatedRuleRow`, `DecisionActions`). The interactive states are the
design system's canonical states the shared primitives already implement, so the
new components reuse them.

Built three components in `features/alerts/components/`:

- **`AlertStatusChip`** (`w4DBr`/`b75I5W`/`GzVzj`/`g770iB`/`Cirrk`/`OMxu3`) —
  rounded-full pill, per-status icon (`clock-3` / `check-check` / `undo-2` /
  `circle-dot` / `rotate-ccw` / `badge-check`) + label + optional timestamp
  suffix. `matched` → "Awaiting decision" (display-only, no migration). Tones map
  onto tokens: awaiting/partial → warning, applied/reviewed → success, dismissed/
  reverted → muted (reverted bordered). The canvas's `#000000` fills on applied/
  reviewed are placeholder glitches — used the success tokens.
- **`DecisionActions`** (`fJtAo`) — primary `Button` + optional secondary outline
  `Button` grouped left, optional tertiary text action pushed right; `loading`
  spins the primary + disables the cluster. Reuses `Button` so it inherits the
  documented states. Polymorphic (amendments §1.1 Option C).
- **`RelatedRuleRow`** (`G0zYC`) — file tile + mono code · name + one-line
  relation desc + chevron; clickable variant lifts bg + nudges the chevron +2px.

Registered all three in the `/preview` component gallery (next to
`AlertStatusBadge`) for verification.

**Latent bug found + fixed:** `text-state-warning-text` is **not a real Tailwind
token** here — it silently fell back to `text-primary` (#101828), masked by the
warning bg. The canonical token is **`text-text-warning`** (#c83d2f). Fixed all 5
occurrences (the new chip + 4 from earlier rounds: the recent-changes EFFECTIVE
pill, the stats-band high-impact sub, the jurisdiction-table SEVERITY-HIGH pill +
the row STATUS review tone). Verified via computed styles: warning chip now
`#c83d2f` on `#fff4f1`, success `#079455` on `#ecfdf3`.

`tsgo` clean. These components are scaffolding (registered in the gallery, not yet
wired into the alert detail / rule review — that's the §1.1–1.3 wiring workstream
with its contract/DB migrations).

---

## Round 10 — row click = review, checkbox = bulk (interaction clarity)

Feedback: clicking a row should open the detail (review one rule); only the
checkbox should bulk-"review". The distinction was misleading — the oJL8o table
had an always-on leading checkbox and **no chevron**, so "how do I review this?"
was ambiguous. Pencil Screen A (`x7C2k` in `GHObe`) shows the answer: rows are
`status dot · title · meta · chevron-right`, single-click opens, and the open row
reads accent-hover + a 2px left accent bar — checkboxes are *not* the prominent
affordance.

Reworked `JurisdictionRuleRow` to that model:
- **Trailing chevron-right** on every row — the unambiguous "this row opens the
  rule" affordance; brightens + nudges +2px on hover, turns accent on the open row.
- **Checkbox demoted to secondary** (Linear/Gmail pattern): a quiet status dot at
  rest that fades to the bulk-select `Checkbox` on row hover / focus, and stays
  visible once checked. "Click the row to review" is now the obvious primary
  action; checking is a deliberate, separate bulk gesture.
- **Active/open row** highlight: passed `activeRuleId` (the `?rule=` panel) → the
  row reads `accent-hover` + 2px accent bar, distinct from the (unchecked) resting
  rows; the checkbox's own checked state separates "selected for bulk" from "open".
- Header gained the chevron column; `GapRow` colSpan 5→6 and the empty colSpan
  7→8 to keep the 8-column grid aligned.

Verified live: every row renders a trailing chevron, the resting checkbox is
`opacity-0` (status dot shown instead). `tsgo` clean.

---

## Round 11 — accept-mutation error dialog (`DGeuG`); in-flight modal flagged as fiction

Pencil `w8tiT` shows two accept-mutation states over a faded /rules: an in-flight
modal (`Wp5e0`) and an error dialog (`DGeuG`). Grounding check: `acceptTemplate` /
`verifyCandidate` are **single oRPC mutations** — no streaming, no step events.

**Built `RuleAcceptErrorDialog` (`DGeuG`)** in `rule-detail-drawer.tsx`: a 480px
destructive-led Dialog with the rule id + attempt count, the **real** server
message, the oRPC code chip (only when it adds signal beyond the message), a
"your draft is preserved" reassurance, and a one-click **Retry**. Wired into
`handleAcceptError`: on failure the loading toast is dismissed and the dialog
takes over (replacing the old error toast); `submitAccept` counts attempts and
clears prior errors so Retry re-runs cleanly. Registered in the `/preview` gallery
(verified: opens with "Couldn't apply rule" + `CONFLICT` chip + Retry).

**Did NOT build the in-flight modal (`Wp5e0`).** Its 5-step progress list,
"Streaming server events · started 00:03 ago", and the error dialog's "Step 3 of
5 · Write deadline changes" / "Reference req_… · Logged to audit" are all fiction
for a single RPC with no streamed step state (and a rolled-back failure isn't
audit-logged). The honest in-flight is the existing loading toast + disabled
"Accepting…" button, which stays. Flagged for the designer rather than fabricated.

`tsgo` clean.

---

## Round 12 — Accept-impact (`D`) + Reject-reason (`E`) aligned to `qjrGE`

`qjrGE` shows Flow D (Accept impact) + Flow E (Reject reason). Both were **already
implemented** — `ConfirmImpactDialog` (the honest impact confirm: real aggregate
deadlines + entity distribution, no fabricated per-client rows) and
`RejectReasonDialog` (preset reason chips + Other note + radiogroup). Applied the
small honest deltas to match the canvas:

- **Accept (`sXJrc`)**: header icon `SparklesIcon` → **`ShieldCheckIcon`** (the
  canvas's shield-check; sparkles read as "AI", wrong for a commit), title
  "Confirm impact" → **"Confirm accept"**, primary "Accept & apply" → **"Activate
  rule"**. Left out the canvas's per-client preview + "12 clients" + "reversible
  within 7 days" — no per-client/window data backs them.
- **Reject (`o7TMz`)**: added the **octagon-x destructive** header icon. The
  reason chips + Other textarea + destructive Reject button already matched.

Verified live: the Reject dialog opens with the octagon-x icon + the four reason
chips. `tsgo` clean.

**Flow G (`Oaey3`, bulk modal) NOT built — flagged.** It's a *list-based* bulk
modal (selected-rules list + per-row edit + batch note + Accept/Reject N), which
conflicts with the live `BatchReviewModal` (a one-card-at-a-time walkthrough), and
its impact strip mixes real metrics (new obligations, affected clients) with
fiction (**+15% coverage lift**, **+3h est. work** — no such backend signals). It
needs a product call: rebuild the bulk surface as the list modal (dropping the two
fictional pills) vs. add Reject to the existing walkthrough. Left for that decision.

---

## Round 13 — Reject in the batch walkthrough (Flow G, option b)

Decision: keep the existing **walkthrough** (the `BatchReviewModal` card-at-a-time
queue — "Reviewing pending rules · 1/N", accept/skip/prev/next) and just add a
**Reject** action, no paradigm change.

`CandidateReviewSection`'s Reject button + `RejectReasonDialog` were gated to
`confirmImpact` (single-detail only); the batch (`RuleDetailCompact`, no
`confirmImpact`) was accept/skip-only by an earlier design choice. Ungated both —
rejecting a candidate rule is valid in any review context, and the dialog is
already driven by `rejectOpen` so it only shows on demand. Reject success calls
`onActionComplete`, which advances the queue exactly like accept.

Verified live: the walkthrough footer now reads **Reject · Accept rule · Done**;
clicking Reject opens the reason dialog (octagon-x icon + 4 reason chips + "Reject
rule"). `tsgo` clean.

---

## Round 14 — organize the Practice-review / Decision section

The decision footer (`CandidateReviewSection`) had the heading + explanation +
two ungrouped review cards (year-over-year diff, AI concrete draft) + the
Accept/Reject buttons all stacked flat — read as a jumble. Grouped the two cards
under a quiet **"Before you accept"** eyebrow so the section now reads
**context → checks → decide**. Verified live in the walkthrough (the label wraps
the year-over-year + AI-draft cards; the AI-draft's "Generate draft" CTA is now
clearly part of the checks group). `tsgo` clean.

Note (informs the Flow-G a/b call): the AI concrete draft is a **per-rule accept
gate** (Accept is disabled until it's generated) and "review cold" is a per-rule
risk signal — both live in this block. A bulk list modal (`Oaey3` / option a)
wouldn't show this per rule; it'd move to the per-row drill-down, so a bulk
"Accept N" needs per-row readiness/risk flags (and must exclude not-ready rules)
or it'd let a reviewer activate rules that can't yet generate deadlines.
- Dead code from the Overview restructure + this rework (`GroupedRulesTable`,
  `RuleReviewProgressBar`, `RulesLibraryEmptyState`, `MissingRulesEmptyState`,
  `startReviewAll`) remains — `tsgo` is clean (`noUnusedLocals` off), but a
  linter-guided sweep should delete it.

---

## Round 15 — bulk-review LIST modal (Flow G / `Oaey3`, option a)

Built `BulkReviewListModal` in `rules.library.tsx` — the canonical bulk surface,
replacing the one-at-a-time walkthrough (`BatchReviewModal`, retained but no
longer wired) at the "Review N" entry. All data is **real**: `previewBulkRuleImpact`
returns `acceptReadyCount`, `estimatedObligationCount`, a `skipped[]` list (per-rule
readiness reasons), and year-over-year `classificationCounts`; `bulkAcceptTemplates`
activates only the ready rules.

Anatomy (matches the canvas, minus fiction):
- **Header** — layers icon + "Bulk review" + "N rules selected".
- **Rule list** — one row per selected rule: include-checkbox · status dot · code
  badge + title + type · **per-row readiness/risk flag** (`Ready` green, or the real
  skip reason e.g. "Needs AI draft review" / "Source changed — review individually"
  amber) · **eye → open detail** (takeover; closes the modal).
- **Shared review note** — required; feeds the accept `reviewNote` AND the reject
  reason. Logged to audit.
- **Impact** — only API-backed metrics: Ready to accept · Est. deadlines · Need
  review · Skipped. **Dropped the canvas's "coverage lift" + "est. work" pills** (no
  backend signal — fiction).
- **Footer** — Reject N (destructive outline, loops `rejectTemplate`/
  `rejectCandidate`) · Cancel · Accept N (`bulkAcceptTemplates`, label = ready
  count, gated on readiness + a note).

Wiring: `BulkReviewBar` → `setBulkListOpen(true)`; bar hides while open; `onOpenRule`
closes the modal + routes to the single-rule takeover; `onComplete` clears selection
+ invalidates rules/obligations/audit/dashboard.

Verified live (10 AL rules): modal opens, every row flags **"Needs AI draft review"**,
impact reads **0 ready · 0 est. deadlines · 10 skipped**, footer gates **Accept 0**
(correct — these source-defined candidates need per-rule AI drafts first) while
**Reject 10** stays available. `tsgo` clean.

Honest caveat surfaced by this: most candidate rules are source-defined, so
bulk-**accept** is frequently gated to 0 until AI drafts are generated per rule. The
modal makes that legible at a glance (readiness column + "N skipped") and still
enables bulk-**reject** + per-row drill-in — rather than letting a reviewer one-click
activate rules that can't yet produce deadlines.
