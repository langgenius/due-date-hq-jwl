# /today — alerts body + caught-up empty state, Priorities hybrid + CPA buckets

**Date:** 2026-06-11
**Surface:** `/today` — `apps/app/src/features/dashboard/{needs-attention-section,needs-attention-card,merged-brief-card}.tsx`, `apps/app/src/routes/dashboard.tsx`; backend `packages/contracts/src/pulse.ts`, `packages/ports/src/pulse.ts`, `packages/db/src/repo/pulse/shared.ts`, `apps/server/src/procedures/pulse/index.ts`

A batch of Yuqi page-feedback rounds on the dashboard.

## Alert cards

- **Titles bigger** (`text-base → text-lg`) and card padding `p-4 → p-5`.
- **Hover micro-interaction tried, then reverted.** A `-translate-y-0.5` lift +
  soft shadow was added, then pulled ("hate the floating shadow interaction").
  Back to the plain bg-step hover — consistent with the restrained-shadows rule
  (cards default to no outer shadow; border + bg contrast does the lift).
- **Body text restored — via the verbatim quote, not `summary`.** The card was
  title-only. The catch: `PulseAlertPublic.title` and `.summary` both derive
  from the pulse `ai_summary` column (see `toAlert` in `repo/pulse/shared.ts`),
  so they're byte-identical — restoring the old `{alert.summary}` body just
  echoed the title, which is why it was cut. The genuinely distinct body is the
  source's **`verbatim_quote`** ("Affected taxpayers in LA County have until
  June 16, 2026…"), which wasn't surfaced on the list row. Plumbed
  `verbatimQuote` through: ports `PulseAlertRow`, db `shared.PulseAlertRow` +
  `toAlert` (the scoped queries already `SELECT pulse.verbatimQuote`),
  `toAlertPublic`, and the public contract (`.nullish()` so existing alert test
  fixtures don't all need updating). The card renders it as a 2-line clamped
  body, guarded against echoing the title.

## Alerts empty state — centered "caught up" block

Replaced the old thin one-line status with a centered illustration block
matching the provided mockup: a `Megaphone` in a `size-16` light-accent disc,
**"No alerts — you're caught up"**, a subtext, and a **Configure sources** link.

No fiction: the subtext names the two leading **real** monitored-source labels
("When IRS Disaster Relief, IRS Newsroom, or another monitored source
publishes a change…") and the most-recent **real** `source.lastCheckedAt`
("Last check: May 1.", hidden until a source has actually been checked).
Degraded states preserved — "No sources monitored yet" when none are watched,
and an "N monitored sources are paused" warning line. This reverses the earlier
"a calm feed shouldn't claim hero space" thin-line rationale at Yuqi's
direction. Dropped the now-unused `PulsingDot` + `CircleCheckIcon` imports.

## Priorities (MergedBriefCard) — hybrid + CPA buckets

- **"Combine the previous table"** → a **hybrid**: kept the brief header
  (sparkles + title + segmented selector + summary lede) and added a labeled
  column header (`FORM · CLIENT · STATUS · DUE`) above the rows so they read as
  a table.
- **CPA-aligned buckets.** Dropped "ending today" (doesn't match how CPAs frame
  work). Buckets re-cut to **This week (0–7d) · This month (8–30d) · Overdue
  (<0)**, selector in that order. Counts wired from facets (this week =
  `today` + `next_7_days`; this month = `next_30_days`). Restored full width
  (a merge had re-added the `max-w-4xl` cap) and the status-column width +
  uniform `text-xs` badge the merge had reverted.

## Note

The local D1 was re-seeded from `mock/demo.sql` mid-session — the dev DB held
stale alert rows where `verbatim_quote` predated the distinct demo bodies.

## Addendum — brief banners unified (same day, later round)

Yuqi: "cross reference to Deadlines page's brief — same style, same visual
language. Elevate both." The `/today` `DailyBriefCard` was restyled in place
onto the `/deadlines` at-a-glance banner's editorial language: accent wash →
neutral `bg-background-subtle` + `border-divider-subtle`; accent-coloured
`text-base` title → dot + tracked-caps eyebrow (`DAILY BRIEF` + freshness);
the AI focus sentence promoted to the `text-lg leading-6 font-semibold`
headline slot; the mono `YESTERDAY`/`TODAY` label grid retired — counts +
recap now sit as calm `text-sm` metric lines under the headline; hand-rolled ✕
→ ghost `icon-xs` Button at `top-2.5 right-2.5`. The deadlines banner got the
matching micro-lift (`gap-1 → gap-1.5`, `py-3.5 → py-4`). Canonical spec +
keep-in-sync checklist: `docs/Design/brief-banner-language.md` (includes why a
shared component was deliberately NOT extracted yet).

## Addendum 2 — the elevation pass (lofi → product)

Yuqi: "looks like a lofi prototype, polish and elevate; avoid side-border
highlights with rounded corners; avoid too much use of borders" + the 8-item
batch. Changes:

- **One section-title voice.** Alerts / Daily Brief / Priorities all anchor on
  `text-lg leading-tight font-semibold tracking-[-0.01em] text-text-primary`
  title-case. Register A redefined in `section-header-style.md` (supersedes
  the 14px-caps original AND the interim demoted 11px eyebrow — caps now live
  only in Register B labels).
- **Daily Brief**: blue tint restored (`bg-state-accent-hover`, borderless —
  the page's one chromatic surface), proper title (no tracked-caps, no dot),
  AI sentence demoted to `text-base font-medium` content under the title.
  `brief-banner-language.md` updated with the purpose-split surface rule.
- **Priorities**: rebuilt as an OPEN section (header + lede float on the page,
  like Alerts) over the canonical framed `<Table>` — merging the original
  actions-list.tsx good bits: labeled header band, client + action-verb
  stacked cell, due cell stacking relative countdown over `formatDatePretty`
  absolute date, `isMine` avatar ring via `useCurrentUserId`, and the
  hover-revealed Review CTA with the gradient mask. Stage-first verb logic +
  CPA buckets + chip selector + payment-late gray chip all preserved.
  ROWS_PER_BUCKET 4 → 5. Border budget: ONE framed surface on the page
  (card-in-card avoided).
- **Alert cards**: verbatim-quote body stepped to `text-xs`; LIVE chip to
  `text-caption`.
- Audited for side-border highlight + rounded-corner combos: none exist on
  these surfaces.

## Addendum 3 — spacing/arrangement audit, all findings applied

Measured audit (DOM tape-measure, 1512×861) then fixes:

- **Title eye-line**: "Priorities" sat at x=152 (sparkles circle pushed it off
  the rail) vs "Alerts" at 114. Circle dropped; a small sparkles GLYPH now sits
  after the title carrying the "Curated by Smart Priority" tooltip (the
  original Priority Actions star's job). Open-section titles share x=114.
- **Region anchor ≡ item headline collision**: section titles (16) matched
  alert-card titles (16). All three section titles → text-xl (18). Page ramp:
  28 / 18 / 16 / 14 / 13. Register A in section-header-style.md → 18px.
- **Micro-gap drift**: Priorities gap-2.5 (10/11px) → gap-3 (12px), matching
  Alerts' header→content rhythm.
- **Row pitch**: Priorities [&_td]:py-3 → py-2.5 (row 68 → 64, nearer the
  /deadlines 56 canonical with two-line stacks).
- **Dismiss targets**: Daily Brief + /deadlines banner ✕ → size-7 (28px) hit
  area (kept in sync per brief-banner checklist).
- **Seam**: Daily Brief workload-counts line now renders ONLY when a real AI
  sentence exists — no more duplicating the Priorities chips when the brief is
  failed/empty.
- **Impact-ordered alerts**: sorted by `matchedCount + needsReviewCount` — the
  EXACT number the card displays as "N clients" (first attempt sorted by
  matchedCount alone and read unsorted: "3 · 1 · 2"; second attempt via the
  affected-clients batch was async + the wrong number — the card never
  displays affectedClients.length). Synchronous, stable, no reorder-on-load.
  Result: a 3-client WA alert surfaced into the top row, displacing a 1-client
  alert recency had favoured.
- Known, deliberately untouched: text-xs(13)/text-sm(14) 1px near-collision is
  a token-level question for a future sweep, not a per-page fix.

## Addendum 4 — Priorities column packing + hover side-bar suppression

Yuqi: "why are STATUS/DUE/assignee so far right when CLIENT is so long?" The
client cell was `w-full max-w-0` (greedy), pushing the meta columns to the
table's far edge with a ~700px void. Fix: CLIENT fixed at the original
ActionsTable's 440px (inner div `w-[440px]`, truncation preserved) + a
trailing spacer column (`w-full p-0` th/td pair) that absorbs the leftover —
data columns now pack left (STATUS at x≈728 instead of ≈1270), whitespace
trails inside the frame. The hover-reveal Review CTA stays anchored to the
row's right edge (the void gains a purpose on hover).

Also suppressed (hover:shadow-none): the canonical TableRow's 2px inset LEFT
ACCENT BAR on interactive-row hover — exactly the "side-border highlight
inside a rounded frame" pattern Yuqi banned. NOTE: the motif still lives in
the primitive (packages/ui table.tsx) and renders on /deadlines, /clients,
etc. — whether to remove it app-wide is an open design decision, not taken
unilaterally here.

## Addendum 5 — type quiet-down + Daily Brief never apologizes

Yuqi: "too many mediums and too-large fonts; unimportant text lighter/smaller;
don't use too many text styles per page" + "is the Daily Brief the best you
can do?"

**Token verdict**: the scale itself is fine (caption 11 / xs 12 / sm 13 /
base 14 / lg 16 / xl 18 / 2xl 28 — primitives.css); the problem was usage.
Page rule now: **medium+ weight is reserved for anchors (titles, client
names), semantic chips (status, HIGH IMPACT), and interactive affordances
(links, buttons, selector chips). Passive meta is regular weight.**

Demoted to regular: alert-card "N clients", conf %, source link, absolute
date under DUE, the Pay-late chip, the AI focus sentence + firm concentration
line (the 18px title carries the card). Alert jurisdiction chip semibold →
medium. Freshness chip (LIVE/FAILED/GENERATING/age) 12px → 11px caption.

**Daily Brief content hierarchy** (the "best you can do" answer): the card
never leads with an apology. Lead priority: AI focus sentence (or its
skeleton) → deterministic since-last-visit recap ("Since your last visit:
3 completed (2 filed · 1 paid) · 2 new alerts") → firm concentration line.
A failed AI brief is a caption-level FOOTNOTE ("AI brief unavailable — it
will retry automatically"); the freshness chip beside the title already
carries the status. YesterdayLine gained a `lead` form (14px primary with
intro) vs its secondary form (13px secondary under an AI sentence).

## Addendum 6 — line-height pass (titles keep, bodies tighten)

Yuqi: two-line text blocks read rigid — body line-height was riding the 1.5
"document default". Rule: titles keep their leading (alert title 1.3, section
titles leading-tight); BODY/description text tightens to leading-snug (1.375)
— alert verbatim body, Daily Brief sentence/recap/footnote/empty lines. The
Priorities table's stacked cells (client name + verb, countdown + date) get
leading-tight so a 2-line stack reads as one unit, not two spaced rows.

## Addendum 7 — line-height tightening promoted to the TOKEN layer (universal)

Yuqi: "这是universal application." Root cause found: `xs/sm/base/lg/xl` had
NO paired `--text-*--line-height` tokens, so every un-leaded use inherited
preflight's `html { line-height: 1.5 }` — the source of the loose feel on
every surface. Fixed in tokens/primitives.css with paired line-heights at
snug ratios:

  xs 12/16 · sm 13/18 · description 13/18 · base 14/19 · md 14/19 ·
  lg 16/22 · xl 18/24 · 2xl 28/32

Explicit `leading-*` at call sites still wins (verified: section titles keep
their leading-tight 22.5px; the /today component-level snug/tight passes from
Addendum 6 remain as explicit equivalents). Visually verified on /today,
/deadlines (densest table + banner), /clients (StatBand + registry table) —
all intact, uniformly tighter.
