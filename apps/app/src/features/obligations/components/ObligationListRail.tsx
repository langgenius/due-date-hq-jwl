import { useMemo, useState } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'

import type { ObligationQueueRow } from '@duedatehq/contracts'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

import {
  ListRail,
  ListRailBody,
  ListRailHead,
  ListRailSection,
  useRailArrival,
} from '@/components/patterns/list-rail'
import { QueryErrorState } from '@/components/patterns/query-error-state'
import { CountPill } from '@/components/primitives/count-pill'
import { SearchInput } from '@/components/primitives/search-input'
import { DueCountdownText } from '@/components/primitives/due-date-label'
import { JurisdictionChip } from '@/components/primitives/state-badge'
import {
  dueCountdownTone,
  DUE_COUNTDOWN_TEXT_CLASS_QUIET,
} from '@/features/_surface-vocabulary/due-date-tone'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { ObligationStatusReadBadge } from '@/features/obligations/status-control'

/**
 * The 380px deadline secondary sidebar shown on the full-page
 * /deadlines detail layout — mirrors the /alerts `AlertListRail` so
 * the master-detail pattern reads the same across the product. Its
 * own `Deadlines · N overdue` head, a search, and a compact-item body
 * (due column + state/form badges + client + status). The open
 * deadline's item carries the 2px left accent.
 *
 * When a deadline is open the full table is hidden and this rail is
 * the list.
 */
export function ObligationListRail({
  rows,
  activeId,
  onSelect,
  hasNextPage = false,
  onLoadMore,
  loadError = null,
}: {
  rows: readonly ObligationQueueRow[]
  activeId: string | null
  onSelect: (obligationId: string) => void
  hasNextPage?: boolean
  onLoadMore?: () => void
  /** S1: non-null when the backing list query FAILED — the rail shows the
   * shared inline error + Retry instead of "No deadlines match." */
  loadError?: { error: unknown; onRetry: () => void; retrying: boolean } | null
}) {
  const { t } = useLingui()
  const [search, setSearch] = useState('')

  // "N overdue" carries the one urgent cue; if nothing is overdue the chip
  // shows the neutral total instead (inventory count, not a call to action).
  // Overdue = past due AND still actionable — terminal rows (filed / paid /
  // completed / N-A) can't be "overdue" (same terminal set as the queue's
  // narrative banner), so this chip never contradicts the page's Overdue cell.
  const overdueCount = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.daysUntilDue < 0 &&
          r.status !== 'done' &&
          r.status !== 'paid' &&
          r.status !== 'completed' &&
          r.status !== 'not_applicable',
      ).length,
    [rows],
  )

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
    <ListRail>
      {/* ListHead — "Deadlines · N overdue / N open". */}
      <ListRailHead className="justify-between">
        <span className="text-item-title text-text-primary">
          <Trans>Deadlines</Trans>
        </span>
        {overdueCount > 0 ? (
          <CountPill>
            <Plural value={overdueCount} one="# overdue" other="# overdue" />
          </CountPill>
        ) : (
          // 2026-07-02 (ux-flow S4 count drift): this fallback used to say
          // "N open", but `rows` is the table's loaded list — every status,
          // filed included — so "open" over-claimed a scope the number never
          // had. "N in list" names the real source (same wording as the
          // detail navigator rail's resting chip).
          <span className="text-sm font-medium text-text-tertiary tabular-nums">
            <Plural value={rows.length} one="# in list" other="# in list" />
          </span>
        )}
      </ListRailHead>

      {/* FilterRow — search. */}
      <ListRailSection>
        <SearchInput
          variant="compact"
          value={search}
          onChange={setSearch}
          placeholder={t`Filter by client or form`}
          className="w-full"
        />
      </ListRailSection>

      {/* ListBody — compact items, the open one accented. */}
      <ListRailBody>
        {loadError && rows.length === 0 ? (
          // Failure ≠ empty: the list query errored, so "No deadlines match."
          // would claim an empty result the server never returned.
          <QueryErrorState
            size="inline"
            what={<Trans>deadlines</Trans>}
            error={loadError.error}
            onRetry={loadError.onRetry}
            retrying={loadError.retrying}
          />
        ) : visible.length === 0 ? (
          // Zero-results is a recovery moment, not a dead-end: when a filter is
          // narrowing the list to nothing, offer a one-click way back to the
          // full list (matches the page-level alerts/audit/notifications empties).
          <div className="px-[18px] py-10 text-center">
            <p className="text-base text-text-tertiary">
              <Trans>No deadlines match.</Trans>
            </p>
            {search.trim().length > 0 ? (
              <TextLink
                variant="accent"
                size="sm"
                onClick={() => setSearch('')}
                className="mt-2 inline-block"
              >
                <Trans>Clear filter</Trans>
              </TextLink>
            ) : null}
          </div>
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
                className="w-full cursor-pointer py-3 text-center text-base font-medium text-text-secondary outline-none transition-colors hover:bg-state-base-hover focus-visible:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt"
              >
                <Trans>Load more</Trans>
              </button>
            ) : null}
          </>
        )}
      </ListRailBody>
    </ListRail>
  )
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
  // Arrival: scroll the opened deadline into view on the rail's first paint +
  // play the one-time arrival wash (shared `useRailArrival`, parity with
  // AlertListRail + DeadlineNavigatorRail) — opening a deadline from deep in
  // the table used to leave the rail scrolled to the top with the selection
  // off-screen.
  const { ref, arrived } = useRailArrival<HTMLButtonElement>(active)
  const dueLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${row.currentDueDate}T00:00:00.000Z`))

  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={t`Deadline: ${row.clientName} ${row.taxType}`}
      className={cn(
        // Mirror the alert rail (AlertListRail) so the two detail-page
        // navigators feel identical: `group/rail` for hover-reveal dimming,
        // py-4, and selection by a LIGHT base-hover fill — not a left accent bar
        // (Yuqi: "rail has its edge"; accent isn't the steady-selection colour).
        'group/rail flex w-full cursor-pointer gap-3 border-b border-b-divider-subtle px-[18px] py-4 text-left outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt',
        active ? 'bg-state-base-hover' : 'hover:bg-state-base-hover-subtle',
        arrived && 'animate-arrival-wash',
      )}
    >
      {/* Due column (64px). Dims on unselected items so the open deadline's
          date reads as the focal one (alert-rail parity); hover restores. */}
      <div
        className={cn(
          'flex w-[64px] shrink-0 flex-col gap-0.5 transition-opacity',
          !active && 'opacity-55 group-hover/rail:opacity-100',
        )}
      >
        <span className="text-sm font-medium text-text-primary tabular-nums">{dueLabel}</span>
        <span
          className={cn(
            'text-caption-xs font-medium tabular-nums',
            // Shared due-date tone (overdue=red, soon=amber, upcoming=muted) so
            // the rail's relative-due line colours lateness identically to the
            // due-days pill + /alerts — one source, not a hand-rolled late flag.
            DUE_COUNTDOWN_TEXT_CLASS_QUIET[dueCountdownTone(row.daysUntilDue)],
          )}
        >
          {/* Canonical countdown (2026-07-22 sweep) — same "#d late/today/in #d"
              wording as before, now i18n-correct and shared with every other
              deadline surface. daysUntilDue is already signed (neg = late). */}
          <DueCountdownText days={row.daysUntilDue} />
        </span>
      </div>

      {/* Content — badge meta row + client + status. */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div
          className={cn(
            'flex min-w-0 flex-wrap items-center gap-1.5 transition-opacity',
            !active && 'opacity-55 group-hover/rail:opacity-100',
          )}
        >
          {row.clientState ? (
            <JurisdictionChip code={row.clientState} className="shrink-0" />
          ) : null}
          <TaxCodeBadge code={row.taxType} />
        </div>
        {/* Client name — same type + 2-line clamp + active/secondary dimming as
            the alert rail title, so the two rails' primary line reads identically
            (active = primary ink, unselected = secondary). */}
        <span
          className={cn(
            'line-clamp-2 text-base font-medium leading-snug',
            active ? 'text-text-primary' : 'text-text-secondary',
          )}
        >
          {row.clientName}
        </span>
        <ObligationStatusReadBadge status={row.status} className="w-fit" />
      </div>
    </button>
  )
}
