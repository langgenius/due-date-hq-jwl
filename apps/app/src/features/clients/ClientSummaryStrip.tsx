import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useLingui } from '@lingui/react/macro'

import type { ClientPublic, ObligationInstancePublic } from '@duedatehq/contracts'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'
import { StateBadge } from '@/components/primitives/state-badge'
import { formatDatePretty } from '@/lib/utils'

import { useClientNextDue } from './use-client-next-due'

// "Filed" counts filings that are done/closed. `done` is the status that
// displays as "Filed" (Filed ≠ Done per the workflow), `completed` is the v2
// terminal, `paid` is filed + paid. `not_applicable` is deliberately excluded —
// it's not a filing. Labeled "Filed" (not "Filed YTD") because this is a
// status-based count with no year-to-date date window — matching the /clients
// table column (ClientFactsWorkspace), which was renamed for the same reason.
const FILED_STATUSES: ReadonlySet<string> = new Set(['done', 'completed', 'paid'])

type SummaryCard = {
  key: string
  label: string
  value: ReactNode
  valueClass?: string
  sub?: ReactNode
  subClass?: string
  onClick?: () => void
  ariaLabel?: string
}

/**
 * ClientSummaryStrip — the /clients/[id] hero fact row: Jurisdictions ·
 * Blocked · Open · Filed · Next due.
 *
 * Rendered as the same bordered fact-cards the /deadlines and /alerts detail
 * surfaces use (rounded-lg + divider-subtle border, CAPS label / bold value /
 * caption sub) so the three detail pages read as one design system — and so
 * the facts cluster into defined cards instead of stranding in a stretched
 * borderless band. Count cards drill into the matching filtered queue.
 */
export function ClientSummaryStrip({
  client,
  obligations,
  isLoading,
}: {
  client: ClientPublic
  obligations: readonly ObligationInstancePublic[]
  /** In-flight obligations fetch — shows skeleton cards instead of computing
   *  falsely-calm zeros from an empty obligation set. */
  isLoading?: boolean
}) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { nextDue, openCount } = useClientNextDue(obligations)
  const nextDueOverdue = nextDue ? Date.parse(nextDue.currentDueDate) < Date.now() : false

  const blockedCount = useMemo(
    () => obligations.filter((o) => o.status === 'blocked').length,
    [obligations],
  )

  // Filed — obligations that have been filed/closed (see FILED_STATUSES).
  const filedCount = useMemo(
    () => obligations.filter((o) => FILED_STATUSES.has(o.status)).length,
    [obligations],
  )

  // Distinct filing jurisdictions: the primary state + each non-archived filing
  // profile's state. Sorted, deduped — rendered as the same outline state chip
  // the /clients list uses.
  const jurisdictions = useMemo(() => {
    const set = new Set<string>()
    if (client.state) set.add(client.state)
    for (const profile of client.filingProfiles) {
      if (!profile.archivedAt) set.add(profile.state)
    }
    return [...set].toSorted()
  }, [client.state, client.filingProfiles])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
        ))}
      </div>
    )
  }

  const cards: SummaryCard[] = [
    {
      key: 'jurisdictions',
      label: t`Jurisdictions`,
      value:
        jurisdictions.length > 0 ? (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {jurisdictions.map((code) => (
              <span key={code} className="inline-flex items-center gap-1">
                <StateBadge code={code} size="xs" preview={false} />
                <span className="text-sm font-semibold text-text-primary">{code}</span>
              </span>
            ))}
          </span>
        ) : (
          '—'
        ),
      valueClass: jurisdictions.length > 0 ? 'text-text-primary' : 'text-text-tertiary',
    },
    {
      key: 'blocked',
      label: t`Blocked`,
      value: blockedCount,
      valueClass: blockedCount > 0 ? 'text-text-warning' : 'text-text-tertiary',
      sub: blockedCount > 0 ? t`Needs attention` : t`None blocked`,
      subClass: blockedCount > 0 ? 'text-text-warning' : 'text-text-tertiary',
      ...(blockedCount > 0
        ? {
            onClick: () => void navigate(`/deadlines?client=${client.id}&status=blocked`),
            ariaLabel: t`View blocked deadlines`,
          }
        : {}),
    },
    {
      key: 'open',
      label: t`Open`,
      value: openCount,
      valueClass: openCount > 0 ? 'text-text-primary' : 'text-text-tertiary',
      sub: openCount > 0 ? t`In progress` : t`Nothing open`,
      ...(openCount > 0
        ? {
            onClick: () => void navigate(`/deadlines?client=${client.id}`),
            ariaLabel: t`View open filings for this client`,
          }
        : {}),
    },
    {
      key: 'filed',
      label: t`Filed`,
      value: filedCount,
      valueClass: filedCount > 0 ? 'text-text-success' : 'text-text-tertiary',
      sub: filedCount > 0 ? t`Closed out` : t`None filed`,
      subClass: filedCount > 0 ? 'text-text-success' : 'text-text-tertiary',
    },
    {
      // Next due — the soonest open deadline + an on-track/overdue read; the
      // Healthy/At-risk pill in the title carries overall health, so this
      // stays factual.
      key: 'next-due',
      label: t`Next due`,
      value: nextDue ? formatDatePretty(nextDue.currentDueDate) : '—',
      valueClass: nextDue
        ? nextDueOverdue
          ? 'text-text-warning'
          : 'text-text-primary'
        : 'text-text-tertiary',
      sub: nextDue ? (nextDueOverdue ? t`Overdue` : t`On track`) : t`Nothing scheduled`,
      subClass: nextDueOverdue ? 'text-text-warning' : 'text-text-tertiary',
    },
  ]

  return (
    <section
      aria-label={t`Client summary`}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"
    >
      {cards.map((card) => {
        const body = (
          <>
            <span className="truncate text-caption-xs font-semibold uppercase tracking-[0.4px] text-text-tertiary">
              {card.label}
            </span>
            <span
              className={cn(
                'text-base font-semibold leading-tight tabular-nums',
                card.valueClass ?? 'text-text-primary',
              )}
            >
              {card.value}
            </span>
            {card.sub != null ? (
              <span
                className={cn('truncate text-caption-xs font-medium', card.subClass ?? 'text-text-tertiary')}
              >
                {card.sub}
              </span>
            ) : null}
          </>
        )

        // Shared fact-card chrome (rounded-lg + divider-subtle border), matching
        // the /deadlines + /alerts detail fact cards.
        const cardClass = 'flex min-w-0 flex-col gap-1 rounded-lg border border-divider-subtle bg-background-default px-3 py-2.5'

        if (card.onClick) {
          return (
            <button
              key={card.key}
              type="button"
              onClick={card.onClick}
              aria-label={card.ariaLabel}
              className={cn(
                cardClass,
                'cursor-pointer text-left transition-colors hover:border-state-accent-active-alt hover:bg-state-base-hover',
                'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none',
              )}
            >
              {body}
            </button>
          )
        }
        return (
          <div key={card.key} className={cardClass}>
            {body}
          </div>
        )
      })}
    </section>
  )
}
