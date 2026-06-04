import { ChevronRightIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * Canonical one-line stats strip used at the top of table-bearing
 * routes (Obligations queue, Rule library, Clients list).
 *
 * Replaces three earlier shapes:
 *   - Rule library's `StatsBar` (4 columns of numbers + entity chips)
 *   - Clients list's `ClientsActionStrip` (3-tile grid)
 *   - Obligations queue's scope-tabs-as-stats
 *
 * See `docs/Design/unified-table-surface-vocabulary.md` rule V3 for
 * the design contract.
 *
 * Visual shape:
 *   `LABEL   N unit · N unit · N unit                       View →`
 *
 * Each item can be inert, link to a route, or fire an `onClick` that
 * the parent maps to a filter state. Tone tints the number (default,
 * muted, warning, review). Loading replaces items with skeleton bars.
 */
export type SurfaceSummaryItemTone = 'default' | 'muted' | 'warning' | 'review' | 'destructive'

export interface SurfaceSummaryItem {
  key: string
  value: number
  label: string
  tone?: SurfaceSummaryItemTone
  onClick?: () => void
  href?: string
  /**
   * When true, the chip renders in a pressed/active visual state —
   * use for filter-toggle chips (Clients action strip) so the CPA
   * can see at a glance which subset is currently filtering the
   * table below. Defaults to false.
   */
  active?: boolean
}

export interface SurfaceSummaryStripProps {
  label: string
  items: SurfaceSummaryItem[]
  loading?: boolean
  detailHref?: string
  detailLabel?: string
}

export function SurfaceSummaryStrip({
  label,
  items,
  loading = false,
  detailHref,
  detailLabel,
}: SurfaceSummaryStripProps) {
  return (
    <div className="flex h-10 items-center gap-3 rounded-md border border-divider-regular bg-background-default px-4">
      <span className="w-[88px] shrink-0 text-xs font-medium uppercase tracking-eyebrow text-text-tertiary">
        {label}
      </span>
      <div
        className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1"
        aria-busy={loading || undefined}
      >
        {loading ? (
          <div className="flex items-center gap-3" aria-label="Loading">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        ) : items.length === 0 ? (
          <span className="text-xs text-text-muted">All caught up</span>
        ) : (
          items.map(({ key, ...item }, idx) => (
            <span key={key} className="inline-flex items-baseline gap-1">
              <SurfaceSummaryNumber {...item} />
              {idx < items.length - 1 ? <Separator /> : null}
            </span>
          ))
        )}
      </div>
      {detailHref && detailLabel ? (
        // 2026-06-01: swap hand-rolled "text-text-accent hover:underline"
        // Link for the canonical TextLink primitive (accent variant, default
        // text-xs size). `shrink-0` is preserved as a layout-context override
        // since the primitive lives inside a flex row that can collapse.
        <TextLink
          variant="accent"
          size="default"
          className="shrink-0"
          render={<Link to={detailHref} />}
        >
          {detailLabel}
          <ChevronRightIcon className="size-3.5" aria-hidden />
        </TextLink>
      ) : null}
    </div>
  )
}

function SurfaceSummaryNumber({
  value,
  label,
  tone = 'default',
  onClick,
  href,
  active = false,
}: Omit<SurfaceSummaryItem, 'key'>) {
  const toneClass = toneToClass(tone, value)
  const inner = (
    <>
      <span className={cn('text-sm font-semibold tabular-nums', toneClass)}>{value}</span>
      <span className={cn('text-xs', active ? 'text-text-primary' : 'text-text-secondary')}>
        {label}
      </span>
    </>
  )
  // `active` adds a subtle background pill so the chip reads as
  // "pressed / filter on" without competing with the destructive /
  // warning tone tints on the value itself.
  const interactiveClass = cn(
    'inline-flex items-baseline gap-1 rounded-md px-1.5 py-0.5 outline-none',
    'hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
    active && 'bg-state-base-hover-alt hover:no-underline',
  )
  if (href) {
    return (
      <Link to={href} className={interactiveClass} aria-pressed={active || undefined}>
        {inner}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={interactiveClass}
        aria-pressed={active || undefined}
      >
        {inner}
      </button>
    )
  }
  return <span className="inline-flex items-baseline gap-1">{inner}</span>
}

function Separator() {
  return (
    <span aria-hidden className="ml-3 text-text-tertiary">
      ·
    </span>
  )
}

function toneToClass(tone: SurfaceSummaryItemTone, value: number): string {
  // Zero-state always reads as muted regardless of declared tone — keeps
  // strips from screaming "0 needs review" in destructive red.
  if (value === 0) return 'text-text-muted'
  switch (tone) {
    case 'review':
      return 'text-status-review'
    case 'warning':
      return 'text-severity-medium'
    case 'destructive':
      return 'text-text-destructive'
    case 'muted':
      return 'text-text-muted'
    default:
      return 'text-text-primary'
  }
}
