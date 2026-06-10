import { Fragment, useMemo } from 'react'
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

import type { DashboardBriefScope, DashboardTopRow, ObligationStatus } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Table, TableBody, TableCell, TableRow } from '@duedatehq/ui/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'

import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { DueDateLabel } from '@/components/primitives/due-date-label'
import { formatDatePretty } from '@/lib/utils'
import { ReadinessIndicator } from '@/components/primitives/readiness-indicator'
import { EmptyState as SharedEmptyState } from '@/components/patterns/empty-state'
import { ExtensionChip } from './extension-chip'
import { LifecycleStripCell } from './lifecycle-strip-cell'
// The owner-avatar slot carries the EFFECTIVE assigneeId/assigneeName
// (obligation override, else client default). The avatar replaces a
// per-row status column: rows are already grouped under status headers,
// so a per-row status badge would repeat the header's information while
// the owner stays invisible. `isMine` matches on user id (not display
// name — the queue's name-compare fallback predates the id being
// available on the contract).
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { useCurrentUserId } from '@/lib/use-current-user-name'

function topPriorityFactors(row: DashboardTopRow): string[] {
  const factors = [...(row.smartPriority.factors ?? [])]
    .filter((f) => f.contribution > 0)
    .toSorted((a, b) => b.contribution - a.contribution)
    .slice(0, 2)
  return factors.map((f) => f.label)
}

// Dashboard v2 "Priority Actions" — verb-led action queue.
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

// Action prompts are imperative tasks a CPA would put in their own
// to-do list, not developer prose.
//
// This is a hook (not a plain function taking `t`): Lingui 5's macro
// transform only fires when `t` is referenced directly in source
// position (imported from `@lingui/react/macro` or destructured from
// `useLingui()` at the call site). Passing `t` as a function arg turns
// every `t\`source\`` in the body into a raw tagged-template call that
// returns `undefined`, so `useLingui()` must live in scope right next to
// every `t\`…\`` macro use.
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

// Row chrome stays NEUTRAL — no per-row rail, no tone-colored chevron,
// no per-row frame. Column shape:
//   • CLIENT 220 — name
//   • ACTION 280 — verb prompt + WHY-NOW sublabel
//   • FILING 130 — TaxCodeBadge
//   • READINESS 180 — `<ReadinessIndicator>` "Docs N/M · missing X"
//     (primary triage signal)
//   • DUE 150 — `<DueDateLabel>` relative countdown
//   • STATUS fill — status pill + `<ExtensionChip>` when applicable +
//     payment-late caption
//   • chevron-down end column — neutral text-tertiary, no tone color

// Rows group by the 6-state lifecycle status, each with its own divider
// header. The raw 10-value status enum folds into the 6 canonical
// buckets (in_progress → review, paid / not_applicable → completed,
// extended → pending).
type StatusGroup = 'pending' | 'waiting_on_client' | 'blocked' | 'review' | 'done' | 'completed'
const STATUS_GROUP_ORDER: readonly StatusGroup[] = [
  'pending',
  'waiting_on_client',
  'blocked',
  'review',
  'done',
  'completed',
]
function classifyStatusGroup(status: DashboardTopRow['status']): StatusGroup {
  switch (status) {
    case 'waiting_on_client':
      return 'waiting_on_client'
    case 'blocked':
      return 'blocked'
    case 'in_progress':
    case 'review':
      return 'review'
    case 'done':
      return 'done'
    case 'paid':
    case 'not_applicable':
    case 'completed':
      return 'completed'
    default:
      // pending + extended (still to-be-started)
      return 'pending'
  }
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
  // A single table grouped by lifecycle status (per-row urgency reads
  // from the red due countdown + the Smart-Priority rank order). JS sort
  // is stable, so the incoming priority order is preserved within each
  // status group.
  const ordered = useMemo(
    () =>
      rows.toSorted(
        (a, b) =>
          STATUS_GROUP_ORDER.indexOf(classifyStatusGroup(a.status)) -
          STATUS_GROUP_ORDER.indexOf(classifyStatusGroup(b.status)),
      ),
    [rows],
  )
  if (ordered.length === 0) return null
  return <ActionsTable rows={ordered} asOfDate={asOfDate} onOpenObligation={onOpenObligation} />
}

function ActionsTable({
  rows,
  asOfDate,
  onOpenObligation,
}: {
  rows: DashboardTopRow[]
  asOfDate: string | null
  onOpenObligation: (row: DashboardTopRow) => void
}) {
  if (rows.length === 0) return null
  // Track status-group boundaries so the body interleaves a status
  // divider header above the first row of each group.
  let lastStatusGroup: StatusGroup | null = null
  return (
    // Wrapper conforms to the canonical table card — rounded-[12px]
    // border border-divider-regular (table-canonical-style.md; matches
    // the /alerts list + /deadlines table) so all three tables share one
    // frame. The 12px radius respects the no-random-corners rule (14 is
    // banned).
    <div className="overflow-hidden rounded-[12px] border border-divider-regular bg-background-default">
      {/* Pencil ErW76 Table — radius 14, white fill, one 8% hairline
          (#10182814 -> border-divider-subtle). The white fill keeps the
          Actions table the brightest (focal) surface on /today. */}
      {/* No `<TableHeader>`: without column labels the same column
          structure reads as a list of action items rather than a data
          table. Action verb + Client anchor each row; meta cells (filing
          chip / readiness / due / status) sit as right-aligned supporting
          context. */}
      {/* Rows opt out of the canonical zebra so the table reads as one
          flat white surface — status-group header bands carry the
          structure. */}
      <Table className="[&_td]:py-2.5 [&_tbody_tr]:even:bg-transparent">
        <TableBody>
          {rows.map((row) => {
            const currentStatusGroup = classifyStatusGroup(row.status)
            const isNewStatusGroup = currentStatusGroup !== lastStatusGroup
            lastStatusGroup = currentStatusGroup
            // Dividers render even for a single-status table — with the
            // per-row status pill replaced by the owner avatar, the group
            // header is the ONLY place a row's workflow status is visible.
            const statusHeader = isNewStatusGroup ? (
              // Subgroup divider rows are NOT clickable — they're labels.
              // The `cursor-default` + explicit hover override on the
              // TableRow primitive keep them static-looking. The solid
              // `bg-background-subtle` band reads as a real header dividing
              // the lifecycle groups. `even:bg-transparent` opts the row
              // out of the canonical zebra.
              <TableRow
                key={`${currentStatusGroup}-divider`}
                className="cursor-default even:bg-transparent hover:!bg-background-subtle"
                aria-hidden="false"
              >
                <TableCell
                  colSpan={7}
                  className="bg-background-subtle px-[18px] py-1.5 text-xs font-semibold tracking-[0.5px] text-text-tertiary uppercase"
                >
                  <StatusGroupLabel kind={currentStatusGroup} />
                </TableCell>
              </TableRow>
            ) : null
            return (
              <Fragment key={row.obligationId}>
                {statusHeader}
                <ActionsTableRow
                  row={row}
                  asOfDate={asOfDate}
                  onClick={() => onOpenObligation(row)}
                />
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function StatusGroupLabel({ kind }: { kind: StatusGroup }) {
  switch (kind) {
    case 'waiting_on_client':
      return <Trans>Waiting on client</Trans>
    case 'blocked':
      return <Trans>Blocked</Trans>
    case 'review':
      return <Trans>In review</Trans>
    case 'done':
      return <Trans>Filed</Trans>
    case 'completed':
      return <Trans>Completed</Trans>
    default:
      return <Trans>Not started</Trans>
  }
}

function ActionsTableRow({
  row,
  asOfDate,
  onClick,
}: {
  row: DashboardTopRow
  asOfDate: string | null
  onClick: () => void
}) {
  const { t } = useLingui()
  const days = daysUntilDueFromAsOf(row.currentDueDate, asOfDate)
  const prompt = useActionPrompt(row, asOfDate)
  const currentUserId = useCurrentUserId()
  const isMine = currentUserId !== null && row.assigneeId === currentUserId
  const assigneeName = row.assigneeName
  // All rows compute factors for the rank-cell tooltip, so every row
  // can surface its Smart Priority rationale on hover.
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
      // Zebra striping, bottom border, and transition-colors live on the
      // canonical `<TableRow>` primitive; this callsite owns only the
      // interactivity affordances (cursor + focus ring) and the `group`
      // hook for descendants. `py-3` leaves room for a 2-line stacked
      // cell (action + why-now, due-date + relative date) without feeling
      // suffocated. The hover token is opaque so the Review mask below
      // still hides the due date.
      className="group relative cursor-pointer hover:!bg-background-default-hover focus-visible:bg-background-default-hover focus-visible:outline-none [&_td]:py-3"
    >
      {/* Plain mono rank with a sparkle for the top 3 only. The tooltip
          on the rank text gives explainability — hover the number, see
          the factors. The compact px override keeps the mono number
          centered in the narrow rank column. */}
      <TableCell className="pr-2 pl-[18px] text-left">
        <Tooltip>
          <TooltipTrigger
            render={(props) => (
              <span
                {...props}
                onClick={(e) => {
                  props?.onClick?.(e)
                  e.stopPropagation()
                }}
                className="inline-flex cursor-help items-center justify-center gap-1 font-mono text-xs font-semibold tabular-nums text-text-tertiary"
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
                    .toSorted((a, b) => b.contribution - a.contribution)
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
      {/* Client column uses the quieter `text-text-tertiary` so the
          action prompt owns the eye and the client name reads as the
          "for which client?" context rather than competing for primary
          attention. */}
      <TableCell className="text-xs text-text-tertiary">{row.clientName}</TableCell>
      <TableCell className="w-[400px]">
        {/* The Why-now factor line surfaces Smart Priority reasoning
            inline. The reason text is ALWAYS visible under the prompt —
            it's the primary triage signal, not a hover-only extra. Only
            the leading corner glyph fades in on row hover (it's a
            decorative connector, not information); its `opacity-0`
            reserves the slot so the text doesn't shift. */}
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-normal text-text-secondary transition-colors group-hover:font-medium group-hover:text-text-primary">
            {prompt}
          </span>
          {allRowFactors.length > 0 ? (
            <span
              className="relative inline-flex items-center text-xs text-text-tertiary"
              title={allRowFactors.join(' · ')}
            >
              {/* Leading corner glyph (filled quarter-turn) signalling this is a
                  follow-on reason for the prompt above. It sits at the line's
                  LEFT edge (flush with the action title above); on row hover it
                  fades in WHILE the "Why now:" text indents to its right, so the
                  corner reads as a connector hanging off the prompt. At rest the
                  icon is hidden and the text sits flush-left, so nothing shifts
                  until hover. */}
              <svg
                viewBox="0 0 9 9"
                className="absolute top-1/2 left-0 size-3 -translate-y-1/2 text-text-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                fill="none"
                aria-hidden
              >
                <path
                  d="M0 2V0H1V2C1 5.03757 3.46243 7.5 6.5 7.5H8.5V8.5H6.5C2.91015 8.5 0 5.58985 0 2Z"
                  fill="currentColor"
                />
              </svg>
              <span className="truncate transition-[margin] duration-200 group-hover:ml-[18px] group-focus-visible:ml-[18px]">
                <Trans>Why now:</Trans> {allRowFactors.join(' · ')}
              </span>
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
      {/* The status pill is replaced by the owner avatar. Rows already
          sit under status group headers, so a per-row pill would repeat
          information; "whose work is this?" is the missing signal.
          ExtensionChip stays — `extended` folds into the "Not started"
          group, so without the chip an extended row would be
          indistinguishable from a plain pending one. */}
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <AssigneeAvatar
            name={assigneeName}
            isMine={isMine}
            title={
              assigneeName === null
                ? t`Unassigned`
                : isMine
                  ? // Local binding (not row.assigneeName) so the Lingui
                    // placeholder is {assigneeName} — same message id the
                    // deadlines queue already translates.
                    t`Assigned to you (${assigneeName})`
                  : assigneeName
            }
          />
          {row.status === 'extended' ? <ExtensionChip /> : null}
        </div>
      </TableCell>
      {/* DUE cell stacks: relative countdown + absolute internal due date.
          It's now the trailing cell (pr-[18px] gives the row's right inset);
          the Review action no longer takes a dedicated column. */}
      <TableCell className="pr-[18px]">
        <div className="flex flex-col gap-0.5">
          <DueDateLabel
            days={days}
            status={row.status}
            paymentDueDate={row.paymentDueDate}
            asOfDate={asOfDate}
          />
          <span className="text-xs font-medium tabular-nums text-text-tertiary">
            {formatDatePretty(row.currentDueDate)}
          </span>
        </div>
        {/* The Review CTA has no trailing column (which would steal width
            from the content cells). It's an absolutely-positioned `primary`
            button anchored to the row's right edge (the row is `relative`),
            invisible at rest and faded in on hover/focus. A left-fading
            gradient in the row's hover tone masks whatever sits under it (the
            due date) so the button always reads cleanly without obscuring the
            action prompt far to the left. `pointer-events-none` on the mask
            keeps the whole-row click working; the button re-enables pointer
            events. `tabIndex={-1}`/`aria-hidden` keep it out of the tab
            order — the row itself is the focusable target. */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end bg-gradient-to-l from-background-default-hover from-55% to-transparent pr-[18px] pl-16 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          <Button
            type="button"
            size="xs"
            variant="primary"
            tabIndex={-1}
            aria-hidden
            onClick={(event) => {
              event.stopPropagation()
              onClick()
            }}
            className="pointer-events-auto"
          >
            <Trans>Review</Trans>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function DashboardActionsList({
  rows,
  asOfDate,
  isLoading,
  totalOpen,
  canRunMigration,
  onOpenWizard,
  onOpenObligation,
  onOpenAllObligations,
  // The "Need your decision / Blocked / Waiting on client" counts are
  // part of this section (they share the "this week" scope), surfaced as
  // its summary header rather than a standalone strip.
  needDecisionCount,
  blockedCount,
  waitingOnClientCount,
  needDecisionDelta,
  blockedDelta,
  waitingOnClientDelta,
  hasClients,
  scope,
  firmTotalOpen,
  onSwitchToEveryone,
}: {
  rows: DashboardTopRow[]
  asOfDate: string | null
  isLoading: boolean
  // Open obligations WITHIN the current scope — used to split the empty
  // state: zero rows in the priority queue means there is no open
  // deadline work in this scope; rows elsewhere should still route to
  // /deadlines.
  totalOpen: number
  // Current page scope + the unscoped firm-wide open count. When
  // scope='me' empties the personal queue but the firm still has open
  // work, the empty state offers a one-click switch to Everyone instead
  // of pretending the practice is idle.
  scope: DashboardBriefScope
  firmTotalOpen: number
  onSwitchToEveryone: () => void
  canRunMigration: boolean
  // When there are 0 open obligations we distinguish a fresh practice
  // (no clients yet, encourage import) from a practice that already
  // imported and just doesn't have deadlines generated yet (don't ask
  // them to import again). Probed once at the route level via
  // `clients.listByFirm({ limit: 1 })`.
  hasClients: boolean
  onOpenWizard: () => void
  onOpenObligation: (row: DashboardTopRow) => void
  onOpenAllObligations: () => void
  needDecisionCount: number
  blockedCount: number
  waitingOnClientCount: number
  // Optional week-over-week deltas for the summary tiles. Pass
  // `undefined` (the current default) to suppress the trend pill; pass a
  // real number once the route loader has prior-period counts wired in.
  needDecisionDelta?: number | undefined
  blockedDelta?: number | undefined
  waitingOnClientDelta?: number | undefined
}) {
  const { t } = useLingui()
  const VISIBLE_CAP = 10
  const visible = rows.slice(0, VISIBLE_CAP)

  // Build summary segments — drop zero-count entries. Only `blocked`
  // uses destructive — it's the one genuinely-stuck signal.
  //
  // The lifecycle strip shows the full status lifecycle on one
  // horizontal strip so the CPA reads *everything in progress* at a
  // glance, not just the items demanding immediate attention. Counts
  // come from the same `rows` array the action table consumes — no extra
  // round-trip. The legacy `needDecisionCount`, `blockedCount`,
  // `waitingOnClientCount`, and `*Delta` props are unused at the strip
  // level but kept on the public API to avoid breaking the route loader's
  // call signature.
  void needDecisionCount
  void blockedCount
  void waitingOnClientCount
  void needDecisionDelta
  void blockedDelta
  void waitingOnClientDelta

  // Strip uses `visible` (top 10 rows displayed in the table) instead of
  // `rows` (up to 20 from server) so the counts match the rows the CPA
  // sees. The strip isn't currently rendered; the `summaryStrip` const +
  // `void` below keep it alive so revival is a one-line uncomment.
  const summaryStrip = <DashboardStatusLifecycleStrip rows={visible} />
  void summaryStrip

  if (isLoading) {
    return (
      <section aria-label={t`Priority Actions`} className="flex flex-col gap-3">
        <ActionsListHeader scope={scope} onOpenAll={onOpenAllObligations} />
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
    // Empty states, in the order they should be tested:
    //   1. This scope has open obligations elsewhere — route to
    //      /deadlines. Avoids the "import again" misread when the user
    //      already has data.
    //   2. (scope='me' only) Your queue is clear but the FIRM still has
    //      open work — say so and offer the one-click switch to Everyone.
    //      Without this branch a cleared-up member reads "no deadlines"
    //      while colleagues' work is still burning down.
    //   3. The practice has zero obligations AND no clients yet — keep
    //      the import CTA.
    //   4. Caught-up state (rows exist somewhere but Smart Priority
    //      filtered them all out).
    return (
      <section aria-label={t`Priority Actions`} className="flex flex-col gap-3">
        <ActionsListHeader scope={scope} onOpenAll={onOpenAllObligations} />
        {totalOpen > 0 ? (
          <p className="rounded-lg border border-divider-subtle p-4 text-center text-sm text-text-secondary">
            <Trans>No priority actions right now.</Trans>{' '}
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
        ) : scope === 'me' && firmTotalOpen > 0 ? (
          // Personal queue is clear, firm isn't. Celebrate the clear
          // queue but keep the firm's remaining load one click away —
          // the switch flips the WHOLE page scope (brief + actions +
          // counts), not just this list.
          <SharedEmptyState
            icon={CircleCheckIcon}
            title={<Trans>You're all caught up</Trans>}
            description={
              <Plural
                value={firmTotalOpen}
                one="Nothing assigned to you (or unassigned) needs attention. The rest of the practice still has # open deadline."
                other="Nothing assigned to you (or unassigned) needs attention. The rest of the practice still has # open deadlines."
              />
            }
            cta={
              <Button size="sm" variant="outline" onClick={onSwitchToEveryone}>
                <Trans>Show everyone's work</Trans>
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            }
          />
        ) : canRunMigration ? (
          // The zero-obligations message splits into two distinct states:
          //   • No clients: "No clients yet" + Import CTA — the fresh-
          //     practice path. The user needs data; importing is the
          //     correct next action.
          //   • Has clients, no deadlines: "No active deadlines yet" +
          //     guidance toward Rule Library — the post-import path where
          //     the user already imported but their rules haven't
          //     generated future deadlines. Pointing them at /clients to
          //     verify state is the right move; importing again would
          //     create dupes.
          // The CTA is `outline`, not `primary`, so the accent stays
          // reserved for the one next action per surface.
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
          // "Caught up" empty state — a calm centered block (no icon-circle)
          // that reassures Smart Priority is watching, with a quiet ghost CTA
          // to tune it + a link to the full list. Responsive: copy capped +
          // centered, CTA row wraps.
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center sm:px-10 sm:py-14">
            <p className="max-w-[540px] text-sm leading-relaxed text-text-secondary">
              <Trans>
                When something gets at-risk — a stalled evidence request, a rejected filing, a 5-day
                client silence — Smart Priority will surface it here. Right now everything is on
                track.
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
    <section aria-label={t`Priority Actions`} className="flex flex-col gap-3">
      <ActionsListHeader scope={scope} onOpenAll={onOpenAllObligations} />
      {/* `<DashboardStatusLifecycleStrip>` render is hidden for now; the
          strip + its scope caption all stay in code so the surface can
          come back by uncommenting the line below. The component is also
          still exported from this file for any other consumer. */}
      {/* {summaryStrip} */}
      {/* Action rows render through a canonical `<Table>` primitive: an
          explicit column table scans faster than a flat row anatomy when
          there are many items, and reuses the same mental model the
          /deadlines queue uses. Click any row → opens the obligation
          drawer (the canonical detail surface). */}
      <ActionsTieredSections
        rows={visible}
        asOfDate={asOfDate}
        onOpenObligation={onOpenObligation}
      />
      {/* No "… N more in the queue" footer caption: the section title
          links to /deadlines, so a footer link would duplicate the same
          destination. The shortlist cap is explained in the tooltip. */}
    </section>
  )
}

function ActionsListHeader({
  scope,
  onOpenAll,
}: {
  scope: DashboardBriefScope
  onOpenAll: () => void
}) {
  const { t } = useLingui()
  return (
    // h2 is LEFT-aligned, with the title/caption sharing one visual
    // midline (`items-center`, not `items-baseline`).
    // No `px-3` so the action header sits at the same left edge as the
    // table wrapper below; the previous padding created a stair-step that
    // read as broken alignment.
    <div className="flex items-center justify-between gap-3">
      {/* The inline SparklesIcon (after the title text) does two jobs at
          once — it marks the section as Smart-Priority curated and it
          opens the explanation tooltip on hover — so the header needs no
          separate Info icon. */}
      <div className="flex flex-col">
        {/* 2026-06-10 (Yuqi "titles are disturbing — quieter"): demoted
            eyebrow treatment shared with the Alerts h2 — 11px / 600 /
            muted tertiary / wider tracking. See section-header-style.md. */}
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.6px] text-text-tertiary uppercase">
          {/* The title links to the full deadlines list (via onOpenAll). The
              Sparkles tooltip stays a non-link sibling. */}
          <Link
            to="/deadlines"
            onClick={(event) => {
              event.preventDefault()
              onOpenAll()
            }}
            className="rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Trans>Priority Actions</Trans>
          </Link>
          <Tooltip>
            <TooltipTrigger
              render={(props) => (
                <button
                  type="button"
                  aria-label={t`About Priority Actions`}
                  className="inline-flex size-4 cursor-help items-center justify-center rounded text-text-tertiary outline-none transition-colors hover:text-text-accent focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                  {...props}
                >
                  <SparklesIcon className="size-3.5" aria-hidden />
                </button>
              )}
            />
            {/* Title row — a tiny accent SparklesIcon + 13/600 title — sits
                above a 12/normal relaxed-leading body, separated by a hairline,
                so it reads as a designed mini-popover. */}
            <TooltipContent className="items-stretch">
              <div className="flex max-w-[300px] flex-col gap-2 text-left">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-components-tooltip-text">
                  <SparklesIcon className="size-3.5 shrink-0 text-text-accent" aria-hidden />
                  <Trans>What's in this list</Trans>
                </span>
                <span className="border-t border-components-panel-border/60 pt-2 text-xs leading-relaxed font-normal text-components-tooltip-text/85">
                  {/* The copy follows the page scope — each mode says what it
                      shows ("your" would be wrong for the firm-wide list). */}
                  {scope === 'me' ? (
                    <Trans>
                      Your top 10 open deadlines — assigned to you or unassigned — ranked by Smart
                      Priority and grouped by workflow status.
                    </Trans>
                  ) : (
                    <Trans>
                      The practice's top 10 open deadlines, ranked by Smart Priority and grouped by
                      workflow status. Each group keeps Smart Priority order.
                    </Trans>
                  )}
                </span>
              </div>
            </TooltipContent>
          </Tooltip>
        </h2>
        <p className="text-sm text-text-tertiary">
          <Trans>
            Curated by Smart Priority — the next work most worth handling, not every deadline.
          </Trans>
        </p>
      </div>
    </div>
  )
}

// 6-column lifecycle strip showing `Not started · Waiting on client ·
// Blocked · In review · Filed · Completed` counts derived from `rows`.
// The CPA glance it answers is "where does every active item sit on the
// lifecycle?", not just the actionable buckets.
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
  // Status aggregation folds `in_progress` into the `review` cell (both
  // are CPA actively working) so the strip totals add up to the visible
  // rows count.
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
    // Layout:
    //   • flex-row across 6 cells, no gap (cells own their dividers)
    //   • flex-wrap defensively for sub-960px viewports so labels
    //     don't clip into invisibility (cells fall to a 3×2 grid)
    //   • Each cell is a `<LifecycleStripCell>` primitive carrying
    //     icon + value + muted label
    // White fill + outer border + rounded radius frame the cluster as a
    // sibling card to the ActionsTable cards below it, giving the
    // per-cell content something to sit on rather than floating against
    // the page wash. The eyebrow caption names the scope explicitly
    // (the strip is fed from `visible`, the top priority actions).
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold tracking-[0.5px] text-text-tertiary uppercase">
        <Trans>Status across priority actions</Trans>
      </span>
      <div className="flex flex-row flex-wrap overflow-hidden rounded-xl border border-divider-deep bg-background-default">
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
