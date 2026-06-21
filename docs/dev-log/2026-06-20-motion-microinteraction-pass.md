# App-wide motion / micro-interaction pass — batch 1

_2026-06-20 · animation-principles + micro-interaction request across the full app_

Surveyed every surface (12 parallel agents) for on-grammar micro-interaction gaps,
grounded in the motion vocabulary (`lib/motion.ts`: EASE_APPLE, ENTER 180 / EXIT
120 / SURFACE 300; CSS 150ms default; global reduced-motion) and the calm-brand
rule ("coffee not confetti"). Catalog (all 85 findings + rationale):
[motion-microinteraction-catalog-2026-06-20](../Design/motion-microinteraction-catalog-2026-06-20.md).
The survey confirmed the app is already extensively animated — this batch fills the
highest-value gaps, not a blanket "animate everything."

## Shipped (10, verified)

- **Checkbox check-draw** (`ui/checkbox.tsx`) — the glyph zooms-in (75%→100%,
  150ms) instead of snapping; dropped the `transition-none` that blocked it.
  `motion-reduce:[&>svg]:animate-none`. App-wide micro-feedback.
- **SuccessModal** (`migration/SuccessModal.tsx`) — the hero check pops in (scale
  0.6→1, 180ms EASE_APPLE) and the four imported-count stats rise+fade 40ms apart
  after it. The import win finally has its celebratory beat (still calm).
- **Wizard Stepper** (`migration/Stepper.tsx`) — the completion check pops in.
- **Today all-clear** (`dashboard/merged-brief-card.tsx`) — the coffee disc gives a
  gentle zoom-in over the text fade.
- **Two missing reduced-motion guards** (`routes/dashboard.tsx`,
  `dashboard/daily-brief-card.tsx`) — the refresh + "Generating" `animate-spin`
  spinners now carry `motion-reduce:animate-none` (the raw-keyframe rule the grammar
  calls out). Correctness, not decoration.
- **Command palette** (`keyboard-shell/CommandPalette.tsx`) — the ↵ enter-hint fades
  in on row-select (`transition-opacity`) instead of snapping.
- **Rules** (`rules/matched-pulse-block.tsx`) — the "pending regulatory change"
  block enters with a fade + 1px top-slide to draw the eye to the urgency signal.
- **Audit log** (`audit/audit-log-table.tsx`) — clickable rows get
  `active:scale-[0.99]` press feedback (reduced-motion safe).

All reuse the existing grammar (no new easings/durations); reduced-motion is handled
globally for motion/react and via explicit `motion-reduce:*` on raw CSS keyframes.

## Rejected (documented in the catalog)

- `sheet.tsx` `data-starting-style:opacity-0` — the code comment shows it was
  removed deliberately (Base UI can leave it stuck → invisible drawer). Skipped.
- `sources-tab.tsx` hover-reveal the source link — it's a primary action; hiding it
  hurts discoverability. Left visible.

## Verification

tsgo 0; build green; no new i18n strings; checkbox check-draw confirmed live on
`/preview` (animate classes present, `transition-none` gone); console clean.

## Next

The catalog's backlog (entrance fades on conditional mounts, `layoutId` indicator
slides, more delight beats) is the next batch — isolated, on-grammar, left out only
to keep this batch verifiable.
