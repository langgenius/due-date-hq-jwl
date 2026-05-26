import { useMemo, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Plural, Trans, useLingui } from '@lingui/react/macro'

import type { ObligationInstancePublic } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'
import { formatDatePretty } from '@/lib/utils'
import { formatTaxCode } from '@/lib/tax-codes'

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
  // 2026-05-24 (Figma replica pass): tile dimensions snapped to the
  // exact pixel spec exported from Figma Make.
  //   - Fill `bg-util-colors-gray-25` (#fcfcfd) — off-white, NOT pure
  //     white. The fill itself does the section-anchoring; no border.
  //   - `rounded-xl` = 12px (was rounded-md / 8px).
  //   - Label opacity dropped to ~30% (Figma uses `rgba(16,24,40,0.3)`)
  //     so the eyebrow whispers instead of competing with the value.
  //   - Inner padding split into a label row (`pt-3 pb-1 px-3`) +
  //     a value row (`pt-1 pb-3 px-3`) to match the two-frame Figma
  //     structure. Subline sits inline with the value at 13px.
  //
  // 2026-05-24 (typeset pass — critique P0): value scaled from 14px →
  // 20px (`text-xl font-semibold leading-7`). The Figma export had it
  // at 14px which made the tile WHISPER — visually equivalent to the
  // filing-plan row form names below, so the strip stopped anchoring
  // the eye. 20px is the Ramp / Linear "headline number" sweet spot:
  // big enough to read first, small enough not to feel like an AI-slop
  // dashboard hero metric. Subline stays at 13px so the value gets
  // genuine primacy.
  // 2026-05-26 (Yuqi follow-up — "copy Today's tile shape"):
  // TileShell adopts the /today exposure-strip pattern exactly.
  // Value (text-lg font-medium leading-tight) sits on top; label
  // (text-sm text-text-secondary) below; unified px-4 py-3 padding;
  // no upper-label kicker, no split frames. Same shape /today
  // ships on its In review / Blocked / Waiting on client tiles.
  const valueClass = cn(
    'text-lg font-medium leading-tight tabular-nums tracking-tight',
    tone === 'critical' && 'text-text-destructive',
    tone === 'warning' && 'text-text-warning',
    tone === 'neutral' && 'text-text-primary',
    tone === 'muted' && 'text-text-tertiary',
  )
  // 2026-05-26 (Yuqi feedback #3 — "卡片样式看看别的地方有没有
  // 在用，可以拿过来的"): TileShell aligned to the canonical
  // inset-surface card chrome used app-wide (see
  // `inset-surface-design-system.md` §card-chrome):
  //   - `bg-background-default` (white) instead of off-white arbitrary
  //   - `border border-divider-subtle` (the canonical card border)
  //   - `rounded-md` (6px) instead of `rounded-xl` (12px)
  // Earlier `rounded-xl` + raw-hex bg was a Figma-replica one-off; the
  // inset-surface system shipped after and made `rounded-md` +
  // `bg-default` + `border-divider-subtle` the family-wide card.
  // 2026-05-26 (Yuqi /clients/[id] feedback #1 — "copy Today's <div ...>"):
  // exact match for the /today exposure-strip tile. Drops `flex-1`
  // (tiles no longer stretch to fill the row — they grow to their
  // natural width + min-w-[160px] floor). Container switches from
  // `grid grid-cols-3` to `flex flex-wrap gap-3` so the tiles cluster
  // left rather than stretching across the row. Subline is dropped
  // here to match Today exactly — see TileShell's `subline` prop
  // (kept for prop stability but unused below).
  const baseClass =
    'group flex min-w-[160px] flex-col gap-1 rounded-md border border-divider-subtle bg-background-default px-4 py-3 transition-colors hover:border-divider-regular hover:bg-background-default-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-accent-active-alt'

  // 2026-05-26 (Yuqi /clients/[id] feedback #1): subline render dropped
  // to match Today's tile pattern exactly. `subline` + `sublineTone`
  // props kept on the type so callers don't break, but the body just
  // renders value + label now. If subline context is needed later,
  // restore conditional render here.
  void subline
  void sublineTone
  const body = (
    <>
      <span className={valueClass}>{value}</span>
      <span className="text-sm text-text-secondary">{label}</span>
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

  const atRiskList = useMemo(
    () => obligations.filter((o) => isAtRisk(o, todayTs)),
    [obligations, todayTs],
  )
  const atRiskCount = atRiskList.length

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
    // 2026-05-24 (Figma replica): subline renders as a split phrase —
    // the calendar anchor ("Due May 6") stays gray-tertiary while the
    // lateness tail ("17 days late") tints red. Matches the Figma
    // exactly; previously the whole subline shared one tone. Tile
    // value (the form code) STAYS BLACK — the Figma keeps the value
    // neutral and lets the subline carry the urgency signal alone.
    const dueDateLabel = formatDatePretty(nextDue.currentDueDate)
    const sublineNode: ReactNode =
      days < 0 ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-text-tertiary">
            <Trans>Due {dueDateLabel}</Trans>
          </span>
          <span className="text-text-destructive">
            <Plural value={daysAbs} one="# day late" other="# days late" />
          </span>
        </span>
      ) : days === 0 ? (
        <span className="text-text-warning">
          <Trans>Due today ({dueDateLabel})</Trans>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-text-tertiary">
          <span>
            <Trans>Due {dueDateLabel}</Trans>
          </span>
          <span>
            <Plural value={days} one="in # day" other="in # days" />
          </span>
        </span>
      )
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
    // 2026-05-24 (Figma replica): tile VALUE stays neutral (black)
    // even when overdue — the subline tail carries the red signal,
    // not the value itself. Previously the value tinted critical
    // when late; the replica shows that's not the Figma rhythm.
    nextDueTone = 'neutral'
    nextDueOnClick = () => openObligationDrawer(nextDue.id)
    nextDueAria = t`Open next-due deadline`
    nextDueSubline = sublineNode
    // Subline is now a composite node that owns its own per-segment
    // tones — TileShell's blanket `sublineTone` no longer applies to
    // this tile. Keeping the prop wired to 'tertiary' as a no-op so
    // the prop contract stays stable.
    nextDueSublineTone = 'tertiary'
  }

  // At-risk subline — surfaces the actual form codes so the CPA can
  // see *which* filings are blocked / overdue without having to drill
  // into the filtered queue first. Previously read just "Blocked or
  // overdue", which was a tease — the page already has the data in
  // memory, so the tile may as well name names.
  //
  // 1 form  → "1120-S blocked"
  // 2 forms → "1120-S, 1065 blocked"
  // 3+      → "1120-S, 1065 + 1 more"
  const atRiskSubline = useMemo(() => {
    if (atRiskList.length === 0) return null
    const codes = atRiskList.slice(0, 2).map((o) => formatTaxCode(o.taxType))
    const overflow = atRiskList.length - codes.length
    if (overflow > 0) {
      return t`${codes.join(', ')} + ${overflow} more`
    }
    if (codes.length === 1) {
      return t`${codes[0]} blocked or overdue`
    }
    return t`${codes.join(', ')} blocked or overdue`
  }, [atRiskList, t])

  // Open-filing subline — count of forms in the filing plan that are
  // still doing work. Singular vs plural phrasing.
  const openFilingSubline =
    openCount === 0
      ? t`Nothing open right now`
      : openCount === 1
        ? t`1 form in motion`
        : t`${openCount} forms in motion`

  return (
    <section aria-label={t`Client summary`} className="flex flex-wrap gap-3">
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
            ? () => void navigate(`/deadlines?client=${clientId}&status=blocked`)
            : undefined
        }
        ariaLabel={t`View at-risk deadlines`}
      />
      <TileShell
        tone={openCount > 0 ? 'neutral' : 'muted'}
        value={openCount}
        label={<Trans>Open filing</Trans>}
        subline={openFilingSubline}
        onClick={openCount > 0 ? () => void navigate(`/deadlines?client=${clientId}`) : undefined}
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
