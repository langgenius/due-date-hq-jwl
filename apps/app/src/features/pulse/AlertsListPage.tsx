import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AlertCircleIcon, ArrowUpRightIcon, FilterXIcon, HistoryIcon } from 'lucide-react'
import { toast } from 'sonner'

import type {
  PulseAlertPublic,
  PulseChangeKind,
  PulseFirmAlertStatus,
  PulseSourceHealth,
} from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { ConceptLabel } from '@/features/concepts/concept-help'
import { StateBadge } from '@/components/primitives/state-badge'

import { usePulseDrawer } from './DrawerProvider'
import {
  usePulseInvalidation,
  usePulseListHistoryQueryOptions,
  usePulseSourceHealthQueryOptions,
} from './api'
import { PulseAlertCard } from './components/PulseAlertCard'
import { PulseReasonDialog, type PulseReasonAction } from './components/PulseReasonDialog'
import { PulsingDot } from './components/PulsingDot'
import { enabledPulseSourceCount, summarizePulseSources } from './lib/source-health-labels'
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
  'reviewed',
] as const
type PulseStatusFilter = (typeof STATUS_FILTER_OPTIONS)[number]
const CHANGE_KIND_FILTER_OPTIONS = [
  'all',
  'deadline_shift',
  'filing_requirement',
  'applicability_scope',
  'form_instruction',
  'source_status',
  'new_obligation',
  'other',
] as const
type PulseChangeKindFilter = (typeof CHANGE_KIND_FILTER_OPTIONS)[number]
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
  const [statusFilter, setStatusFilter] = useState<PulseStatusFilter>('all')
  const [impactFilter, setImpactFilter] = useState<PulseImpactFilter>('all')
  const [changeKindFilter, setChangeKindFilter] = useState<PulseChangeKindFilter>('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  // 2026-05-25 (Yuqi Alerts #9): state filter. v1 ships as a chip
  // strip (one chip per state with active alerts, count badge,
  // click-to-filter). The full SVG US map is a follow-on polish
  // round on top of this; the chip strip delivers the same filter
  // function with much less surface area. `null` = no filter
  // active.
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string | null>(null)
  const invalidatePulse = usePulseInvalidation()
  // 2026-05-24 (re-critique): the dismiss / snooze row-actions used
  // to grab the reason via `window.prompt()` — system-styled, no
  // textarea, no character counter, no app context. The drawer
  // already had a proper `PulseReasonDialog` for the same flow;
  // extracted it to a shared component (see
  // `./components/PulseReasonDialog.tsx`) and wired both surfaces
  // through it so the dismiss / snooze experience is consistent
  // whether the user is in the drawer or running through the list.
  const [reasonState, setReasonState] = useState<{
    action: PulseReasonAction
    alertId: string
  } | null>(null)
  const [reasonText, setReasonText] = useState('')
  const closeReasonDialog = () => {
    setReasonState(null)
    setReasonText('')
  }
  // Dismiss alerts directly from the Radar list (Rules › Radar). Mirrors
  // the dashboard banner's dismiss flow — same orpc.pulse.dismiss
  // mutation, same toast + invalidation on success. The optional
  // onDismiss prop on PulseAlertCard already renders a "Dismiss" button
  // when provided; wiring this handler turns it on for the in-Rules
  // surface so CPAs reviewing alerts at depth don't have to go back to
  // the dashboard banner just to dismiss noise.
  const dismissAlertMutation = useMutation(
    orpc.pulse.dismiss.mutationOptions({
      onSuccess: () => {
        toast.success(t`Alert dismissed`)
        invalidatePulse()
        closeReasonDialog()
      },
      onError: (err) => {
        toast.error(t`Couldn't dismiss alert`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  // Snooze mirrors Dismiss — same canonical reason prompt, same audit
  // semantics, same toast pattern — but the alert reappears when the
  // 24h window elapses. Wired here per docs/Design/pulse-vocabulary.md
  // so CPAs don't have to open the drawer to defer a low-priority
  // alert.
  const snoozeAlertMutation = useMutation(
    orpc.pulse.snooze.mutationOptions({
      onSuccess: () => {
        toast.success(t`Alert snoozed for 24h`)
        invalidatePulse()
        closeReasonDialog()
      },
      onError: (err) => {
        toast.error(t`Couldn't snooze alert`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const alertsQuery = useQuery(usePulseListHistoryQueryOptions(50))
  const sourceHealthQuery = useQuery(usePulseSourceHealthQueryOptions())
  const alerts = alertsQuery.data?.alerts ?? EMPTY_ALERTS
  const sourceHealth = sourceHealthQuery.data?.sources ?? EMPTY_SOURCES
  const sourceOptions = useMemo(
    () =>
      alerts
        .map((alert) => alert.source)
        .filter((source, index, sources) => sources.indexOf(source) === index)
        .toSorted(),
    [alerts],
  )
  // Counts per jurisdiction (state) across the unfiltered alerts —
  // backs the chip strip below. Sorted by count desc then state code
  // asc so the highest-impact states float to the front; zero-count
  // states never appear (alerts.filter excludes them implicitly).
  const jurisdictionCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const alert of alerts) {
      map.set(alert.jurisdiction, (map.get(alert.jurisdiction) ?? 0) + 1)
    }
    return [...map.entries()].toSorted(([aCode, aCount], [bCode, bCount]) => {
      if (aCount !== bCount) return bCount - aCount
      return aCode.localeCompare(bCode)
    })
  }, [alerts])
  const filteredAlerts = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          matchesPulseImpactFilter(alert, impactFilter) &&
          matchesStatusFilter(alert.status, statusFilter) &&
          (changeKindFilter === 'all' || alert.changeKind === changeKindFilter) &&
          (sourceFilter === 'all' || alert.source === sourceFilter) &&
          (jurisdictionFilter === null || alert.jurisdiction === jurisdictionFilter),
      ),
    [alerts, changeKindFilter, impactFilter, jurisdictionFilter, sourceFilter, statusFilter],
  )
  const isEmpty = !alertsQuery.isLoading && alerts.length === 0
  const isFilteredEmpty = !alertsQuery.isLoading && alerts.length > 0 && filteredAlerts.length === 0
  const breathingAlertId = filteredAlerts.find(isBreathingAlertRow)?.id
  const filtersActive =
    impactFilter !== 'all' ||
    statusFilter !== 'all' ||
    changeKindFilter !== 'all' ||
    sourceFilter !== 'all' ||
    jurisdictionFilter !== null

  return (
    // Match the 1100px cap applied across narrow content pages
    // (Today/Clients/Opportunities/Audit/Settings). Skipped in the
    // `embedded` case because the embedding surface (the Rule
    // library's Pulse tab) already constrains width.
    // 2026-05-25 (Yuqi Alerts #14): compactness pass — gap-5 → gap-4
    // on both the embedded and standalone wrappers. The standalone
    // padding also drops one step (p-3 base / md:p-4) so the page
    // doesn't read as "loose" inside the app shell's existing padding.
    <div
      className={
        embedded
          ? 'flex flex-col gap-4'
          : 'mx-auto flex w-full max-w-page-wide flex-col gap-4 p-3 md:p-4'
      }
    >
      {!embedded ? (
        <header className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="flex items-center gap-2 text-2xl font-semibold leading-tight text-text-primary">
                <PulsingDot
                  tone={isEmpty ? 'success' : 'warning'}
                  active
                  label={
                    isEmpty ? t`No active alerts right now` : t`Active alerts waiting for review`
                  }
                />
                <Trans>Alerts</Trans>
              </h1>
              <p className="max-w-[640px] text-md text-text-secondary">
                <ConceptLabel concept="pulse">
                  <Trans>
                    Regulatory Pulse signals that match your practice's clients. Review, batch-apply
                    due-date changes, snooze, or revisit closed changes.
                  </Trans>
                </ConceptLabel>
              </p>
            </div>
            <div className="flex shrink-0 items-end gap-3">
              {!alertsQuery.isLoading ? (
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
              ) : null}
              {/* 2026-05-25 (Yuqi Alerts #2, #12): cross-surface
                  links so the CPA can jump out of the alert review
                  loop. "View sources" goes to the canonical rules
                  surface where the source list lives. "View
                  history" pre-sets the status filter to "applied"
                  (most common closed state) — a starting point
                  into the closed-alert archive without inventing
                  a new route. The full closed-state set is still
                  reachable via the filter dropdown. */}
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  to="/rules/library"
                  className="group/sources inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
                >
                  <Trans>View sources</Trans>
                  <ArrowUpRightIcon
                    className="size-3.5 transition-transform duration-200 group-hover/sources:rotate-45"
                    aria-hidden
                  />
                </Link>
                {statusFilter !== 'applied' &&
                statusFilter !== 'dismissed' &&
                statusFilter !== 'reverted' ? (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('applied')}
                    className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
                  >
                    <HistoryIcon className="size-3.5" aria-hidden />
                    <Trans>View history</Trans>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </header>
      ) : null}

      {alertsQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Couldn't load alerts</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(alertsQuery.error) ??
              t`Check your network and try again. If this keeps happening, contact support.`}{' '}
            <button type="button" className="underline" onClick={() => void alertsQuery.refetch()}>
              <Trans>Retry</Trans>
            </button>
          </AlertDescription>
        </Alert>
      ) : null}

      {alertsQuery.isLoading ? (
        <SkeletonList sources={sourceHealth} />
      ) : isEmpty ? (
        <EmptyState sources={sourceHealth} />
      ) : (
        <>
          {/* 2026-05-25 (Yuqi Alerts #3): dropped the framed
              container around the filter row. The cards below
              already sit on the page surface without a frame —
              wrapping just the filters in a `border + bg + p-3`
              container made them look heavier than the actual
              alert content. Now the filters live inline with the
              page's outer padding, same rhythm as the header
              above and the list below. */}
          {/* State filter chip strip (Yuqi Alerts #9, 2026-05-25):
              one chip per state with active alerts. Counts come from
              the unfiltered alert set so the chip stays clickable
              even after other filters narrow the list. Clicking
              toggles single-state focus; clicking the active chip
              clears the filter. A full SVG US map could replace this
              chip strip as a follow-on polish — the data shape
              (state + count) is the same, only the visual changes. */}
          {/* 2026-05-25 (Yuqi Alerts follow-up — state badges export):
              the state chip strip now leads each chip with the
              designed StateBadge SVG (flag/seal motif) instead of the
              bare two-letter code. The visual makes the strip scan
              like a row of flags — you spot "your state" by motif at
              a glance, the way a CPA recognises a Florida licence
              plate before reading "FL". Code text follows so the
              filter remains keyboard-typable and the chip is
              accessible without the SVG. The count chip on the right
              stays — same affordance as before. */}
          {jurisdictionCounts.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs uppercase tracking-wide text-text-tertiary">
                <Trans>States</Trans>
              </span>
              {jurisdictionCounts.map(([state, count]) => {
                const active = jurisdictionFilter === state
                return (
                  <button
                    key={state}
                    type="button"
                    onClick={() => setJurisdictionFilter(active ? null : state)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md border py-0.5 pl-1 pr-2 text-xs font-medium tabular-nums transition-colors',
                      active
                        ? 'border-state-accent-solid bg-state-accent-hover text-text-accent'
                        : 'border-divider-regular bg-background-default text-text-secondary hover:border-divider-strong hover:bg-background-default-hover hover:text-text-primary',
                    )}
                  >
                    <StateBadge code={state} size="xs" aria-hidden />
                    <span>{state}</span>
                    <span
                      className={cn(
                        'inline-flex h-4 min-w-4 items-center justify-center rounded-sm px-1 text-xs',
                        active
                          ? 'bg-state-accent-solid/15 text-text-accent'
                          : 'bg-background-soft text-text-tertiary',
                      )}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : null}

          {/* 2026-05-25 (Yuqi Alerts #10): Reset moved into the same
              row as the filter dropdowns and demoted to ghost — was a
              full outline button on the right side of its own flex row.
              Inline ghost reads as a tertiary affordance ("clear what
              you've set") instead of a primary action competing with
              the filters themselves. */}
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={impactFilter}
              onValueChange={(value) => {
                if (typeof value === 'string' && isPulseImpactFilter(value)) setImpactFilter(value)
              }}
            >
              <SelectTrigger className="w-[180px]" size="sm" aria-label={t`Filter by impact`}>
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
              value={changeKindFilter}
              onValueChange={(value) => {
                if (typeof value === 'string' && isChangeKindFilter(value))
                  setChangeKindFilter(value)
              }}
            >
              <SelectTrigger className="w-[180px]" size="sm" aria-label={t`Filter by change type`}>
                <SelectValue>{changeKindFilterLabel(changeKindFilter)}</SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                {CHANGE_KIND_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {changeKindFilterLabel(option)}
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
              <SelectTrigger className="w-[180px]" size="sm" aria-label={t`Filter by alert status`}>
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
              <SelectTrigger className="w-[220px]" size="sm" aria-label={t`Filter by source`}>
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

            <Button
              variant="ghost"
              size="sm"
              disabled={!filtersActive}
              onClick={() => {
                setImpactFilter('all')
                setStatusFilter('all')
                setChangeKindFilter('all')
                setSourceFilter('all')
                setJurisdictionFilter(null)
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
              {filteredAlerts.map((alert) => {
                // Dismiss only on `matched` (still-open) alerts. Other statuses
                // are terminal or already-actioned (dismissed / applied /
                // partially_applied / reverted / snoozed) — growing a Dismiss
                // button there would imply a no-op or a misleading retreat.
                const canDismiss = alert.status === 'matched'
                // Snooze applies to the same lifecycle stage as Dismiss
                // (still-open alerts) — the difference is the alert
                // reappears after 24h. Per canonical action order, both
                // are exposed on the card; Snooze is the softer choice.
                const canSnooze = canDismiss
                return (
                  <PulseAlertCard
                    key={alert.id}
                    alert={alert}
                    breathing={alert.id === breathingAlertId}
                    onReview={() => openDrawer(alert.id)}
                    {...(canSnooze
                      ? {
                          onSnooze: () => {
                            setReasonState({ action: 'snooze', alertId: alert.id })
                            setReasonText('')
                          },
                        }
                      : {})}
                    {...(canDismiss
                      ? {
                          onDismiss: () => {
                            setReasonState({ action: 'dismiss', alertId: alert.id })
                            setReasonText('')
                          },
                        }
                      : {})}
                  />
                )
              })}
            </div>
          )}
        </>
      )}

      <PulseReasonDialog
        action={reasonState?.action ?? null}
        reason={reasonText}
        pending={dismissAlertMutation.isPending || snoozeAlertMutation.isPending}
        onChangeReason={setReasonText}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeReasonDialog()
        }}
        onSubmit={() => {
          const trimmed = reasonText.trim()
          if (!trimmed || !reasonState) return
          if (reasonState.action === 'dismiss') {
            dismissAlertMutation.mutate({ alertId: reasonState.alertId, reason: trimmed })
          } else if (reasonState.action === 'snooze') {
            snoozeAlertMutation.mutate({
              alertId: reasonState.alertId,
              until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              reason: trimmed,
            })
          }
          // The list-page surface doesn't expose `reviewed` — that's
          // a drawer-only flow (it depends on the affected-client
          // selection state the drawer holds).
        }}
      />
    </div>
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

function isStatusFilter(value: string): value is PulseStatusFilter {
  return STATUS_FILTER_OPTIONS.some((option) => option === value)
}

function isChangeKindFilter(value: string): value is PulseChangeKindFilter {
  return CHANGE_KIND_FILTER_OPTIONS.some((option) => option === value)
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
  if (filter === 'reviewed') return <Trans>Reviewed</Trans>
  return <Trans>Snoozed</Trans>
}

function changeKindFilterLabel(filter: PulseChangeKindFilter): React.ReactNode {
  if (filter === 'all') return <Trans>All change types</Trans>
  return changeKindLabel(filter)
}

function changeKindLabel(kind: PulseChangeKind): React.ReactNode {
  if (kind === 'deadline_shift') return <Trans>Deadline shifts</Trans>
  if (kind === 'filing_requirement') return <Trans>Filing requirements</Trans>
  if (kind === 'applicability_scope') return <Trans>Applicability scope</Trans>
  if (kind === 'form_instruction') return <Trans>Forms and instructions</Trans>
  if (kind === 'source_status') return <Trans>Source status</Trans>
  if (kind === 'new_obligation') return <Trans>New obligations</Trans>
  return <Trans>Other changes</Trans>
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
