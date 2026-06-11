# Brief banner — one editorial language across surfaces

**Date:** 2026-06-11 (Yuqi: "cross reference to Deadlines page's brief — same
style, same visual language. Elevate both.")

Two surfaces open with a short editorial read of where the work stands:

| Surface | Component |
| --- | --- |
| `/deadlines` | "Deadlines at a glance" narrative banner — `routes/obligations.tsx` |
| `/today` | `DailyBriefCard` — `features/dashboard/daily-brief-card.tsx` |

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

Chrome: `rounded-xl border border-divider-subtle bg-background-subtle px-5
py-4 pr-9`, with a ghost `icon-xs` ✕ absolute at `top-2.5 right-2.5` when
dismissible. **No accent wash** — the banner is a calm document, urgency lives
in the words and the destructive count tints, not in a coloured surface
(consistent with the no-coloured-text-on-dark / accent-in-containers rules and
the detail-pane calm-document surface model).

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
