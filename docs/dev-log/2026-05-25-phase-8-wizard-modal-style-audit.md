# 2026-05-25 — Phase 8: wizard modal style audit (Yuqi Wizard #37)

## Why

Yuqi flagged "wizard should match other modals". The wizard renders
its own `WizardShell` (a `<div>` inside a Radix Dialog with
`bg-transparent p-0 border-0` overrides) instead of using
`<DialogContent>` directly, which has produced subtle visual drift
between the wizard and every other `<Dialog>` callsite.

Audited all `<DialogContent>` callsites for side-by-side comparison
with `WizardShell`'s `WizardFrame`.

## Callsites compared

| Callsite                 | DialogContent classes                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Dialog primitive default | `rounded-lg`, `border-components-panel-border`, `bg-components-panel-bg`, `p-6`, `shadow-overlay`, `gap-5` |
| CreateObligationDialog   | `w-[36rem] max-w-[calc(100vw-2rem)]` (uses primitive defaults)                                             |
| CreateClientDialog       | `w-160 max-w-[calc(100vw-2rem)]` (uses primitive defaults)                                                 |
| PulseReasonDialog        | `sm:max-w-[440px]` (uses primitive defaults)                                                               |
| **WizardShell (BEFORE)** | `rounded-xl`, `border-divider-regular`, `bg-components-panel-bg`, `p-3`, `shadow-overlay`, `gap-0`         |
| **WizardShell (AFTER)**  | `rounded-lg`, `border-components-panel-border`, `bg-components-panel-bg`, `p-3`, `shadow-overlay`, `gap-0` |

## What converged

1. **Border radius**: `rounded-xl` (12px) → `rounded-lg` (8px). The
   wizard now matches every other Dialog corner.
2. **Border token**: `border-divider-regular` →
   `border-components-panel-border`. Same family of dividers, but
   the panel-border token is the one that the Dialog primitive
   inherits — using it directly keeps the wizard in sync with any
   future theme change to overlay surfaces.

## What stayed divergent (intentional)

1. **Padding**: `p-3` outer vs Dialog's `p-6`. The wizard owns its
   own header (with Esc hint), stepper, body, and footer — each
   region needs its own padding boundary. A flat `p-6` would
   conflict with the per-region paddings the wizard already
   carries (header `h-10 px-4`, body `px-6`, footer `h-12 px-4`).
2. **Gap**: `gap-0` vs Dialog's `gap-5`. Same reason — the wizard
   uses borders (header bottom, footer top) to separate sections,
   not a flex gap.
3. **Transparent Dialog wrapper**: `bg-transparent border-0
shadow-none` on the outer `DialogContent`, because the
   `WizardFrame` div is the visible surface. This is a Radix
   layout hack that lets the wizard own its full chrome without
   double-stacking borders / shadows from the primitive.

These divergences are **structural** (multi-step workspace vs
single-form modal), not stylistic. Documenting them inline so
future audits don't try to flatten the wizard onto plain
`<DialogContent>` and break the stepper/footer layout.

## What's the same now

- Border radius (`rounded-lg`)
- Border token (`border-components-panel-border`)
- Background token (`bg-components-panel-bg`)
- Shadow token (`shadow-overlay`)
- Text token (`text-text-primary`)

A CPA opening a wizard right after closing a CreateObligationDialog
will read the two surfaces as the same family — same corner shape,
same border weight, same drop shadow. The wizard just happens to
be wider (960px) and taller (multi-step), and has its own header
chrome.

## Verification

- `pnpm exec tsc --noEmit` clean
- `vp lint apps/app/src/features/migration/WizardShell.tsx` 0/0

## Closes Yuqi review items

- Wizard: **#37** (modal style consistency with other modals)

Combined with prior commits the review is at **66 / 89**.
