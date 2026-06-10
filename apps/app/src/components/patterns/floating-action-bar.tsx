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
 *    multi-button clusters; tighter than `rounded-xl` so single-line
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
  tone = 'default',
}: {
  ariaLabel: string
  className?: string
  children: ReactNode
  /**
   * `default` — clean elevated white pill (legacy recipe, used by
   * Rule library's bulk-review bar).
   *
   * `elevated` — dark inverted surface so the bar reads as a
   * deliberate "command bar" mode (think Linear / Notion batch
   * tools). Used by /deadlines, where a white pill would blend into
   * the page chrome and not read as a distinct selection-mode surface.
   */
  tone?: 'default' | 'elevated'
}) {
  // The `default` tone is a clean elevated white pill — hairline neutral
  // border, lifted shadow — reading as a floating control surface (think
  // Linear/Stripe context bars) without claiming a warm/warning tone.
  // `tone="elevated"` is a dark contrast surface that reads as a distinct
  // selection-mode bar; the default white recipe stays for callers (Rule
  // library) that want the quieter shape.
  //
  // Inner ghost buttons inherit text-primary (default) or
  // text-inverted (elevated); the canonical primary action (sized
  // `sm` by the caller) uses the standard accent fill for the
  // "do the batch action" CTA.
  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={cn(
        // Step 1-5 reaudit canonicalized shadows — keep `shadow-overlay`
        // token, not main's arbitrary `shadow-[0_20px_48px_-16px_...]`.
        // `flex-nowrap` so the bar stays a single horizontal row at desktop
        // widths. Consumers that need more than ~6 affordances must use a
        // `More` overflow dropdown (see /deadlines) — wrapping to two lines
        // reads as "the bar is broken" rather than "the bar has many
        // actions."
        'fixed bottom-12 left-1/2 z-40 flex -translate-x-1/2 flex-nowrap items-center gap-2 rounded-xl px-4 py-2.5 shadow-overlay',
        tone === 'elevated'
          ? [
              // Dark inverted surface — matches the `bg-text-primary +
              // text-text-inverted` pattern used by selected state-rail
              // chips and rules-console primitives. No border (the
              // dark surface reads as elevated on its own; a hairline
              // would just thicken the silhouette).
              'bg-text-primary text-text-inverted',
              // Ghost buttons inside need to flip to inverted text +
              // a translucent-white hover so they read against the
              // dark fill.
              '[&_button]:text-text-inverted',
              '[&_button:hover:not(:disabled)]:bg-white/10',
              '[&_button:disabled]:opacity-50',
              // Vertical separators between groups also need to be
              // visible against the dark surface.
              '[&_[role=separator]]:bg-white/15',
            ]
          : [
              'border border-divider-regular bg-background-default text-text-primary',
              '[&_button]:text-text-primary',
              '[&_button:hover:not(:disabled)]:bg-state-base-hover',
              '[&_button:disabled]:opacity-50',
            ],
        className,
      )}
    >
      {children}
    </div>
  )
}
