import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { Trans, useLingui } from '@lingui/react/macro'

import type { ObligationInstancePublic } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'

/**
 * ClientSummaryStrip — three-tile horizontal strip on the Client detail
 * page that answers "what should I do here?" in a single scan: Next due,
 * At risk, Team.
 *
 * Visual rhythm mirrors `apps/app/src/features/dashboard/exposure-strip.tsx`:
 * Link-styled tiles, big sans-serif numeral over a small label, only
 * truly-stuck signals use the destructive tone.
 *
 * Each tile is its own click target so the user can drill straight into
 * the matching obligation row (via the drawer) or into a filtered queue
 * view, instead of bouncing through the page first.
 */

type TileTone = 'neutral' | 'warning' | 'critical' | 'muted'

function TileShell({
  tone,
  value,
  label,
  onClick,
  to,
  ariaLabel,
}: {
  tone: TileTone
  value: React.ReactNode
  label: React.ReactNode
  onClick?: (() => void) | undefined
  to?: string | undefined
  ariaLabel?: string | undefined
}) {
  const valueClass = cn(
    'text-xl font-semibold leading-tight tabular-nums tracking-tight',
    tone === 'critical' && 'text-text-destructive',
    tone === 'warning' && 'text-text-warning',
    tone === 'neutral' && 'text-text-primary',
    tone === 'muted' && 'text-text-tertiary',
  )
  const baseClass =
    'group flex min-w-[160px] flex-1 flex-col gap-1 rounded-md border border-divider-subtle bg-background-default px-4 py-3 transition-colors hover:border-divider-regular hover:bg-background-default-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-accent-active-alt'

  if (to) {
    return (
      <Link to={to} aria-label={ariaLabel} className={baseClass}>
        <span className={valueClass}>{value}</span>
        <span className="text-sm text-text-secondary">{label}</span>
      </Link>
    )
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(baseClass, 'text-left')}
      >
        <span className={valueClass}>{value}</span>
        <span className="text-sm text-text-secondary">{label}</span>
      </button>
    )
  }
  return (
    <div className={baseClass} aria-label={ariaLabel}>
      <span className={valueClass}>{value}</span>
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  )
}

// Open = obligation is still doing work. We exclude terminal states.
const TERMINAL_STATUSES = new Set(['done', 'paid', 'completed', 'filed', 'not_applicable'])

function isAtRisk(o: ObligationInstancePublic, today: number): boolean {
  if (o.status === 'blocked') return true
  if (o.status === 'review' && o.efileRejectedAt != null) return true
  const due = Date.parse(o.currentDueDate)
  if (!Number.isNaN(due) && due < today && !TERMINAL_STATUSES.has(o.status)) return true
  return false
}

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

  const todayTs = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [])

  const atRiskCount = useMemo(
    () => obligations.filter((o) => isAtRisk(o, todayTs)).length,
    [obligations, todayTs],
  )

  let nextDueValue: React.ReactNode = t`Nothing open`
  let nextDueLabel: React.ReactNode = <Trans>Next due</Trans>
  let nextDueTone: TileTone = 'muted'
  let nextDueOnClick: (() => void) | undefined
  let nextDueAria: string | undefined

  if (nextDue) {
    const dueTs = Date.parse(nextDue.currentDueDate)
    const days = Math.ceil((dueTs - Date.now()) / 86_400_000)
    const daysText = days <= 0 ? t`${days}d` : t`${days}d`
    nextDueValue = (
      <span className="flex items-baseline gap-2">
        {/* `asChild` so TaxCodeLabel renders its TooltipTrigger as a
            <span>, not a <button>. The Next-due tile itself is a
            <button> (TileShell renders one when `onClick` is set), so
            without `asChild` we get button-in-button DOM nesting and
            a hydration warning. */}
        <TaxCodeLabel code={nextDue.taxType} asChild />
        <span className="text-sm font-medium text-text-secondary">{daysText}</span>
      </span>
    )
    nextDueLabel = <Trans>Next due</Trans>
    nextDueTone = days <= 0 ? 'warning' : days <= 7 ? 'neutral' : 'neutral'
    nextDueOnClick = () => openObligationDrawer(nextDue.id)
    nextDueAria = t`Open next-due deadline`
  }

  // Two tiles (Next due / At risk). The earlier 3-tile shape had a
  // "Team" tile that just counted unique `reviewerUserId`s — weak
  // signal that didn't tell the CPA who's actually on this client. A
  // proper owner-avatar treatment is queued separately (see
  // docs/Design/clients-user-journey-2026-05-22.md "Team / Owner
  // surfacing" follow-up).
  return (
    <section aria-label={t`Client summary`} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TileShell
        tone={nextDueTone}
        value={nextDueValue}
        label={nextDueLabel}
        onClick={nextDueOnClick}
        ariaLabel={nextDueAria}
      />
      <TileShell
        tone={atRiskCount > 0 ? 'critical' : 'muted'}
        value={atRiskCount}
        label={<Trans>At risk</Trans>}
        onClick={
          atRiskCount > 0
            ? () => void navigate(`/obligations?client=${clientId}&status=blocked`)
            : undefined
        }
        ariaLabel={t`View at-risk deadlines`}
      />
    </section>
  )
}
