import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useLingui } from '@lingui/react/macro'

import type { ObligationInstancePublic } from '@duedatehq/contracts'

import { StatBand, type StatBandItem } from '@/components/patterns/stat-band'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'
import { formatDatePretty } from '@/lib/utils'

import { useClientNextDue } from './use-client-next-due'

/**
 * ClientSummaryStrip — three-stat anchor on /clients/[id]: Next filing /
 * Blocked / Open filing. Renders the shared `StatBand` — the same "card
 * summary" component the rule-library overview, /rules/sources, and
 * /alerts/history use — so the four surfaces never drift apart again.
 * Always renders all three slots so the strip stays a stable page anchor;
 * empty slots whisper in the muted tone.
 *
 * Each stat is its own click target so the user drills straight into the
 * matching obligation (drawer) or filtered queue.
 */
export function ClientSummaryStrip({
  clientId,
  obligations,
}: {
  clientId: string
  obligations: readonly ObligationInstancePublic[]
}) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { openDrawer: openObligationDrawer } = useObligationDrawer()
  const { nextDue, openCount, paymentOverdueCount } = useClientNextDue(obligations)

  // Whether the soonest deadline is already past — drives the warning
  // tone on the "Next filing" sub so a late filing reads hot, matching
  // the colored subs on the rule-library / alerts bands.
  const nextDueOverdue = nextDue ? Date.parse(nextDue.currentDueDate) < Date.now() : false

  // Blocked count tracks the destination filter (?status=blocked)
  // exactly so the stat and the deadlines queue agree on what they
  // mean. Earlier the count was a broader "at risk" set; the audit
  // (L8) flagged the mismatch. Payment-overdue + efile-rejected
  // still surface as row-level chips in the filing plan.
  const blockedCount = useMemo(
    () => obligations.filter((o) => o.status === 'blocked').length,
    [obligations],
  )

  // `asChild` so TaxCodeLabel renders its TooltipTrigger as a <span>,
  // not a <button>. The stat column itself is a <button> when next-due
  // is set, so without `asChild` we'd get button-in-button DOM nesting
  // and a hydration warning.
  const nextDueValue: React.ReactNode = nextDue ? (
    <TaxCodeLabel code={nextDue.taxType} asChild />
  ) : (
    '—'
  )

  const stats: StatBandItem[] = [
    {
      key: 'next',
      label: t`Next filing`,
      value: nextDueValue,
      valueClass: nextDue ? 'text-text-primary' : 'text-text-tertiary',
      sub: nextDue ? t`Due ${formatDatePretty(nextDue.currentDueDate)}` : t`Nothing scheduled`,
      subClass: nextDueOverdue ? 'text-text-warning' : 'text-text-tertiary',
      ...(nextDue
        ? { onClick: () => openObligationDrawer(nextDue.id), ariaLabel: t`Open next-due deadline` }
        : {}),
    },
    {
      key: 'blocked',
      label: t`Blocked`,
      value: blockedCount,
      valueClass: blockedCount > 0 ? 'text-text-destructive' : 'text-text-tertiary',
      sub: blockedCount > 0 ? t`Needs attention` : t`None blocked`,
      subClass: blockedCount > 0 ? 'text-text-destructive' : 'text-text-tertiary',
      ...(blockedCount > 0
        ? {
            onClick: () => void navigate(`/deadlines?client=${clientId}&status=blocked`),
            ariaLabel: t`View blocked deadlines`,
          }
        : {}),
    },
    {
      key: 'open',
      label: t`Open filing`,
      value: openCount,
      valueClass: openCount > 0 ? 'text-text-primary' : 'text-text-tertiary',
      sub:
        openCount === 0
          ? t`Nothing open`
          : paymentOverdueCount > 0
            ? t`${paymentOverdueCount} payment overdue`
            : t`Payments current`,
      subClass: paymentOverdueCount > 0 ? 'text-text-warning' : 'text-text-tertiary',
      ...(openCount > 0
        ? {
            onClick: () => void navigate(`/deadlines?client=${clientId}`),
            ariaLabel: t`View open filings for this client`,
          }
        : {}),
    },
  ]

  return <StatBand stats={stats} ariaLabel={t`Client summary`} />
}
