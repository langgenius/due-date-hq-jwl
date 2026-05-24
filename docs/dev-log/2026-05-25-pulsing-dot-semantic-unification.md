# 2026-05-25 — PulsingDot semantic unification (Phase 1 of 89-item review)

## Why

Yuqi's 2026-05-25 review surfaced **5 separate "what does the
coloured dot mean?" complaints**, one of them a real bug: the FL
DOR alert showed a green dot on the dashboard's NeedsAttentionCard
but a red dot inside the PulseDetailDrawer **for the same alert**.

Root cause: each render site computed its own tone using slightly
different signals. NeedsAttentionCard used `impacted === 0 ?
success : warning`. PulseAlertCard used `veryLowConfidence ? error
: impacted === 0 ? success : warning`. PulseDetailDrawer used
`drawerTone(status, confidence)` — and prioritised differently
again. Three formulas, one alert, three different colours.

Beyond the bug: most dots had **no `aria-label`** so even when the
colours were correct the user had to guess the semantic.

## What changed

### New `apps/app/src/features/pulse/pulse-alert-tone.ts`

Single source of truth for "what tone is this Pulse alert?":

```
function pulseAlertTone(alert) {
  if (isVeryLowPulseConfidence(alert.confidence)) return 'error'
  if (status === 'applied' || status === 'partially_applied') return 'success'
  const impacted = matchedCount + needsReviewCount
  if (impacted === 0) return 'success'
  return 'warning'
}
```

Plus `pulseAlertToneLabel(tone)` — one-line human explanation
("Low AI confidence — needs human review before action") used by
both `title` (hover tooltip) and `aria-label` (screen reader).

### `PulsingDot` now accepts a `label` prop

Renders as `title` + `aria-label` so users hovering get one
sentence explaining what the dot signals. JSDoc on the component
documents the canonical tone ladder:

- **error** (red) — needs immediate attention
- **warning** (amber) — needs attention soon
- **success** (green) — healthy / no action
- **normal** (blue) — informational
- **disabled** (gray) — paused / closed

### All three Pulse alert render sites use the shared helper

- `apps/app/src/features/dashboard/needs-attention-card.tsx`
- `apps/app/src/features/pulse/components/PulseAlertCard.tsx`
- `apps/app/src/features/pulse/PulseDetailDrawer.tsx`

The `drawerTone()` private function in `PulseDetailDrawer.tsx` was
removed. AlertsListPage's hero dot (aggregate) gained a
contextual label too.

### Duplicate-dot fix — `PulseStatusBadge` (Yuqi #18)

The badge always sits next to a `<PulsingDot>` in the alert header,
so the leading `<BadgeStatusDot>` inside the badge was duplicating
the same signal. Dropped the inner dot. `"New"` status now renders
as a soft `warning`-fill badge instead of a neutral outline so it
stands out from the row of outline chips (#17). Other statuses
stay as quiet outline chips.

### Wizard stepper bullets (Yuqi #32, #39)

Stepper markers in `WizardShell.tsx` were bare coloured dots with
no `aria-label`. Now each marker has `role="img"` +
`aria-label="Completed"` / `"In progress"` / `"Pending"` so the
hover tooltip and screen reader explain the colour.

## Verification

- `pnpm exec tsc --noEmit` clean
- `vp lint` 0/0 (665 files)
- 23/23 runnable client+pulse tests pass (4 test files fail to
  load with pre-existing config errors — `babel-plugin-macros` /
  `@/i18n/bootstrap` — unrelated)

## Files touched

- new: `apps/app/src/features/pulse/pulse-alert-tone.ts`
- mod: `apps/app/src/features/pulse/components/PulsingDot.tsx`
- mod: `apps/app/src/features/pulse/components/PulseAlertCard.tsx`
- mod: `apps/app/src/features/pulse/components/PulseStatusBadge.tsx`
- mod: `apps/app/src/features/pulse/PulseDetailDrawer.tsx`
- mod: `apps/app/src/features/pulse/AlertsListPage.tsx`
- mod: `apps/app/src/features/dashboard/needs-attention-card.tsx`
- mod: `apps/app/src/features/migration/WizardShell.tsx`

## Reviewer addresses these Yuqi review items

- **Today**: #1, #16, #17, #18, #32, #39
- **Alerts**: #4

7 of 89 items closed. Next phase: D. PulseDetailDrawer redesign
(17 items).
