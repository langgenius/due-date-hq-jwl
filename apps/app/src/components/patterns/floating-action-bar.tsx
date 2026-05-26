import type { ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `FloatingActionBar` — the canonical bottom-pinned action bar that
 * appears when ≥1 row is selected in a list/table surface.
 *
 * Single source of truth so the Obligations queue's bulk-actions bar
 * and the Rule library's bulk-review bar (and any future list with
 * batch actions) share the same shape, shadow, blur, and stacking
 * order. Before this primitive existed, the two bars had drifted
 * (different border-radius, different shadow recipe, different
 * z-index, one had a backdrop-blur and the other didn't).
 *
 * Visual recipe (matches the Obligations queue's earlier hand-tuned
 * version, which was the more refined of the two pre-merge):
 *
 *  - Centered via `fixed left-1/2 -translate-x-1/2` so the bar sits
 *    in the optical center regardless of parent container width.
 *  - 40px above the viewport bottom (`bottom-10`) — reads as a
 *    discrete floating control surface, not a sticky footer.
 *  - `rounded-xl` (12px) — softer than `rounded-full` so it can host
 *    multi-button clusters; tighter than `rounded-2xl` so single-line
 *    text still reads as a pill.
 *  - Ambient lifted shadow + 8px y-offset + backdrop blur — looks
 *    lifted from the page underneath without competing with toasts
 *    above it.
 *  - `z-40` — above table headers + sticky pagination footers, below
 *    toasts (z-50) and the Sheet/Dialog portal (z-50+).
 *
 * Z-index ladder this primitive sits in:
 *
 *  z-50+  Dialogs / Sheets / Toasts
 *  z-40   Floating action bar (this)
 *  z-30   Sticky table headers, sticky pagination footers
 *  z-20   Tooltip popovers / dropdowns scoped to a section
 *  z-0    Page content
 *
 * Accessibility note: the bar is an ARIA `region` with an accessible
 * label, so screen readers announce "Bulk actions, region" when focus
 * enters. Callers MUST pass a meaningful `aria-label` describing the
 * batch domain (e.g. "Bulk review actions", "Bulk actions").
 */
export function FloatingActionBar({
  ariaLabel,
  className,
  children,
}: {
  ariaLabel: string
  className?: string
  children: ReactNode
}) {
  // 2026-05-26 (Yuqi feedback): bar swapped from inverted dark
  // surface to a warm beige surface. The previous dark-on-light
  // gave it strong "you have a temporary mode active" contrast,
  // but Yuqi prefers a softer signal — beige reads as "different
  // from the page chrome" without slamming the page with a black
  // bar. Uses the warning-100 semantic token (a warm peach-cream
  // ~#ffe4dd) as the surface, with dark text + a slightly deeper
  // border on top. Button text reverts to default text-primary so
  // ghost buttons read normally against the beige bg. The shape +
  // shadow + bottom-12 position are unchanged.
  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={cn(
        'fixed bottom-12 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-3 rounded-xl border border-state-warning-border bg-state-warning-hover-alt px-5 py-3 text-text-primary shadow-[0_16px_48px_-12px_rgb(0_0_0_/_0.18)] [&_button]:text-text-primary [&_button:hover:not(:disabled)]:bg-black/5 [&_button:disabled]:opacity-50',
        className,
      )}
    >
      {children}
    </div>
  )
}
