import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'

import type { ObligationInstancePublic } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { initialsFromName } from '@/lib/auth'
import { orpc } from '@/lib/rpc'
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
  // Tile chrome: `divider-regular` (8%) at rest. Previously
  // `divider-subtle` (4%) — paired with the white `background-default`
  // body, the tiles read as "barely there boxes" against the page,
  // contributing to the overall "pale and white" feel. Bumping the
  // border to match the panel chrome elsewhere on the detail page
  // gives the summary strip presence as a real section.
  const baseClass =
    'group flex min-w-[160px] flex-1 flex-col gap-1 rounded-md border border-divider-regular bg-background-default px-4 py-3 transition-colors hover:border-divider-deep hover:bg-background-default-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-accent-active-alt'

  if (to) {
    return (
      <Link to={to} aria-label={ariaLabel} className={baseClass}>
        <span className="text-xs font-medium tracking-[0.08em] text-text-tertiary uppercase">
          {label}
        </span>
        <span className={valueClass}>{value}</span>
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
        <span className="text-xs font-medium tracking-[0.08em] text-text-tertiary uppercase">
          {label}
        </span>
        <span className={valueClass}>{value}</span>
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
    // Date format matches what ClientDetailDrawer + ClientPeekHoverCard
    // already use — `5d late` / `due today` / `due in 12d`. The
    // earlier `${days}d` form (e.g. `-17d`) read as a math expression,
    // not a deadline, and was inconsistent with the rest of the app.
    const daysAbs = Math.abs(days)
    const daysText = days < 0 ? t`${daysAbs}d late` : days === 0 ? t`due today` : t`due in ${days}d`
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

  // Team derived from open obligations' reviewerUserId set. The
  // earlier audit removed a Team tile that just counted unique
  // reviewers (a count of nameless IDs isn't useful); this version
  // resolves IDs to names via `members.listAssignable` and shows
  // up to 3 initialed avatars + an "+N" overflow. The query is
  // cached app-wide (the obligations queue + CreateClientDialog hit
  // the same endpoint), so the lookup is usually a cache read.
  const reviewerIds = useMemo(() => {
    const ids = new Set<string>()
    for (const o of obligations) {
      if (o.reviewerUserId && !TERMINAL_STATUSES.has(o.status)) {
        ids.add(o.reviewerUserId)
      }
    }
    return [...ids]
  }, [obligations])

  const membersQuery = useQuery({
    ...orpc.members.listAssignable.queryOptions({ input: undefined }),
    enabled: reviewerIds.length > 0,
  })

  const reviewerNames = useMemo(() => {
    if (reviewerIds.length === 0) return []
    const lookup = new Map<string, string>()
    for (const m of membersQuery.data ?? []) {
      lookup.set(m.assigneeId, m.name)
    }
    return reviewerIds.map((id) => lookup.get(id) ?? '—').toSorted((a, b) => a.localeCompare(b))
  }, [reviewerIds, membersQuery.data])

  const teamTone: TileTone = reviewerNames.length === 0 ? 'muted' : 'neutral'
  const teamValue =
    reviewerNames.length === 0 ? (
      <span className="text-base font-medium text-text-tertiary">
        <Trans>Unassigned</Trans>
      </span>
    ) : (
      <TeamAvatarStack names={reviewerNames} />
    )

  return (
    <section
      aria-label={t`Client summary`}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
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
      <TileShell
        tone={teamTone}
        value={teamValue}
        label={<Trans>Team</Trans>}
        ariaLabel={
          reviewerNames.length === 0
            ? t`No one assigned`
            : t`${reviewerNames.length} on this client`
        }
      />
    </section>
  )
}

/**
 * Up to 3 24px initial avatars + an "+N" pill for the overflow.
 * Uses the same `initialsFromName` helper as the rest of the app so
 * "Alex Reyes" reads as `AR` everywhere. Avatars get a stable hash
 * to a 6-bucket muted palette so two different members never look
 * identical even though they're both grey-on-grey.
 */
function TeamAvatarStack({ names }: { names: readonly string[] }) {
  const visible = names.slice(0, 3)
  const overflow = names.length - visible.length
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex -space-x-1.5">
        {visible.map((name) => (
          <span
            key={name}
            title={name}
            aria-label={name}
            className={cn(
              'inline-flex size-6 items-center justify-center rounded-full border border-background-default text-[10px] font-semibold uppercase tracking-tight',
              TEAM_TINTS[hashTeamMember(name)],
            )}
          >
            {initialsFromName(name)}
          </span>
        ))}
      </span>
      {overflow > 0 ? (
        <span className="text-sm font-medium text-text-tertiary tabular-nums">+{overflow}</span>
      ) : null}
      {names.length === 1 ? (
        <span className="truncate text-sm font-medium text-text-primary">{names[0]}</span>
      ) : null}
    </span>
  )
}

const TEAM_TINTS = [
  'bg-state-base-hover-alt text-text-secondary',
  'bg-state-warning-hover text-text-primary',
  'bg-state-success-hover text-text-primary',
  'bg-state-destructive-hover text-text-primary',
  'bg-state-accent-hover-alt text-text-accent',
  'bg-background-section text-text-secondary',
]

function hashTeamMember(name: string): number {
  let hash = 5381
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 33) ^ name.charCodeAt(i)
  }
  return Math.abs(hash) % TEAM_TINTS.length
}
