import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ChevronRightIcon, RefreshCwIcon } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import type { PulseAlertPublic, PulseSourceHealth } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { useFirmPermission } from '@/features/permissions/permission-gate'

import { usePulseDrawer } from './DrawerProvider'
import {
  usePulseInvalidation,
  usePulseListAlertsQueryOptions,
  usePulseSourceHealthQueryOptions,
} from './api'
import { PulsingDot, type PulsingDotTone } from './components/PulsingDot'
import { pulseErrorDescriptor } from './lib/error-mapping'
import {
  reviewableSourcesNeedingAttention,
  sourcesNeedingAttention,
  summarizePulseSources,
} from './lib/source-health-labels'

// Pulse banner — a single-line "heartbeat" strip that lives at the top of
// the dashboard. Calm by default (a green pulsing dot + the watcher list);
// shifts to warning tone with the most recent alert inline when a Pulse
// matches a firm's clients. Mirrors DESIGN.md "calm, dense, hairline-first":
// no large warning panel, no skeleton block — just a 36px row that reads
// like a vital sign on a hospital monitor.
export function PulseAlertsBanner() {
  const alertsQuery = useQuery(usePulseListAlertsQueryOptions(5))
  const sourceHealthQuery = useQuery(usePulseSourceHealthQueryOptions())
  const permission = useFirmPermission()
  const navigate = useNavigate()
  const alerts = alertsQuery.data?.alerts ?? []
  const sourceHealth = sourceHealthQuery.data?.sources ?? []
  const [hiddenSourceIssueKeys, setHiddenSourceIssueKeys] = useState(readHiddenSourceIssueKeys)
  const attentionSources = sourcesNeedingAttention(sourceHealth).filter(
    (source) => !hiddenSourceIssueKeys.includes(sourceIssueKey(source)),
  )
  const reviewableAttentionSources = reviewableSourcesNeedingAttention(attentionSources)
  const canReviewSourceHealth = permission.can('pulse.apply')
  const hasAlerts = alerts.length > 0
  const isChecking = alertsQuery.isLoading || (!hasAlerts && alertsQuery.isFetching)
  const refreshAction = (
    <RefreshAlertsButton
      isFetching={alertsQuery.isFetching || sourceHealthQuery.isFetching}
      onRefresh={() => {
        void alertsQuery.refetch()
        void sourceHealthQuery.refetch()
      }}
    />
  )

  if (isChecking) {
    return (
      <PulseStrip
        tone="warning"
        active
        label={<LoadingLabel sources={sourceHealth} />}
        actions={refreshAction}
      />
    )
  }

  if (!hasAlerts) {
    if (attentionSources.length > 0) {
      const canShowSourceReview = canReviewSourceHealth && reviewableAttentionSources.length > 0
      const labelSources = canShowSourceReview ? reviewableAttentionSources : attentionSources
      return (
        <PulseStrip
          tone={canShowSourceReview ? 'warning' : 'normal'}
          active
          label={
            canShowSourceReview ? (
              <AttentionLabel sources={reviewableAttentionSources} />
            ) : (
              <PassiveDegradedLabel />
            )
          }
          meta={<PulseMetaTimestamp iso={newestCheckedAt(labelSources)} />}
          actions={
            <span className="flex items-center gap-1">
              {refreshAction}
              {canShowSourceReview ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    void navigate('/rules/pulse?sourceReview=1#pulse-source-health')
                  }}
                >
                  <Trans>Review sources</Trans>
                </Button>
              ) : null}
              {permission.can('pulse.apply') ? (
                <HideSourceAttentionButton
                  sources={attentionSources}
                  onHide={(keys) => {
                    setHiddenSourceIssueKeys((current) => storeHiddenSourceIssueKeys(current, keys))
                  }}
                />
              ) : null}
            </span>
          }
        />
      )
    }

    return (
      <PulseStrip
        tone="success"
        active
        className="pulse-strip-breathing"
        label={<WatchingLabel sources={sourceHealth} />}
        meta={<PulseMetaTimestamp iso={null} />}
        actions={refreshAction}
      />
    )
  }

  return (
    <ActivePulseStrip
      alerts={alerts}
      isFetching={alertsQuery.isFetching || sourceHealthQuery.isFetching}
      onRefresh={() => {
        void alertsQuery.refetch()
        void sourceHealthQuery.refetch()
      }}
    />
  )
}

const HIDDEN_SOURCE_ISSUES_STORAGE_KEY = 'duedatehq:pulse:hidden-source-issues'

function sourceIssueKey(source: PulseSourceHealth): string {
  return [source.sourceId, source.healthStatus, source.lastError ?? ''].join('|')
}

function readHiddenSourceIssueKeys(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(HIDDEN_SOURCE_ISSUES_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : []
  } catch {
    return []
  }
}

function storeHiddenSourceIssueKeys(current: string[], keys: readonly string[]): string[] {
  const next = Array.from(new Set([...current, ...keys])).slice(-50)
  try {
    window.localStorage.setItem(HIDDEN_SOURCE_ISSUES_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore storage failures; the in-memory state still hides the current banner.
  }
  return next
}

interface PulseStripProps {
  tone: PulsingDotTone
  active: boolean
  label: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  onClick?: () => void
  className?: string
}

// Shared chrome for every Pulse banner state — single hairline row, mono
// metadata aligned right, optional inline actions. Made interactive only
// when `onClick` is provided so the read-only states stay non-clickable.
function PulseStrip({ tone, active, label, meta, actions, onClick, className }: PulseStripProps) {
  const interactive = Boolean(onClick)
  const Element: 'button' | 'div' = interactive ? 'button' : 'div'
  return (
    <Element
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group/pulse flex h-9 w-full items-center gap-3 rounded-md border border-divider-subtle bg-background-default px-3 text-base text-text-secondary transition-colors',
        interactive
          ? 'cursor-pointer text-left hover:border-divider-regular hover:bg-background-default-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt'
          : '',
        className,
      )}
      data-tone={tone}
    >
      <PulsingDot tone={tone} active={active} />
      <span className="flex min-w-0 flex-1 items-center gap-2">{label}</span>
      {meta ? (
        <span className="hidden shrink-0 items-center gap-2 font-mono text-xs tabular-nums text-text-tertiary md:inline-flex">
          {meta}
        </span>
      ) : null}
      {actions ? <span className="shrink-0">{actions}</span> : null}
      {interactive && !actions ? (
        <ChevronRightIcon
          className="size-3.5 shrink-0 text-text-tertiary transition-transform group-hover/pulse:translate-x-0.5"
          aria-hidden
        />
      ) : null}
    </Element>
  )
}

// Renders the strip in its active (alert-bearing) state. We pull this out so
// the mutation hook stays out of the empty / loading branches.
function ActivePulseStrip({
  alerts,
  isFetching,
  onRefresh,
}: {
  alerts: readonly PulseAlertPublic[]
  isFetching: boolean
  onRefresh: () => void
}) {
  const { i18n, t } = useLingui()
  const { openDrawer } = usePulseDrawer()
  const invalidate = usePulseInvalidation()

  const [primary, ...rest] = alerts
  if (!primary) return null

  const dismissMutation = useMutation(
    orpc.pulse.dismiss.mutationOptions({
      onSuccess: () => {
        toast.success(t`Alert dismissed`)
        invalidate()
      },
      onError: (err) => {
        toast.error(t`Couldn't dismiss alert`, {
          description: i18n._(pulseErrorDescriptor(err)) || (rpcErrorMessage(err) ?? undefined),
        })
      },
    }),
  )

  const tone: PulsingDotTone = primary.needsReviewCount > 0 ? 'warning' : 'warning'
  const totalImpact = primary.matchedCount + primary.needsReviewCount

  return (
    <PulseStrip
      tone={tone}
      active
      className="pulse-strip-breathing"
      onClick={() => openDrawer(primary.id)}
      label={
        <>
          <span className="truncate font-medium text-text-primary" title={primary.title}>
            {primary.source}
          </span>
          <span aria-hidden className="text-text-tertiary">
            ·
          </span>
          <span className="truncate text-text-secondary" title={primary.title}>
            {primary.title}
          </span>
          {totalImpact > 0 ? (
            <>
              <span aria-hidden className="text-text-tertiary">
                ·
              </span>
              <span className="shrink-0 font-mono tabular-nums text-text-primary">
                <Plural value={totalImpact} one="# client" other="# clients" />
              </span>
            </>
          ) : null}
          {rest.length > 0 ? (
            <>
              <span aria-hidden className="text-text-tertiary">
                ·
              </span>
              <span className="shrink-0 font-mono tabular-nums text-text-tertiary">
                <Plural value={rest.length} one="+ # more" other="+ # more" />
              </span>
            </>
          ) : null}
        </>
      }
      meta={<PulseMetaTimestamp iso={newestPublishedAt(alerts)} />}
      actions={
        <span
          className="flex items-center gap-1"
          // Stop the parent strip click from firing when the user reaches
          // the inline Dismiss button.
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <RefreshAlertsButton isFetching={isFetching} onRefresh={onRefresh} />
          <Button
            variant="ghost"
            size="sm"
            disabled={dismissMutation.isPending}
            onClick={() => {
              const reason = window.prompt(t`Reason for dismissing this alert?`)?.trim()
              if (!reason) return
              dismissMutation.mutate({ alertId: primary.id, reason })
            }}
          >
            <Trans>Dismiss</Trans>
          </Button>
          <Button size="sm" onClick={() => openDrawer(primary.id)}>
            <Trans>Review</Trans>
          </Button>
        </span>
      }
    />
  )
}

function RefreshAlertsButton({
  isFetching,
  onRefresh,
}: {
  isFetching: boolean
  onRefresh: () => void
}) {
  const { t } = useLingui()
  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={isFetching}
      aria-label={t`Refresh`}
      onClick={onRefresh}
    >
      <RefreshCwIcon className={cn('size-3.5', isFetching ? 'animate-spin' : '')} />
    </Button>
  )

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>
        <Trans>Refresh</Trans>
      </TooltipContent>
    </Tooltip>
  )
}

function HideSourceAttentionButton({
  sources,
  onHide,
}: {
  sources: readonly PulseSourceHealth[]
  onHide: (keys: string[]) => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => onHide(sources.map(sourceIssueKey))}
    >
      <Trans>Hide</Trans>
    </Button>
  )
}

function sourceLabel(sources: readonly PulseSourceHealth[]): string {
  return summarizePulseSources(sources)
}

function LoadingLabel({ sources }: { sources: readonly PulseSourceHealth[] }) {
  const sourceCount = sources.length
  return (
    <span className="truncate text-text-tertiary">
      {sourceCount > 0 ? (
        <Trans>Checking official tax source health…</Trans>
      ) : (
        <Trans>Checking Pulse source health…</Trans>
      )}
    </span>
  )
}

function WatchingLabel({ sources: _sources }: { sources: readonly PulseSourceHealth[] }) {
  return (
    <span className="truncate text-text-secondary">
      <Trans>All clear · Monitoring official tax deadline sources</Trans>
    </span>
  )
}

function AttentionLabel({ sources }: { sources: readonly PulseSourceHealth[] }) {
  const sourceCount = sources.length
  const sourceDetails = sourceLabel(sources)

  return (
    <span className="truncate text-text-secondary" title={sourceDetails}>
      <Trans>Source needs attention</Trans>
      <span aria-hidden className="text-text-tertiary">
        {' '}
        ·{' '}
      </span>
      <span className="font-mono tabular-nums text-text-primary">
        <Plural value={sourceCount} one="# source" other="# sources" />
      </span>
    </span>
  )
}

function PassiveDegradedLabel() {
  return (
    <span className="truncate text-text-secondary">
      <Trans>Pulse source checks degraded · Monitoring continues</Trans>
    </span>
  )
}

function PulseMetaTimestamp({ iso }: { iso: string | null }) {
  if (!iso) {
    return (
      <span>
        <Trans>Live</Trans>
      </span>
    )
  }
  const minutes = minutesSince(iso)
  return (
    <span>
      <Plural value={minutes} one="# min ago" other="# min ago" />
    </span>
  )
}

function newestCheckedAt(sources: readonly PulseSourceHealth[]): string | null {
  let newest: string | null = null
  for (const source of sources) {
    if (
      source.lastCheckedAt &&
      (!newest || new Date(source.lastCheckedAt).getTime() > new Date(newest).getTime())
    ) {
      newest = source.lastCheckedAt
    }
  }
  return newest
}

function newestPublishedAt(alerts: readonly PulseAlertPublic[]): string | null {
  let newest: string | null = null
  for (const alert of alerts) {
    if (!newest || new Date(alert.publishedAt).getTime() > new Date(newest).getTime()) {
      newest = alert.publishedAt
    }
  }
  return newest
}

function minutesSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.round(ms / 60000))
}
