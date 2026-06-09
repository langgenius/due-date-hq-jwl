import { useMemo, useState } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { SearchIcon } from 'lucide-react'

import type { ObligationQueueRow } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

import { CountPill } from '@/components/primitives/count-pill'
import { StateBadge } from '@/components/primitives/state-badge'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { ObligationStatusReadBadge } from '@/features/obligations/status-control'

/**
 * 2026-06-08 (Yuqi "standardize on compact rail"): the 380px deadline
 * secondary sidebar shown on the full-page /deadlines detail layout —
 * mirrors the /alerts `AlertListRail` so the master-detail pattern reads
 * the same across the product. Its own `Deadlines · N overdue` head, a
 * search, and a compact-item body (due column + state/form badges +
 * client + status). The open deadline's item carries the 2px left accent.
 *
 * Replaces the prior "table shrinks beside the detail" split: when a
 * deadline is open the full table is hidden and this rail is the list.
 */
export function ObligationListRail({
  rows,
  activeId,
  onSelect,
  hasNextPage = false,
  onLoadMore,
}: {
  rows: readonly ObligationQueueRow[]
  activeId: string | null
  onSelect: (obligationId: string) => void
  hasNextPage?: boolean
  onLoadMore?: () => void
}) {
  const { t } = useLingui()
  const [search, setSearch] = useState('')

  // "N overdue" carries the one urgent cue; if nothing is overdue the chip
  // shows the neutral total instead (inventory count, not a call to action).
  const overdueCount = useMemo(() => rows.filter((r) => r.daysUntilDue < 0).length, [rows])

  const query = search.trim().toLowerCase()
  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          query === '' ||
          r.clientName.toLowerCase().includes(query) ||
          r.taxType.toLowerCase().includes(query),
      ),
    [rows, query],
  )

  return (
    <div className="flex h-full w-[380px] shrink-0 flex-col border-r border-divider-subtle bg-background-default">
      {/* ListHead — "Deadlines · N overdue / N open". */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-divider-subtle px-[18px] py-3.5">
        <span className="text-[15px] font-semibold text-text-primary">
          <Trans>Deadlines</Trans>
        </span>
        {overdueCount > 0 ? (
          <CountPill>
            <Plural value={overdueCount} one="# overdue" other="# overdue" />
          </CountPill>
        ) : (
          <span className="text-[12px] font-medium text-text-tertiary tabular-nums">
            <Plural value={rows.length} one="# open" other="# open" />
          </span>
        )}
      </div>

      {/* FilterRow — search. */}
      <div className="flex shrink-0 items-center gap-2 border-b border-divider-subtle px-4 py-2.5">
        <label className="inline-flex h-7 w-full items-center gap-2 rounded-lg px-2 text-text-muted transition-colors focus-within:bg-state-base-hover hover:bg-state-base-hover">
          <SearchIcon className="size-3.5 shrink-0" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t`Search deadlines`}
            aria-label={t`Search deadlines`}
            className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-text-primary outline-none placeholder:text-text-muted"
          />
        </label>
      </div>

      {/* ListBody — compact items, the open one accented. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="px-[18px] py-10 text-center text-[13px] text-text-tertiary">
            <Trans>No deadlines match.</Trans>
          </p>
        ) : (
          <>
            {visible.map((row) => (
              <RailItem
                key={row.id}
                row={row}
                active={row.id === activeId}
                onSelect={() => onSelect(row.id)}
              />
            ))}
            {hasNextPage && onLoadMore ? (
              <button
                type="button"
                onClick={onLoadMore}
                className="w-full cursor-pointer py-3 text-center text-[13px] font-medium text-text-secondary outline-none transition-colors hover:bg-state-base-hover focus-visible:bg-state-base-hover"
              >
                <Trans>Load more</Trans>
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

function relativeDueLabel(daysUntilDue: number): { text: string; late: boolean } {
  if (daysUntilDue < 0) return { text: `${Math.abs(daysUntilDue)}d late`, late: true }
  if (daysUntilDue === 0) return { text: 'today', late: false }
  return { text: `in ${daysUntilDue}d`, late: false }
}

function RailItem({
  row,
  active,
  onSelect,
}: {
  row: ObligationQueueRow
  active: boolean
  onSelect: () => void
}) {
  const { t } = useLingui()
  const dueLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${row.currentDueDate}T00:00:00.000Z`))
  const relative = relativeDueLabel(row.daysUntilDue)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={t`Deadline: ${row.clientName} ${row.taxType}`}
      className={cn(
        'flex w-full cursor-pointer gap-3 border-b border-b-divider-subtle px-[18px] py-3.5 text-left outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt',
        active
          ? 'border-l-2 border-l-state-accent-solid bg-[#fafbfc]'
          : 'border-l-2 border-l-transparent hover:bg-state-base-hover',
      )}
    >
      {/* Due column (64px). */}
      <div className="flex w-[64px] shrink-0 flex-col gap-0.5">
        <span className="text-[12px] font-medium text-text-primary tabular-nums">{dueLabel}</span>
        <span
          className={cn(
            'text-[10px] font-medium tabular-nums',
            relative.late ? 'text-text-destructive' : 'text-text-muted',
          )}
        >
          {relative.text}
        </span>
      </div>

      {/* Content — badge meta row + client + status. */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {row.clientState ? (
            <span className="inline-flex h-[20px] shrink-0 items-center gap-1 rounded-lg border border-divider-regular px-1.5 text-[11px] font-semibold text-text-secondary uppercase">
              <StateBadge code={row.clientState} size="xs" style={{ width: 12, height: 12 }} />
              {row.clientState}
            </span>
          ) : null}
          <TaxCodeBadge code={row.taxType} />
        </div>
        <span className="truncate text-[13px] font-medium text-text-primary">{row.clientName}</span>
        <ObligationStatusReadBadge status={row.status} className="h-5 w-fit text-[11px]" />
      </div>
    </button>
  )
}
