import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans } from '@lingui/react/macro'
import { ArrowUpRightIcon, ClipboardCheckIcon } from 'lucide-react'

import type { AuditRange } from '@duedatehq/contracts'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'

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
  // Reverse entity→audit path: jump to this entity's full history in the
  // firm-wide audit log (full filters + export), scoped via ?entity=<id>.
  // Lives INSIDE the panel so every caller (rules, clients, alerts, …) gets the
  // de-isolation link — including the empty state, which otherwise dead-ended.
  const fullLogLink = (
    <div className="mt-3 border-t border-divider-subtle pt-3">
      <TextLink
        variant="accent"
        size="sm"
        render={<Link to={`/audit?entity=${encodeURIComponent(entityId)}`} />}
      >
        <Trans>View in full audit log</Trans>
        <ArrowUpRightIcon className="size-3.5" aria-hidden />
      </TextLink>
    </div>
  )

  const events = auditQuery.data?.events ?? []
  if (events.length === 0) {
    return (
      <div>
        <EmptyState icon={ClipboardCheckIcon} title={emptyTitle} description={emptyDescription} />
        {fullLogLink}
      </div>
    )
  }
  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-divider-regular bg-background-default">
        <ul className="divide-y divide-divider-subtle">
          {events.map((event) => (
            <li
              key={event.id}
              className="grid gap-1 px-4 py-3 transition-colors hover:bg-state-base-hover"
            >
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
      {fullLogLink}
    </div>
  )
}
