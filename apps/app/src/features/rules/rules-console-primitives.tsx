import type { ReactNode } from 'react'
import { CircleAlertIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'

import type { RuleSource } from '@duedatehq/contracts'
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import type { BreadcrumbItem } from '@/components/patterns/breadcrumb'
import { PageHeader } from '@/components/patterns/page-header'
import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { JurisdictionChip } from '@/components/primitives/state-badge'

import { normalizeSourceHealth } from './rules-console-model'

type FilterOption<T extends string> = {
  value: T
  label: string
  count: number
}

/**
 * Thin wrapper around the shared `PageHeader`. Kept for the string-based
 * call sites in `rules.{coverage,library,sources,pulse,temporary,preview}.tsx`
 * — the shared primitive accepts ReactNode, but rules pages still pass
 * plain strings through their loaders, so this adapter keeps that
 * ergonomics-of-strings while routing through the single source of truth.
 */
function RulesPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: ReactNode
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
}) {
  return (
    <PageHeader
      title={title}
      {...(description ? { description } : {})}
      {...(breadcrumbs ? { breadcrumbs } : {})}
      {...(actions ? { actions } : {})}
    />
  )
}

/**
 * Layout shell for each Rules sub-page. Mirrors the old Rules Console layout
 * (24 px padding · single scroll region · header + content column) so each
 * extracted page keeps the visual rhythm it had as a tab, just without the
 * tab nav rib that previously sat above it.
 *
 * `compact` collapses the page header (title + description) — used by
 * pages that enter a focused "review mode" where the orientation
 * header just steals vertical space. The collapse is animated via a
 * max-height + opacity + margin transition so the transition between
 * the two modes feels smooth instead of snapping.
 */
export function RulesPageShell({
  title,
  description,
  breadcrumbs,
  actions,
  compact = false,
  lockViewport = false,
  wide = false,
  contentClassName,
  children,
}: {
  title: ReactNode
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  compact?: boolean
  lockViewport?: boolean
  /**
   * Opt out of the `max-w-page-wide` (1100px) cap and let the content
   * fill the outer 1440px cap from `app-shell.tsx`. Matches the
   * /deadlines page where the table benefits from the extra horizontal
   * room (jurisdiction + 7 entity columns + tier + chevrons). Default
   * stays at 1100px so /alerts and /rules/coverage are unaffected.
   */
  wide?: boolean
  contentClassName?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex min-h-0 flex-col overflow-hidden', lockViewport ? 'h-svh' : 'h-full')}>
      {/* `overscroll-contain` deliberately omitted on the rules shell —
        the gesture should chain to the route layout when the user
        scrolls past the end of a rules table (rule library, sources,
        preview, pulse). Was trapping the scroll at the seam before,
        which felt "stuck" at the boundary. Drawer + settings shells
        still trap (different intent). */}
      <div className={cn('min-h-0 flex-1', lockViewport ? 'overflow-hidden' : 'overflow-y-auto')}>
        {/* Page chrome mirrors `/today` — `mx-auto max-w-page-wide` cap +
            responsive padding — so it reads as the same minimal surface
            as every other page in the app rather than a denser outlier. */}
        <div
          className={cn(
            // 2026-06-12 (Yuqi /alerts #9): pt-8 (32px) centers the page
            // title on the sidebar's firm avatar (title 32px tall at y34 →
            // center 50 = avatar center 50); pb-5 (20px) matches the
            // sidebar's ~18px bottom inset so the page and rail end
            // together. /today + /deadlines moved to pt-8 in the same pass.
            'mx-auto flex w-full flex-col gap-6 px-4 pt-8 pb-5 md:px-6',
            wide ? 'max-w-page-expanded' : 'max-w-page-wide',
            lockViewport && 'h-full min-h-0',
            contentClassName,
          )}
        >
          {/* Header is unmounted in compact mode — not just visually
            collapsed. A collapsed-but-mounted div still consumes a
            flex `gap-6` slot above the next child, which created a
            ~48-72px dead space at the top of the review surface. */}
          {!compact ? (
            <RulesPageHeader
              title={title}
              {...(description ? { description } : {})}
              {...(breadcrumbs ? { breadcrumbs } : {})}
              {...(actions ? { actions } : {})}
            />
          ) : null}
          {children}
        </div>
      </div>
    </div>
  )
}

export function SectionFrame({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-divider-regular bg-background-default',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <CapsFieldLabel as="div" variant="group" className="whitespace-pre">
      {children}
    </CapsFieldLabel>
  )
}

export function FilterChips<T extends string>({
  options,
  value,
  onValueChange,
}: {
  options: Array<FilterOption<T>>
  value: T
  onValueChange: (value: T) => void
}) {
  // Uses the shared <Segmented> primitive so every single-select toggle in
  // the product reads the same. Counts ride inside each option's label.
  return (
    <Segmented<T>
      value={value}
      onValueChange={onValueChange}
      size="sm"
      options={options.map((option) => ({
        value: option.value,
        label: (
          <span className="flex items-center gap-1">
            <span>{option.label}</span>
            <span className="tabular-nums">{option.count}</span>
          </span>
        ),
      }))}
    />
  )
}

export function QueryPanelState({
  state,
  message,
}: {
  state: 'loading' | 'error'
  message: string
}) {
  if (state === 'loading') {
    return (
      <SectionFrame className="p-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-6 w-3/5" />
        </div>
      </SectionFrame>
    )
  }

  return (
    <SectionFrame className="flex items-center gap-2 p-4 text-sm text-text-secondary">
      <CircleAlertIcon className="size-4 text-text-warning" aria-hidden />
      <span>{message}</span>
    </SectionFrame>
  )
}

// 2026-06-11: now a thin alias for the app-wide JurisdictionChip
// primitive (Badge outline/square per §4.10 — jurisdiction codes are
// reference tags). The old bg-subtle filled span was one of five
// per-surface chrome drifts; the canonical chrome lives in
// `primitives/state-badge`. Kept as a named export so the rules-console
// call sites (sources, coverage, drawers) stay untouched.
export function JurisdictionCode({ code }: { code: string }) {
  return <JurisdictionChip code={code} />
}

export function ToneDot({ tone }: { tone: 'success' | 'warning' | 'review' | 'disabled' }) {
  const className = {
    success: 'bg-status-done',
    warning: 'bg-severity-medium',
    review: 'bg-status-review',
    disabled: 'bg-text-disabled',
  }[tone]
  return (
    <span aria-hidden className={cn('inline-block size-1.5 shrink-0 rounded-full', className)} />
  )
}

export function HealthBadge({ health }: { health: RuleSource['healthStatus'] }) {
  const { t } = useLingui()
  const normalized = normalizeSourceHealth(health)
  const tones: Record<typeof normalized, 'success' | 'disabled'> = {
    healthy: 'success',
    paused: 'disabled',
  }
  const labels: Record<typeof normalized, string> = {
    healthy: t`Watched`,
    paused: t`Paused`,
  }
  const tone = tones[normalized]
  return (
    <Badge variant="outline">
      <BadgeStatusDot tone={tone} className="size-1.5" />
      {labels[normalized]}
    </Badge>
  )
}

export function TablePaginationFooter({
  pageIndex,
  pageCount,
  firstItemNumber,
  lastItemNumber,
  totalCount,
  onPreviousPage,
  onNextPage,
}: {
  pageIndex: number
  pageCount: number
  firstItemNumber: number
  lastItemNumber: number
  totalCount: number
  onPreviousPage: () => void
  onNextPage: () => void
}) {
  const { t } = useLingui()
  const pageNumber = pageIndex + 1
  const hasPreviousPage = pageIndex > 0
  const hasNextPage = pageIndex + 1 < pageCount

  return (
    <div className="flex min-h-10 flex-col gap-2 bg-background-subtle px-3 py-2 text-xs text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium text-text-primary">
          <Trans>
            Page {pageNumber} of {pageCount}
          </Trans>
        </span>
        <span>
          <Trans>
            Showing {firstItemNumber}-{lastItemNumber} of {totalCount}
          </Trans>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={onPreviousPage}
          disabled={!hasPreviousPage}
          aria-label={t`Previous page`}
        >
          <ChevronLeftIcon data-icon="inline-start" />
          <Trans>Previous</Trans>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={onNextPage}
          disabled={!hasNextPage}
          aria-label={t`Next page`}
        >
          <Trans>Next</Trans>
          <ChevronRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
