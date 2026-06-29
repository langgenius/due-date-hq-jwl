import { Fragment, type ReactNode } from 'react'
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

/**
 * A single segment of the optional proportion bar — a thin visual echo of the
 * stat columns' real counts. No legend: the columns above already label the
 * numbers, so the bar just shows their MIX. Restrained register only (the
 * /deadlines wiring uses green filed / red overdue / neutral in-flight) — keep
 * to the 3-tone color budget, never one chromatic segment per status.
 */
export interface StatBandProportionSegment {
  key: string
  /** Real count for this segment. Width = value / sum(values). Zero renders nothing. */
  value: number
  /** Tailwind bg utility for the fill (e.g. `bg-state-success-solid`). */
  toneClass: string
  /** Human label for the segment (used in tooltips / future legends, not rendered inline). */
  label: ReactNode
}

export function StatBand({
  stats,
  loading,
  ariaLabel,
  proportionBar,
  proportionBarLabel,
  bumpKey,
}: {
  stats: StatBandItem[]
  /** Renders a band-height skeleton while the source query is in flight. */
  loading?: boolean
  /** Accessible name for the band region. */
  ariaLabel?: string
  /**
   * When this value changes, each value node remounts (via `key`) and plays a
   * single quiet opacity pulse (`.animate-stat-bump`), signalling the numbers
   * just recomputed (e.g. the audit strip as filters change). Opacity-only →
   * no layout shift; guarded for reduced-motion. Omit to keep values static.
   */
  bumpKey?: string
  /**
   * Optional thin proportion bar rendered BELOW the stat columns, inside the
   * band. A visual echo of the same real counts the columns already label — no
   * legend, no trend. Each segment width = value / sum(values); zero-value
   * segments render nothing. Omit (or pass an all-zero set) to render exactly
   * as a band without the prop. Keep to the restrained 3-tone budget.
   */
  proportionBar?: StatBandProportionSegment[] | undefined
  /**
   * aria-label for the proportion bar summarizing the mix (e.g. "Portfolio:
   * 6 filed, 5 overdue, 17 in progress"). Supplied by the caller so the
   * translatable string lives where `t` already does; the band stays i18n-free.
   * Optional: when omitted, the bar falls back to a "N label, …" summary built
   * from the segments' own string labels, so `role="img"` is never unlabeled.
   */
  proportionBarLabel?: string | undefined
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
            className="flex min-w-0 flex-1 flex-col gap-1 px-5 first:pl-0 sm:border-l sm:border-divider-subtle sm:first:border-l-0"
          >
            <Skeleton className="h-2.5 w-16 rounded" />
            <Skeleton className="h-6 w-12 rounded" />
          </div>
        ))}
      </div>
    )
  }
  // Only segments with a real, positive count occupy width; the rest render
  // nothing (a zero-count tone would be an invisible 0%-wide sliver anyway).
  const barSegments = proportionBar?.filter((seg) => seg.value > 0) ?? []
  const barTotal = barSegments.reduce((n, seg) => n + seg.value, 0)
  const showBar = barTotal > 0
  // The bar must never be an unlabeled `role="img"`. Prefer the caller's
  // `proportionBarLabel` (it owns the translatable phrasing); if absent, fall
  // back to a "N label, N label" summary built from the segments' own string
  // labels so a screen reader still hears the mix. Non-string labels (rare —
  // a chip node) are skipped from the fallback rather than rendered as
  // "[object Object]".
  const segmentSummary = barSegments
    .map((seg) => (typeof seg.label === 'string' ? `${seg.value} ${seg.label}` : null))
    .filter((part): part is string => part !== null)
    .join(', ')
  const barAccessibleLabel = proportionBarLabel ?? (segmentSummary || undefined)

  // The stat columns. Carries the grid/flex layout itself when the bar is
  // present (so the section can stack column-row over bar); otherwise the
  // section keeps that layout and the columns render as its direct children —
  // bands without the prop are byte-for-byte the same as before.
  const columnsLayoutClass = 'grid grid-cols-2 gap-y-4 sm:flex sm:items-start sm:gap-y-0'
  const columns = stats.map((stat) => {
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
          // Remount on bumpKey change so the once-only pulse re-fires; static
          // (no key) when the caller doesn't opt in.
          {...(bumpKey != null ? { key: bumpKey } : {})}
          className={cn(
            'text-stat-value font-semibold tracking-tight tabular-nums',
            stat.valueClass ?? 'text-text-primary',
            bumpKey != null && 'animate-stat-bump motion-reduce:animate-none',
          )}
        >
          {stat.value}
        </span>
        {stat.sub != null ? (
          <span
            className={cn('truncate text-xs font-medium', stat.subClass ?? 'text-text-tertiary')}
          >
            {stat.sub}
          </span>
        ) : null}
      </>
    )

    // Subtle vertical hairline between columns (row layout only) gives the
    // band structure without re-introducing a card border; the first
    // column and the mobile 2-up grid stay divider-free.
    // first:pl-0 flushes the first stat's text to the band's left edge (= the
    // page content margin) so the summary left-aligns with the page header +
    // editorial line above it, instead of sitting 20px inset from the px-5.
    const columnClass =
      'flex min-w-0 flex-1 flex-col gap-1 px-5 first:pl-0 sm:border-l sm:border-divider-subtle sm:first:border-l-0'
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
  })

  return (
    <section
      aria-label={ariaLabel}
      // 2026-06-10 (Yuqi "occupied too much space. be information dense and
      // clean"): tightened the band — py-7→py-4, column gap-2→gap-1, number
      // 32→26 — so it carries the same info in ~40px less height. The shared
      // band drives all 5 summary surfaces, so they all densify together.
      // The bar (when present) stacks below the columns inside the band, above
      // the bottom hairline.
      className={cn(
        'shrink-0 border-y border-divider-subtle py-4',
        showBar ? 'block' : columnsLayoutClass,
      )}
    >
      {showBar ? <div className={columnsLayoutClass}>{columns}</div> : columns}
      {showBar ? (
        <div className="mt-4 px-5">
          <div
            role="img"
            aria-label={barAccessibleLabel}
            // Thin full-width segmented proportion bar — a quiet visual echo of
            // the counts above (no legend, no trend). Inset px-5 aligns it to
            // the column content. Seamless segments (no gap) read as one
            // continuous mix like the Toloka reference; h-2 keeps it
            // hairline-weight. overflow-hidden + rounded-full clip the segment
            // ends into the rounded track.
            className="flex h-2 w-full overflow-hidden rounded-full bg-divider-subtle"
          >
            {barSegments.map((seg) => (
              <div
                key={seg.key}
                // Per-segment native tooltip (`N label`) so a sighted user can
                // hover a color and learn what it is — the bar carries no inline
                // legend. Only string labels become a title (a node can't).
                title={typeof seg.label === 'string' ? `${seg.value} ${seg.label}` : undefined}
                className={cn('h-full', seg.toneClass)}
                style={{ width: `${(seg.value / barTotal) * 100}%` }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

/**
 * StatSummaryStrip — the COMPACT one-line form of the same summary, for list
 * surfaces where the tall band (`border-y py-4` ≈ 80px) wastes vertical space
 * (2026-06-29, Yuqi "wasteful of space"). Renders the SAME `StatBandItem[]` as a
 * single line — `12 Overdue · 10 In review · …` — at ~24px, so the table/cards
 * rise up the fold. Same per-stat interaction contract (`href` → `<Link>`,
 * `onClick` → `<button>`, neither → static text) and the same `valueClass` tone
 * budget, so a band and a strip are interchangeable per surface. Use the band
 * when the summary IS the surface's headline; use the strip when a list/lane view
 * below already carries the weight.
 */
export function StatSummaryStrip({
  stats,
  loading,
  ariaLabel,
  bumpKey,
  className,
}: {
  stats: StatBandItem[]
  loading?: boolean
  ariaLabel?: string
  /** Same as StatBand: remount the value on change to re-fire the quiet pulse. */
  bumpKey?: string
  className?: string
}) {
  if (loading) {
    return <Skeleton className="h-5 w-72 rounded" />
  }
  // A "0 Overdue" segment is noise in a compact line (its absence already says
  // zero) — drop numeric-zero cells so the strip stays tight, and render nothing
  // when that leaves it empty (2026-06-29, Yuqi "太零碎"). Callers still drop any
  // surface-specific redundant cell (e.g. a "Total" already in the title pill).
  const visible = stats.filter((stat) => !(typeof stat.value === 'number' && stat.value === 0))
  if (visible.length === 0) {
    return null
  }
  return (
    <div
      aria-label={ariaLabel}
      className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-sm', className)}
    >
      {visible.map((stat, index) => {
        const interactive = Boolean(stat.href || stat.onClick)
        const body = (
          <>
            <span
              {...(bumpKey != null ? { key: bumpKey } : {})}
              className={cn(
                'font-medium tabular-nums text-text-primary',
                stat.valueClass,
                bumpKey != null && 'animate-stat-bump motion-reduce:animate-none',
              )}
            >
              {stat.value}
            </span>
            <span
              className={cn(
                'text-text-tertiary',
                interactive && 'transition-colors group-hover:text-text-secondary',
              )}
            >
              {stat.label}
            </span>
          </>
        )
        const interactiveClass =
          'group inline-flex cursor-pointer items-baseline gap-1.5 rounded-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt'
        return (
          <Fragment key={stat.key}>
            {index > 0 ? (
              <span aria-hidden className="text-divider-regular">
                ·
              </span>
            ) : null}
            {stat.href ? (
              <Link to={stat.href} aria-label={stat.ariaLabel} className={interactiveClass}>
                {body}
              </Link>
            ) : stat.onClick ? (
              <button
                type="button"
                onClick={stat.onClick}
                aria-label={stat.ariaLabel}
                className={interactiveClass}
              >
                {body}
              </button>
            ) : (
              <span className="inline-flex items-baseline gap-1.5">{body}</span>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
