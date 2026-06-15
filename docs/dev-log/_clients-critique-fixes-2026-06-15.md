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

## Follow-up: DeadlineRow side-stripe removed (cross-surface)
Yuqi: yes, take the `DeadlineRow` overdue stripe on.

Removed `overdue && border-l-[3px] border-l-state-destructive-solid pl-[17px]`
from the shared filing-row primitive (BAN 1 — a >1px colored side-stripe
accent). Overdue stays signaled by the leading `AlertTriangleIcon` + the red
countdown pill, which is BAN 1's sanctioned replacement and already present.

Investigation correction: the stripe lived in the **standard `<article>`
variant** (modes `navigate`/`drawer`/`navigate-to-audit`). `DeadlineRow`'s
only current consumer is the client-detail filing table on the
**`inline-expand`** variant, which never had the stripe. So no surface
currently mounted the stripe — this is a *preventive* removal from the
primitive's API (it can't render the banned pattern if those modes are used
later), not a fix of a visible bug. tsgo clean; client-detail rows verified
unchanged.

Still-open BAN-1 instance (NOT touched — needs its own call): the `Card`
primitive's `data-[emphasis=unread]:border-l-[3px] border-l-accent-default`
unread stripe in `packages/ui`. Left-border-as-unread is a more established
convention (mail clients), and it's a base primitive touching alert cards
etc. — flag for a deliberate decision rather than a drive-by change.

## Follow-up: Card unread-stripe removed (the other open BAN-1)
Yuqi: take on the card unread-stripe.

The `Card` primitive's `emphasis="unread"` rendered
`border-l-[3px] border-l-accent-default` — the second banned side-stripe.
Its only consumer was the notifications inbox.

- **Removed the `emphasis` prop entirely** from the Card primitive
  (param, type, `data-emphasis`, the stripe class) — no dead no-op prop
  left behind.
- **Notifications inbox** now signals unread with a **leading accent dot**
  before the title (the canonical, accent-rarity-respecting marker), in a
  reserved column so read + unread titles stay aligned. Unread is further
  carried by the "Mark read" affordance already present.
- First tried a primitive-level accent background wash
  (`bg-state-accent-hover-alt`) but it made every unread row look
  *selected* — too heavy, fought the restraint rule. Dropped it; the dot
  alone is cleaner.

tsgo clean for these files (the lone error is the parallel session's WIP
`AlertDetailDrawer.tsx`, untouched by me). Verified live on /notifications.

## Notes
- tsgo clean; console clean (the only errors are the parallel session's
  WIP `rule-detail-drawer.tsx`, unrelated).
- Catalogs: `i18n:extract` + `compile --strict` pass. The `.po`/`.ts`
  carry the parallel session's WIP, so per the parallel-session protocol
  this commit is **source `.tsx` only** — catalog commit deferred.
