import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FilterXIcon,
  InfoIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { parseAsStringLiteral, useQueryState } from 'nuqs'
import { toast } from 'sonner'

import type {
  PulseAlertPublic,
  PulseFirmAlertStatus,
  PulseSourceHealth,
  PulseSourceHealthStatus,
} from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'

import { PageHeader, PageShell } from '@/components/patterns/page'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { ConceptLabel } from '@/features/concepts/concept-help'
import { useFirmPermission } from '@/features/permissions/permission-gate'

import { usePulseDrawer } from './DrawerProvider'
import {
  usePulseInvalidation,
  usePulseListHistoryQueryOptions,
  usePulseSourceHealthQueryOptions,
} from './api'
import { PulseAlertCard } from './components/PulseAlertCard'
import { PulsingDot } from './components/PulsingDot'
import {
  enabledPulseSourceCount,
  reviewableSourcesNeedingAttention,
  sourcesNeedingAttention,
  summarizePulseSources,
} from './lib/source-health-labels'
import {
  isPulseImpactFilter,
  matchesPulseImpactFilter,
  PULSE_IMPACT_FILTER_OPTIONS,
  type PulseImpactFilter,
} from './lib/impact-filter'

const STATUS_FILTER_OPTIONS = [
  'all',
  'active',
  'applied',
  'partially_applied',
  'dismissed',
  'reverted',
  'snoozed',
] as const
type PulseStatusFilter = (typeof STATUS_FILTER_OPTIONS)[number]
const EMPTY_ALERTS: readonly PulseAlertPublic[] = []
const EMPTY_SOURCES: readonly PulseSourceHealth[] = []

interface PulseChangesTabProps {
  embedded?: boolean
}

// Pulse Changes — source-backed rule-change timeline used inside Rules.
// Uses the same hairline / mono language as the dashboard strip; no oversized
// cards, no chrome shadows.
export function PulseChangesTab({ embedded = false }: PulseChangesTabProps) {
  const { t } = useLingui()
  const { openDrawer } = usePulseDrawer()
  const permission = useFirmPermission()
  const [statusFilter, setStatusFilter] = useState<PulseStatusFilter>('all')
  const [impactFilter, setImpactFilter] = useState<PulseImpactFilter>('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [sourceReviewParam, setSourceReviewParam] = useQueryState(
    'sourceReview',
    parseAsStringLiteral(['1']).withOptions({ history: 'replace' }),
  )
  const alertsQuery = useQuery(usePulseListHistoryQueryOptions(50))
  const sourceHealthQuery = useQuery(usePulseSourceHealthQueryOptions())
  const alerts = alertsQuery.data?.alerts ?? EMPTY_ALERTS
  const sourceHealth = sourceHealthQuery.data?.sources ?? EMPTY_SOURCES
  const attentionSources = sourcesNeedingAttention(sourceHealth)
  const reviewableAttentionSources = reviewableSourcesNeedingAttention(sourceHealth)
  const canReviewSourceHealth = permission.can('pulse.apply')
  const sourceReviewOpen = sourceReviewParam === '1' && canReviewSourceHealth
  const hasSourceAttention = attentionSources.length > 0
  const sourceOptions = useMemo(
    () =>
      alerts
        .map((alert) => alert.source)
        .filter((source, index, sources) => sources.indexOf(source) === index)
        .toSorted(),
    [alerts],
  )
  const filteredAlerts = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          matchesPulseImpactFilter(alert, impactFilter) &&
          matchesStatusFilter(alert.status, statusFilter) &&
          (sourceFilter === 'all' || alert.source === sourceFilter),
      ),
    [alerts, impactFilter, sourceFilter, statusFilter],
  )
  const isEmpty = !alertsQuery.isLoading && alerts.length === 0
  const isFilteredEmpty = !alertsQuery.isLoading && alerts.length > 0 && filteredAlerts.length === 0
  const breathingAlertId = filteredAlerts.find(isBreathingAlertRow)?.id
  const filtersActive = impactFilter !== 'all' || statusFilter !== 'all' || sourceFilter !== 'all'

  const headerCountBadge = !alertsQuery.isLoading ? (
    <span className="hidden text-xs tabular-nums text-text-tertiary md:inline">
      {alerts.length === 0 ? (
        <Trans>0 active</Trans>
      ) : filtersActive ? (
        <Trans>
          {filteredAlerts.length} shown · {alerts.length} total
        </Trans>
      ) : (
        <Plural value={alerts.length} one="# active" other="# active" />
      )}
    </span>
  ) : null

  const body = (
    <>
      {alertsQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Couldn't load alerts</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(alertsQuery.error) ?? t`Please try again.`}{' '}
            <button type="button" className="underline" onClick={() => void alertsQuery.refetch()}>
              <Trans>Retry</Trans>
            </button>
          </AlertDescription>
        </Alert>
      ) : null}

      {canReviewSourceHealth && reviewableAttentionSources.length > 0 ? (
        <SourceAttentionAlert
          sources={reviewableAttentionSources}
          open={sourceReviewOpen}
          onOpenChange={(open) => {
            void setSourceReviewParam(open ? '1' : null)
          }}
          onRefresh={() => {
            void sourceHealthQuery.refetch()
          }}
        />
      ) : attentionSources.length > 0 ? (
        <PassiveSourceHealthNotice />
      ) : null}

      {alertsQuery.isLoading ? (
        <SkeletonList sources={sourceHealth} />
      ) : isEmpty && hasSourceAttention ? (
        <NoClientMatchesState />
      ) : isEmpty ? (
        <EmptyState sources={sourceHealth} />
      ) : (
        <>
          <div className="flex flex-col gap-2 rounded-md border border-divider-subtle bg-background-default p-3 md:flex-row md:items-center md:justify-between">
            <div className="grid gap-2 md:grid-cols-[180px_180px_minmax(220px,320px)]">
              <Select
                value={impactFilter}
                onValueChange={(value) => {
                  if (typeof value === 'string' && isPulseImpactFilter(value))
                    setImpactFilter(value)
                }}
              >
                <SelectTrigger className="w-full" size="sm" aria-label={t`Filter by impact`}>
                  <SelectValue>{impactFilterLabel(impactFilter)}</SelectValue>
                </SelectTrigger>
                <SelectContent align="start">
                  {PULSE_IMPACT_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {impactFilterLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  if (typeof value === 'string' && isStatusFilter(value)) setStatusFilter(value)
                }}
              >
                <SelectTrigger className="w-full" size="sm" aria-label={t`Filter by alert status`}>
                  <SelectValue>{statusFilterLabel(statusFilter)}</SelectValue>
                </SelectTrigger>
                <SelectContent align="start">
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {statusFilterLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sourceFilter}
                onValueChange={(value) => {
                  if (typeof value === 'string') setSourceFilter(value)
                }}
              >
                <SelectTrigger className="w-full" size="sm" aria-label={t`Filter by source`}>
                  <SelectValue>
                    {sourceFilter === 'all' ? <Trans>All sources</Trans> : sourceFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="all">
                    <Trans>All sources</Trans>
                  </SelectItem>
                  {sourceOptions.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!filtersActive}
              onClick={() => {
                setImpactFilter('all')
                setStatusFilter('all')
                setSourceFilter('all')
              }}
            >
              <FilterXIcon data-icon="inline-start" />
              <Trans>Reset</Trans>
            </Button>
          </div>

          {isFilteredEmpty ? (
            <FilteredEmptyState />
          ) : (
            <div className="flex flex-col gap-2">
              {filteredAlerts.map((alert) => (
                <PulseAlertCard
                  key={alert.id}
                  alert={alert}
                  breathing={alert.id === breathingAlertId}
                  onReview={() => openDrawer(alert.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )

  if (embedded) {
    return <div className="flex flex-col gap-6">{body}</div>
  }

  return (
    <PageShell>
      <PageHeader
        leading={<PulsingDot tone={isEmpty ? 'success' : 'warning'} active />}
        title={<Trans>Radar</Trans>}
        subtitle={
          <ConceptLabel concept="pulse">
            <Trans>
              Source-backed government changes that match your practice's clients. Review,
              batch-apply due-date changes, snooze, or revisit closed changes.
            </Trans>
          </ConceptLabel>
        }
        actions={headerCountBadge}
      />
      {body}
    </PageShell>
  )
}

function isBreathingAlertRow(alert: PulseAlertPublic): boolean {
  return alert.status === 'matched' && alert.matchedCount + alert.needsReviewCount > 0
}

// Loading shimmer that matches the heartbeat language: warning-tone pulsing
// dot on the lead row, then two ghost rows with mono shimmer bars. No solid
// gray blocks — the page should look like it's listening, not waiting.
function sourceLabel(sources: readonly PulseSourceHealth[]): string {
  return summarizePulseSources(sources, { emptyLabel: 'configured Pulse sources' })
}

function enabledSourceCount(sources: readonly PulseSourceHealth[]): number {
  return enabledPulseSourceCount(sources)
}

function SourceAttentionAlert({
  sources,
  open,
  onOpenChange,
  onRefresh,
}: {
  sources: readonly PulseSourceHealth[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh: () => void
}) {
  const sourceCount = sources.length
  return (
    <Alert id="pulse-source-health" variant="warning" className="scroll-mt-24">
      <AlertTriangleIcon />
      <AlertTitle className="flex min-w-0 flex-wrap items-center gap-2">
        <span>
          <Trans>Radar source needs attention</Trans>
        </span>
        <Badge variant="warning" className="tabular-nums">
          <Plural value={sourceCount} one="# source" other="# sources" />
        </Badge>
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3 text-pretty">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <span>
            <Plural
              value={sourceCount}
              one="# official source needs review. Alerts remain reviewable."
              other="# official sources need review. Alerts remain reviewable."
            />
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(!open)}>
            {open ? (
              <>
                <Trans>Hide sources</Trans>
                <ChevronUpIcon data-icon="inline-end" />
              </>
            ) : (
              <>
                <Trans>Review sources</Trans>
                <ChevronDownIcon data-icon="inline-end" />
              </>
            )}
          </Button>
        </div>

        {open ? <PulseSourceHealthTable sources={sources} onRefresh={onRefresh} /> : null}
      </AlertDescription>
    </Alert>
  )
}

function PassiveSourceHealthNotice() {
  return (
    <Alert id="pulse-source-health" variant="info" className="scroll-mt-24">
      <InfoIcon />
      <AlertTitle>
        <Trans>Radar source checks degraded · Monitoring continues</Trans>
      </AlertTitle>
      <AlertDescription>
        <Trans>
          Lower-priority source checks are recovering in the background. Existing Pulse alerts
          remain reviewable.
        </Trans>
      </AlertDescription>
    </Alert>
  )
}

function PulseSourceHealthTable({
  sources,
  onRefresh,
}: {
  sources: readonly PulseSourceHealth[]
  onRefresh: () => void
}) {
  const { i18n, t } = useLingui()

  return (
    <div className="overflow-x-auto rounded-md border border-divider-subtle bg-background-default">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Trans>Source</Trans>
            </TableHead>
            <TableHead>
              <Trans>Status</Trans>
            </TableHead>
            <TableHead>
              <Trans>Last success</Trans>
            </TableHead>
            <TableHead className="text-right">
              <Trans>Failures</Trans>
            </TableHead>
            <TableHead>
              <Trans>Next check</Trans>
            </TableHead>
            <TableHead className="text-right">
              <Trans>Check</Trans>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr]:border-b-0 [&_td]:py-3">
          {sources.map((source) => (
            <TableRow key={source.sourceId}>
              <TableCell className="min-w-[220px]">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium text-text-primary">{source.label}</span>
                  <span className="truncate font-mono text-xs text-text-tertiary">
                    {source.sourceId} · {source.jurisdiction} · {source.tier}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <SourceHealthStatusBadge status={source.healthStatus} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                {formatSourceDate(source.lastSuccessAt, i18n, t`Never`)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-text-primary">
                {source.consecutiveFailures}
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                {formatSourceDate(source.nextCheckAt, i18n, t`Not scheduled`)}
              </TableCell>
              <TableCell className="text-right">
                <RetryPulseSourceButton source={source} onRefresh={onRefresh} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SourceHealthStatusBadge({ status }: { status: PulseSourceHealthStatus }) {
  if (status === 'healthy') {
    return (
      <Badge variant="success" className="text-xs">
        <BadgeStatusDot tone="success" />
        <Trans>Healthy</Trans>
      </Badge>
    )
  }
  if (status === 'failing') {
    return (
      <Badge variant="destructive" className="text-xs">
        <BadgeStatusDot tone="error" />
        <Trans>Failing</Trans>
      </Badge>
    )
  }
  if (status === 'paused') {
    return (
      <Badge variant="secondary" className="text-xs">
        <BadgeStatusDot tone="disabled" />
        <Trans>Paused</Trans>
      </Badge>
    )
  }

  return (
    <Badge variant="warning" className="text-xs">
      <BadgeStatusDot tone="warning" />
      <Trans>Degraded</Trans>
    </Badge>
  )
}

function RetryPulseSourceButton({
  source,
  onRefresh,
}: {
  source: PulseSourceHealth
  onRefresh: () => void
}) {
  const { t } = useLingui()
  const invalidate = usePulseInvalidation()
  const retryMutation = useMutation(
    orpc.pulse.retrySourceHealth.mutationOptions({
      onSuccess: (data) => {
        const updatedSource = data.sources.find(
          (candidate) => candidate.sourceId === source.sourceId,
        )
        if (updatedSource?.healthStatus === 'healthy') {
          toast.success(t`Source recovered`, { description: updatedSource.label })
        } else if (updatedSource) {
          toast.warning(t`Source checked, but still needs attention`, {
            description: updatedSource.label,
          })
        } else {
          toast.success(t`Source checked`)
        }
        invalidate()
        onRefresh()
      },
      onError: (err) => {
        toast.error(t`Please try again.`, {
          description: rpcErrorMessage(err) ?? undefined,
        })
      },
    }),
  )

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={retryMutation.isPending}
      onClick={() => retryMutation.mutate({ sourceId: source.sourceId })}
    >
      <RefreshCwIcon
        data-icon="inline-start"
        className={retryMutation.isPending ? 'animate-spin' : undefined}
      />
      <Trans>Check</Trans>
    </Button>
  )
}

function formatSourceDate(
  iso: string | null,
  i18n: ReturnType<typeof useLingui>['i18n'],
  empty: string,
) {
  if (!iso) return empty
  return i18n.date(new Date(iso), {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function FilteredEmptyState() {
  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-divider-regular bg-background-default px-4 py-5 text-md text-text-secondary">
      <PulsingDot tone="disabled" />
      <span className="flex-1">
        <Trans>No alerts match these filters.</Trans>
      </span>
    </div>
  )
}

function NoClientMatchesState() {
  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-divider-regular bg-background-default px-4 py-5 text-md text-text-secondary">
      <PulsingDot tone="disabled" />
      <span className="flex-1">
        <Trans>No client-matching Radar changes right now.</Trans>
      </span>
    </div>
  )
}

function isStatusFilter(value: string): value is PulseStatusFilter {
  return STATUS_FILTER_OPTIONS.some((option) => option === value)
}

function matchesStatusFilter(status: PulseFirmAlertStatus, filter: PulseStatusFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'active') return status === 'matched'
  return status === filter
}

function impactFilterLabel(filter: PulseImpactFilter): React.ReactNode {
  if (filter === 'all') return <Trans>All impact</Trans>
  if (filter === 'needs_action') return <Trans>Needs action</Trans>
  if (filter === 'needs_review') return <Trans>Needs review</Trans>
  if (filter === 'no_matches') return <Trans>No matches</Trans>
  return <Trans>Closed</Trans>
}

function statusFilterLabel(filter: PulseStatusFilter): React.ReactNode {
  if (filter === 'all') return <Trans>All statuses</Trans>
  if (filter === 'active') return <Trans>Active</Trans>
  if (filter === 'partially_applied') return <Trans>Partially applied</Trans>
  if (filter === 'applied') return <Trans>Applied</Trans>
  if (filter === 'dismissed') return <Trans>Dismissed</Trans>
  if (filter === 'reverted') return <Trans>Reverted</Trans>
  return <Trans>Snoozed</Trans>
}

function SkeletonList({ sources }: { sources: readonly PulseSourceHealth[] }) {
  const label = sourceLabel(sources)
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      <span className="sr-only">
        <Trans>Loading alerts…</Trans>
      </span>
      <SkeletonRow tone="warning" active label={<Trans>Checking {label}…</Trans>} />
      <SkeletonRow tone="disabled" />
      <SkeletonRow tone="disabled" />
    </div>
  )
}

function SkeletonRow({
  tone,
  active = false,
  label,
}: {
  tone: 'warning' | 'disabled'
  active?: boolean
  label?: React.ReactNode
}) {
  return (
    <div
      data-skeleton="alert"
      className="flex h-14 items-center gap-3 rounded-md border border-divider-subtle bg-background-default px-3"
    >
      <PulsingDot tone={tone} active={active} />
      {label ? (
        <span className="text-md text-text-tertiary">{label}</span>
      ) : (
        <>
          <span
            aria-hidden
            className="h-2 w-24 animate-pulse rounded-full bg-state-base-hover-alt motion-reduce:animate-none"
          />
          <span aria-hidden className="text-text-tertiary">
            ·
          </span>
          <span
            aria-hidden
            className="h-2 max-w-[280px] flex-1 animate-pulse rounded-full bg-state-base-hover-alt motion-reduce:animate-none"
          />
          <span
            aria-hidden
            className="ml-auto h-2 w-12 animate-pulse rounded-full bg-state-base-hover-alt motion-reduce:animate-none"
          />
        </>
      )}
    </div>
  )
}

function EmptyState({ sources }: { sources: readonly PulseSourceHealth[] }) {
  const count = enabledSourceCount(sources)
  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-divider-regular bg-background-default px-4 py-5 text-md text-text-secondary">
      <PulsingDot tone="success" active />
      <span className="flex-1">
        {count > 0 ? (
          <Trans>
            All clear. We're watching official federal and state sources (
            <Plural value={count} one="# source" other="# sources" />
            ); new matches will appear here.
          </Trans>
        ) : (
          <Trans>
            All clear. We're watching configured Pulse sources; new matches will appear here.
          </Trans>
        )}
      </span>
    </div>
  )
}
