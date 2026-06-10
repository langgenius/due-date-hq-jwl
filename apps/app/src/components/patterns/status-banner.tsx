import type { ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `StatusBanner` — the canonical inline status / filtered-empty strip.
 *
 * Sibling primitive to `EmptyState` (vertical hero "nothing here" card)
 * and `InfoBanner` (Stripe-style slim tip strip). `StatusBanner` is the
 * **horizontal, spacious** dashed-border surface used for "all clear",
 * "no alerts match these filters", "this section needs attention",
 * etc. Lives at the same surface scale as a single content card but
 * communicates state instead of carrying data.
 *
 * Three sibling primitives now cover the empty/info/status family:
 *   - `EmptyState`   → vertical, centered, hero. Used when the data
 *                      source itself is empty and the page needs a
 *                      "what now" moment with an icon + CTA.
 *   - `InfoBanner`   → slim h-12 inline tip strip with dismiss. Used
 *                      for one-line nudges between page chrome and a
 *                      content card.
 *   - `StatusBanner` → spacious dashed-border inline strip with an
 *                      optional leading indicator (icon / PulsingDot)
 *                      and optional trailing CTA. Used for "system
 *                      state right now" announcements.
 *
 * Visual contract:
 *   - `flex items-center gap-3`
 *   - `rounded-lg border border-dashed border-divider-regular`
 *   - `bg-background-default p-4`
 *   - `text-sm text-text-secondary`
 *
 * Callers previously hand-rolled this className in
 * AlertsListPage.tsx (×2), ClientFactsWorkspace.tsx, and
 * needs-attention-section.tsx. Centralizing here so future
 * tone / spacing / typography tweaks land in one place.
 */
export function StatusBanner({
  indicator,
  cta,
  children,
  role,
  ariaLive,
  className,
}: {
  /**
   * Leading indicator slot. Accepts any node so callers can pass a
   * `<PulsingDot tone="success" active />`, a lucide icon
   * (`<CircleCheckIcon className="size-4 text-text-success" aria-hidden />`),
   * or any other visual marker. Omit for a text-only banner.
   */
  indicator?: ReactNode
  /**
   * Optional trailing call-to-action. Typically a `<Button>` or
   * `<Link>`. Sits flush-right with `ml-auto` enforced by `flex-1`
   * on the body span.
   */
  cta?: ReactNode
  /** Banner body content (text, plurals, links inline, etc.). */
  children: ReactNode
  /**
   * ARIA role. Default `'status'` for soft state announcements.
   * Use `'alert'` for assertive ones (rare — most status banners
   * are polite).
   */
  role?: 'status' | 'alert'
  /**
   * `aria-live` politeness. Default `'polite'` so changes don't
   * interrupt screen-reader output.
   */
  ariaLive?: 'polite' | 'assertive'
  className?: string
}) {
  return (
    <div
      role={role ?? 'status'}
      aria-live={ariaLive ?? 'polite'}
      className={cn(
        'flex items-center gap-3 rounded-lg border border-dashed border-divider-regular bg-background-default p-4 text-sm text-text-secondary',
        className,
      )}
    >
      {indicator}
      <span className="min-w-0 flex-1">{children}</span>
      {cta}
    </div>
  )
}
