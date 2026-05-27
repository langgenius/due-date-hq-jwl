import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Trans, useLingui } from '@lingui/react/macro'

import type { ObligationInstancePublic } from '@duedatehq/contracts'

import { cn } from '@duedatehq/ui/lib/utils'

import { StatTile } from '@/components/patterns/stat-tile'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'

import { useClientNextDue } from './use-client-next-due'

/**
 * ClientSummaryStrip — three-tile horizontal anchor on /clients/[id]:
 * Next filing / Blocked / Open filing. Always renders all three slots
 * so the strip stays a stable page anchor — empty slots use the `muted`
 * tone on the canonical StatTile (see `stat-tile.tsx`).
 *
 * Each tile is its own click target so the user drills straight into
 * the matching obligation (drawer) or filtered queue.
 */
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
  const { nextDue, openCount } = useClientNextDue(obligations)

  // Blocked count tracks the destination filter (?status=blocked)
  // exactly so the tile and the deadlines queue agree on what they
  // mean. Earlier the count was a broader "at risk" set; the audit
  // (L8) flagged the mismatch. Payment-overdue + efile-rejected
  // still surface as row-level chips in the filing plan.
  const blockedCount = useMemo(
    () => obligations.filter((o) => o.status === 'blocked').length,
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
      className={cn('flex gap-3', compact ? 'flex-nowrap overflow-x-auto' : 'flex-wrap')}
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
