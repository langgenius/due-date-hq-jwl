# Priorities table harsh pass + morning-paper brief tab (2026-06-12, round 6)

Yuqi: "spend some time on the Priorities table — be professional and harsh"

- "be more playful and fun with this Daily brief idea."

## The harsh findings → fixes (merged-brief-card.tsx)

1. **The dead right half** (🔴): pack-left columns + trailing spacer left
   ~40% blank frame at 1512 — the DUE column (the page's reason to exist)
   hid mid-table and the hover Review CTA materialized in the void. Now:
   identity cluster left (FORM·CLIENT·STATUS), spacer, ownership cluster
   right (OWNER·DUE), with DUE right-aligned on the frame's right rail —
   red countdowns stack into one scan column at the edge the eye expects.
   Header, rows, and skeleton all mirror the order.
2. **Lede double-counted the chip**: "5 overdue, 5 awaiting source
   documents" 40px from "Overdue 5". When every overdue row shares the
   blocker, the lede now carries only the insight: "Every overdue deadline
   is waiting on source documents."
3. **"{n} more not shown" was information posing as an affordance**: folded
   into the footer link — "See all {activeTotal} deadlines →".
4. **Zero buckets invited dead-end clicks**: inactive chips with count 0
   dim to 60% (still clickable; the empty state names where work sits).
5. **Noted, not cut**: the row triple-encodes state (status pill + verb
   line + Docs n/m). Pill is canonical, readiness quantifies; the verb is
   the derivative layer and the first candidate if the row must lose
   weight later.

## The morning-paper tab (daily-brief-card.tsx)

Metaphor: a folded paper on the doorstep, played through glyph motion only:

- NewspaperIcon masthead; hover tilts it −6° ("pick the paper up"),
  chevron dips 2px ("pull to unfold").
- **Above-the-fold teaser**: collapsed + real AI headline → the headline
  rides beside the tab, one truncated muted line ([n] markers stripped),
  itself a click target. All-quiet line takes the slot when nothing to say.
- **The unfold**: expand plays `animate-in fade-in slide-in-from-top-1
duration-200`; the tab fades in at 150. All `motion-reduce`-guarded.

## Verification caveat

tsgo clean (one pre-existing error in the parallel session's in-flight
AlertDetailDrawer.tsx, not this change); strict i18n compile clean (5 zh-CN
filled, 3 of them the parallel session's). The demo dataset was mid-reseed
at verification time, so the POPULATED table layout is verified
structurally (6-column symmetry across header/rows/skeleton) but the
visual should be eyeballed when data returns — empty states verified live
(dimmed zero chips, megaphone empty state, no tab without a brief).
