import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Trans, useLingui } from '@lingui/react/macro'

import type { ObligationInstancePublic } from '@duedatehq/contracts'

import { cn } from '@duedatehq/ui/lib/utils'

import { StatTile } from '@/components/patterns/stat-tile'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { useFirmAsOfDate } from '@/features/firm/use-firm-as-of-date'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'

/**
 * ClientSummaryStrip — three-tile horizontal anchor on /clients/[id]:
 * Next due / At risk / Open filing. Always renders all three slots so
 * the strip stays a stable page anchor — empty slots use the `muted`
 * tone on the canonical StatTile (see `stat-tile.tsx`).
 *
 * Each tile is its own click target so the user drills straight into
 * the matching obligation (drawer) or filtered queue.
 */

// Terminal states per the 6-state lifecycle v2. `done` is "Filed" —
// the filing event shipped but payment may still be outstanding, so
// it is NOT terminal. Only `completed`/`not_applicable` are. Legacy
// `paid` stays in the set because it means filing + payment both done.
const TERMINAL_STATUSES = new Set(['paid', 'completed', 'not_applicable'])

export function ClientSummaryStrip({
  clientId,
  obligations,
  compact = false,
}: {
  clientId: string
  obligations: readonly ObligationInstancePublic[]
  /** When true, the strip switches from wrap-on-narrow to horizontal
   *  scroll so the three tiles stay on one row even when the
   *  obligation panel squeezes the left column (audit L9). */
  compact?: boolean
}) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { openDrawer: openObligationDrawer } = useObligationDrawer()
  // Anchor day-math to the firm's "as of" date (matches the dashboard).
  // Fallback to real-now when the hook returns an unparseable string so
  // the strip never breaks the page.
  const asOfDate = useFirmAsOfDate()

  const todayTs = useMemo(() => {
    const parsed = asOfDate ? Date.parse(asOfDate) : NaN
    if (!Number.isNaN(parsed)) return parsed
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [asOfDate])

  const nextDue = useMemo(() => {
    const open = obligations.filter((o) => !TERMINAL_STATUSES.has(o.status))
    let best: ObligationInstancePublic | null = null
    let bestTs = Infinity
    for (const o of open) {
      const ts = Date.parse(o.currentDueDate)
      if (!Number.isNaN(ts) && ts < bestTs) {
        bestTs = ts
        best = o
      }
    }
    return best
  }, [obligations])

  // Blocked count tracks the destination filter (?status=blocked)
  // exactly so the tile and the deadlines queue agree on what they
  // mean. Earlier the count was a broader "at risk" set (blocked +
  // efile-rejected + payment-overdue + past-due) but the click went
  // to ?status=blocked only — the audit (L8) flagged the mismatch.
  // Payment-overdue and efile-rejected still surface as row-level
  // chips in the filing plan; the strip's job here is to anchor the
  // blocked count.
  const blockedCount = useMemo(
    () => obligations.filter((o) => o.status === 'blocked').length,
    [obligations],
  )

  const openCount = useMemo(
    () => obligations.filter((o) => !TERMINAL_STATUSES.has(o.status)).length,
    [obligations],
  )

  // `asChild` so TaxCodeLabel renders its TooltipTrigger as a <span>,
  // not a <button>. The tile itself is a <button> (StatTile renders one
  // when `onClick` is set), so without `asChild` we'd get
  // button-in-button DOM nesting and a hydration warning.
  const nextDueValue: React.ReactNode = nextDue ? (
    <TaxCodeLabel code={nextDue.taxType} asChild />
  ) : (
    '—'
  )
  const nextDueProps = nextDue
    ? { onClick: () => openObligationDrawer(nextDue.id), ariaLabel: t`Open next-due deadline` }
    : {}
  const blockedProps =
    blockedCount > 0
      ? {
          onClick: () => void navigate(`/deadlines?client=${clientId}&status=blocked`),
          ariaLabel: t`View blocked deadlines`,
        }
      : {}
  const openProps =
    openCount > 0
      ? {
          onClick: () => void navigate(`/deadlines?client=${clientId}`),
          ariaLabel: t`View open filings for this client`,
        }
      : {}

  return (
    <section
      aria-label={t`Client summary`}
      className={cn(
        'flex gap-3',
        compact ? 'flex-nowrap overflow-x-auto' : 'flex-wrap',
      )}
    >
      <StatTile
        tone={nextDue ? 'neutral' : 'muted'}
        value={nextDueValue}
        label={<Trans>Next filing</Trans>}
        {...nextDueProps}
      />
      <StatTile
        tone={blockedCount > 0 ? 'critical' : 'muted'}
        value={blockedCount}
        label={<Trans>Blocked</Trans>}
        {...blockedProps}
      />
      <StatTile
        tone={openCount > 0 ? 'neutral' : 'muted'}
        value={openCount}
        label={<Trans>Open filing</Trans>}
        {...openProps}
      />
    </section>
  )
}
