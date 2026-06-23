import { Fragment, useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import type { ObligationStatus, PulseAffectedClient } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { cn } from '@duedatehq/ui/lib/utils'

import { formatDatePretty } from '@/lib/utils'
import { deadlineDetailHref } from '@/features/obligations/deadline-detail-url'
import { clientDetailPath } from '@/features/clients/client-url'
import {
  LIFECYCLE_V2_STATUSES,
  LIFECYCLE_V2_STATUS_SETS,
  StatusMark,
  STATUS_ICON_COLOR,
  useLifecycleV2StatusLabels,
} from '@/features/obligations/status-control'

import { isSelectable, toggleSelection, setAllSelection } from '../lib/selection'

// Each affected client carries its obligation's real lifecycle status
// (PulseAffectedClient.status). When an alert spans clients in different
// stages — some not-started, some already in review, some filed — a flat
// table buries that signal; grouping by the v2 lifecycle stage answers
// "where does the firm stand on this relief?" at a glance (Pencil img-026).
//
// Grouping is keyed on the SIX collapsed v2 stages, not the raw 10-value
// enum, so in_progress / review / extended (all "In review") don't fragment
// into three headers. This inverse map sends each raw status to its v2
// stage; it's the exact inverse of LIFECYCLE_V2_STATUS_SETS (same source of
// truth the queue counts against), so a row's header label always matches
// the ObligationStatusReadBadge it would wear elsewhere.
type V2Stage = (typeof LIFECYCLE_V2_STATUSES)[number]
const RAW_STATUS_TO_V2_STAGE: Record<ObligationStatus, V2Stage> = (() => {
  // oxlint-disable-next-line no-unsafe-type-assertion -- empty literal cast; map is fully filled by the loop below before return
  const map = {} as Record<ObligationStatus, V2Stage>
  for (const stage of LIFECYCLE_V2_STATUSES) {
    for (const raw of LIFECYCLE_V2_STATUS_SETS[stage]) {
      map[raw] = stage
    }
  }
  return map
})()

interface AffectedClientsTableProps {
  rows: readonly PulseAffectedClient[]
  selection: ReadonlySet<string>
  confirmedReviewIds: ReadonlySet<string>
  excludedIds?: ReadonlySet<string> | undefined
  onChangeSelection: (next: Set<string>) => void
  onToggleNeedsReviewConfirmation: (obligationId: string, confirmed: boolean) => void
  onToggleExcluded?: ((obligationId: string, excluded: boolean) => void) | undefined
  /** When true, all controls are read-only (e.g. RBAC denies apply). */
  readOnly?: boolean
  /**
   * 'apply' (default) renders the full date-overlay workflow — the select
   * checkbox, the "Due date change" (old → new) column, and the "Match"
   * status + Confirm/Exclude controls. 'review' is the rule-change /
   * source-drift variant: those columns don't apply (no new date is
   * computed, and there's nothing to apply), so it renders a clean
   * informational list of Client + Form, each row linking to the deadline.
   */
  variant?: 'apply' | 'review'
}

// High-match alerts can carry dozens of rows (a CA 1040 shift can hit half
// the client book) — collapsed, the table shows the first VISIBLE_COLLAPSED
// rows plus a "Show all N" footer (the collapsible-density rule: long detail
// cards must collapse). Below COLLAPSE_THRESHOLD everything renders and no
// expander appears ("Show all 9" would be sillier than 9 rows).
const COLLAPSE_THRESHOLD = 10
const VISIBLE_COLLAPSED = 8

// Humanized entity-type labels (Pencil KwfpP ENTITY column). The contract
// carries the snake_case enum; this maps each to its display form.
const ENTITY_LABEL: Record<PulseAffectedClient['entityType'], string> = {
  llc: 'LLC',
  s_corp: 'S-corp',
  partnership: 'Partnership',
  c_corp: 'C-corp',
  sole_prop: 'Sole prop',
  trust: 'Trust',
  individual: 'Individual',
  other: 'Other',
}

// "FL · Lee" — state code + county; just the state when no county, "—" when
// neither is known (Pencil KwfpP LOCATION column).
function formatLocation(row: PulseAffectedClient): string {
  return [row.state, row.county].filter(Boolean).join(' · ') || '—'
}

// Affected clients table inside the Drawer body. One row per obligation; only
// `eligible` rows are interactive. Other matchStatus values are surfaced with
// a badge so CPAs see why a row isn't part of the apply set.
export function AffectedClientsTable({
  rows,
  selection,
  confirmedReviewIds,
  excludedIds = new Set(),
  onChangeSelection,
  onToggleNeedsReviewConfirmation,
  onToggleExcluded,
  readOnly = false,
  variant = 'apply',
}: AffectedClientsTableProps) {
  const { t } = useLingui()
  const isReview = variant === 'review'
  const selectableCount = rows.filter((row) => isSelectable(row, confirmedReviewIds)).length
  const selectedCount = countSelected(rows, selection, confirmedReviewIds)
  const allSelectableChecked = selectableCount > 0 && selectedCount === selectableCount

  // Collapse state. Reset when the table is handed a different alert's rows
  // (render-time setState per project rule — same pattern as the drawer's
  // resetKey). Key off first-row id + length so switching alerts collapses
  // again, while selection churn on the same alert doesn't.
  const [showAll, setShowAll] = useState(false)
  const [rowsKey, setRowsKey] = useState<string | null>(null)
  const nextRowsKey = `${rows[0]?.obligationId ?? 'none'}:${rows.length}`
  if (rowsKey !== nextRowsKey) {
    setShowAll(false)
    setRowsKey(nextRowsKey)
  }
  const collapsible = rows.length > COLLAPSE_THRESHOLD
  // When the table collapses, rows the AI flagged `needs_review` sort to the
  // TOP — the fold may only ever hide auto-matched rows, never one that
  // needs human eyes. Below the threshold the server order is kept
  // untouched (no behavior change for small sets, which is also what the
  // demo data + E2E specs render).
  const orderedRows = useMemo(() => {
    if (!collapsible) return rows
    return [...rows].toSorted(
      (a, b) =>
        (a.matchStatus === 'needs_review' ? 0 : 1) - (b.matchStatus === 'needs_review' ? 0 : 1),
    )
  }, [rows, collapsible])
  const visibleRows =
    collapsible && !showAll ? orderedRows.slice(0, VISIBLE_COLLAPSED) : orderedRows

  // Group-by-status only in the 'apply' variant, and only when the rows
  // actually SPAN more than one v2 stage — a single-status set (the common
  // case) renders flat, so we never fragment "5 not-started clients" behind
  // one redundant "Not started · 5" header. The 'review' variant is a clean
  // informational list with no status column, so it stays ungrouped.
  const distinctStages = useMemo(() => {
    const stages = new Set<V2Stage>()
    for (const row of rows) stages.add(RAW_STATUS_TO_V2_STAGE[row.status])
    return stages
  }, [rows])
  const grouped = !isReview && distinctStages.size > 1
  // Partition the VISIBLE window (post-collapse slice) into ordered groups.
  // Iterating LIFECYCLE_V2_STATUSES gives the lifecycle reading order
  // (Not started → Waiting → Blocked → In review → Filed → Completed); the
  // filter preserves each row's position in orderedRows, so the
  // needs_review-first sort survives inside every group. Empty groups (no
  // visible rows after the collapse slice) are dropped so the fold stays
  // honest about what's shown.
  const groups = useMemo(() => {
    if (!grouped) return []
    return LIFECYCLE_V2_STATUSES.map((stage) => ({
      stage,
      // Full-set count for the header — the collapse may hide some rows of a
      // stage, but the header still tells the truth about the whole alert.
      total: rows.reduce(
        (acc, row) => (RAW_STATUS_TO_V2_STAGE[row.status] === stage ? acc + 1 : acc),
        0,
      ),
      visible: visibleRows.filter((row) => RAW_STATUS_TO_V2_STAGE[row.status] === stage),
    })).filter((group) => group.visible.length > 0)
  }, [grouped, rows, visibleRows])

  // Per-group collapse. Default: every group expanded. Tracks the COLLAPSED
  // set so a fresh alert (groups change) starts fully expanded without a
  // reset effect. Collapsing a group only hides its rows visually — it never
  // touches selection, so select-all still operates on every row.
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<V2Stage>>(new Set())
  const toggleGroup = (stage: V2Stage) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(stage)) next.delete(stage)
      else next.add(stage)
      return next
    })
  }
  const v2Labels = useLifecycleV2StatusLabels()
  // Body column count for the group-header band's colSpan: select + Client +
  // Entity + Location + Current→New + Match = 6 in the apply variant.
  const bodyColSpan = 6

  const handleToggleAll = (checked: boolean) => {
    onChangeSelection(setAllSelection(rows, checked, confirmedReviewIds))
  }

  const handleToggleRow = (row: PulseAffectedClient) => {
    if (!isSelectable(row, confirmedReviewIds)) return
    onChangeSelection(toggleSelection(selection, row.obligationId))
  }

  // Per-row "Confirm applies" goes through a confirmation Dialog rather
  // than an inline checkbox: applying a relief the AI flagged as
  // needs_review is a real consequence (deadline shifts that touch the
  // client's workflow). Clicking "Confirm applies" opens a Dialog asking
  // the CPA to confirm explicitly, so the action requires both gestures
  // (open the dialog + click Confirm) — a deliberate double-confirm.
  // Unconfirming is a single click on the same row — the negative path
  // doesn't need a dialog.
  const [confirmTarget, setConfirmTarget] = useState<PulseAffectedClient | null>(null)
  const navigate = useNavigate()
  return (
    <>
      {/* Outer border + overflow-hidden so the table reads as one
          clipped surface — corners and the bottom row line up to the
          same radius. AffectedClientsTable is visually identical to the
          /deadlines obligations table:
            • Body cells: `[&_td]:py-2 [&_td]:text-sm` matches obligations'
              `TableBody` (py-2 row density + canonical body text-sm). The
              compact-cell override is kept because this is a dense overlay
              table where the canonical py-4 reads too tall.
            • Header heights stay h-10 — same as obligations queue header.
            • Client name explicitly `text-sm font-medium leading-tight
              text-text-primary` (see TableCell below) so it renders
              identically to the obligations row client name, not just
              relying on inherited text-sm from the cell.
          `rounded-xl` matches ActionsTable's canonical card radius. */}
      <div className="overflow-hidden rounded-xl border border-divider-regular">
        <Table>
          <TableHeader>
            <TableRow>
              {isReview ? null : (
                <TableHead className="w-8">
                  <Checkbox
                    aria-label={t`Select all eligible deadlines`}
                    checked={allSelectableChecked}
                    disabled={readOnly || selectableCount === 0}
                    onCheckedChange={(checked) => handleToggleAll(checked)}
                  />
                </TableHead>
              )}
              {/* Pencil KwfpP columns: Client · Entity · Location · Current →
                  New · Match. Entity + Location replace the per-row Form (the
                  alert already names the form); the before/after dates share one
                  arrow column. */}
              <TableHead>{t`Client`}</TableHead>
              <TableHead>{t`Entity`}</TableHead>
              <TableHead>{t`Location`}</TableHead>
              {isReview ? null : (
                <>
                  <TableHead>{t`Current → New`}</TableHead>
                  <TableHead>{t`Match`}</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="[&_td]:py-2 [&_td]:text-sm">
            {(() => {
              const renderRow = (row: PulseAffectedClient) => {
                const checked = selection.has(row.obligationId)
                const reviewConfirmed = confirmedReviewIds.has(row.obligationId)
                const excluded = excludedIds.has(row.obligationId)
                const selectable = isSelectable(row, confirmedReviewIds) && !readOnly
                return (
                  <TableRow
                    key={row.obligationId}
                    data-status={row.matchStatus}
                    // Clicking anywhere on the row TOGGLES the checkbox
                    // (the dominant action: select clients to apply).
                    // Navigation to the deadline detail happens via the
                    // hover-revealed arrow button on the right edge of the
                    // row. The 'review' variant has no select/apply columns,
                    // so there a row click navigates straight to the deadline
                    // detail instead of toggling selection.
                    onClick={() =>
                      isReview
                        ? void navigate(deadlineDetailHref({ obligationId: row.obligationId }))
                        : handleToggleRow(row)
                    }
                    className={cn(
                      'group/affected-row',
                      isReview || (selectable && !excluded)
                        ? 'cursor-pointer'
                        : 'cursor-default opacity-80',
                    )}
                  >
                    {isReview ? null : (
                      <TableCell>
                        <Checkbox
                          aria-label={t`Select ${row.clientName}`}
                          checked={checked}
                          disabled={!selectable || excluded}
                          // No onCheckedChange here — the row click owns
                          // the toggle now. Checkbox is presentational +
                          // accessible (still announces state via the
                          // checked attr; the row's onClick is the
                          // toggle handler).
                          onCheckedChange={() => handleToggleRow(row)}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </TableCell>
                    )}
                    {/* Client name only — the state code moved to its own
                      Location column (Pencil KwfpP), so the name reads clean at
                      the obligations-queue size/weight. */}
                    <TableCell className="min-w-0 whitespace-normal">
                      {/* The name links to the client's detail page — the
                        alert's "who is affected" → "open that client" path.
                        stopPropagation (click + Enter/Space) so the row's own
                        select / open-deadline handler doesn't also fire. The
                        hover-arrow still owns the open-deadline path. */}
                      <Link
                        to={clientDetailPath({ id: row.clientId, name: row.clientName })}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
                        }}
                        title={row.clientName}
                        className="block w-fit max-w-full break-words rounded-sm text-sm font-medium leading-tight text-text-primary underline-offset-2 outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                      >
                        {row.clientName}
                      </Link>
                    </TableCell>
                    {/* ENTITY — humanized entity type (Sole prop / LLC / …). */}
                    <TableCell className="whitespace-nowrap text-text-secondary">
                      {ENTITY_LABEL[row.entityType]}
                    </TableCell>
                    {/* LOCATION — state · county. */}
                    <TableCell className="whitespace-nowrap text-text-secondary">
                      {formatLocation(row)}
                    </TableCell>
                    {/* CURRENT → NEW — one column: struck-through current date, an
                      arrow, then the live new date. */}
                    {isReview ? null : (
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-tight">
                          <span className="text-xs text-text-tertiary tabular-nums line-through">
                            {formatDatePretty(row.currentDueDate)}
                          </span>
                          <ArrowRightIcon className="size-3 shrink-0 text-text-muted" aria-hidden />
                          <span className="text-xs font-medium text-text-primary tabular-nums">
                            {row.newDueDate ? (
                              formatDatePretty(row.newDueDate)
                            ) : (
                              <Trans>Not yet set</Trans>
                            )}
                          </span>
                        </span>
                      </TableCell>
                    )}
                    {isReview ? null : (
                      <TableCell className="relative">
                        {/* The hover-arrow is an actual button — click
                        navigates to the deadline detail. The row click
                        toggles the checkbox (dominant action); the arrow
                        handles the secondary "open deadline detail" path.
                        Surfaces on row hover via group/affected-row. */}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void navigate(deadlineDetailHref({ obligationId: row.obligationId }))
                          }}
                          aria-label={t`Open ${row.clientName} in deadlines`}
                          className="absolute right-3 top-1/2 inline-flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-text-tertiary opacity-0 outline-none transition-opacity hover:bg-state-base-hover hover:text-text-primary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt group-hover/affected-row:opacity-100"
                        >
                          <ArrowUpRightIcon className="size-3.5" aria-hidden />
                        </button>
                        <div className="flex flex-col items-start gap-1.5">
                          <MatchStatusBadge row={row} />
                          {/* Confirm-applies is a real outline button with
                            an explicit frame so it reads as a decisive
                            action on a row the AI flagged as needing human
                            review. Confirm / Unconfirm use the canonical
                            Button primitive (accent + secondary, size=xs). */}
                          {row.matchStatus === 'needs_review' ? (
                            reviewConfirmed ? (
                              <Button
                                type="button"
                                variant="secondary"
                                size="xs"
                                disabled={readOnly || excluded}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onToggleNeedsReviewConfirmation(row.obligationId, false)
                                }}
                                aria-label={t`Unconfirm ${row.clientName}`}
                              >
                                <Trans>Unconfirm</Trans>
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="accent"
                                size="xs"
                                disabled={readOnly || excluded}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setConfirmTarget(row)
                                }}
                                aria-label={t`Confirm ${row.clientName} applies to this relief`}
                              >
                                <Trans>Confirm</Trans>
                              </Button>
                            )
                          ) : null}
                          {onToggleExcluded &&
                          (row.matchStatus === 'eligible' || row.matchStatus === 'needs_review') ? (
                            <label
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex cursor-pointer items-center gap-2 text-xs text-text-secondary"
                            >
                              <Checkbox
                                aria-label={t`Exclude ${row.clientName} from manager review`}
                                checked={excluded}
                                disabled={readOnly}
                                onCheckedChange={(value) =>
                                  onToggleExcluded(row.obligationId, value)
                                }
                              />
                              <span>
                                <Trans>Exclude</Trans>
                              </span>
                            </label>
                          ) : null}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              }

              // Flat list when not grouping (single-status set, or the
              // 'review' variant). Same render as before grouping landed.
              if (!grouped) return visibleRows.map(renderRow)

              // Grouped: a collapsible band header per v2 stage, then its
              // rows. The header is a real button (Fitts-friendly full-width
              // hit area) toggling only that group's visibility — selection
              // is untouched, so select-all still spans every row.
              return groups.map(({ stage, total, visible }) => {
                const isCollapsed = collapsedGroups.has(stage)
                return (
                  <Fragment key={stage}>
                    <TableRow className="cursor-default even:bg-transparent hover:!bg-background-subtle">
                      <TableCell colSpan={bodyColSpan} className="bg-background-subtle p-0">
                        <button
                          type="button"
                          onClick={() => toggleGroup(stage)}
                          aria-expanded={!isCollapsed}
                          className="flex w-full cursor-pointer items-center gap-2 px-[18px] py-1.5 text-left outline-none transition-colors hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt"
                        >
                          {/* One chevron that ROTATES 90° when the group is
                              expanded (the same disclosure motif DeadlineRow
                              uses) so the glyph eases instead of cutting between
                              right/down. The body rows stay un-animated —
                              height-animating table rows is a known trap. */}
                          <ChevronRightIcon
                            className={cn(
                              'size-3.5 shrink-0 text-text-tertiary transition-transform',
                              !isCollapsed && 'rotate-90',
                            )}
                            aria-hidden
                          />
                          <StatusMark
                            status={stage}
                            className={cn('shrink-0', STATUS_ICON_COLOR[stage])}
                          />
                          <span className="text-sm font-medium text-text-primary">
                            {v2Labels[stage]}
                          </span>
                          <span className="text-sm text-text-tertiary tabular-nums">{total}</span>
                        </button>
                      </TableCell>
                    </TableRow>
                    {isCollapsed ? null : visible.map(renderRow)}
                  </Fragment>
                )
              })
            })()}
          </TableBody>
        </Table>
        {/* Expander footer — only when there's something folded. A quiet
            full-width row inside the table frame; the header's select-all,
            "Confirm N", and the selection summary all operate on the FULL
            data set, so the collapsed view never lies about totals. */}
        {collapsible ? (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            aria-expanded={showAll}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-divider-subtle bg-background-default py-2 text-sm font-medium text-text-secondary outline-none transition-colors hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-accent-active-alt"
          >
            {showAll ? (
              <>
                <ChevronUpIcon className="size-3.5" aria-hidden />
                <Trans>Show fewer</Trans>
              </>
            ) : (
              <>
                <ChevronDownIcon className="size-3.5" aria-hidden />
                {/* Plain <Trans> with one variable — the count is always
                    > COLLAPSE_THRESHOLD here so no plural branch needed
                    (and <Plural> string props can't interpolate, per the
                    lingui footgun). "View all N affected clients" per KwfpP. */}
                <Trans>View all {orderedRows.length} affected clients</Trans>
              </>
            )}
          </button>
        ) : null}
      </div>

      <Dialog
        open={confirmTarget !== null}
        onOpenChange={(next) => {
          if (!next) setConfirmTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans>Confirm this client is in scope?</Trans>
            </DialogTitle>
            <DialogDescription>
              {confirmTarget ? (
                <Trans>
                  The AI flagged {confirmTarget.clientName} as needing human review. Confirming
                  marks the client as eligible for this relief and unlocks the row for Apply.
                </Trans>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirmTarget(null)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (confirmTarget) {
                  onToggleNeedsReviewConfirmation(confirmTarget.obligationId, true)
                  setConfirmTarget(null)
                }
              }}
            >
              <Trans>Confirm applies</Trans>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function MatchStatusBadge({ row }: { row: PulseAffectedClient }) {
  if (row.matchStatus === 'eligible') {
    return (
      <Badge variant="success">
        <Trans>Eligible</Trans>
      </Badge>
    )
  }
  if (row.matchStatus === 'needs_review') {
    return (
      <Badge variant="warning" title={row.reason ?? undefined}>
        <Trans>Needs review</Trans>
      </Badge>
    )
  }
  if (row.matchStatus === 'already_applied') {
    return (
      <Badge variant="secondary">
        <Trans>Already applied</Trans>
      </Badge>
    )
  }
  return (
    <Badge variant="outline">
      <Trans>Reverted</Trans>
    </Badge>
  )
}

function countSelected(
  rows: readonly PulseAffectedClient[],
  selection: ReadonlySet<string>,
  confirmedReviewIds: ReadonlySet<string>,
): number {
  let count = 0
  for (const row of rows) {
    if (isSelectable(row, confirmedReviewIds) && selection.has(row.obligationId)) count += 1
  }
  return count
}
