# Alert apply-gate diagnostic — one-line "why can't I apply yet"

**Date:** 2026-06-21
**Surface:** `apps/app/src/features/alerts/AlertDetailDrawer.tsx` (img-067)

The alert detail panel had two unequal answers to "why can't I apply yet":

- A **verbose low-confidence Alert** at the top of the body — a warning-tone
  card with a title (`Low AI confidence (NN%) — verify before you act`) plus a
  two-bullet verify checklist. It sat far from the Apply button the CPA was
  actually reaching for, and the CPA scrolled past it.
- A **silent not-ready gate** — when `applyReadiness.status !== 'ready'`,
  `DecisionBanners` rendered `null` and the Apply button simply sat disabled,
  with the reason only surfaced (truncated) in a `title=` tooltip on hover.

Both are replaced by a single-line **`ApplyGateDiagnostic`** bar docked directly
above the decision button in the footer.

## What it is

- `bg-background-subtle`, `rounded-lg`, one row: a `TriangleAlertIcon` +
  one-line reason on the left (`text-sm text-text-secondary`, truncates), and a
  `Review source` `<TextLink variant="accent">` on the right that smooth-scrolls
  to the `#alert-section-source` section.
- The footer container flipped from `flex-row` to `flex-col gap-3` so the bar
  stacks above the existing shield-line + `DrawerActions` row. The Apply button
  and all its states (disabled gating, count label, mark-reviewed, applying
  pill) are untouched — the bar only **explains** the gate, it doesn't act.

## Reason derivation (no fiction)

Derived entirely from real backend fields:

- `applyReadiness.status === 'needs_details'` → names the first item in
  `applyReadiness.missing[]` (the `PulseApplyReadinessMissing` enum:
  `affected_clients` / `original_due_date` / `new_due_date` / `forms` /
  `entity_types`), with a generic honest fallback.
- otherwise `isLowAiConfidence(alert.confidence)` → a quiet verify-first nudge,
  worded for the action that follows (apply vs. mark-reviewed for
  `no_current_match`).
- Only renders while `alert.status === 'matched'` (still awaiting a decision).

## Canon

- Demote-don't-delete: the decision info (what's missing / what to verify) is
  preserved, just compressed to one line where the act happens.
- One purpose per panel: diagnosis only; the button owns the action.
- i18n footgun avoided: the reason strings use the macro-bound `t` **inside**
  the component body (a `t` passed as a function parameter is invisible to the
  lingui extractor). The removed banner's `ConceptLabel` import was dropped.

tsgo clean; `i18n:extract` + zh-CN + `i18n:compile --strict` clean (8 new
strings).
