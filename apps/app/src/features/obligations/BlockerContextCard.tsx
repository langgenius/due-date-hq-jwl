import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowUpRightIcon } from 'lucide-react'

import type { AuditEventPublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { buildAuditChangeView } from '@/features/audit/audit-change-view'
import { useAuditActionLabels, useAuditChangeLabels } from '@/features/audit/audit-log-labels'
import {
  STATUS_VARIANT,
  useLifecycleV2StatusLabels,
  useReadinessLabels,
  useStatusLabels,
} from '@/features/obligations/status-control'
import { useLifecycleV2 } from '@/features/obligations/use-lifecycle-v2'
import { orpc } from '@/lib/rpc'
import { formatTaxCode } from '@/lib/tax-codes'
import { formatDate, formatRelativeTime } from '@/lib/utils'

// Status-change audit actions surfaced on the blocker card. Both write the
// `status` field into the audit snapshot, so `buildAuditChangeView` renders a
// "Deadline status changed from X to Y" headline for either one.
const STATUS_CHANGE_ACTIONS = new Set([
  'obligation.status.updated',
  'obligation.status.auto_unblocked',
])

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
  const auditEvents = detailQuery.data?.auditEvents ?? []
  // Error before the loading guard (audit #5): on a failed fetch the old
  // `isLoading || !blocker` guard left `blocker` null forever, so the card
  // hung on the loading skeleton with no recourse. Show a compact retry line.
  if (detailQuery.isError) {
    return (
      <div className="rounded-lg border border-divider-subtle bg-background-subtle p-3 text-caption text-text-secondary">
        <span>
          <Trans>Couldn't load the blocking deadline.</Trans>
        </span>{' '}
        <button
          type="button"
          onClick={() => void detailQuery.refetch()}
          disabled={detailQuery.isFetching}
          className="cursor-pointer font-medium text-text-accent underline-offset-2 hover:underline disabled:opacity-50"
        >
          <Trans>Retry</Trans>
        </button>
      </div>
    )
  }
  if (detailQuery.isLoading) {
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
  if (!blocker) return null
  return (
    <button
      type="button"
      onClick={() => onOpen(blockerId)}
      className="group flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border border-divider-regular bg-background-subtle p-3 text-left transition-colors hover:border-divider-deep hover:bg-state-base-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-state-accent-active-alt"
      aria-label={t`Open blocking deadline: ${formatTaxCode(blocker.taxType)} for ${blocker.clientName}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <CapsFieldLabel as="span" variant="group">
          <Trans>Blocked by</Trans>
        </CapsFieldLabel>
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
      <BlockerRecentTransitions auditEvents={auditEvents} />
    </button>
  )
}

/**
 * The 1–2 most recent status transitions for the blocker, rendered as
 * compact tertiary lines so the CPA can see how the blocker's status has
 * been moving without leaving the card. Reuses the canonical audit-change
 * renderer (`buildAuditChangeView`) for the headline rather than
 * hand-parsing the before/after JSON, so the wording stays in lockstep
 * with the Audit tab and audit log.
 *
 * Kept calm: no new colors, no nested interactive elements (the parent is
 * a button), just a leading arrow glyph + relative time per row.
 */
function BlockerRecentTransitions({ auditEvents }: { auditEvents: AuditEventPublic[] }) {
  const { t } = useLingui()
  const actionLabels = useAuditActionLabels()
  const lifecycleV2 = useLifecycleV2()
  const legacyStatusLabels = useStatusLabels()
  const v2StatusLabels = useLifecycleV2StatusLabels()
  const statusLabels = lifecycleV2 ? v2StatusLabels : legacyStatusLabels
  const readinessLabels = useReadinessLabels()
  const changeLabels = useAuditChangeLabels({ actionLabels, readinessLabels, statusLabels })

  // auditEvents arrive newest-first; keep the latest 1–2 status changes.
  const recent = auditEvents.filter((event) => STATUS_CHANGE_ACTIONS.has(event.action)).slice(0, 2)
  if (recent.length === 0) return null

  return (
    <div
      className="flex flex-col gap-1 border-t border-divider-subtle pt-2 text-text-tertiary"
      aria-label={t`Recent status changes`}
    >
      {recent.map((event) => {
        const headline = buildAuditChangeView(event, changeLabels).headline
        return (
          <div key={event.id} className="flex items-baseline gap-1.5 text-caption-xs">
            <span aria-hidden className="shrink-0 font-mono text-text-tertiary">
              →
            </span>
            <span className="min-w-0 flex-1 truncate" title={headline}>
              {headline}
            </span>
            <span className="shrink-0 tabular-nums text-text-tertiary">
              {formatRelativeTime(event.createdAt)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
