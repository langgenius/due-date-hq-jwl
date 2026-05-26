import type { ReactNode } from 'react'
import { AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'

import type { RuleSource } from '@duedatehq/contracts'
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import type { BreadcrumbItem } from '@/components/patterns/breadcrumb'
import { PageHeader } from '@/components/patterns/page-header'

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
   * 2026-05-26 (Yuqi rule library width): opt out of the
   * `max-w-page-wide` (1100px) cap and let the content fill the
   * outer 1440px cap from `app-shell.tsx`. Matches the /deadlines
   * page where the table benefits from the extra horizontal room
   * (jurisdiction + 7 entity columns + tier + chevrons). Default
   * stays at 1100px so /rules/pulse and /rules/coverage are
   * unaffected.
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
        {/* 2026-05-26 (Yuqi /rules/pulse fifth pass — B#1): page chrome
            now mirrors `/today` exactly — `mx-auto max-w-page-wide`
            cap + responsive padding (`px-4 md:px-6 pt-6 md:pt-8 pb-4
            md:pb-6`). Previously the shell used fixed `px-6 py-6`
            with no width cap, which read denser than every other
            page in the app. Yuqi asked for the same minimal feel
            as /today; this is that one-line change. */}
        <div
          className={cn(
            'mx-auto flex w-full flex-col gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6',
            wide ? 'max-w-[1440px]' : 'max-w-page-wide',
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
        'overflow-hidden rounded-md border border-divider-regular bg-background-default',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-[0.08em] whitespace-pre text-text-tertiary uppercase">
      {children}
    </p>
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
  // Active chip is neutral (`bg-text-primary` + `text-text-inverted`), NOT the
  // Dify UI blue — Figma 219:254 uses `text/primary` to keep the
  // wayfinding accent reserved for tab underline + sub-route
  // highlights only. Inactive chips are flat white pills with a 1 px hairline.
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {options.map((option) => {
        const active = option.value === value
        return (
          <Button
            key={option.value}
            type="button"
            size="xs"
            variant="secondary"
            className={cn(
              'h-[26px] rounded px-2.5 text-xs shadow-none',
              active
                ? 'border-transparent bg-text-primary text-text-inverted hover:bg-text-primary'
                : 'bg-background-default text-text-secondary',
            )}
            onClick={() => onValueChange(option.value)}
          >
            <span>{option.label}</span>
            <span className="tabular-nums">{option.count}</span>
          </Button>
        )
      })}
    </div>
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
      <AlertCircleIcon className="size-4 text-text-warning" aria-hidden />
      <span>{message}</span>
    </SectionFrame>
  )
}

export function JurisdictionCode({ code }: { code: string }) {
  return (
    <span className="inline-flex h-[18px] min-w-9 items-center justify-center rounded-sm bg-background-subtle px-2 font-mono text-xs font-medium tabular-nums text-text-secondary">
      {code}
    </span>
  )
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
    <Badge variant="outline" className="h-[22px] rounded-full px-2 text-xs">
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
