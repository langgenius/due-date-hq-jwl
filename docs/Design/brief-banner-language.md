# Brief banner — one editorial language across surfaces

**Date:** 2026-06-11 (Yuqi: "cross reference to Deadlines page's brief — same
style, same visual language. Elevate both.")

Two surfaces open with a short editorial read of where the work stands:

| Surface      | Component                                                           |
| ------------ | ------------------------------------------------------------------- |
| `/deadlines` | "Deadlines at a glance" narrative banner — `routes/obligations.tsx` |
| `/today`     | `DailyBriefCard` — `features/dashboard/daily-brief-card.tsx`        |

They previously spoke different dialects: the deadlines banner was a calm
neutral editorial block, while the Daily Brief was an accent-washed card with a
mono `YESTERDAY`/`TODAY` label grid and no real headline. They now share one
spec.

## The spec

Anatomy, top to bottom (single `flex-col gap-1.5` stack):

1. **Eyebrow** — `size-1.5` accent dot (`bg-state-accent-active-alt`) +
   tracked-caps label, `text-caption font-medium tracking-eyebrow
text-text-tertiary uppercase`. The deadlines banner puts the date here
   ("THU JUN 11"); the Daily Brief puts its name + freshness chip
   ("DAILY BRIEF · FRESH").
2. **Headline** — the one editorial sentence, `text-lg leading-6 font-semibold
text-text-primary max-w-[64ch]`. Deadlines: the narrative ("6 overdue —
   clear the urgent set to pull the week back on track."). Daily Brief: the AI
   focus sentence (or the deterministic firm-concentration line / quiet
   pending-failed note).
3. **Metric line(s)** — `text-sm text-text-secondary`, segments separated by
   `·`, counts `tabular-nums`. Deadlines: "28 active filings · across 10
   entities · penalty exposure". Daily Brief: today's workload counts, then the
   "since last visit" recap line.

Chrome: `rounded-xl px-5 py-4 pr-9`, with a ghost `icon-xs` ✕ absolute at
`top-2.5 right-2.5` when dismissible. Surface differs BY PURPOSE (revised
2026-06-11, Yuqi):

- `/deadlines` at-a-glance: `border border-divider-subtle bg-background-subtle`
  — a calm neutral read of the queue it sits above.
- `/today` Daily Brief: **`bg-state-accent-hover` tint, no border** — the
  page's ONE chromatic surface, marking the AI digest apart from the neutral
  monitor (Alerts) and work (Priorities) sections. The tint alone defines the
  edge; chromatic accent lives in the container, never the text.

Anatomy divergence (same revision): the Daily Brief opens with a **proper
title** ("Daily Brief", Register-A section-title voice — see
`section-header-style.md`) + the freshness chip, and its focus sentence reads
as content (`text-base font-medium`) under that title. The /deadlines banner
stays title-less — its `text-lg` narrative sentence IS the anchor, with the
date eyebrow above. No tracked-caps eyebrow or dot on the Daily Brief.

## The tab pattern — collapse, never dismiss (2026-06-12, supersedes the quiet-line)

Yuqi feedback #4: "what if the user closes it but wants to reopen it? can it
be something like a 'tab' on the page you can click to open?" The Daily Brief
now has TWO states in the same page slot:

- **Expanded** — the accent band (spec above). The top-right ✕ **collapses**
  (aria-label "Collapse brief"); nothing ever deletes the brief.
- **Collapsed** — a small tab chip: `h-7 rounded-lg bg-state-accent-hover
  text-xs font-medium text-text-accent` (same tint family as the band it
  expands into), anatomy = freshness dot (green fresh / amber stale / red
  failed / spinner pending) + "Daily Brief" + chevron-down. Click expands.

State is persisted in localStorage (`ddhq:dashboard:brief-collapsed`,
JSON `{key, collapsed}`) **keyed to the brief's generation stamp** — a fresh
day's brief auto-expands on its own; the user's collapse only pins THIS
edition. (The old `brief-dismissed` remove-forever key is retired.)

**The morning-paper personality** (2026-06-12, Yuqi: "be more playful and
fun with this Daily brief idea") — the metaphor is a folded paper on the
doorstep, played entirely through glyph motion (never surfaces/shadows):

- `NewspaperIcon` masthead glyph leads the tab; on hover it tilts −6°
  ("picking the paper up"), the chevron dips 2px ("pull to unfold").
- **Above-the-fold teaser:** when the brief has a real AI headline and is
  collapsed, the headline rides beside the tab as one truncated muted line
  (citation `[n]` markers stripped) — itself a click target that opens the
  edition. Real content only; the all-quiet line takes the slot when there
  is nothing to say.
- **The unfold:** expanding plays the house `animate-in fade-in
  slide-in-from-top-1 duration-200`; the collapsed tab fades in at 150ms.
  All motion `motion-reduce`-guarded.

**Failure rule:** when the AI sentence failed AND the recap is all-quiet AND
no catch-up rows exist, the card defaults COLLAPSED, with the deterministic
all-quiet line riding inline beside the tab ("All quiet — no deadline
changes, new alerts, or reminders since your last visit." — no failure
apology; the recap is deterministic truth and the brief self-heals
server-side). The accent band must always be carried by real content.

**Why a page tab and not a right insight panel:** the brief is 1–3 lines of
editorial; a persistent right panel is layout machinery it hasn't earned,
competes with the obligation/alert drawer pattern, and dies at <xl widths.
The tab keeps the page's Monitor → Work structure with the brief one click
away. If the brief grows real content (citation stacks, activity stream),
revisit the panel then.

## Why not a shared component (yet)

The two banners' middles differ structurally — the Daily Brief's headline slot
is a stateful component (AI pending skeleton / failed note / citation chips),
not a string. Forcing both through one `<BriefBanner>` shell today would buy
~10 lines of chrome and cost an awkward render-prop API. The contract is this
doc; if a third banner appears, extract the shell then.

## Keep-in-sync checklist

When either banner's chrome changes, mirror: surface bg/border, padding
(`px-5 py-4 pr-9`), stack gap (`gap-1.5`), eyebrow recipe, headline type
(`text-lg leading-6 font-semibold`), metric-line type (`text-sm` + `·` +
`tabular-nums`), dismiss affordance (ghost `icon-xs`, `top-2.5 right-2.5`).
