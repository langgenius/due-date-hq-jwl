import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, ArrowUpRightIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { PulseAffectedClient } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
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
}: AffectedClientsTableProps) {
  const { t } = useLingui()
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

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">
            <Checkbox
              aria-label={t`Select all eligible obligations`}
              checked={allSelectableChecked}
              disabled={readOnly || selectableCount === 0}
              onCheckedChange={(checked) => handleToggleAll(checked)}
            />
          </TableHead>
          <TableHead>{t`Client`}</TableHead>
          <TableHead>{t`Form`}</TableHead>
          <TableHead className="text-right">{t`Due date change`}</TableHead>
          <TableHead>{t`Match`}</TableHead>
          <TableHead className="w-[1%]">
            <span className="sr-only">{t`Open in queue`}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const checked = selection.has(row.obligationId)
          const reviewConfirmed = confirmedReviewIds.has(row.obligationId)
          const excluded = excludedIds.has(row.obligationId)
          const selectable = isSelectable(row, confirmedReviewIds) && !readOnly
          return (
            <TableRow
              key={row.obligationId}
              data-status={row.matchStatus}
              className={cn((!selectable || excluded) && 'opacity-80')}
            >
              <TableCell>
                <Checkbox
                  aria-label={t`Select ${row.clientName}`}
                  checked={checked}
                  disabled={!selectable || excluded}
                  onCheckedChange={() => handleToggleRow(row)}
                />
              </TableCell>
              <TableCell className="font-medium text-text-primary">
                <div className="flex flex-col leading-tight">
                  <span>{row.clientName}</span>
                  <span className="font-mono text-xs text-text-tertiary tabular-nums">
                    {[row.state, row.county].filter(Boolean).join(' · ')}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-text-secondary">
                <TaxCodeLabel code={row.taxType} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5 font-mono text-xs tabular-nums text-text-primary">
                  <span className="text-text-tertiary line-through">
                    {formatDate(row.currentDueDate)}
                  </span>
                  <ArrowRightIcon className="size-3 text-text-tertiary" aria-hidden />
                  <span>
                    {row.newDueDate ? formatDate(row.newDueDate) : <Trans>Unknown</Trans>}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1.5">
                  <MatchStatusBadge row={row} />
                  {row.matchStatus === 'needs_review' ? (
                    <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                      <Checkbox
                        aria-label={t`Confirm ${row.clientName} applies to this relief`}
                        checked={reviewConfirmed}
                        disabled={readOnly || excluded}
                        onCheckedChange={(value) =>
                          onToggleNeedsReviewConfirmation(row.obligationId, value)
                        }
                      />
                      <span>
                        <Trans>Confirm applies</Trans>
                      </span>
                    </label>
                  ) : null}
                  {onToggleExcluded &&
                  (row.matchStatus === 'eligible' || row.matchStatus === 'needs_review') ? (
                    <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
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
              <TableCell className="text-right">
                {/* Deep-link out to the obligation queue so CPAs can
                    investigate a row before applying the relief.
                    Without this the drawer is a read-only triage and
                    the only way to inspect the obligation in context
                    is to memorise the client name and search. */}
                <Link
                  to={`/obligations?id=${row.obligationId}&drawer=obligation`}
                  aria-label={t`Open ${row.clientName} ${row.taxType} in the obligation queue`}
                  className="inline-flex items-center gap-0.5 text-xs text-text-tertiary outline-none hover:text-text-primary focus-visible:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt rounded-sm"
                >
                  <Trans>Open</Trans>
                  <ArrowUpRightIcon className="size-3" aria-hidden />
                </Link>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
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
