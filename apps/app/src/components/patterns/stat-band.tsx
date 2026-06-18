import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { CapsFieldLabel } from '@/components/primitives/caps-field-label'

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
 *  - `/clients`             → Total clients · Active deadlines · At risk
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
 * Visual contract (Pencil O0pyRO `p0WeNy`; label re-CAPSed 2026-06-14):
 *  - Frame: `border-y border-divider-subtle py-7`, no card border
 *  - Label: tracked-CAPS eyebrow `text-caption-xs font-semibold tracking-eyebrow
 *    text-text-tertiary uppercase` — the "CAPS title · big number · small
 *    caption" grammar Yuqi confirmed (over the sentence-case label tried
 *    2026-06-12). One treatment across all summary surfaces.
 *  - Value: `text-stat-value font-semibold tracking-tight tabular-nums`,
 *    tone-coded via `valueClass` (default `text-text-primary`)
 *  - Sub: small caption `text-xs font-medium`, tone-coded via `subClass`
 *    (default `text-text-tertiary`); omitted entirely when absent
 *  - Narrow viewports fall to a 2-up grid so values never crush together
 *
 * COLOR BUDGET (von-Restorff, 2026-06-18): color in a band is a SIGNAL, not
 * decoration — if every column is colored, none stands out. Rules:
 *  - The value stays neutral (`text-text-primary`); tone lives in the SUB.
 *  - Anchor / context stats (a "Total", a vanity count) stay NEUTRAL — never an
 *    always-on accent. They orient; they aren't a call to action.
 *  - Reserve color for CONDITIONALLY-actionable stats — go amber/destructive
 *    only when the count > 0 (a warning-toned zero flags a problem that doesn't
 *    exist). A single steady positive-green KPI is fine, but don't paint the
 *    expected/dominant column.
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
    // Mirror the loaded band's chrome (same border-y hairlines + py-4 wrapper +
    // column layout) so only the text slots shimmer — the band frame itself
    // doesn't pop in on paint. One short label bar + one wider value bar per
    // column, matching the eyebrow + 26px value grammar.
    return (
      <div
        aria-hidden
        className="grid shrink-0 grid-cols-2 gap-y-4 border-y border-divider-subtle py-4 sm:flex sm:items-start sm:gap-y-0"
      >
        {stats.map((stat) => (
          <div
            key={stat.key}
            className="flex min-w-0 flex-1 flex-col gap-1 px-5 sm:border-l sm:border-divider-subtle sm:first:border-l-0"
          >
            <Skeleton className="h-2.5 w-16 rounded" />
            <Skeleton className="h-6 w-12 rounded" />
          </div>
        ))}
      </div>
    )
  }
  return (
    <section
      aria-label={ariaLabel}
      // 2026-06-10 (Yuqi "occupied too much space. be information dense and
      // clean"): tightened the band — py-7→py-4, column gap-2→gap-1, number
      // 32→26 — so it carries the same info in ~40px less height. The shared
      // band drives all 5 summary surfaces, so they all densify together.
      className="grid shrink-0 grid-cols-2 gap-y-4 border-y border-divider-subtle py-4 sm:flex sm:items-start sm:gap-y-0"
    >
      {stats.map((stat) => {
        const body = (
          <>
            {/* 2026-06-14 (Yuqi): tracked-CAPS eyebrow label — the "CAPS title ·
                big number · small caption" stat grammar, restored over the
                sentence-case label tried 2026-06-12. All summary surfaces
                (clients ×2, sources, library overview + jurisdiction detail,
                alert history, audit) pick this up together — one design. */}
            <CapsFieldLabel as="span" variant="group" className="truncate">
              {stat.label}
            </CapsFieldLabel>
            <span
              className={cn(
                'text-stat-value font-semibold tracking-tight tabular-nums',
                stat.valueClass ?? 'text-text-primary',
              )}
            >
              {stat.value}
            </span>
            {stat.sub != null ? (
              <span
                className={cn(
                  'truncate text-xs font-medium',
                  stat.subClass ?? 'text-text-tertiary',
                )}
              >
                {stat.sub}
              </span>
            ) : null}
          </>
        )

        // Subtle vertical hairline between columns (row layout only) gives the
        // band structure without re-introducing a card border; the first
        // column and the mobile 2-up grid stay divider-free.
        const columnClass =
          'flex min-w-0 flex-1 flex-col gap-1 px-5 sm:border-l sm:border-divider-subtle sm:first:border-l-0'
        // Interactive columns gain a hover wash + focus ring so they read
        // as tappable; the read-only column stays dead-quiet.
        const interactiveClass = cn(
          columnClass,
          'cursor-pointer rounded-lg py-1 -my-1 text-left transition-colors hover:bg-state-base-hover',
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
