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
 * At risk, Open Filing.
 *
 * 2026-05-23: Tile 3 swapped from Team → Open Filing. The owner (who is
 * this client assigned to?) now lives as a pill in the H1 chip cluster,
 * so the third tile slot can carry a count signal instead. Each tile
 * also gains a quiet secondary line under the value — "17 days late"
 * under Next due, the kind of obligation under At risk, etc.
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
  subline,
  sublineTone = 'tertiary',
  onClick,
  to,
  ariaLabel,
}: {
  tone: TileTone
  value: React.ReactNode
  label: React.ReactNode
  subline?: React.ReactNode
  sublineTone?: 'tertiary' | 'destructive'
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
  // Tile chrome: `divider-regular` (8%) at rest. Previously
  // `divider-subtle` (4%) — paired with the white `background-default`
  // body, the tiles read as "barely there boxes" against the page,
  // contributing to the overall "pale and white" feel. Bumping the
  // border to match the panel chrome elsewhere on the detail page
  // gives the summary strip presence as a real section.
  const baseClass =
    'group flex min-w-[160px] flex-1 flex-col gap-1 rounded-md border border-divider-regular bg-background-default px-4 py-3 transition-colors hover:border-divider-deep hover:bg-background-default-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-accent-active-alt'

  // Inner content shared by all three variants. Renders label → value
  // → optional subline so each tile reads top-down (eyebrow → number
  // → context phrase). The subline is the new piece (2026-05-23) —
  // carries the small explanatory phrase the design shows beneath the
  // big number ("17 days late", "some context here") so the user
  // doesn't need to hover/click to find the secondary detail.
  const body = (
    <>
      <span className="text-xs font-medium tracking-[0.08em] text-text-tertiary uppercase">
        {label}
      </span>
      <span className={valueClass}>{value}</span>
      {subline ? (
        <span
          className={cn(
            'text-xs leading-snug',
            sublineTone === 'destructive' ? 'text-text-destructive' : 'text-text-tertiary',
          )}
        >
          {subline}
        </span>
      ) : null}
    </>
  )

  if (to) {
    return (
      <Link to={to} aria-label={ariaLabel} className={baseClass}>
        {body}
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
        {body}
      </button>
    )
  }
  return (
    <div className={baseClass} aria-label={ariaLabel}>
      {body}
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

  // Open filing count (2026-05-23). All non-terminal obligations on
  // this client — the third tile slot's number. "Open filing" matches
  // the language used in /clients table (Open count column) and the
  // year-section badge in the Filing plan below.
  const openCount = useMemo(
    () => obligations.filter((o) => !TERMINAL_STATUSES.has(o.status)).length,
    [obligations],
  )

  let nextDueValue: React.ReactNode = t`Nothing open`
  let nextDueLabel: React.ReactNode = <Trans>Next due</Trans>
  let nextDueTone: TileTone = 'muted'
  let nextDueOnClick: (() => void) | undefined
  let nextDueAria: string | undefined
  let nextDueSubline: React.ReactNode = null
  let nextDueSublineTone: 'tertiary' | 'destructive' = 'tertiary'

  if (nextDue) {
    const dueTs = Date.parse(nextDue.currentDueDate)
    const days = Math.ceil((dueTs - Date.now()) / 86_400_000)
    // Date format matches what ClientDetailDrawer + ClientPeekHoverCard
    // already use — `5d late` / `due today` / `due in 12d`. The
    // earlier `${days}d` form (e.g. `-17d`) read as a math expression,
    // not a deadline, and was inconsistent with the rest of the app.
    const daysAbs = Math.abs(days)
    // Subline carries the lateness phrase. Late deadlines tint
    // destructive so the tile reads as a real alert without making
    // the form code itself red.
    const sublineText =
      days < 0 ? t`${daysAbs} days late` : days === 0 ? t`Due today` : t`Due in ${days} days`
    nextDueValue = (
      <span className="inline-flex items-baseline gap-2">
        {/* `asChild` so TaxCodeLabel renders its TooltipTrigger as a
            <span>, not a <button>. The Next-due tile itself is a
            <button> (TileShell renders one when `onClick` is set), so
            without `asChild` we get button-in-button DOM nesting and
            a hydration warning. */}
        <TaxCodeLabel code={nextDue.taxType} asChild />
      </span>
    )
    nextDueLabel = <Trans>Next due</Trans>
    nextDueTone = days <= 0 ? 'warning' : days <= 7 ? 'neutral' : 'neutral'
    nextDueOnClick = () => openObligationDrawer(nextDue.id)
    nextDueAria = t`Open next-due deadline`
    nextDueSubline = sublineText
    nextDueSublineTone = days < 0 ? 'destructive' : 'tertiary'
  }

  // At-risk subline — explains *why* the tile is non-zero in one
  // phrase. Empty state shows nothing under "0" so the tile reads as
  // calm. Non-zero pulls "Blocked or overdue" as the canonical
  // shorthand for the isAtRisk() predicate above (which OR's
  // status='blocked', a rejected efile, or past-due non-terminal).
  const atRiskSubline =
    atRiskCount > 0 ? (atRiskCount === 1 ? t`Blocked or overdue` : t`Blocked or overdue`) : null

  // Open-filing subline — count of forms in the filing plan that are
  // still doing work. Singular vs plural phrasing.
  const openFilingSubline =
    openCount === 0
      ? t`Nothing open right now`
      : openCount === 1
        ? t`1 form in motion`
        : t`${openCount} forms in motion`

  return (
    <section
      aria-label={t`Client summary`}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <TileShell
        tone={nextDueTone}
        value={nextDueValue}
        label={nextDueLabel}
        subline={nextDueSubline}
        sublineTone={nextDueSublineTone}
        onClick={nextDueOnClick}
        ariaLabel={nextDueAria}
      />
      <TileShell
        tone={atRiskCount > 0 ? 'critical' : 'muted'}
        value={atRiskCount}
        label={<Trans>At risk</Trans>}
        subline={atRiskSubline}
        sublineTone={atRiskCount > 0 ? 'destructive' : 'tertiary'}
        onClick={
          atRiskCount > 0
            ? () => void navigate(`/obligations?client=${clientId}&status=blocked`)
            : undefined
        }
        ariaLabel={t`View at-risk deadlines`}
      />
      <TileShell
        tone={openCount > 0 ? 'neutral' : 'muted'}
        value={openCount}
        label={<Trans>Open filing</Trans>}
        subline={openFilingSubline}
        onClick={openCount > 0 ? () => void navigate(`/obligations?client=${clientId}`) : undefined}
        ariaLabel={t`View open filings for this client`}
      />
    </section>
  )
}

// `TeamAvatarStack` + the team-tint palette + the hashTeamMember
// helper were dropped 2026-05-23 with the Team-tile retirement. The
// owner identity now lives in the H1 chip cluster (see
// ClientOwnerHeaderPill in ClientFactsWorkspace.tsx) and the third
// summary tile slot carries Open Filing instead. Git history has the
// stack component if we ever bring back a multi-reviewer surface.
