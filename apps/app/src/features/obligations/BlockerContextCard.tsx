import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowUpRightIcon } from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import { FieldLabel } from '@/components/primitives/field-label'
import { STATUS_VARIANT, useLifecycleV2StatusLabels } from '@/features/obligations/status-control'
import { orpc } from '@/lib/rpc'
import { formatTaxCode } from '@/lib/tax-codes'
import { formatDate } from '@/lib/utils'

/**
 * Inline blocker card rendered on the Blocked stage. Shows the
 * upstream obligation's form / client / due / current status so the
 * CPA understands WHY this row is blocked without leaving the
 * drawer. The whole card is clickable — opens the blocker's drawer
 * via the same provider the queue + client detail use.
 *
 * Fetches via `obligations.getDetail` (the same query the drawer
 * itself uses), so when the CPA clicks through to the blocker the
 * data is already in cache and the destination drawer opens
 * instantly.
 */
export function BlockerContextCard({
  blockerId,
  onOpen,
}: {
  blockerId: string
  onOpen: (id: string) => void
}) {
  const { t } = useLingui()
  const detailQuery = useQuery({
    ...orpc.obligations.getDetail.queryOptions({
      input: { obligationId: blockerId },
    }),
    enabled: blockerId !== '',
  })
  const labels = useLifecycleV2StatusLabels()
  const blocker = detailQuery.data?.row ?? null
  if (detailQuery.isLoading || !blocker) {
    return (
      <div
        role="status"
        aria-label={t`Loading blocker details`}
        className="rounded-lg border border-divider-subtle bg-background-subtle p-3"
      >
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-2 h-3 w-1/3" />
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(blockerId)}
      className="group flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border border-divider-regular bg-background-subtle p-3 text-left transition-colors hover:border-divider-deep hover:bg-state-base-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-accent-active-alt"
      aria-label={t`Open blocking deadline: ${formatTaxCode(blocker.taxType)} for ${blocker.clientName}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <FieldLabel as="span" variant="group">
          <Trans>Blocked by</Trans>
        </FieldLabel>
        <ArrowUpRightIcon
          className="size-3.5 shrink-0 text-text-tertiary transition-colors group-hover:text-text-primary"
          aria-hidden
        />
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-sm font-medium text-text-primary">
          {formatTaxCode(blocker.taxType)}
        </span>
        <span className="text-xs text-text-secondary">{blocker.clientName}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
        <Badge variant={STATUS_VARIANT[blocker.status]} className="text-caption-xs">
          {labels[blocker.status]}
        </Badge>
        <span className="tabular-nums">
          <Trans>Due {formatDate(blocker.currentDueDate)}</Trans>
        </span>
      </div>
    </button>
  )
}
