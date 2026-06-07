import { useMemo } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  CircleCheckIcon,
  ConstructionIcon,
  FileCheckIcon,
  HourglassIcon,
  LoaderIcon,
  MessageSquareTextIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
} from 'lucide-react'
import { Link } from 'react-router'

import type { DashboardTopRow, ObligationStatus } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Table, TableBody, TableCell, TableRow } from '@duedatehq/ui/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { DueDateLabel } from '@/components/primitives/due-date-label'
import { formatDatePretty } from '@/lib/utils'
import { ReadinessIndicator } from '@/components/primitives/readiness-indicator'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { EmptyState as SharedEmptyState } from '@/components/patterns/empty-state'
import { ObligationStatusReadBadge } from '@/features/obligations/status-control'
import { isPaymentOverdue, paymentOverdueDays } from '@/features/obligations/payment-overdue'
import { ExtensionChip } from './extension-chip'
import { LifecycleStripCell } from './lifecycle-strip-cell'
import { severityToTier, type SeverityTier } from './severity-section'
// 2026-05-31 (Yuqi Pencil FpHtM — owner-avatar slot): Pencil also
// shows a per-row owner-initials avatar on the right cluster.
// `DashboardTopRow` (packages/contracts/src/dashboard.ts) does not
// expose an `assigneeName` field today — the obligation queue
// schema does (`obligation-queue.ts`), but the dashboard top-rows
// projection drops it. To render the avatar without a stale
// placeholder, the contract + server projection need a small
// extension (one field + one SELECT). Imports kept commented so
// the wire-up is one uncomment away once the contract change
// lands.
// import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
// import { useCurrentUserName } from '@/lib/use-current-user-name'

function topPriorityFactors(row: DashboardTopRow): string[] {
  const factors = [...(row.smartPriority.factors ?? [])]
    .filter((f) => f.contribution > 0)
    .toSorted((a, b) => b.contribution - a.contribution)
    .slice(0, 2)
  return factors.map((f) => f.label)
}

// Dashboard v2 "Actions this week" — verb-led action queue.
//
// Behavior:
//   - Each row has a chevron at the start (`>` collapsed → `v` expanded)
//   - Hovering the row expands it INLINE (the row's container grows
//     downward to reveal a details panel). Hover-out collapses it.
//   - Keyboard focus on the row also expands it (focus parity).
//   - The Review button opens the obligation drawer
//     in place via the parent's onOpenObligation handler.
//   - Row meta is the right-aligned time signal ("3d late" /
//     "today" / "in 2d"). No dollar amounts.

function daysUntilDueFromAsOf(currentDueDate: string, asOfDate: string | null): number {
  if (!asOfDate) return 0
  const due = new Date(currentDueDate).getTime()
  const as = new Date(asOfDate).getTime()
  return Math.round((due - as) / (1000 * 60 * 60 * 24))
}

// 2026-06-03 (audit follow-up — dead-code prune):
// `internalDueDateFromOfficial` removed. It only served the
// hover-expansion `<dl>` panel in the now-deleted `ActionRow`; the
// canonical surface for the firm-internal vs. statutory split is
// now the obligation drawer (which has its own derivation). Restore
// from git history if a dashboard surface ever needs the inline date.

// 2026-05-25 (Yuqi #26): the previous prompts read like developer
// prose — "close the row" is engineering-speak the CPA never uses,
// "Complete CPA review and close the row" stacked two verbs from
// different frames. Rewritten as imperative tasks a CPA would put
// in their own to-do list.
//
// 2026-05-25 (Yuqi follow-up — "still missing the title"): this
// function used to take `t` as a parameter. That broke Lingui 5's
// macro transform — the `t` macro only fires when `t` is referenced
// directly in the source position (imported from `@lingui/react/
// macro` or destructured from `useLingui()` at the call site). When
// `t` is passed as a function arg, every `t\`source\`` in the body
// becomes a raw tagged-template call on a function that doesn't
// know how to handle one, and returns `undefined` — the empty
// "Action" row + bare `·` separator next to the client name Yuqi
// screenshotted. Refactored as a hook so `useLingui()` lives in
// scope right next to every `t\`…\`` macro use.
function useActionPrompt(row: DashboardTopRow, asOfDate: string | null): string {
  const { t } = useLingui()
  const days = daysUntilDueFromAsOf(row.currentDueDate, asOfDate)
  if (row.status === 'waiting_on_client') return t`Follow up with the client for documents`
  if (row.evidenceCount === 0) return t`Attach the source document`
  if (row.status === 'review') return t`Review the prepared return and sign off`
  if (days <= 0) return t`Confirm filing or payment status — due today`
  if (days <= 2) return t`Final-check owner, source, and cutoff date`
  return t`Re-verify the source still applies to this return`
}

// 2026-06-04 (Yuqi triage redesign — 分诊要回答"什么最重要、什么次要"):
//
// Rows are now grouped by SEVERITY TIER (Critical / High / Upcoming)
// at the top level, with each tier rendered as its own table preceded
// by a `<SeveritySectionHeader>` that carries the plain-language
// urgency copy ("Act today or risk missing the deadline").
//
// Row chrome stays NEUTRAL — no per-row rail, no tone-colored
// chevron, no per-row frame. Tier identity lives entirely in the
// section header. Inside each tier rows are sorted "Ready to work"
// first (workable now), then "Waiting on client", then "Blocked"
// — a 2D triage axis that answers the CPA's question "can I make
// progress right now?"
//
// New columns vs. Pencil VmcdD's 5-column shape:
//   • CLIENT 220 — name
//   • ACTION 280 — verb prompt + (Critical only) WHY-NOW sublabel
//   • FILING 130 — TaxCodeBadge
//   • READINESS 180 — `<ReadinessIndicator>` "Docs N/M · missing X"
//     (primary triage signal per item 1.4 of the redesign)
//   • DUE 150 — `<DueDateLabel>` relative countdown
//   • STATUS fill — status pill + `<ExtensionChip>` when applicable +
//     payment-late caption
//   • chevron-down end column — neutral text-tertiary, no tone color
const TIER_ORDER_LOCAL: readonly SeverityTier[] = ['critical', 'high', 'upcoming']

// 2D triage subgroup classification.
//   • "ready"   — work can move forward today
//   • "waiting" — paused waiting on client-supplied docs / signoff
//   • "blocked" — explicit blocker (K-1 cascade, missing rule, etc.)
type Subgroup = 'ready' | 'waiting' | 'blocked'
function classifySubgroup(status: DashboardTopRow['status']): Subgroup {
  if (status === 'blocked') return 'blocked'
  if (status === 'waiting_on_client') return 'waiting'
  return 'ready'
}
const SUBGROUP_ORDER: readonly Subgroup[] = ['ready', 'waiting', 'blocked']

// Tier resolution WITH extension downscaling. An extended row is no
// longer "today on fire" — demote one notch (Critical → High, High
// → Upcoming). The payment side stays separate; payment-overdue
// rows still surface the "Pay Nd late" caption regardless of tier.
function resolveTier(row: DashboardTopRow): SeverityTier {
  const baseTier = severityToTier(row.severity)
  if (row.status === 'extended') {
    if (baseTier === 'critical') return 'high'
    if (baseTier === 'high') return 'upcoming'
  }
  return baseTier
}

function ActionsTieredSections({
  rows,
  asOfDate,
  onOpenObligation,
}: {
  rows: DashboardTopRow[]
  asOfDate: string | null
  onOpenObligation: (row: DashboardTopRow) => void
}) {
  // Single pass: bucket rows by tier (with extension demotion) and
  // sort each tier's rows by subgroup order (ready first).
  const byTier = useMemo(() => {
    const buckets: Record<SeverityTier, DashboardTopRow[]> = {
      critical: [],
      high: [],
      upcoming: [],
    }
    for (const row of rows) {
      buckets[resolveTier(row)].push(row)
    }
    for (const tier of TIER_ORDER_LOCAL) {
      buckets[tier].sort(
        (a, b) =>
          SUBGROUP_ORDER.indexOf(classifySubgroup(a.status)) -
          SUBGROUP_ORDER.indexOf(classifySubgroup(b.status)),
      )
    }
    return buckets
  }, [rows])
  // 2026-06-04 round 5 (Yuqi feedback "there is nothing else than
  // critical, so there is no use of saying Critical 10 / Act today
  // …"): when ONLY ONE tier has rows, suppress the tier header
  // entirely. The "Actions this week" h2 + the Smart Priority
  // subtitle already establish the section's framing; a tier
  // header in a single-tier render is redundant chrome that adds
  // a wasted line of vertical real estate.
  //
  // Also (Yuqi follow-up "otherway to show it is critical?"): when
  // a tier header DOES render (multi-tier case), the row table
  // gains a left accent border whose tone tracks the tier
  // (destructive / warning / outline) — same color signal as the
  // tier chip — so the critical-ness reads from the table edge
  // without leaning on the explainer copy.
  // 2026-06-04 round 6 (Yuqi "SeveritySectionHeader seems to be
  // useless"): tier section headers DROPPED. The left accent
  // border on each tier's table now carries the entire severity
  // signal — destructive red for Critical, warning amber for
  // High, none for Upcoming. The h2 + "Curated by Smart Priority"
  // subtitle frame the section; severity reads from the table
  // edge tone.
  const tiersWithRows = TIER_ORDER_LOCAL.filter((tier) => byTier[tier].length > 0)
  const isMultiTier = tiersWithRows.length > 1
  return (
    <div className="flex flex-col gap-4">
      {tiersWithRows.map((tier) => (
        <ActionsTable
          key={tier}
          rows={byTier[tier]}
          tier={tier}
          asOfDate={asOfDate}
          onOpenObligation={onOpenObligation}
          showTierAccent={isMultiTier}
        />
      ))}
    </div>
  )
}

const TIER_ACCENT_BORDER_CLASS: Record<SeverityTier, string> = {
  critical: 'border-l-4 border-l-state-destructive-solid',
  high: 'border-l-4 border-l-state-warning-solid',
  upcoming: '',
}

// 2026-06-04 round 11: PriorityScoreDots removed (Yuqi
// "complicated and useless"). Rank cell renders a plain mono
// number now; sparkle icon for top 3 retained as the only
// algorithmic flourish.

function ActionsTable({
  rows,
  tier,
  asOfDate,
  onOpenObligation,
  showTierAccent = false,
}: {
  rows: DashboardTopRow[]
  tier: SeverityTier
  asOfDate: string | null
  onOpenObligation: (row: DashboardTopRow) => void
  showTierAccent?: boolean
}) {
  if (rows.length === 0) return null
  // Track subgroup boundaries so the table body can interleave
  // subgroup-divider rows between the workable and blocked buckets.
  // First-row in each subgroup gets a top divider with the
  // subgroup name; subsequent rows render plainly.
  let lastSubgroup: Subgroup | null = null
  return (
    // 2026-06-04 round 7: rounded-[12px] perimeter + bg-background-default
    // give the table a real card identity.
    // 2026-06-04 round 16 (Yuqi page-feedback "lighter border"):
    // border tone has bounced subtle (4%) → regular (8%) → deep
    // (14%) → now back to `divider-regular` (8%). 8% is the
    // visible-but-quiet sweet spot; deep was reading as too heavy
    // an outline against the white card. Updated canonical doc
    // back to regular.
    <div
      className={cn(
        'overflow-hidden rounded-[12px] border border-divider-regular bg-background-default',
        showTierAccent && TIER_ACCENT_BORDER_CLASS[tier],
      )}
    >
      {/* 2026-06-04 round 13 (Yuqi "remove the table header row.
          make it more like ACTIONS"): `<TableHeader>` dropped
          entirely. Column labels were reading the rows as a
          data table; without them, the same column structure
          renders as a list of action items. Action verb +
          Client (text-base) anchor each row; meta cells
          (filing chip / readiness / due / status) sit as
          right-aligned supporting context. The rank column
          stays as the leading anchor — `#01 / ✦#02 …` reads
          as "item number" in a list, not as a sortable table
          column. */}
      <Table>
        <TableBody>
          {rows.map((row) => {
            const currentSubgroup = classifySubgroup(row.status)
            const isNewSubgroup = currentSubgroup !== lastSubgroup
            lastSubgroup = currentSubgroup
            const subgroupHeader =
              isNewSubgroup &&
              // Only render subgroup dividers when the tier contains
              // MORE THAN ONE subgroup — single-subgroup tiers don't
              // need the extra row.
              hasMultipleSubgroups(rows) ? (
                // 2026-06-04 round 10 (Yuqi "ensure everything
                // clickable is really clickable"): subgroup
                // divider rows are NOT clickable — they're
                // labels. Override the TableRow primitive's
                // default hover-bg + cursor so they don't look
                // tappable. `cursor-default` and the explicit
                // `!hover:bg-transparent` enforce static behavior.
                // 2026-06-04 round 14 (Yuqi page-feedback #1
                // "header 应该有个稍微深的颜色"): subgroup-label
                // bg bumped from `bg-background-section/40`
                // (40% alpha gray-50, barely visible) to
                // `bg-background-subtle` (solid gray-100) so
                // the row reads as a real header band dividing
                // Ready-to-work from Waiting-on-client, not a
                // near-invisible whisper. Hover override matches
                // so the row stays static-looking on hover.
                // `even:bg-transparent` opts the row out of the
                // canonical zebra (otherwise the subgroup label
                // would alternate tint with row position).
                <TableRow
                  key={`${currentSubgroup}-divider`}
                  className="cursor-default even:bg-transparent hover:!bg-background-subtle"
                  aria-hidden="false"
                >
                  {/* 2026-06-04 round 84 (Yuqi "apply table design
                      guideline … to Alert and Deadlines" — push
                      readability to both surfaces): subgroup
                      divider tokens lifted to match /alerts day-
                      header chrome — `text-[12px] text-text-secondary`
                      (was `text-[11px] text-text-tertiary`). Round
                      79 #2 made /alerts more readable; this
                      brings /today's matching primitive up to
                      the same readable scale so both surfaces
                      share one token combo end-to-end. */}
                  <TableCell
                    colSpan={7}
                    className="bg-background-subtle px-5 py-2 text-[12px] font-semibold tracking-[0.5px] text-text-secondary uppercase"
                  >
                    <SubgroupLabel kind={currentSubgroup} />
                  </TableCell>
                </TableRow>
              ) : null
            return (
              <>
                {subgroupHeader}
                <ActionsTableRow
                  key={row.obligationId}
                  row={row}
                  tier={tier}
                  asOfDate={asOfDate}
                  onClick={() => onOpenObligation(row)}
                />
              </>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function hasMultipleSubgroups(rows: DashboardTopRow[]): boolean {
  const seen = new Set<Subgroup>()
  for (const row of rows) {
    seen.add(classifySubgroup(row.status))
    if (seen.size > 1) return true
  }
  return false
}

function SubgroupLabel({ kind }: { kind: Subgroup }) {
  if (kind === 'ready') return <Trans>Ready to work</Trans>
  if (kind === 'waiting') return <Trans>Waiting on client</Trans>
  return <Trans>Blocked</Trans>
}

function ActionsTableRow({
  row,
  tier,
  asOfDate,
  onClick,
}: {
  row: DashboardTopRow
  tier: SeverityTier
  asOfDate: string | null
  onClick: () => void
}) {
  const { t } = useLingui()
  const days = daysUntilDueFromAsOf(row.currentDueDate, asOfDate)
  const prompt = useActionPrompt(row, asOfDate)
  // 2026-06-04 round 8 (Yuqi "tooltip to show why this matter"):
  // ALL rows compute factors for the rank-cell tooltip — even
  // High / Upcoming rows surface their Smart Priority rationale
  // on hover. Inline rendering still gated to Critical (no
  // caption noise on quieter rows) but explanation is universal.
  const allRowFactors = topPriorityFactors(row)
  return (
    <TableRow
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      tabIndex={0}
      aria-label={t`Open ${prompt} for ${row.clientName}`}
      // 2026-06-04 (Yuqi table sweep): zebra striping, hover-bg,
      // bottom border, transition-colors all PROMOTED to the
      // canonical `<TableRow>` primitive. This callsite only
      // owns the interactivity affordances (cursor + focus
      // ring) and the `group` hook for descendants.
      // 2026-06-04 round 44 (Yuqi /today #3 — "slightly taller
      // row"): row body padding `py-2` (8px) → `py-3` (12px). The
      // round-43 cut went too far; py-3 lands between the original
      // py-4 (16px) and round-43's py-2. Still tighter than default,
      // but rows can now contain a 2-line stacked cell (action +
      // why-now, due-date + relative date) without feeling
      // suffocated.
      className="group cursor-pointer focus-visible:bg-state-base-hover focus-visible:outline-none [&_td]:py-3"
    >
      {/* 2026-06-04 round 11 (Yuqi "don't like the dedicated Smart
          Priority chip - too complicated and useless"): chip
          chrome dropped. Plain mono rank with sparkle ONLY for
          top 3. Tooltip retained on the rank text itself for
          explainability — hover the number, see the factors. */}
      {/* 2026-06-04 (Yuqi table sweep): py-4 align-middle dropped
          — canonical defaults. px-3 kept as a deliberate compact
          override for the narrow rank column (canonical px-5
          would push the mono number off-center). text-center is
          structural. */}
      <TableCell className="px-3 text-center">
        <Tooltip>
          <TooltipTrigger
            render={(props) => (
              <span
                {...props}
                onClick={(e) => {
                  props?.onClick?.(e)
                  e.stopPropagation()
                }}
                className="inline-flex cursor-help items-center justify-center gap-1 font-mono text-[11px] font-semibold tabular-nums text-text-tertiary"
              >
                {row.smartPriority?.rank && row.smartPriority.rank <= 3 ? (
                  <SparklesIcon className="size-2.5 shrink-0 text-text-accent" aria-hidden />
                ) : null}
                {row.smartPriority?.rank ? String(row.smartPriority.rank).padStart(2, '0') : '—'}
              </span>
            )}
          />
          <TooltipContent>
            <div className="flex max-w-[260px] flex-col gap-1 text-left">
              <span className="font-semibold">
                <Trans>Smart Priority</Trans>
                {row.smartPriority?.rank
                  ? ` #${String(row.smartPriority.rank).padStart(2, '0')}`
                  : ''}
              </span>
              {row.smartPriority?.factors && row.smartPriority.factors.length > 0 ? (
                // B11: surface each factor's rawValue ("Due in 3 days",
                // "Importance: high") + its source, not just the label —
                // makes the rank legible instead of a bare number.
                <div className="flex flex-col gap-0.5">
                  {[...row.smartPriority.factors]
                    .sort((a, b) => b.contribution - a.contribution)
                    .slice(0, 4)
                    .map((factor) => (
                      <span key={factor.key} className="text-text-secondary">
                        {factor.label}:{' '}
                        <span className="text-text-tertiary">{factor.rawValue}</span>
                      </span>
                    ))}
                </div>
              ) : (
                <span className="text-text-tertiary">
                  <Trans>No specific priority factors flagged.</Trans>
                </span>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TableCell>
      {/* 2026-06-04 round 12 (Yuqi "do you not have a middle ground
          text size between the previous too big and the current
          too small"): both bumped `text-sm` (14px) → `text-base`
          (16px). Middle tier — not headline-scale, but bigger
          than dense table body. Reads as "list of actions"
          density without the table feeling like cramped data. */}
      {/* 2026-06-04 (Yuqi table sweep): redundant `px-5 py-4
          align-middle` cell overrides stripped from every cell
          below — those are the canonical primitive defaults
          now. Only content-tone classes (text-base font-medium
          text-text-secondary on Client column, etc.) remain. */}
      {/* 2026-06-04 round 43 (Yuqi /today feedback #4 — "smaller
          client name and action text size. 1 or 2 px"): row body
          text dropped from `text-base` (16px) to `text-[14px]`. Two
          px down — clearly less shouty than the round-12 bump but
          still scan-friendly. Also `py-2` on every cell in this
          table tightens the row (canonical TableCell default is
          `py-4` = 16px each side; this saves ~16px per row, which
          stacks meaningfully across the 10-row Actions list). */}
      {/* 2026-06-04 round 44 (Yuqi /today #3 — "even smaller 1 or
          2px client name and action"): body text another px down
          `text-[14px]` → `text-[13px]`. Aligns with the source-row
          13px on /alerts + /today PulseSourceMeta — the dashboard
          row body and the alert card source now read at the same
          weight. The `py-2` override here is removed; TableRow's
          `[&_td]:py-3` carries the row height now. */}
      {/* 2026-06-04 round 71 (Yuqi "change the client name to a
          lighter tone"): client column color stepped one tier
          quieter — `text-text-secondary` → `text-text-tertiary`.
          The client name was reading as the second-loudest cell
          on every row after the title in the ACTION column;
          dropping it lets the action prompt own the eye and the
          client name reads as the "for which client?" context
          rather than competing for primary attention. */}
      <TableCell className="text-[13px] font-medium text-text-tertiary">{row.clientName}</TableCell>
      <TableCell>
        {/* 2026-06-04 round 16 (Yuqi page-feedback "should allow
            hover on each row to show more information"): the
            Why-now factor line previously only rendered on
            Critical rows (always visible). High + Upcoming rows
            had Smart Priority factors but nowhere to surface
            them inline. Now ALL rows with factors render the
            line — Critical stays visible at rest, High / Upcoming
            fade in on row hover via `group-hover:opacity-100`.
            The TableRow already carries the `group` class, so
            this is a CSS-only reveal with no JS state. Row height
            is reserved when factors exist (opacity-0 keeps layout
            in place) so hover doesn't jitter the table. */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-medium text-text-primary">{prompt}</span>
          {allRowFactors.length > 0 ? (
            <span
              className={cn(
                'truncate text-xs text-text-tertiary transition-opacity duration-200',
                tier === 'critical'
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
              )}
              title={allRowFactors.join(' · ')}
            >
              <Trans>Why now:</Trans> {allRowFactors.join(' · ')}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <TaxCodeBadge code={row.taxType} />
      </TableCell>
      <TableCell>
        <ReadinessIndicator obligationType={row.obligationType} attached={row.evidenceCount} />
      </TableCell>
      {/* DUE cell stacks: relative countdown + absolute internal
          due date (Yuqi feedback round 3 #10). */}
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <DueDateLabel
            days={days}
            status={row.status}
            paymentDueDate={row.paymentDueDate}
            asOfDate={asOfDate}
          />
          <span className="text-[11px] font-medium tabular-nums text-text-tertiary">
            {formatDatePretty(row.currentDueDate)}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <ObligationStatusReadBadge status={row.status} className="h-6 text-xs" />
          {row.status === 'extended' ? <ExtensionChip /> : null}
          {isPaymentOverdue(row.paymentDueDate, asOfDate) ? (
            <span className="text-[11px] font-semibold tabular-nums text-text-destructive">
              <Plural
                value={paymentOverdueDays(row.paymentDueDate, asOfDate)}
                one="Pay #d late"
                other="Pay #d late"
              />
            </span>
          ) : null}
        </div>
      </TableCell>
      {/* Chevron cell dropped (Yuqi round 4): hover-to-expand isn't
          wired; the row's whole-row click opens the drawer. */}
    </TableRow>
  )
}

function DashboardActionsList({
  rows,
  asOfDate,
  isLoading,
  totalThisWeek,
  totalOpen,
  canRunMigration,
  onOpenWizard,
  onOpenObligation,
  onOpenAllObligations,
  // 2026-05-25 (Yuqi #5): the standalone ExposureStrip ("Need
  // your decision / Blocked / Waiting on client") merged into
  // this section. Both shared the "this week" scope so they're
  // now one section with the tile strip as its summary header.
  needDecisionCount,
  blockedCount,
  waitingOnClientCount,
  needDecisionDelta,
  blockedDelta,
  waitingOnClientDelta,
  hasClients,
}: {
  rows: DashboardTopRow[]
  asOfDate: string | null
  isLoading: boolean
  totalThisWeek: number
  // Total open obligations across the whole practice — used to split
  // the empty state: zero rows in the queue means "import data";
  // zero this week but rows elsewhere means "you're caught up,
  // here's the rest."
  totalOpen: number
  canRunMigration: boolean
  // 2026-05-29 (Yuqi /today follow-up — "no clients vs no deadlines"):
  // when there are 0 open obligations we need to distinguish a
  // fresh practice (no clients yet, encourage import) from a
  // practice that already imported and just doesn't have deadlines
  // generated yet (don't ask them to import again). Probed once at
  // the route level via `clients.listByFirm({ limit: 1 })`.
  hasClients: boolean
  onOpenWizard: () => void
  onOpenObligation: (row: DashboardTopRow) => void
  onOpenAllObligations: () => void
  needDecisionCount: number
  blockedCount: number
  waitingOnClientCount: number
  // 2026-05-31 (Yuqi Pencil /today AvFsh round): optional
  // week-over-week deltas for the summary tiles. Pass `undefined`
  // (the current default) to suppress the trend pill; pass a real
  // number once the route loader has prior-period counts wired in.
  needDecisionDelta?: number | undefined
  blockedDelta?: number | undefined
  waitingOnClientDelta?: number | undefined
}) {
  const { t } = useLingui()
  const VISIBLE_CAP = 10
  const visible = rows.slice(0, VISIBLE_CAP)

  // 2026-06-03 (audit follow-up — dead-code prune): `hoveredId`/
  // `setHoveredId` state and `useCurrentFirm` lookup retired. They
  // served the hover-expand `ActionRow` (deleted) and its
  // `internalDeadlineOffsetDays` dependency (also dead). If a
  // future preview-on-hover affordance comes back, it's a clean
  // one-line `useState` add at this position.

  // Build summary segments — drop zero-count entries. Only `blocked`
  // uses destructive — it's the one genuinely-stuck signal.
  //
  // 2026-05-31 (Yuqi Pencil /today AvFsh round): each tile now also
  // carries an optional week-over-week trend (`trend.delta`). Until
  // the backend ships prior-period counts, the deltas come in as
  // `undefined` from the caller — StatTile renders no pill in that
  // case, so this stays visually backwards-compatible.
  // 2026-06-03 (Yuqi Pencil VmcdD — 6-column status strip):
  // Lifecycle strip replaces the 3-tile cluster. The previous
  // 3-tile cluster ("In review · Blocked · Waiting on client")
  // only surfaced the actionable buckets; Pencil shows the full
  // status lifecycle on one horizontal strip so the CPA reads
  // *everything in progress* at a glance, not just the items
  // demanding immediate attention.
  //
  // Counts come from the same `rows` array the action table
  // consumes — no extra round-trip. The legacy `needDecisionCount`,
  // `blockedCount`, `waitingOnClientCount`, and `*Delta` props
  // are now unused at the strip level but kept on the public API
  // to avoid breaking the route loader's call signature; they may
  // be retired in a follow-up once no caller passes them.
  void needDecisionCount
  void blockedCount
  void waitingOnClientCount
  void needDecisionDelta
  void blockedDelta
  void waitingOnClientDelta

  // 2026-06-04 (Yuqi alignment fix): dropped the `px-3` wrapper.
  // The lifecycle strip now spans the same x-edges as the tier
  // section headers + ActionsTable wrapper below.
  // 2026-06-04 round 6 (Yuqi "wire numbers correctly"): strip
  // now uses `visible` (top 10 rows displayed in the table)
  // instead of `rows` (up to 20 from server). Counts now match
  // the rows the CPA actually sees below.
  // 2026-06-04 round 15 (Yuqi "hide this for now"): strip render
  // commented out below. `summaryStrip` const + `void` cheat
  // kept so revival is a one-line uncomment without re-wiring
  // the JSX expression.
  const summaryStrip = <DashboardStatusLifecycleStrip rows={visible} />
  void summaryStrip

  if (isLoading) {
    return (
      <section aria-label={t`Actions this week`} className="flex flex-col gap-3">
        <ActionsListHeader count={null} onOpenAll={onOpenAllObligations} />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-16 w-40" />
          <Skeleton className="h-16 w-40" />
          <Skeleton className="h-16 w-40" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </section>
    )
  }

  if (visible.length === 0) {
    // Three empty states, in order of how they should be tested:
    //   1. The practice has obligations beyond this week — show the
    //      count and route to /deadlines. Avoids the "import again"
    //      misread when the user already has data.
    //   2. The practice has zero obligations AND no clients yet — keep
    //      the import CTA.
    //   3. Caught-up state (rows exist somewhere but Smart Priority
    //      filtered them all out).
    return (
      <section aria-label={t`Actions this week`} className="flex flex-col gap-3">
        <ActionsListHeader count={0} onOpenAll={onOpenAllObligations} />
        {totalOpen > 0 ? (
          <p className="rounded-md border border-divider-subtle p-4 text-center text-sm text-text-secondary">
            <Trans>Nothing due this week.</Trans>{' '}
            <Button
              variant="link"
              size="sm"
              className="px-0 align-baseline"
              onClick={onOpenAllObligations}
            >
              <Plural value={totalOpen} one="View # open deadline" other="View # open deadlines" />
              <ArrowUpRightIcon data-icon="inline-end" />
            </Button>
          </p>
        ) : canRunMigration ? (
          // 2026-05-28 (Yuqi /today polish): empty state refined to
          // follow the design system —
          //   • title + description split (was crammed into title)
          //   • CalendarIcon at the top echoes the page's Today icon
          //   • CTA dropped from primary → outline so Dify Blue stays
          //     reserved for the ONE next action per surface (synthesis
          //     §2 taste principle #2: "one accent, one viewport, one
          //     action"). Empty-state CTA is helpful but not the
          //     primary path on Today.
          //
          // 2026-05-29 (Yuqi /today follow-up — "the empty state - there
          // is a difference between no clients and no deadline"): split
          // the zero-obligations message into two distinct states.
          //   • No clients: "No clients yet" + Import CTA — the fresh-
          //     practice path. The user needs data; importing is the
          //     correct next action.
          //   • Has clients, no deadlines: "No active deadlines yet" +
          //     guidance toward Rule Library — the post-import path
          //     where the user already imported but their rules
          //     haven't generated future deadlines (could be
          //     monitoring start date is in the past, or all rules
          //     are still pending review). Pointing them at /clients
          //     to verify state is the right move; importing again
          //     would create dupes.
          hasClients ? (
            <SharedEmptyState
              icon={CalendarIcon}
              title={<Trans>No active deadlines yet</Trans>}
              description={
                <Trans>
                  Your clients are imported, but no future deadlines have been generated. Check
                  client filing profiles or Rule Library for what's pending.
                </Trans>
              }
              cta={
                <Button size="sm" variant="outline" onClick={onOpenAllObligations}>
                  <Trans>View deadlines</Trans>
                </Button>
              }
            />
          ) : (
            <SharedEmptyState
              icon={CalendarIcon}
              title={<Trans>No clients yet</Trans>}
              description={<Trans>Import your client list to start tracking deadlines.</Trans>}
              cta={
                <Button size="sm" variant="outline" onClick={onOpenWizard}>
                  <Trans>Import clients</Trans>
                </Button>
              }
            />
          )
        ) : (
          // 2026-06-07 (design replication WDQea — /today empty / "caught up"):
          // a calm centered block (no icon-circle) that reassures Smart Priority
          // is watching, with a quiet ghost CTA to tune it + a link to the full
          // list. Responsive: copy capped + centered, CTA row wraps.
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center sm:px-10 sm:py-14">
            <p className="max-w-[540px] text-sm leading-relaxed text-text-secondary">
              <Trans>
                When something gets at-risk — a stalled evidence request, a rejected filing, a
                5-day client silence — Smart Priority will surface it here. Right now everything is
                on track.
              </Trans>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" size="sm" render={<Link to="/practice" />}>
                <SlidersHorizontalIcon data-icon="inline-start" />
                <Trans>Adjust priority rules</Trans>
              </Button>
              <Button variant="link" size="sm" onClick={onOpenAllObligations}>
                <Trans>See full deadline list</Trans>
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </div>
        )}
      </section>
    )
  }

  return (
    <section aria-label={t`Actions this week`} className="flex flex-col gap-3">
      <ActionsListHeader count={totalThisWeek} onOpenAll={onOpenAllObligations} />
      {/* 2026-06-04 round 15 (Yuqi page-feedback "hide this for
          now"): `<DashboardStatusLifecycleStrip>` render hidden.
          The strip + its scope caption + the new border tone work
          all stay in code so the surface can come back in one
          edit — uncomment the line below. The component is also
          still EXPORTED from this file for any other consumer. */}
      {/* {summaryStrip} */}
      {/* 2026-06-03 (Yuqi Pencil VmcdD — table layout): action rows
          moved from a custom hover-expand card list into a canonical
          `<Table>` primitive. Pencil's read: an explicit 5-column
          table (CLIENT / ACTION / FILING / INTERNAL DUE DATE / STATUS)
          scans faster than the previous flat row anatomy when
          there are many items, and reuses the same mental model the
          /deadlines queue uses. Click any row → opens the
          obligation drawer (same behavior the previous ActionRow
          carried). The hover-expand inline `dl` panel is dropped —
          the drawer is the canonical detail surface.
          `setHoveredId` is preserved so any future drift-protection
          (e.g. preview-on-hover) can re-attach without a contract
          change; for now it's wired but unused. */}
      {/* 2026-06-04 (Yuqi triage redesign): render rows through
          ActionsTieredSections which buckets rows by severity tier
          (Critical / High / Upcoming) with section headers carrying
          plain-language urgency copy. Replaces the single flat
          ActionsTable that didn't answer "what's most important?" */}
      <ActionsTieredSections
        rows={visible}
        asOfDate={asOfDate}
        onOpenObligation={onOpenObligation}
      />
      {/* 2026-06-03 (audit follow-up): `hoveredId === '__never__'`
          dead-code suppression removed alongside the state machinery
          it was holding alive. */}
      {/* 2026-05-26 (Yuqi /today feedback): "… N more in the queue"
          caption removed. The section already has a "View all
          deadlines" link in its header (see ActionsListHeader); the
          footer caption was duplicate-pointing to the same
          destination. The truncation itself is communicated
          implicitly — the count in the header tells the user how
          many TOTAL deadlines exist this week. */}
    </section>
  )
}

function ActionsListHeader({ onOpenAll }: { count: number | null; onOpenAll: () => void }) {
  const { t } = useLingui()
  return (
    // 2026-05-25 (Yuqi Today follow-up — clarification): h2 is
    // LEFT-aligned with the "All deadlines" link justify-between on
    // the right. Earlier centring attempt (grid 1fr/auto/1fr) was
    // misreading Yuqi's note — she meant the row should sit on the
    // left, with the title/count/caption sharing one visual midline
    // (`items-center`, not `items-baseline`).
    // 2026-06-04 (Yuqi alignment fix — "not left aligned"): dropped
    // `px-3` so the "Actions this week" header sits at the same
    // left edge as the lifecycle strip below, the tier headers
    // (Critical / High / Upcoming), and the ActionsTable wrapper.
    // The previous px-3 created an 8-12px stair-step between the
    // section headers and the table contents that read as broken
    // alignment.
    <div className="flex items-center justify-between gap-3">
      {/* 2026-05-25 (Yuqi #27 + Today follow-up): sort order was
          implicit ("list is ordered by Smart Priority desc"). Surfaced
          inline as "Sorted by priority" so the CPA knows why row 3 is
          below row 2. The Info icon next to the sort caption tells the
          reader the sort isn't arbitrary — there's documented logic
          behind it (the title attribute carries the short
          explanation; the full breakdown lives in the obligation's
          Smart Priority panel). Quiet caption so it doesn't compete
          with the h2. */}
      {/* 2026-05-25 (Yuqi Today #1 — second pass): h2 dropped from
          text-xl → text-lg. Yuqi flagged the page as "too much bold
          and medium text" again — keeping `font-semibold` for the
          single anchor per section, but stepping down a scale
          tier so the heading doesn't shout next to a quieter
          body. Same change made to the "Alerts" h2 in
          needs-attention-section.tsx. */}
      {/* 2026-06-03 (Yuqi Pencil VmcdD — actions header): count
          extracted from the heading string into a separate accent-
          toned "{N} awaiting" pill with a leading BadgeStatusDot.
          Matches the Alerts section's "{N} active" treatment so
          the two sections read as a parallel pair. The "sorted by
          priority" tail + ConceptHelp drop in favor of the cleaner
          parallel header (priority sorting is still the implicit
          contract; the hint moves to the column-sort affordance
          when we add it). */}
      {/* 2026-06-04 round 6 (Yuqi "alerts, actions this week title
          should be 大标题Today的下一级"): h2 stepped down from
          text-2xl → text-xl, matching the Alerts h2. Both
          section titles now sit one tier below the page H1. */}
      {/* 2026-06-04 round 7 (Yuqi "Smart Priority is not shown"):
          h2 gains a tiny accent-toned `<SparklesIcon>` prefix
          that reads as the section's algorithmic seal. Subtitle
          calls Smart Priority by name; icon makes the seal
          visual. Same micro-mark repeated on each row's rank
          chip so the table is unmistakably "smart". */}
      {/* 2026-06-04 round 16 (Yuqi page-feedback "align with
          Actions this week"): restructured the heading column so
          the SparklesIcon sits OUTSIDE the inner h2 + p stack.
          The inner stack's left edge is the same as the heading
          text's left edge, so the "Curated by Smart Priority…"
          paragraph now starts directly under "Actions this week"
          — not under the leading icon. Previously the p sat
          under the icon's left edge, creating an unintended
          indent against the heading text. */}
      {/* 2026-06-04 round 43 (Yuqi /today feedback #2 — "move the
          icon to after Actions this week icon? and it is replacing
          i icon as the information tooltip"): Sparkles moved INLINE
          INTO the h2, AFTER the "Actions this week" text. It now
          doubles as the tooltip trigger that the InfoIcon used to
          carry — one accent-toned icon does both jobs:
            • Marks the section as Smart-Priority curated (the
              original sparkle's role)
            • Opens the explanation tooltip on hover (the InfoIcon's
              old role)
          Saves a slot in the header without losing either signal.
          The leading SparklesIcon column outside the h2 is gone. */}
      {/* 2026-06-04 round 44 (Yuqi /today #2 — "tighter"): h2 →
          subtitle vertical gap collapsed `gap-1` (4px) → `gap-0`.
          The h2 + p sit as one tight title-stack now; the
          subtitle reads as a direct continuation of the h2, not
          as a separate caption line. */}
      <div className="flex flex-col">
        <h2 className="flex items-center gap-1.5 text-xl font-semibold tracking-tight text-text-primary">
          <Trans>Actions this week</Trans>
          <Tooltip>
            <TooltipTrigger
              render={(props) => (
                <button
                  type="button"
                  aria-label={t`About Actions this week`}
                  className="inline-flex size-5 cursor-help items-center justify-center rounded text-text-accent outline-none transition-colors hover:text-text-accent focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                  {...props}
                >
                  <SparklesIcon className="size-4" aria-hidden />
                </button>
              )}
            />
            <TooltipContent>
              <div className="flex max-w-[300px] flex-col gap-1 text-left">
                <span className="font-semibold">
                  <Trans>What's in this list</Trans>
                </span>
                <span>
                  <Trans>
                    Your top 10 deadlines due this week, ranked by Smart Priority and bucketed into
                    Critical (act today), High (this week), and Upcoming. Subgroups inside each tier
                    separate work you can start now from work waiting on the client.
                  </Trans>
                </span>
              </div>
            </TooltipContent>
          </Tooltip>
        </h2>
        <p className="text-sm text-text-tertiary">
          <Trans>
            Curated by Smart Priority — the work that needs your attention this week, not every
            deadline.
          </Trans>
        </p>
      </div>
      {/* 2026-06-04 round 16 (Yuqi page-feedback "remove arrow"):
          trailing ChevronRightIcon dropped on the section-link.
          The underlined "View all" copy alone carries the
          affordance; chevron read as a redundant directional cue. */}
      <TextLink
        render={
          <Link
            to="/deadlines"
            onClick={(event) => {
              event.preventDefault()
              onOpenAll()
            }}
          />
        }
      >
        <Trans>View all</Trans>
      </TextLink>
    </div>
  )
}

// 2026-06-03 (Yuqi Pencil VmcdD): 6-column lifecycle strip showing
// `Not started · Waiting on client · Blocked · In review · Filed ·
// Completed` counts derived from `rows`. Replaces the 3-tile
// `StatTile` cluster — the old shape only surfaced actionable
// buckets ("In review", "Blocked", "Waiting on client"), but the
// real CPA glance is "where does every active item sit on the
// lifecycle?"
//
// Each cell is a clickable Link routing to the deadlines queue
// filtered by status, so the strip doubles as a navigation
// surface (drill into any bucket).
//
// Design-system: wraps `<Card radius="md">` (no `tone` —
// neutral surface so the colored status icons read against a
// quiet bg). Right-borders between cells use `border-divider-subtle`
// to keep the lifecycle reading as one continuous strip, not 6
// separate cards.
const LIFECYCLE_CELLS = [
  { key: 'pending', icon: LoaderIcon, label: 'Not started', toneClass: 'text-text-tertiary' },
  {
    key: 'waiting_on_client',
    icon: HourglassIcon,
    label: 'Waiting on client',
    toneClass: 'text-text-warning',
  },
  {
    key: 'blocked',
    icon: ConstructionIcon,
    label: 'Blocked',
    toneClass: 'text-text-destructive',
  },
  {
    key: 'review',
    icon: MessageSquareTextIcon,
    label: 'In review',
    toneClass: 'text-text-accent',
  },
  { key: 'done', icon: FileCheckIcon, label: 'Filed', toneClass: 'text-text-success' },
  {
    key: 'completed',
    icon: CircleCheckIcon,
    label: 'Completed',
    toneClass: 'text-text-success',
  },
] as const

function DashboardStatusLifecycleStrip({ rows }: { rows: DashboardTopRow[] }) {
  const { t } = useLingui()
  // 2026-06-04 round 6 (Yuqi "ensure everything on Today is wired
  // correctly - all of the numbers will match"): status
  // aggregation now folds `in_progress` into the `review` cell
  // (both are CPA actively working). Previously `in_progress`
  // rows were silently dropped from the strip, so the strip
  // totals didn't add up to the visible rows count.
  const counts = useMemo(() => {
    const byStatus = new Map<string, number>()
    for (const row of rows) {
      const key = row.status === 'in_progress' ? 'review' : row.status
      byStatus.set(key, (byStatus.get(key) ?? 0) + 1)
    }
    return byStatus
  }, [rows])

  // i18n: label strings derived inside render via `t\`...\`` so the
  // lingui extractor catches them. The `LIFECYCLE_CELLS` constant
  // carries English fallbacks but the rendered text is gated.
  const cellLabels: Record<(typeof LIFECYCLE_CELLS)[number]['key'], string> = {
    pending: t`Not started`,
    waiting_on_client: t`Waiting on client`,
    blocked: t`Blocked`,
    review: t`In review`,
    done: t`Filed`,
    completed: t`Completed`,
  }

  return (
    // 2026-06-03 (Pencil VmcdD row-B `Y12FTm` exact replica):
    //   • cornerRadius 10
    //   • height: 120 (fixed) — set via min-height so the strip can
    //     grow if labels wrap on narrow viewports, but defaults to
    //     Pencil's exact 120px on the canonical viewport
    //   • bg-default with a 1px subtle hairline border
    //   • flex-row across 6 cells, no gap (cells own their dividers)
    //   • flex-wrap defensively for sub-960px viewports so labels
    //     don't clip into invisibility (cells fall to a 3×2 grid)
    //   • Each cell is a `<LifecycleStripCell>` primitive carrying
    //     icon + 28/600 value + 12/500 muted label per Pencil
    // 2026-06-03 (Pencil VmcdD: bg-default + rounded + border).
    // 2026-06-04 round 3 had briefly dropped the bg — strip floated
    // on the page wash with only an outer border.
    // 2026-06-04 round 14 (Yuqi page-feedback #2 "数据条有个背景"
    // — the data strip should have a background): bg restored to
    // `bg-background-default` (white). The strip now reads as a
    // sibling card to the ActionsTable cards below it — same
    // tonal family, page-wash > white cards. The outer border +
    // rounded radius frame the cluster as a unit; the white fill
    // gives the per-cell content something to sit on rather than
    // floating against the page wash.
    // 2026-06-04 round 14 (Yuqi page-feedback "so is this for
    // Actions this week, or all deadlines?"): wrapped the strip
    // with a small eyebrow caption so the scope is explicit at
    // the glance, not implicit via the section header above.
    // Strip is fed from `visible` (the top 10 rows of this
    // week's actions); the caption names that scope directly.
    // 11/600 uppercase tertiary matches the canonical column-
    // label tone shared across tables — same family signal.
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold tracking-[0.5px] text-text-tertiary uppercase">
        <Trans>Status across this week's actions</Trans>
      </span>
      <div className="flex flex-row flex-wrap overflow-hidden rounded-[10px] border border-divider-deep bg-background-default">
        {LIFECYCLE_CELLS.map((cell, index) => {
          const count = counts.get(cell.key as ObligationStatus) ?? 0
          return (
            <LifecycleStripCell
              key={cell.key}
              href={`/deadlines?status=${cell.key}`}
              icon={cell.icon}
              iconToneClass={cell.toneClass}
              value={count}
              label={cellLabels[cell.key]}
              isFirst={index === 0}
              isLast={index === LIFECYCLE_CELLS.length - 1}
              ariaLabel={t`${count} deadlines: ${cellLabels[cell.key]}`}
            />
          )
        })}
      </div>
    </div>
  )
}

export { DashboardActionsList, DashboardStatusLifecycleStrip, daysUntilDueFromAsOf }
