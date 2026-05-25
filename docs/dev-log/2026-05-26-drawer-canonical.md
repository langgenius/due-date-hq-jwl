# Drawer canonical — cross-drawer chrome unification

**Date:** 2026-05-26
**Branch:** `design/inset-surface-system`
**Scope:** PulseDetailDrawer (/rules/pulse panel) + ObligationDrawer (/deadlines drawer) + PulseStructuredFields nested cards

## What changed

The inset-surface design doc gained a new "Drawer canonical" section that defines the chrome both drawers share. Both drawers are now aligned to it:

### Drawer canonical (added to docs/Design/inset-surface-design-system.md)

- **Padding**: header `px-12 py-10`, body `px-12 py-10`, sticky footer `px-12 py-4`
- **Body structure**: scrolling container with `flex-col gap-4`; each section uses `flex-col gap-3` internally; section headings inside body use `text-sm font-semibold` (quieter than the drawer's own `text-2xl` h1)
- **Header structure**: kicker → h1 → optional description → chip row
- **Footer two-cluster**: LEFT = reversal/secondary, RIGHT = forward/primary, `justify-between` separates
- **Sticky inner heading bleed**: `-mx-12 px-12 py-3` for full-width subtle-bg strips inside the body

### ObligationDrawer — applied canonical

`apps/app/src/routes/obligations.tsx`:

- Header `px-5 py-3` → `px-12 py-10`
- Body `px-5 pb-5` → `px-12 py-10`
- Sticky inner heading `-mx-5 px-5 py-3` → `-mx-12 px-12 py-3`
- Materials selection bar `px-5 py-2.5` → `px-12 py-4`
- Sticky action footer `px-5 py-3` → `px-12 py-4`, plus border bumped to `border-t-2 border-divider-regular` and `min-h-16` for the canonical heavier footer chrome

### PulseDetailDrawer — interior sweep

`apps/app/src/features/pulse/PulseDetailDrawer.tsx`:

- "Affected clients" section heading `text-base font-semibold` → `text-sm font-semibold`. Body-internal headings should sit quieter than the drawer's h1 per canonical.

`apps/app/src/features/pulse/components/PulseStructuredFields.tsx`:

- FactCard chrome aligned to "nested card" pattern. Previous `px-6 py-5` body matched the OLD drawer-body padding (px-6 py-5) — now superseded by canonical drawer body `px-12 py-10`, so nested cards drop to `p-4` (canonical standard card).
- FactCard header: `min-h-11 px-6 py-2` → `min-h-10 px-4 py-2`. Title size `text-base` → `text-sm` (matches body-section canonical).

## Why

Two reasons:

1. **Consistency:** PulseDetailDrawer just got `px-12 py-10` per Yuqi's spec. ObligationDrawer was still using `px-5 py-3`. Different drawers ≠ different rhythms — they should feel like the same surface treatment.
2. **Documentation:** the canonical is now in the design doc, so the next drawer-touching change has a reference, not just precedent.

## Risk

ObligationDrawer is the bigger change here — its body is now ~40% wider in padding (px-5 → px-12). The drawer width is 720-920px depending on viewport, so 96px total horizontal padding (px-12 × 2) leaves 624-824px of content. Internal tables / cards should still fit, but if anything breaks visually it'll show up in:

- The internal tab content (tables inside the drawer body)
- The PrimaryDeadlineStrip three-column layout
- The sticky inner heading bg-strip

Worth a smoke test before this hits anything shared.

## Pending

- Visual smoke test of /deadlines drawer + /rules/pulse panel
- ObligationDrawer body internal sections may have their own padding worth aligning (drawer-internal section frames, collapsibles, etc.) — left as a follow-up since they were on-canonical-enough.
- The drawer body in ObligationDrawer is currently not wrapped in `flex-col gap-4`; children use their own `mb-*` margins. Could be normalized to canonical `gap-4` later if drift becomes visible.
