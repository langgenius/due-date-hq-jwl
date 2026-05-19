import type { ReactNode } from 'react'
import { AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'

import type { RuleSource } from '@duedatehq/contracts'
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { PageHeader } from '@/components/patterns/page-header'
import { ConceptLabel } from '@/features/concepts/concept-help'

import type { CoverageCellState } from './rules-console-model'

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
export function RulesPageHeader({ title, description }: { title: string; description: string }) {
  return <PageHeader title={title} description={description} />
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
  compact = false,
  children,
}: {
  title: string
  description: string
  compact?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex w-full flex-col gap-6 px-6 py-6">
          {/* Header is unmounted in compact mode — not just visually
            collapsed. A collapsed-but-mounted div still consumes a
            flex `gap-6` slot above the next child, which created a
            ~48-72px dead space at the top of the review surface. */}
          {!compact ? <RulesPageHeader title={title} description={description} /> : null}
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
                ? 'border-text-primary bg-text-primary text-text-inverted hover:border-text-primary hover:bg-text-primary'
                : 'bg-background-default text-text-secondary',
            )}
            onClick={() => onValueChange(option.value)}
          >
            <span>{option.label}</span>
            <span className="font-mono tabular-nums">{option.count}</span>
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

export function CoverageCell({ state }: { state: CoverageCellState }) {
  const { t } = useLingui()
  const tone = state === 'verified' ? 'success' : state === 'review' ? 'warning' : 'disabled'
  const label = state === 'verified' ? t`active` : state === 'review' ? t`review` : t`no rule`
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-sm',
        state === 'verified' && 'text-text-primary',
        state === 'review' && 'text-severity-medium',
        state === 'none' && 'text-text-disabled',
      )}
    >
      <ToneDot tone={tone} />
      {label}
    </span>
  )
}

/**
 * Compact legend describing both axes of the Coverage status entity-dot
 * strip: *which entity each dot represents* (left-to-right order) and
 * *what tone means* (active / review / no rule). Lives above the table
 * rather than below so users see it before they encounter the dots.
 */
export function CoverageLegend() {
  return (
    <div className="flex flex-col gap-2 text-xs text-text-tertiary">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="shrink-0 font-medium tracking-[0.04em] text-text-tertiary uppercase">
          <Trans>Dot order</Trans>
        </span>
        <span aria-hidden>·</span>
        <span>LLC</span>
        <span aria-hidden>·</span>
        <span>Partnership</span>
        <span aria-hidden>·</span>
        <span>S-Corp</span>
        <span aria-hidden>·</span>
        <span>C-Corp</span>
        <span aria-hidden>·</span>
        <span>Sole prop</span>
        <span aria-hidden>·</span>
        <span>Trust</span>
        <span aria-hidden>·</span>
        <span>Individual</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <span className="inline-flex items-center gap-2">
          <ToneDot tone="success" />
          <ConceptLabel concept="verifiedRule">
            <Trans>active — accepted by this practice</Trans>
          </ConceptLabel>
        </span>
        <span className="inline-flex items-center gap-2">
          <ToneDot tone="warning" />
          <ConceptLabel concept="requiresReview">
            <Trans>review — needs CPA confirmation</Trans>
          </ConceptLabel>
        </span>
        <span className="inline-flex items-center gap-2">
          <ToneDot tone="disabled" />
          <Trans>no rule — not in MVP scope</Trans>
        </span>
      </div>
    </div>
  )
}

export function HealthBadge({ health }: { health: RuleSource['healthStatus'] }) {
  const { t } = useLingui()
  const tones: Record<typeof health, 'success' | 'warning' | 'error' | 'disabled'> = {
    healthy: 'success',
    degraded: 'warning',
    failing: 'error',
    paused: 'disabled',
  }
  const labels: Record<typeof health, string> = {
    healthy: t`Healthy`,
    degraded: t`Degraded`,
    failing: t`Failing`,
    paused: t`Paused`,
  }
  const tone = tones[health]
  return (
    <Badge variant="outline" className="h-[22px] rounded-full px-2 text-xs">
      <BadgeStatusDot tone={tone} className="size-1.5" />
      {labels[health]}
    </Badge>
  )
}

/**
 * Cross-page origin breadcrumb. Renders above a filtered table when the
 * user landed via a drill-in URL (e.g. `?from=coverage`, `?from=sources`,
 * `?from=cmd`). Shows the origin label + a Clear button that resets the
 * page to its default state.
 *
 * Each page owns its own Clear semantics (Library clears 4 filters,
 * Sources clears 2). The component itself is just the chrome — pass the
 * resolved label and onClear callback in.
 */
export function OriginBreadcrumb({
  label,
  onClear,
  clearLabel,
}: {
  label: string
  onClear: () => void
  clearLabel: string
}) {
  return (
    <div className="inline-flex h-8 w-fit items-center gap-2 rounded-md border border-divider-regular bg-background-subtle pr-1 pl-2.5 text-xs text-text-secondary">
      <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-text-accent" aria-hidden />
      <span>{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={clearLabel}
        className="ml-1 inline-flex h-6 items-center gap-1 rounded px-2 text-xs font-medium text-text-accent outline-none hover:bg-background-default focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        <Trans>Clear</Trans>
        <span aria-hidden>×</span>
      </button>
    </div>
  )
}

export function TableFooterBar({
  note,
  action,
  onAction,
}: {
  note: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="flex h-9 items-center justify-between bg-background-subtle px-3 text-xs text-text-tertiary">
      <span>{note}</span>
      {action && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="font-medium text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          {action}
        </button>
      ) : null}
    </div>
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
