import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * StatBand — the canonical "summary card" for table-bearing routes: a
 * borderless, full-width row of stat columns (eyebrow · 32px value ·
 * optional colored sub) framed by a top + bottom hairline rather than a
 * card border. Promoted out of the rule-library overview (Pencil O0pyRO
 * `p0WeNy`, where it shipped as `OverviewStatsBand`) into the shared
 * pattern layer so every "card summary" surface renders the *same*
 * component with different content:
 *
 *  - `/clients`             → Total clients · Active obligations · At risk
 *  - `/clients/[id]`        → Next filing · Blocked · Open filing
 *  - `/rules/sources`       → Feeds · Rules derived · Fetched 24h
 *  - `/rules/library`       → Total · Jurisdictions · Changed · Pending
 *  - `/alerts/history`      → Handled · Applied · Dismissed · …
 *
 * This replaced five bespoke variants that had drifted apart (bordered
 * `rounded-xl` / `rounded-xl` / `rounded-xl` cards, mono vs
 * proportional values, `text-muted`/`font-bold` vs
 * `text-tertiary`/`font-semibold` eyebrows, separate StatTile tiles vs a
 * single band).
 *
 * Visual contract (Pencil O0pyRO `p0WeNy`):
 *  - Frame: `border-y border-divider-subtle py-7`, no card border
 *  - Eyebrow: `text-xs font-semibold tracking-eyebrow text-text-muted uppercase`
 *  - Value: `text-[32px] leading-none font-medium tracking-tight tabular-nums`,
 *    tone-coded via `valueClass` (default `text-text-primary`)
 *  - Sub: `text-sm font-medium`, tone-coded via `subClass`
 *    (default `text-text-tertiary`); omitted entirely when absent
 *  - Narrow viewports fall to a 2-up grid so values never crush together
 *
 * Interaction (optional, per stat): pass `href` → the column renders as a
 * `<Link>`; `onClick` → a `<button>`; neither → a read-only `<div>`. The
 * /clients/[id] anchor uses this to drill straight into the matching
 * obligation or filtered queue.
 */
export interface StatBandItem {
  key: string
  /** Eyebrow label above the value. */
  label: ReactNode
  /** Headline magnitude. ReactNode so chips (`<TaxCodeLabel>`) compose. */
  value: ReactNode
  /** Optional sub caption below the value. Omitted when absent. */
  sub?: ReactNode
  /** Tone class for the value. Default `text-text-primary`. */
  valueClass?: string
  /** Tone class for the sub. Default `text-text-tertiary`. */
  subClass?: string
  /** Render the column as a `<Link to={href}>`. Wins over `onClick`. */
  href?: string
  /** Render the column as a `<button onClick={onClick}>`. */
  onClick?: () => void
  /** aria-label override for the interactive column. */
  ariaLabel?: string
}

export function StatBand({
  stats,
  loading,
  ariaLabel,
}: {
  stats: StatBandItem[]
  /** Renders a band-height skeleton while the source query is in flight. */
  loading?: boolean
  /** Accessible name for the band region. */
  ariaLabel?: string
}) {
  if (loading) {
    return <Skeleton className="h-[132px] w-full rounded-none" />
  }
  return (
    <section
      aria-label={ariaLabel}
      className="grid shrink-0 grid-cols-2 gap-y-6 border-y border-divider-subtle py-7 sm:flex sm:items-start sm:gap-y-0"
    >
      {stats.map((stat) => {
        const body = (
          <>
            <span className="text-xs font-semibold tracking-eyebrow text-text-muted uppercase">
              {stat.label}
            </span>
            <span
              className={cn(
                'text-[32px] leading-none font-medium tracking-tight tabular-nums',
                stat.valueClass ?? 'text-text-primary',
              )}
            >
              {stat.value}
            </span>
            {stat.sub != null ? (
              <span
                className={cn(
                  'truncate text-sm font-medium',
                  stat.subClass ?? 'text-text-tertiary',
                )}
              >
                {stat.sub}
              </span>
            ) : null}
          </>
        )

        const columnClass = 'flex min-w-0 flex-1 flex-col gap-2 px-5'
        // Interactive columns gain a hover wash + focus ring so they read
        // as tappable; the read-only column stays dead-quiet.
        const interactiveClass = cn(
          columnClass,
          'cursor-pointer rounded-lg py-1 -my-1 text-left transition-colors hover:bg-background-default-hover',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-accent-active-alt',
        )

        if (stat.href) {
          return (
            <Link
              key={stat.key}
              to={stat.href}
              aria-label={stat.ariaLabel}
              className={interactiveClass}
            >
              {body}
            </Link>
          )
        }
        if (stat.onClick) {
          return (
            <button
              key={stat.key}
              type="button"
              onClick={stat.onClick}
              aria-label={stat.ariaLabel}
              className={interactiveClass}
            >
              {body}
            </button>
          )
        }
        return (
          <div key={stat.key} className={columnClass}>
            {body}
          </div>
        )
      })}
    </section>
  )
}
