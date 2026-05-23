import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { Trans, useLingui } from '@lingui/react/macro'

import type { ObligationInstancePublic } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'
import { formatDatePretty } from '@/lib/utils'

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
  // Tile chrome: `divider-regular` (8% black) at rest — matches the
  // Figma `components/panel/border` token. Previously paired with
  // `px-4 py-3` (16×12) — the vertical breathing room felt tight
  // next to the Figma reference's generous tile padding, so the y
  // padding went up to py-4 (16). Internal gap stays gap-2 (8) so
  // the label / value / subline stack tracks the Figma spacing
  // rhythm exactly.
  const baseClass =
    'group flex min-w-[160px] flex-1 flex-col gap-2 rounded-md border border-divider-regular bg-background-default px-4 py-4 transition-colors hover:border-divider-deep hover:bg-background-default-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-accent-active-alt'

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
    const daysAbs = Math.abs(days)
    // 2026-05-23: subline format upgraded to lead with the deadline
    // date itself, then the lateness phrase. Earlier shape was just
    // "{N} days late" — useful for urgency but hid WHEN the deadline
    // was. The Figma renders "Due May 6  17 days late" so the CPA
    // gets both anchors (calendar date + lateness countdown) without
    // opening the drawer. Late deadlines tint destructive so the
    // tile reads as a real alert without making the form code itself
    // red.
    const dueDateLabel = formatDatePretty(nextDue.currentDueDate)
    const sublineText =
      days < 0
        ? t`Due ${dueDateLabel} · ${daysAbs} days late`
        : days === 0
          ? t`Due today (${dueDateLabel})`
          : t`Due ${dueDateLabel} · in ${days} days`
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
    // 2026-05-23: tone ladder split into three steps so already-late
    // tiles render in `critical` (red) instead of the prior `warning`
    // (orange). Per Figma — when a deadline is actually past, the
    // tile value (e.g. "Form 1041") needs to read at the same urgency
    // as the destructive subline ("15 days late"). One tone, both
    // pieces. `warning` is reserved for due-today (last-chance) which
    // is the actual amber semantic.
    nextDueTone = days < 0 ? 'critical' : days === 0 ? 'warning' : 'neutral'
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
