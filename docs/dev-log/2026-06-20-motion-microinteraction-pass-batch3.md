# App-wide motion / micro-interaction pass — batch 3

\_2026-06-20 · continuation of [batch 1](2026-06-20-motion-microinteraction-pass.md)

- [batch 2](2026-06-20-motion-microinteraction-pass-batch2.md)\_

The medium-risk remainder from the [catalog](../Design/motion-microinteraction-catalog-2026-06-20.md):
the `layoutId` active-indicator slides + one state-change polish.

## Shipped (3)

- **Alert-detail scroll-spy underline** (`AlertDetailDrawer.tsx`) — the Change /
  Source / Activity section indicator now **slides** between sections via a
  shared-layout `motion.span layoutId="alert-detail-section-underline"` instead of
  blinking. Added the `motion` import.
- **Deadline-detail section-nav underline** (`ObligationQueueDetailDrawer.tsx`) —
  same shared-layout slide (`layoutId="deadline-detail-section-underline"`).
- **Workflow stepper node** (`panels.tsx`) — added `transition-colors` so a stage
  node's ring-fill eases when the active stage advances (e.g. → Filed) instead of
  snapping.

Both underlines are **verbatim copies of the app's proven tab-underline pattern**
(`ClientDetailWorkspace` `client-detail-tab-underline` + the deadlines
`scope-tab-underline`): a single `motion.span` rendered inside the active item,
spring `stiffness 500 / damping 38`, unique `layoutId` per nav, reduced-motion
handled globally. Only the existing color/position classes were preserved.

## Verification

tsgo 0; build green; no new i18n strings. **Live-slide not watched:** the preview
harness wouldn't open the alert/deadline detail drawers via synthetic clicks this
session (it kept drifting off-route), so I couldn't film the slide. Confidence rests
on (a) build-green, (b) the code being an exact copy of the shipped, working
client-tab underline, and (c) low breakage risk — if framer-motion can't match the
`layoutId`, the indicator simply appears without sliding (no break). Worth a glance
next time a drawer is open.

## Catalog status

With batches 1-3, the high-value, low/medium-risk findings are shipped. What remains
in the catalog is genuinely optional (a shape-faithful sources skeleton, a couple of
debatable delight beats, the rejected items) — recorded, not pending.
