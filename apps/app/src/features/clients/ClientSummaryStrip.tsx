import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useLingui } from '@lingui/react/macro'

import type { ClientPublic, ObligationInstancePublic } from '@duedatehq/contracts'
import { StatBand, type StatBandItem } from '@/components/patterns/stat-band'
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

/**
 * ClientSummaryStrip — the /clients/[id] hero meta strip. Matches Pencil
 * `ibWOx`: Jurisdictions · Blocked · Open · Filed. Reuses the shared
 * `StatBand` (the canonical card-summary band) + the `Badge` outline chip the
 * /clients list uses for state codes — no bespoke strip. Jurisdiction chips are
 * the client's distinct filing states; the three counts come straight from the
 * obligation set, color-coded per the canvas (blocked warm, filed green).
 *
 * Each numeric stat drills into the matching filtered deadlines queue.
 */
export function ClientSummaryStrip({
  client,
  obligations,
  isLoading,
}: {
  client: ClientPublic
  obligations: readonly ObligationInstancePublic[]
  /** In-flight obligations fetch — shows the band skeleton instead of
   *  computing falsely-calm zeros from an empty obligation set. */
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

  const stats: StatBandItem[] = [
    {
      key: 'jurisdictions',
      label: t`Jurisdictions`,
      value:
        jurisdictions.length > 0 ? (
          <span className="flex flex-wrap items-center gap-2">
            {jurisdictions.map((code) => (
              <span key={code} className="inline-flex items-center gap-1">
                <StateBadge code={code} size="xs" preview={false} />
                <span className="text-sm font-medium text-text-secondary">{code}</span>
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
      // Next due — moved off the header subtitle into the strip (Yuqi). The
      // soonest open deadline + an on-track/overdue read; the Healthy/At-risk
      // pill in the title carries the overall health, so this stays factual.
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

  return <StatBand stats={stats} loading={isLoading ?? false} ariaLabel={t`Client summary`} />
}
