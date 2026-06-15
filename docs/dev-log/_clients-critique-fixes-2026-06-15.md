# Clients flow — /critique + /design-critique pass (2026-06-15)

Yuqi: run `/design-critique` and `/critique` on the full clients UX flow
(list, detail, interactions, UI, end-to-end), then fix.

## Method
Two independent assessments per the /critique framework:
- **Automated detector** (`npx impeccable --json` over `features/clients` +
  `routes/clients.tsx`): **0 of 25 patterns** — no side-stripe borders, no
  gradient text, no glassmorphism, no hero-metric grid, no nested cards.
- **Delegated LLM design review** (read every clients source file): verdict
  "not AI-slop — senior, opinionated human work." Nielsen **34/40**
  ("Good, approaching Excellent"); heuristic #4 (consistency) the anchor.

User chose: fix all four clusters, **enforce** the type-weight rule on the
countdown, scope = everything actionable.

## Shipped (verified live on Meridian Multistate + the list)
1. **Spacing normalized off the freelance scale.** The rail's arbitrary
   bracket values → 4pt tokens: `gap-[18px]`→`gap-5` (rail card gap 20),
   `gap-[14px]`→`gap-3.5`, `p-[18px]`→`p-5` (Contacts card 20), `gap-[3px]`
   →`gap-0.5` (contact name/role/email stack); `ClientNotesStrip`
   `px-[18px] py-3.5`→`p-5`. These existed nowhere else in the flow.
2. **Countdown de-double-highlighted (type-weight rule enforced).** The
   relative-due label (`DueLabel` in `ClientFactsWorkspace`) went
   `font-semibold`→`font-medium` across all four states (late/today/soon/
   future). Red+600 was the banned red+bold combo; color carries urgency,
   500 is the "key data" weight. Applies to every list row.
3. **One name for one surface.** The Filings tab → **"Filing plan"** —
   matching the section, the hotkey registry ("Filing plan tab"), and the
   code's own URL-intent comment (the "Filings" label was a lone
   Pencil-node override). The now-redundant "Filing plan" h2 inside the
   panel was dropped (the tab names it; each year card carries its year +
   open count) — only the quiet "Latest first" grouping caption survives.
   Removed the now-dead `TabSection` import from `ClientWorkPlanPanel`.
4. **Jurisdiction label demoted.** `ClientSummaryStrip` juris codes
   `text-base font-semibold` (16/600) → `text-sm font-medium` — 16px is the
   reserved urgency size; a neutral chip label shouldn't claim it.

## Verified-then-NOT-changed (critique findings that were false positives)
Closer inspection (not eyeballing) showed several "issues" were sound:
- **Radius "drift" (rounded-lg vs rounded-xl).** This is the *documented
  two-tier system*: `rounded-xl` (12) = standalone card (Card primitive
  default, rail cards); `rounded-lg` (8) = inset section frame (used by
  obligations/alerts/rules everywhere). Forcing one would fork every
  sibling page. Kept.
- **"Dead" filing-plan sort.** Headers render plain labels with **no sort
  carets** — no false affordance; the `field:null` state is documented
  fixed-order intent. Kept.
- **"Invisible" hotkeys.** Cycle arrows already show `(j)`/`(k)` in
  tooltips and all shortcuts register in the global `?` dialog; the list
  shows "? for shortcuts." Always-visible kbd chips would add noise. Kept.
- **"Redundant" row ⋯ menu.** Peek is a hidden ⌘-click gesture (no visible
  Eye icon); the menu's "Quick peek"/"Open detail" are the *discoverable*
  surface for otherwise-hidden gestures. Kept.
- **"Filed" vs "Filed YTD" label drift.** Deliberate + documented: list
  counts all-time terminal rows, detail counts YTD — different metrics. Kept.
- **StatBand skeleton `rounded-none`.** Matches the band's squared,
  hairline-bordered shape (it isn't a rounded card). Kept.

## Flagged for a separate (cross-surface) pass
- **`DeadlineRow` overdue `border-l-[3px]` accent stripe** (the shared
  filing-row primitive, also /deadlines + /today) is a banned side-stripe.
  Out of clients-flow scope and forking it would break cohesion — needs its
  own decision.
- **Empty-state marketing stats** ("4 min average import", "11 tools",
  "SOC 2 compliant") are business facts I can't verify — confirm
  substantiated or the "no fiction on canvas" rule applies unevenly.

## Notes
- tsgo clean; console clean (the only errors are the parallel session's
  WIP `rule-detail-drawer.tsx`, unrelated).
- Catalogs: `i18n:extract` + `compile --strict` pass. The `.po`/`.ts`
  carry the parallel session's WIP, so per the parallel-session protocol
  this commit is **source `.tsx` only** — catalog commit deferred.
