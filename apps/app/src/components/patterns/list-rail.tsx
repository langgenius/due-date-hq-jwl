import type { ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `ListRail` — the canonical 380px master-list sidebar shell.
 *
 * `AlertListRail`, `ObligationListRail`, the rules `JurisdictionRail`, and the
 * deadline `DeadlineNavigatorRail` all hand-rolled the SAME recipe (their code
 * comments literally said "canonical list-rail recipe — identical to …"):
 * a full-height 380px flex column with a hairline right border, a bordered
 * title head, one or more bordered filter rows, and a scrolling body.
 *
 * This is a *minimal-prescription* shell — it owns the duplicated chrome
 * (width, border, padding, section dividers, scroll) but NOT the inner content,
 * because the heads/filters genuinely differ (a title vs a back-link, a count
 * pill vs a filter toggle, a search vs a search + status dropdown). Callers
 * compose `ListRailHead` / `ListRailSection` / `ListRailBody` inside.
 */
export function ListRail({
  ariaLabel,
  className,
  children,
}: {
  ariaLabel?: string
  /** Override the default width/visibility (e.g. responsive `w-[340px] lg:flex`). */
  className?: string
  children: ReactNode
}) {
  return (
    <aside
      aria-label={ariaLabel}
      className={cn(
        // border-l (2026-06-12, Yuqi "don't like the gap between the alert
        // list and the sidebar"): the rail sits ~30px from the floating
        // sidebar card (the shell's 12px slot margin + the rail's own
        // content padding) with nothing marking where the pane begins — the
        // void read as sloppy. The left hairline gives the rail an EDGE so
        // the gutter reads as the app's intentional margin, mirroring the
        // border-r against the detail pane.
        'flex h-full w-[380px] shrink-0 flex-col border-r border-l border-divider-subtle bg-background-default',
        className,
      )}
    >
      {children}
    </aside>
  )
}

/**
 * Title head — bordered row at the top of the rail. Pass the title + any
 * trailing control as children; add `justify-between` via className when the
 * head has a trailing control on the right.
 */
export function ListRailHead({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      // Fixed h-[52px] (was py-3.5 → ~57px) so the rail header's bottom hairline
      // lines up EXACTLY with the detail pane's top-bar hairline beside it — both
      // the alert + deadline crumb bars are h-[52px] (Yuqi 2026-06-23: "the lines
      // slightly misalign"). Content centers vertically within the fixed height.
      className={cn(
        'flex h-[52px] shrink-0 items-center gap-2 border-b border-divider-subtle px-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** The canonical rail title text (`text-item-title`). */
export function ListRailTitle({ children }: { children: ReactNode }) {
  return <span className="text-item-title text-text-primary">{children}</span>
}

/**
 * A filter/control row beneath the head (search, a segmented toggle,
 * a search + status dropdown, …). `px-4 py-2.5` by default.
 *
 * No bottom border (Yuqi 2026-06-11): the rail is a floaty sidebar — a
 * hairline under every control row over-segmented it into stacked boxes.
 * The head keeps its border (title ⟷ content is a real boundary); control
 * rows separate by spacing alone, and the list items below carry their own
 * row hairlines.
 */
export function ListRailSection({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex shrink-0 items-center gap-2 px-4 py-2.5', className)}>{children}</div>
  )
}

/** The scrolling list body — fills remaining height, scrolls on overflow. */
export function ListRailBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto', className)}>{children}</div>
}
