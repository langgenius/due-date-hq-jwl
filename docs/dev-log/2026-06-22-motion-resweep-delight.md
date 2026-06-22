# Motion re-sweep + delight pass

_2026-06-22_

A second full-app motion pass after the [2026-06-20 catalog](../Design/motion-microinteraction-catalog-2026-06-20.md)
and its [deferred tail](_motion-deferred-tail-2026-06-22.md) drained the original
survey. Two goals at once (Yuqi): a **fresh re-sweep** (gaps the first survey
missed + components added *after* it) and a **delight/personality** layer on the
sanctioned surfaces. Method: 4 read-only survey agents (one per cluster) → dedupe
against everything already shipped → 4 worktree build agents. **28 items shipped,
1 skipped, 4 pre-dropped as gild/risk.** All honor `@/lib/motion` (`EASE_APPLE`,
`MOTION_DURATION`, `contentEnterMotion`, `fadeMotion`), global `<MotionConfig>`
reduced-motion, and the calm-on-dense canon.

## Dashboard cluster (7)
- **Spinner a11y guard** — the collapsed brief-tab `RotateCwIcon` was the third
  unguarded `animate-spin`; now `motion-reduce:animate-none`.
- **Setup step-completion pop** — the setup cards snap-cut the exact moment they
  exist to show (a step flipping to ✓). Extracted a shared `SetupStepIcon`
  (SetupProgressCard + sidebar-setup-card, the only two callers); the incoming
  check pops `scale 0.6→1` via `AnimatePresence mode="wait"`.
- **create-choice-cards stagger** + **CTA arrow nudge** — the 3 first-run cards
  cascade in (`staggerChildren 0.05`) instead of one block; each card's CTA arrow
  nudges on hover.
- **PinnedSection fade** + **needs-attention stagger** — section/card arrivals
  match the page's other fade-ins (rows stay calm).
- **TickProgress climb** — filled ticks ramp opacity L→R on mount so the bar
  appears to fill.

## Deadlines + alerts cluster (7)
- **Deadlines bulk-bar exit** — slides out on deselect (verbatim copy of the
  shipped alerts bulk-bar pattern; deadlines/alerts parity).
- **PulseAlertRow** — `transition-[color,box-shadow]` so the inset accent bar eases
  with the bg. (Agent caught the cn()/tailwind-merge footgun: `transition-colors`
  + `transition-shadow` collide in one merge group and would drop the color ease —
  used the multi-property form instead.)
- **Workflow stepper connector** — `transition-colors` so the accent fills in sync
  with the already-animated node circles.
- **Alerts header count bump** + **deadlines zero-results fade** + **AffectedClients
  group chevron rotate** + **crumb-bar title reveal** (with the alert top-bar
  getting the same reveal for parity).

## Clients + rules + audit cluster (7, +1 skipped)
- **Spinner a11y sweep** — 7 `Loader2Icon` sites across audit/rules/dialogs guarded
  with `motion-reduce:animate-none` (grammar-compliance gap).
- **Audit pagination + empty crossfade** — one `AnimatePresence mode="wait"` over
  the table↔empty branches; table keyed on page index.
- **Audit diff-row stagger**, **rule impact-line fade**, **new-note enter**,
  **ClientSummaryStrip KPI cross-fade**, **client health-badge state fade** — all
  counts stay inside `<Plural>` (no digit-rolling).
- _Skipped_: ClientFactsWorkspace skeleton→table crossfade — a `motion.div` wrapper
  breaks the `flex min-h-0` height chain + the sticky-thead positioning context;
  not worth a scroll regression for a load-time fade.

## Onboarding + shell + primitives cluster (7)
- **Wizard step-panel transition** — the 4 import steps slide directionally
  (forward/back) via `AnimatePresence mode="wait"` instead of hard-cutting.
- **Stepper connector fill** — the rail segment grows `scaleY 0→1` in success color
  as each step completes (pairs with the shipped check-pop).
- **Brand-mark entrance** (splash + login), **CommandPalette empty-state fade**,
  **onboarding form-field stagger**.
- **Sidebar collapse chevron** — one rotating `ChevronRightIcon` (360ms, in lockstep
  with the rail slide) instead of an instant glyph swap.
- **DropdownMenu / Select indicator zoom** — the selected check/radio glyph uses
  checkbox.tsx's exact `zoom-in-75` recipe; fires once per click, so dense menus are
  unaffected.

## Pre-dropped (gild / risk — recorded, not built)
Segmented count-bump (risk-med shared primitive, low value); system-status dot
pulse (Yuqi removed ping halos before); DuotoneIcon entrance (the cards already
slide in — would double-animate).

## Verification
`tsgo` app + ui 0 · `i18n extract` 0 (no new strings — motion is structural,
zh-CN Missing 0) · production build green · **app tests 550 passed / 2 skipped**
(baseline). Live: `/today`, `/alerts`, `/audit`, `/clients` render with a clean
console (the "Could not Fast Refresh" lines are benign HMR full-reload fallbacks);
the restructured sidebar collapse toggle exercises without error. The motion beats
themselves are build/test/pattern-verified rather than filmed — the preview harness
remains flaky at synthetically opening drawers/triggering gated states, the same
honest limitation noted across prior batches; every change reuses an
already-shipped pattern and degrades to "appears without animating" if anything
mismatches.
