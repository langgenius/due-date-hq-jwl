import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans } from '@lingui/react/macro'
import { ClipboardCheckIcon } from 'lucide-react'

import type { AuditRange } from '@duedatehq/contracts'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import { EmptyState } from '@/components/patterns/empty-state'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { orpc } from '@/lib/rpc'
import { formatDateTimeWithTimezone } from '@/lib/utils'

import { useAuditActionLabels } from './audit-log-labels'
import { formatAuditActionLabel } from './audit-log-model'

/**
 * Per-entity audit timeline. Reverse-chronological `audit.list` filtered by
 * `entityType` + `entityId`, rendered as the same divide-y row list used by the
 * client Activity tab. Self-contained: owns its own audit-read permission gate,
 * timezone, and query, so a caller only drops it into a drawer/section.
 *
 * Generalises the per-client ClientActivityPanel so rule version history and
 * the Pulse alert Activity tab share one surface (audit-log-surface-
 * requirements.md §Surfaces).
 */
export function EntityAuditActivityPanel({
  entityType,
  entityId,
  emptyTitle,
  emptyDescription,
  range = '30d',
  limit = 8,
  enabled = true,
}: {
  entityType: string
  entityId: string
  emptyTitle: ReactNode
  emptyDescription: ReactNode
  range?: AuditRange
  limit?: number
  enabled?: boolean
}) {
  const permission = useFirmPermission()
  const canReadAudit = permission.can('audit.read')
  const firmTimezone = usePracticeTimezone()
  const actionLabels = useAuditActionLabels()

  const auditQuery = useQuery({
    ...orpc.audit.list.queryOptions({
      input: { entityType, entityId, range, limit },
    }),
    enabled: canReadAudit && enabled && entityId.length > 0,
  })

  if (!canReadAudit) {
    return (
      <EmptyState
        icon={ClipboardCheckIcon}
        title={<Trans>Audit access is role-gated</Trans>}
        description={<Trans>Owners, partners, managers, and preparers can inspect activity.</Trans>}
      />
    )
  }
  if (auditQuery.isLoading) {
    return (
      <div className="grid gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }
  const events = auditQuery.data?.events ?? []
  if (events.length === 0) {
    return (
      <EmptyState icon={ClipboardCheckIcon} title={emptyTitle} description={emptyDescription} />
    )
  }
  return (
    <div className="overflow-hidden rounded-md border border-divider-regular bg-background-default">
      <ul className="divide-y divide-divider-subtle">
        {events.map((event) => (
          <li key={event.id} className="grid gap-1 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-text-primary">
                {formatAuditActionLabel(event.action, actionLabels)}
              </span>
              <span className="text-xs tabular-nums text-text-tertiary">
                {formatDateTimeWithTimezone(event.createdAt, firmTimezone)}
              </span>
            </div>
            <p className="text-xs text-text-tertiary">
              {event.actorLabel ?? event.actorId ?? 'System'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
