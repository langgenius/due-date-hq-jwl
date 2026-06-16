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

type SummaryCell = {
  key: string
  label: string
  /** Pre-rendered value node (a mono number, a date, or jurisdiction chips). */
  value: ReactNode
  onClick?: () => void
  ariaLabel?: string
}

/**
 * ClientSummaryStrip — the /clients/[id] hero fact strip: Jurisdictions ·
 * Blocked · Open · Filed · Next due.
 *
 * Replicates Pencil `VtC73`: a single `bg-subtle` rounded-xl panel with the
 * facts as hairline-divider cells inside (10/700 muted label + a big
 * JetBrains-Mono number, color-coded). One grouped panel — not a stretched
 * borderless band, not five separate bordered cards — so the facts read as a
 * defined block. Count cells drill into the matching filtered queue.
 */
export function ClientSummaryStrip({
  client,
  obligations,
  isLoading,
}: {
  client: ClientPublic
  obligations: readonly ObligationInstancePublic[]
  /** In-flight obligations fetch — shows a skeleton panel instead of computing
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
  // profile's state. Sorted, deduped.
  const jurisdictions = useMemo(() => {
    const set = new Set<string>()
    if (client.state) set.add(client.state)
    for (const profile of client.filingProfiles) {
      if (!profile.archivedAt) set.add(profile.state)
    }
    return [...set].toSorted()
  }, [client.state, client.filingProfiles])

  if (isLoading) {
    return <Skeleton className="h-[84px] w-full rounded-xl" />
  }

  // Big mono number (VtC73: JetBrains Mono 24/700, color-coded). Dim to tertiary
  // when zero so an empty count reads as "nothing here", not a loud signal.
  const num = (value: number, tone: string) => (
    <span
      className={cn(
        'font-mono text-2xl leading-none font-semibold tracking-tight tabular-nums',
        value > 0 ? tone : 'text-text-tertiary',
      )}
    >
      {value}
    </span>
  )

  const cells: SummaryCell[] = [
    {
      key: 'jurisdictions',
      label: t`Jurisdictions`,
      value:
        jurisdictions.length > 0 ? (
          <span className="flex flex-wrap items-center gap-2">
            {jurisdictions.map((code) => (
              <span
                key={code}
                className="inline-flex items-center gap-1 rounded-lg bg-background-section px-2 py-1"
              >
                <StateBadge code={code} size="xs" preview={false} />
                <span className="text-sm font-semibold text-text-primary">{code}</span>
              </span>
            ))}
          </span>
        ) : (
          <span className="font-mono text-2xl leading-none font-semibold text-text-tertiary">—</span>
        ),
    },
    {
      key: 'blocked',
      label: t`Blocked`,
      value: num(blockedCount, 'text-text-warning'),
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
      value: num(openCount, 'text-text-primary'),
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
      value: num(filedCount, 'text-text-success'),
    },
    {
      key: 'next-due',
      label: t`Next due`,
      value: nextDue ? (
        <span
          className={cn(
            'font-mono text-2xl leading-none font-semibold tracking-tight tabular-nums',
            nextDueOverdue ? 'text-text-warning' : 'text-text-primary',
          )}
        >
          {formatDatePretty(nextDue.currentDueDate)}
        </span>
      ) : (
        <span className="font-mono text-2xl leading-none font-bold text-text-tertiary">—</span>
      ),
    },
  ]

  return (
    <section
      aria-label={t`Client summary`}
      // One grouped panel (VtC73 MetaStrip): bg-subtle rounded-xl, cells split
      // by hairline dividers. flex-wrap so it stacks gracefully when squeezed.
      className="flex flex-wrap rounded-xl bg-background-subtle px-2 py-3"
    >
      {cells.map((cell, i) => {
        const body = (
          <>
            <span className="text-caption-xs font-medium tracking-eyebrow uppercase text-text-muted">
              {cell.label}
            </span>
            <span className="flex min-h-[28px] items-center">{cell.value}</span>
          </>
        )
        const cellClass = cn(
          'flex min-w-0 flex-1 flex-col justify-center gap-2 px-4',
          i > 0 && 'border-l border-divider-subtle',
        )
        if (cell.onClick) {
          return (
            <button
              key={cell.key}
              type="button"
              onClick={cell.onClick}
              aria-label={cell.ariaLabel}
              className={cn(
                cellClass,
                '-my-2 cursor-pointer rounded-lg py-2 text-left transition-colors hover:bg-background-default-hover',
                'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none',
              )}
            >
              {body}
            </button>
          )
        }
        return (
          <div key={cell.key} className={cellClass}>
            {body}
          </div>
        )
      })}
    </section>
  )
}
