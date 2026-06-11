# Motion grammar — Layer-3 call-site sweep, batch 1 (2026-06-11)

First batch of the call-site sweep that
`_motion-grammar-foundation-2026-06-11.md` queued as "its own pass":
hardcoded framer configs migrate to the `@/lib/motion` grammar
(`EASE_APPLE`, `MOTION_DURATION`, `contentEnterMotion`).

- `AlertsListPage.tsx` — detail-pane enter/exit fades onto
  `MOTION_DURATION.surface`/`.exit` + `EASE_APPLE`; the 0.64s paper-rise
  stays as a DELIBERATE off-scale outlier (celebratory arrival, matches
  `DETAIL_PANEL_INNER_RISE_ANIM`) and is now commented as such. Skeleton
  rows drop per-element `motion-reduce:animate-none` — the Layer-2 global
  reduced-motion kill switch in preset.css covers them.
- `obligations/queue/constants.ts` — `DETAIL_SWIFT_EASE` aliases
  `EASE_APPLE`; panel open/close/fade/content-swap durations move onto
  `MOTION_DURATION.surface`/`.exit` (content swap 0.12/0.08 → the grammar
  exit tempo). Paper-rise outlier kept + documented.
- `ObligationQueueDetailDrawer.tsx` — tab-content enters use the
  `contentEnterMotion` preset (3 sites); header/title collapse transitions
  move to `duration-300 ease-apple`. Also carries the page-mode spacing
  follow-ups from Yuqi's page feedback: tab strip drops the variant's
  horizontal inset (`px-0`) so the first tab aligns to the document
  measure, gets a `pt-3` band gap below the key dates (reverses the
  earlier flush `-mt-1.5`), and the page-mode body's `pt-6` is restored so
  the first card doesn't stick to the tab seam.
- `migration/Step3Normalize.tsx` — both collapse/expand height animations
  onto `MOTION_DURATION.enter`/`.exit` + `EASE_APPLE`.

Dev-log markdown normalization (`*…*` → `_…_`, list spacing) in two older
entries rode along from the formatter.

Remaining Layer-3 surfaces (hover transitions, row pressed states, other
routes) still to sweep in later batches.
