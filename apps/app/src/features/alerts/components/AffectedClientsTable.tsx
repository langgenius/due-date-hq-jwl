import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowUpRightIcon } from 'lucide-react'
import { useNavigate } from 'react-router'

import type { PulseAffectedClient } from '@duedatehq/contracts'
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

import { formatDate } from '@/lib/utils'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { deadlineDetailHref } from '@/features/obligations/deadline-detail-url'

import { isSelectable, toggleSelection, setAllSelection } from '../lib/selection'

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

  const handleToggleAll = (checked: boolean) => {
    onChangeSelection(setAllSelection(rows, checked, confirmedReviewIds))
  }

  const handleToggleRow = (row: PulseAffectedClient) => {
    if (!isSelectable(row, confirmedReviewIds)) return
    onChangeSelection(toggleSelection(selection, row.obligationId))
  }

  // 2026-05-26 (Yuqi /alerts third pass #11): per-row "Confirm
  // applies" checkbox moved out of the grid into a confirmation
  // Dialog. Applying a relief that the AI flagged as needs_review
  // is a real consequence (deadline shifts that touch the client's
  // workflow) — the inline checkbox treated it as a casual toggle.
  // Now: clicking "Confirm applies" opens a Dialog asking the CPA
  // to confirm explicitly. The action requires both gestures (open
  // the dialog + click Confirm) which gives the "double confirm"
  // shape Yuqi asked for. Unconfirming is a single click on the
  // same row — confirming the negative path doesn't need a dialog.
  const [confirmTarget, setConfirmTarget] = useState<PulseAffectedClient | null>(null)
  const navigate = useNavigate()
  return (
    <>
      {/* 2026-05-26 (Yuqi /alerts third pass #9): outer
          rounded-md border + overflow-hidden so the table reads
          as one clipped surface — corners and the bottom row
          line up to the same radius. Previously the raw <Table>
          had its own square corners and was sitting flush
          against the drawer body without a containing chrome. */}
      {/* 2026-05-26 (Yuqi forty-fourth pass — table chrome match):
          AffectedClientsTable is now visually identical to the
          /deadlines obligations table.
            • Body cells: `[&_td]:py-2 [&_td]:text-sm` matches
              `TableBody` in obligations.tsx:2874 (py-2 row density
              + canonical body text-sm).
            • Header heights stay h-10 — same as obligations queue
              header.
            • Client name explicitly `text-sm font-medium
              leading-tight text-text-primary` (see TableCell below)
              so it renders identically to the obligations row
              client name, not just relying on inherited text-sm
              from the cell. */}
      {/* 2026-06-04 (Yuqi table sweep): TableHead h-10 text-left
          text-sm overrides removed — primitive ships the canonical
          column-label style now. TableBody [&_td]:py-2 [&_td]:text-sm
          override kept because this is a dense overlay table where
          the canonical py-4 reads too tall; opt-in to compact cells
          via the body selector. */}
      {/* 2026-06-04 round 16 (Yuqi "lighter border"): outer
          wrapper border settled at `divider-regular` (8% alpha
          — visible-but-quiet sweet spot) after a brief deep-tone
          overshoot. Matches the new canonical wrapper recipe. */}
      <div className="overflow-hidden rounded-md border border-divider-regular">
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
              <TableHead>{t`Client`}</TableHead>
              <TableHead>{t`Form`}</TableHead>
              {isReview ? null : (
                <>
                  <TableHead>{t`Due date change`}</TableHead>
                  <TableHead>{t`Match`}</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="[&_td]:py-2 [&_td]:text-sm">
            {rows.map((row) => {
              const checked = selection.has(row.obligationId)
              const reviewConfirmed = confirmedReviewIds.has(row.obligationId)
              const excluded = excludedIds.has(row.obligationId)
              const selectable = isSelectable(row, confirmedReviewIds) && !readOnly
              return (
                <TableRow
                  key={row.obligationId}
                  data-status={row.matchStatus}
                  // 2026-05-26 (Yuqi thirty-first pass #7): row click
                  // semantics inverted. Clicking anywhere on the
                  // row now TOGGLES the checkbox (the dominant
                  // action: select clients to apply). Navigation to
                  // the deadline detail happens via the hover-revealed
                  // arrow button on the right edge of the row.
                  // 2026-06-03: the 'review' variant has no select/apply
                  // columns, so a row click navigates straight to the
                  // deadline detail instead of toggling selection.
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
                  {/* 2026-05-26 (Yuqi /alerts third pass #8):
                      jurisdiction cell collapsed to the bare
                      2-letter code — no SVG state badge, no full
                      state name. Reasoning: the drawer header
                      already shows the alert's jurisdiction with
                      the full chip; repeating the same treatment
                      per row was loud and pushed the client name
                      to a smaller font. CA / NY / TX / FL read
                      instantly to a CPA without the flag motif. */}
                  <TableCell className="min-w-0 whitespace-normal">
                    <div className="flex flex-col gap-0.5">
                      {/* 2026-05-26 (Yuqi forty-fourth pass — client
                          name match): explicit `text-sm font-medium
                          leading-tight text-text-primary` so it
                          renders identically to the obligations
                          queue client-name column (see
                          obligations.tsx ClientNameCell). Same SIZE
                          + same WEIGHT + same line-height + same
                          color, so the CPA reads the Affected
                          Clients table as "the deadlines table,
                          just filtered to this alert's scope". */}
                      <span className="break-words text-sm font-medium leading-tight text-text-primary">
                        {row.clientName}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {/* 2026-06-01: state code now uses canonical
                            Badge primitive (variant=outline, shape=square,
                            size=sm) so it matches the bordered-pill state
                            chip rolled out across /clients in the
                            2026-05-29 sweep — no more hand-rolled
                            uppercase span. */}
                        {row.state ? (
                          <Badge variant="outline" shape="square" size="sm">
                            {row.state}
                          </Badge>
                        ) : null}
                        {row.county ? (
                          <span className="text-text-tertiary">{row.county}</span>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    <TaxCodeLabel code={row.taxType} />
                  </TableCell>
                  {/* 2026-05-26 (Yuqi sixteenth pass #3): due-date
                      change cell stacks OLD on top + NEW below, both
                      in mono+tabular. Reads as a vertical "from → to"
                      so each line is short and the cell stays
                      narrow — no horizontal sprawl with the arrow
                      glyph in the middle. */}
                  {isReview ? null : (
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs tabular-nums leading-tight text-text-primary">
                        <span className="text-text-tertiary line-through">
                          {formatDate(row.currentDueDate)}
                        </span>
                        <span>
                          {row.newDueDate ? formatDate(row.newDueDate) : <Trans>Unknown</Trans>}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isReview ? null : (
                    <TableCell className="relative">
                      {/* 2026-05-26 (Yuqi thirty-first pass #7): the
                        hover-arrow is now an actual button — click
                        navigates to the deadline detail. Pre-row
                        click toggles the checkbox (dominant
                        action); the arrow handles the secondary
                        "open deadline detail" path. Surfaces on row
                        hover via group/affected-row. */}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          void navigate(deadlineDetailHref({ obligationId: row.obligationId }))
                        }}
                        aria-label={t`Open ${row.clientName} in deadlines`}
                        className="absolute right-3 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-text-tertiary opacity-0 outline-none transition-opacity hover:bg-state-base-hover hover:text-text-primary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt group-hover/affected-row:opacity-100"
                      >
                        <ArrowUpRightIcon className="size-3.5" aria-hidden />
                      </button>
                      <div className="flex flex-col items-start gap-1.5">
                        <MatchStatusBadge row={row} />
                        {/* 2026-05-26 (Yuqi thirty-first pass #2):
                          Confirm-applies button promoted from text
                          link → real outline button with explicit
                          frame. Reads as a decisive action on a
                          row that the AI flagged as needing human
                          review — the previous underlined text
                          treatment was too easy to miss. */}
                        {/* 2026-06-01: Confirm / Unconfirm row buttons
                            moved to canonical Button primitive
                            (accent + secondary, size=xs). Hand-rolled
                            h-7 chip frames replaced — accent variant
                            maps onto the previous state-accent-solid
                            frame and secondary maps onto the outline
                            revert affordance. */}
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
                            className="inline-flex items-center gap-2 text-xs text-text-secondary"
                          >
                            <Checkbox
                              aria-label={t`Exclude ${row.clientName} from manager review`}
                              checked={excluded}
                              disabled={readOnly}
                              onCheckedChange={(value) => onToggleExcluded(row.obligationId, value)}
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
            })}
          </TableBody>
        </Table>
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
