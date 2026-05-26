# Obligation panel CSS slide-in on /clients/[id]

**Date:** 2026-05-26
**Branch:** `design/clients-detail-panel-css-slide-in`
**Scope:** Bring back the slide-in animation on the obligation panel
in `ClientDetailWorkspace` (`/clients/[id]`).

## Background

Earlier in this session we tried `AnimatePresence + motion.div` with
`animate={{ width: 600 }}` on the right-rail obligation panel. The
animation got stuck at intermediate widths (~234px, then ~308px) under
React 19's concurrent renders inside the new flex-row + items-stretch
layout — the entry-animation never reliably reached the 600px target.
We rolled back to a plain conditional `<aside xl:w-[600px]>` that
snap-mounts but doesn't animate. The Stripe-level critique
(`docs/Design/stripe-level-critique-2026-05-26.md`) flagged the missing
slide-in.

## Fix

`apps/app/src/features/clients/ClientFactsWorkspace.tsx` —
`ClientDetailWorkspace`, obligation-panel `<aside>`:

- Drop the conditional render gate at xl+. The aside is now ALWAYS
  mounted at xl+ so the width transition has a stable element to
  animate.
- Add `transition-[width,margin-right] duration-300
  ease-[cubic-bezier(0.32,0.72,0,1)]` so width changes animate
  natively. CSS sidesteps React 19's reconciliation entirely — the
  browser owns the tween, the framework can't stall it.
- Closed state: `xl:w-0 xl:-mr-6`. The negative right margin cancels
  the parent's `xl:gap-6`, so there's no phantom 24px void to the
  right of the left column while the panel is closed.
- Open state: `xl:w-[600px] xl:mr-0`. Width and margin animate to
  their open values together; the gap re-appears between the left
  column and the panel.
- Below xl: parent is `flex-col` so a width transition isn't the
  right shape (it's the cross axis there). Kept the conditional
  full-width block (`activeObligationId ? 'flex w-full' : 'hidden'`)
  with no animation — matches the prior behavior at narrower
  viewports.
- `<ObligationPanelDispatcher>` only renders when `activeObligationId`
  is truthy. On close it snap-unmounts; the empty aside then shrinks
  600 → 0 over 300ms with `overflow-hidden` clipping any residue.
  This is the same trade-off as a Sheet primitive's exit animation
  without exit content — adequate for now.
- Added `data-open` attribute on the aside for future styling /
  testing hooks.

## What this does NOT include

- **Inner content fade on row-switch.** The motion-library version
  faded the inner panel content when `activeObligationId` switched
  to a different obligation id. That's deferred for now — would need
  a keyframe (touching `globals.css` / `preset.css`, which the spec
  explicitly forbade) or a different mechanism (e.g., keyed inner
  div with `motion-safe:animate-in motion-safe:fade-in`). Tracked as
  a follow-up if the snap-swap on row switch reads jarring in
  practice.
- **Exit slide.** Same trade-off as above — the panel content
  unmounts immediately on close, only the empty container shrinks.
  Fine because `overflow-hidden` clips during the shrink.

## Verification

- `pnpm exec vp check --fix apps/app/src/features/clients/ClientFactsWorkspace.tsx`
  passed with zero errors and zero new warnings.
- Manual browser verification skipped (no dev server running in this
  worktree).
