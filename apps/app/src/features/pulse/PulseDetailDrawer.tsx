import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  MailIcon,
  MessageSquareIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type { FirmPublic, FirmRole, PulseFirmAlertStatus, PulseStatus } from '@duedatehq/contracts'
import type { PulseDetail } from '@duedatehq/contracts'
import { hasFirmPermission } from '@duedatehq/core/permissions'
import { planHasFeature } from '@duedatehq/core/plan-entitlements'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import { Label } from '@duedatehq/ui/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { ConceptLabel } from '@/features/concepts/concept-help'

import { AffectedClientsTable } from './components/AffectedClientsTable'
import { isVeryLowPulseConfidence, PulseConfidenceBadge } from './components/PulseConfidenceBadge'
import { PulseSourceBadge } from './components/PulseSourceBadge'
import { PulseSourceStatusBadge } from './components/PulseSourceStatusBadge'
import { PulseStatusBadge } from './components/PulseStatusBadge'
import { PulseStructuredFields } from './components/PulseStructuredFields'
import { PulsingDot, type PulsingDotTone } from './components/PulsingDot'
import {
  usePulseInvalidation,
  usePulseDetailQueryOptions,
  usePulsePriorityQueueQueryOptions,
} from './api'
import { isPulseConflict, pulseErrorDescriptor } from './lib/error-mapping'
import {
  computeSelectionStats,
  confirmAllNeedsReview,
  defaultSelection,
  excludeFromSelection,
  type SelectionStats,
} from './lib/selection'

interface PulseDetailDrawerProps {
  alertId: string | null
  onClose: () => void
}

const REVERTABLE_STATUSES: ReadonlySet<PulseFirmAlertStatus> = new Set([
  'applied',
  'partially_applied',
])
const REVIEW_UNAVAILABLE_STATUSES: ReadonlySet<PulseFirmAlertStatus> = new Set([
  'dismissed',
  'reverted',
])
const SHOW_PRIORITY_REVIEW_UI = false

function drawerTone(status: PulseFirmAlertStatus, confidence: number): PulsingDotTone {
  if (isVeryLowPulseConfidence(confidence)) return 'error'
  if (status === 'applied' || status === 'partially_applied') return 'success'
  if (status === 'matched') return 'warning'
  return 'disabled'
}

export function canRequestPulseReview(input: {
  role: FirmRole | null | undefined
  alertStatus: PulseFirmAlertStatus
  sourceStatus: PulseStatus
}): boolean {
  return (
    input.role === 'preparer' &&
    input.sourceStatus !== 'source_revoked' &&
    !REVIEW_UNAVAILABLE_STATUSES.has(input.alertStatus)
  )
}

// Read RBAC from the firms cache the layout already primed. The Apply CTA stays
// disabled until we know the user is Owner / Manager (matches server permissions).
function usePulsePermissions(): {
  role: FirmRole | null
  canApply: boolean
  canViewPriorityQueue: boolean
  canManagePriorityReview: boolean
} {
  const queryClient = useQueryClient()
  const firms = queryClient.getQueryData<FirmPublic[]>(
    orpc.firms.listMine.queryKey({ input: undefined }),
  )
  if (!firms) {
    return {
      role: null,
      canApply: false,
      canViewPriorityQueue: false,
      canManagePriorityReview: false,
    }
  }
  const current = firms.find((firm) => firm.isCurrent) ?? firms[0]
  if (!current) {
    return {
      role: null,
      canApply: false,
      canViewPriorityQueue: false,
      canManagePriorityReview: false,
    }
  }
  const priorityEnabled =
    SHOW_PRIORITY_REVIEW_UI && planHasFeature(current.plan, 'priorityPulseMatching')
  const canApply = hasFirmPermission({
    role: current.role,
    permission: 'pulse.apply',
    coordinatorCanSeeDollars: current.coordinatorCanSeeDollars,
  })
  return {
    role: current.role,
    canApply,
    canViewPriorityQueue: priorityEnabled,
    canManagePriorityReview: priorityEnabled && canApply,
  }
}

// Pulse detail drawer: AI summary + structured fields + affected clients + apply
// / dismiss / revert. Apply is the safer path because the server writes audit +
// evidence + email outbox in one transaction (see packages/db/src/repo/pulse.ts).
export function PulseDetailDrawer({ alertId, onClose }: PulseDetailDrawerProps) {
  const { t, i18n } = useLingui()
  const queryClient = useQueryClient()
  const open = alertId !== null
  const detailQuery = useQuery(usePulseDetailQueryOptions(alertId))
  const detail = detailQuery.data
  const permissions = usePulsePermissions()
  const canApply = permissions.canApply
  const priorityQueueQuery = useQuery(
    usePulsePriorityQueueQueryOptions(100, permissions.canViewPriorityQueue),
  )
  const priorityReview =
    priorityQueueQuery.data?.items.find((item) => item.alert.id === detail?.alert.id)?.review ??
    null
  const invalidate = usePulseInvalidation()

  const [selection, setSelection] = useState<Set<string>>(() => new Set())
  const [confirmedReviewIds, setConfirmedReviewIds] = useState<Set<string>>(() => new Set())
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set())
  const [resetKey, setResetKey] = useState<string | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewNote, setReviewNote] = useState('')

  // Re-derive default selection when the loaded alert changes — without
  // useEffect, per project rule. Render-time setState bails out after one update.
  const nextResetKey = detail
    ? [
        detail.alert.id,
        detail.affectedClients.length,
        priorityReview?.id ?? 'none',
        priorityReview?.status ?? 'none',
        priorityReview?.reviewedAt ?? 'none',
      ].join(':')
    : null
  if (detail && resetKey !== nextResetKey) {
    setSelection(
      priorityReview
        ? new Set(priorityReview.selectedObligationIds)
        : defaultSelection(detail.affectedClients),
    )
    setConfirmedReviewIds(new Set(priorityReview?.confirmedObligationIds ?? []))
    setExcludedIds(new Set(priorityReview?.excludedObligationIds ?? []))
    setReviewDialogOpen(false)
    setReviewNote('')
    setResetKey(nextResetKey)
  }
  if (!open && resetKey !== null) {
    setSelection(new Set())
    setConfirmedReviewIds(new Set())
    setExcludedIds(new Set())
    setReviewDialogOpen(false)
    setReviewNote('')
    setResetKey(null)
  }

  const stats = useMemo<SelectionStats | null>(
    () =>
      detail ? computeSelectionStats(detail.affectedClients, selection, confirmedReviewIds) : null,
    [detail, selection, confirmedReviewIds],
  )

  const handleToggleNeedsReviewConfirmation = (obligationId: string, confirmed: boolean) => {
    setConfirmedReviewIds((current) => {
      const next = new Set(current)
      if (confirmed) next.add(obligationId)
      else next.delete(obligationId)
      return next
    })
    setSelection((current) => {
      const next = new Set(current)
      if (confirmed) next.add(obligationId)
      else next.delete(obligationId)
      return next
    })
  }

  const handleToggleExcluded = (obligationId: string, excluded: boolean) => {
    const next = excludeFromSelection(
      selection,
      confirmedReviewIds,
      excludedIds,
      obligationId,
      excluded,
    )
    setSelection(next.selection)
    setConfirmedReviewIds(next.confirmedReviewIds)
    setExcludedIds(next.excludedIds)
  }

  const handleConfirmAllNeedsReview = () => {
    if (!detail) return
    const nextConfirmed = confirmAllNeedsReview(detail.affectedClients)
    setConfirmedReviewIds(nextConfirmed)
    setSelection((current) => {
      const next = new Set(current)
      for (const obligationId of nextConfirmed) {
        if (!excludedIds.has(obligationId)) next.add(obligationId)
      }
      return next
    })
  }

  const revertMutation = useMutation(
    orpc.pulse.revert.mutationOptions({
      onSuccess: (result) => {
        invalidate()
        toast.success(t`Reverted ${result.revertedCount} clients`)
      },
      onError: (err) => {
        toast.error(t`Couldn't undo Pulse`, {
          description: i18n._(pulseErrorDescriptor(err)),
        })
      },
    }),
  )

  const reactivateMutation = useMutation(
    orpc.pulse.reactivate.mutationOptions({
      onSuccess: () => {
        invalidate()
        toast.success(t`Alert reactivated`, {
          description: t`Select clients and apply again.`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't reactivate alert`, {
          description: i18n._(pulseErrorDescriptor(err)),
        })
      },
    }),
  )

  const applyMutation = useMutation(
    orpc.pulse.apply.mutationOptions({
      onSuccess: (result) => {
        invalidate()
        toast.success(t`Applied to ${result.appliedCount} clients`, {
          description: t`Audit + evidence written. Undo within 24h.`,
          action: {
            label: t`Undo`,
            onClick: () => revertMutation.mutate({ alertId: result.alert.id }),
          },
        })
        onClose()
      },
      onError: (err) => {
        const description = i18n._(pulseErrorDescriptor(err)) || (rpcErrorMessage(err) ?? '')
        if (isPulseConflict(err)) {
          toast.error(t`Couldn't apply Pulse`, {
            description,
            action: {
              label: t`Refresh`,
              onClick: () => void detailQuery.refetch(),
            },
          })
          return
        }
        toast.error(t`Couldn't apply Pulse`, { description })
      },
    }),
  )

  const dismissMutation = useMutation(
    orpc.pulse.dismiss.mutationOptions({
      onSuccess: () => {
        toast.success(t`Alert dismissed`)
        invalidate()
        onClose()
      },
      onError: (err) => {
        toast.error(t`Couldn't dismiss alert`, {
          description: i18n._(pulseErrorDescriptor(err)),
        })
      },
    }),
  )

  const snoozeMutation = useMutation(
    orpc.pulse.snooze.mutationOptions({
      onSuccess: () => {
        toast.success(t`Alert snoozed`)
        invalidate()
        onClose()
      },
      onError: (err) => {
        toast.error(t`Couldn't snooze alert`, {
          description: i18n._(pulseErrorDescriptor(err)),
        })
      },
    }),
  )

  const requestReviewMutation = useMutation(
    orpc.pulse.requestReview.mutationOptions({
      onSuccess: () => {
        setReviewDialogOpen(false)
        setReviewNote('')
        void queryClient.invalidateQueries({ queryKey: orpc.notifications.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.pulse.key() })
        toast.success(t`Review requested`, {
          description: t`Owner and manager notifications and emails will be sent.`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't request review`, {
          description: i18n._(pulseErrorDescriptor(err)),
        })
      },
    }),
  )

  const reviewPriorityMutation = useMutation(
    orpc.pulse.reviewPriorityMatches.mutationOptions({
      onSuccess: () => {
        invalidate()
        toast.success(t`Manager review saved`, {
          description: t`The reviewed client set is ready to apply.`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't save manager review`, {
          description: i18n._(pulseErrorDescriptor(err)),
        })
      },
    }),
  )

  const applyReviewedMutation = useMutation(
    orpc.pulse.applyReviewed.mutationOptions({
      onSuccess: (result) => {
        invalidate()
        toast.success(t`Applied reviewed set to ${result.appliedCount} clients`, {
          description: t`Audit + evidence written. Undo within 24h.`,
          action: {
            label: t`Undo`,
            onClick: () => revertMutation.mutate({ alertId: result.alert.id }),
          },
        })
        onClose()
      },
      onError: (err) => {
        toast.error(t`Couldn't apply reviewed set`, {
          description: i18n._(pulseErrorDescriptor(err)),
        })
      },
    }),
  )

  const isMutating =
    applyReviewedMutation.isPending ||
    applyMutation.isPending ||
    dismissMutation.isPending ||
    reviewPriorityMutation.isPending ||
    reactivateMutation.isPending ||
    requestReviewMutation.isPending ||
    revertMutation.isPending ||
    snoozeMutation.isPending

  const handleApply = () => {
    if (!detail) return
    applyMutation.mutate({
      alertId: detail.alert.id,
      obligationIds: Array.from(selection),
      confirmedObligationIds: Array.from(selection).filter((obligationId) =>
        confirmedReviewIds.has(obligationId),
      ),
    })
  }

  const handleCopyDraft = () => {
    if (!detail) return
    void navigator.clipboard.writeText(buildClientEmailDraft(detail, selection)).then(
      () => toast.success(t`Client email draft copied`),
      () => toast.error(t`Couldn't copy client email draft`),
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:max-w-[100vw] sm:data-[side=right]:w-[calc(100vw-2rem)] sm:data-[side=right]:max-w-[calc(100vw-2rem)] md:data-[side=right]:w-[min(820px,calc(100vw-2rem))] md:data-[side=right]:max-w-[min(820px,calc(100vw-2rem))] xl:data-[side=right]:w-[min(880px,calc(100vw-2rem))] xl:data-[side=right]:max-w-[min(880px,calc(100vw-2rem))]"
      >
        <SheetHeader className="border-b border-divider-subtle">
          {detailQuery.isLoading || !detail ? (
            <DetailHeaderSkeleton />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <PulsingDot
                  tone={drawerTone(detail.alert.status, detail.alert.confidence)}
                  active
                />
                <PulseSourceBadge source={detail.alert.source} sourceUrl={detail.alert.sourceUrl} />
                <PulseConfidenceBadge confidence={detail.alert.confidence} />
                <PulseStatusBadge status={detail.alert.status} />
                <PulseSourceStatusBadge status={detail.alert.sourceStatus} />
              </div>
              <SheetTitle className="text-lg">{detail.alert.title}</SheetTitle>
              <SheetDescription className="text-md text-text-secondary">
                {detail.alert.summary}
              </SheetDescription>
            </div>
          )}
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          {detailQuery.isError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>
                <Trans>Couldn't load this alert</Trans>
              </AlertTitle>
              <AlertDescription>
                {i18n._(pulseErrorDescriptor(detailQuery.error))}{' '}
                <button
                  type="button"
                  className="underline"
                  onClick={() => void detailQuery.refetch()}
                >
                  <Trans>Retry</Trans>
                </button>
              </AlertDescription>
            </Alert>
          ) : null}

          {detail ? (
            <>
              {isVeryLowPulseConfidence(detail.alert.confidence) ? (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle>
                    <ConceptLabel concept="aiConfidence">
                      <Trans>Low AI confidence</Trans>
                    </ConceptLabel>
                  </AlertTitle>
                  <AlertDescription>
                    <Trans>
                      Review the source excerpt and structured fields before applying this alert.
                    </Trans>
                  </AlertDescription>
                </Alert>
              ) : null}

              <PulseStructuredFields detail={detail} />

              {!canApply ? (
                <Alert>
                  <ShieldAlertIcon />
                  <AlertTitle>
                    <Trans>Read-only view</Trans>
                  </AlertTitle>
                  <AlertDescription>
                    <Trans>Only owners and managers can apply Pulse changes.</Trans>
                  </AlertDescription>
                </Alert>
              ) : null}

              {detail.alert.sourceStatus === 'source_revoked' ? (
                <Alert variant="destructive">
                  <ShieldAlertIcon />
                  <AlertTitle>
                    <Trans>Source revoked</Trans>
                  </AlertTitle>
                  <AlertDescription>
                    <Trans>
                      This source is no longer trusted. The historical alert remains visible, but
                      new apply, dismiss, snooze, and undo actions are disabled.
                    </Trans>
                  </AlertDescription>
                </Alert>
              ) : null}

              <section className="flex flex-col gap-3">
                <header className="flex items-baseline justify-between">
                  <h3 className="text-md font-semibold text-text-primary">
                    <ConceptLabel concept="pulse">
                      <Trans>Affected clients</Trans>
                    </ConceptLabel>
                  </h3>
                  {stats ? <SelectionSummary stats={stats} /> : null}
                </header>
                <AffectedClientsTable
                  rows={detail.affectedClients}
                  selection={selection}
                  confirmedReviewIds={confirmedReviewIds}
                  excludedIds={excludedIds}
                  onChangeSelection={setSelection}
                  onToggleNeedsReviewConfirmation={handleToggleNeedsReviewConfirmation}
                  onToggleExcluded={
                    permissions.canViewPriorityQueue ? handleToggleExcluded : undefined
                  }
                  readOnly={!canApply}
                />
              </section>

              {permissions.canViewPriorityQueue ? (
                <ManagerReviewPanel
                  canManage={permissions.canManagePriorityReview}
                  reviewStatus={priorityReview?.status ?? null}
                  selectedCount={stats?.selectedCount ?? 0}
                  excludedCount={excludedIds.size}
                  needsReviewCount={stats?.needsReviewCount ?? 0}
                  isMutating={isMutating}
                  onConfirmAll={handleConfirmAllNeedsReview}
                  onSave={() =>
                    reviewPriorityMutation.mutate({
                      alertId: detail.alert.id,
                      selectedObligationIds: Array.from(selection),
                      confirmedObligationIds: Array.from(confirmedReviewIds),
                      excludedObligationIds: Array.from(excludedIds),
                    })
                  }
                />
              ) : null}

              <SuggestedActionsPanel
                selectionCount={stats?.selectedCount ?? 0}
                canApply={canApply}
                canRequestReview={canRequestPulseReview({
                  role: permissions.role,
                  alertStatus: detail.alert.status,
                  sourceStatus: detail.alert.sourceStatus,
                })}
                sourceRevoked={detail.alert.sourceStatus === 'source_revoked'}
                isClosed={detail.alert.status === 'dismissed' || detail.alert.status === 'reverted'}
                isMutating={isMutating}
                onApply={handleApply}
                onCopyDraft={handleCopyDraft}
                onRequestReview={() => setReviewDialogOpen(true)}
              />

              <ApplySafetyChecklist />
            </>
          ) : null}
        </div>

        <SheetFooter className="border-t border-divider-subtle">
          {detail ? (
            <DrawerActions
              alertStatus={detail.alert.status}
              sourceStatus={detail.alert.sourceStatus}
              selectionCount={stats?.selectedCount ?? 0}
              canApply={canApply}
              canRequestReview={canRequestPulseReview({
                role: permissions.role,
                alertStatus: detail.alert.status,
                sourceStatus: detail.alert.sourceStatus,
              })}
              canApplyReviewed={permissions.canManagePriorityReview}
              reviewedSetReady={priorityReview?.status === 'reviewed'}
              isMutating={isMutating}
              onApply={handleApply}
              onApplyReviewed={() => applyReviewedMutation.mutate({ alertId: detail.alert.id })}
              onDismiss={() => dismissMutation.mutate({ alertId: detail.alert.id })}
              onSnooze={() =>
                snoozeMutation.mutate({
                  alertId: detail.alert.id,
                  until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                })
              }
              onRevert={() => revertMutation.mutate({ alertId: detail.alert.id })}
              onReactivate={() => reactivateMutation.mutate({ alertId: detail.alert.id })}
              onRequestReview={() => setReviewDialogOpen(true)}
              onCopyDraft={handleCopyDraft}
            />
          ) : null}
        </SheetFooter>
      </SheetContent>
      {detail ? (
        <PulseReviewRequestDialog
          open={reviewDialogOpen}
          note={reviewNote}
          pending={requestReviewMutation.isPending}
          onOpenChange={setReviewDialogOpen}
          onChangeNote={setReviewNote}
          onSubmit={() =>
            requestReviewMutation.mutate({
              alertId: detail.alert.id,
              ...(reviewNote.trim() ? { note: reviewNote } : {}),
            })
          }
        />
      ) : null}
    </Sheet>
  )
}

function SuggestedActionsPanel({
  selectionCount,
  canApply,
  canRequestReview,
  sourceRevoked,
  isClosed,
  isMutating,
  onApply,
  onCopyDraft,
  onRequestReview,
}: {
  selectionCount: number
  canApply: boolean
  canRequestReview: boolean
  sourceRevoked: boolean
  isClosed: boolean
  isMutating: boolean
  onApply: () => void
  onCopyDraft: () => void
  onRequestReview: () => void
}) {
  const applyDisabled = !canApply || isMutating || isClosed || sourceRevoked || selectionCount === 0
  return (
    <section className="grid gap-3 rounded-md border border-divider-subtle bg-background-section p-3">
      <header className="flex flex-col gap-1">
        <h3 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          <Trans>Suggested actions</Trans>
        </h3>
        <p className="text-sm text-text-secondary">
          <Trans>
            Use the source-backed path for deadline changes, then prepare client communication from
            the same selected obligations.
          </Trans>
        </p>
      </header>

      <div className="grid gap-2 md:grid-cols-2">
        <article className="flex items-start gap-3 rounded-md border border-divider-subtle bg-background-default p-3">
          <span
            aria-hidden
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-state-accent-hover text-text-accent"
          >
            <CheckCircle2Icon className="size-4" />
          </span>
          <div className="grid min-w-0 flex-1 gap-2">
            <div className="grid gap-0.5">
              <h4 className="text-sm font-semibold text-text-primary">
                <Trans>Apply deadline exception</Trans>
              </h4>
              <p className="text-sm text-text-secondary">
                {selectionCount === 0 ? (
                  <Trans>Select eligible obligations before applying.</Trans>
                ) : (
                  <Plural
                    value={selectionCount}
                    one="# selected obligation will get the temporary due-date exception."
                    other="# selected obligations will get the temporary due-date exception."
                  />
                )}
              </p>
            </div>
            <Button size="sm" disabled={applyDisabled} onClick={onApply}>
              {selectionCount === 0 ? (
                <Trans>Select obligations</Trans>
              ) : (
                <Plural
                  value={selectionCount}
                  one="Apply to # obligation"
                  other="Apply to # obligations"
                />
              )}
            </Button>
          </div>
        </article>

        <article className="flex items-start gap-3 rounded-md border border-divider-subtle bg-background-default p-3">
          <span
            aria-hidden
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-state-base-hover text-text-secondary"
          >
            <MailIcon className="size-4" />
          </span>
          <div className="grid min-w-0 flex-1 gap-2">
            <div className="grid gap-0.5">
              <h4 className="text-sm font-semibold text-text-primary">
                <Trans>Prepare client draft</Trans>
              </h4>
              <p className="text-sm text-text-secondary">
                <Trans>Copy a reviewable client email draft with the official source link.</Trans>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={isMutating} onClick={onCopyDraft}>
                <MailIcon data-icon="inline-start" />
                <Trans>Copy draft</Trans>
              </Button>
              {canRequestReview ? (
                <Button variant="outline" size="sm" disabled={isMutating} onClick={onRequestReview}>
                  <MessageSquareIcon data-icon="inline-start" />
                  <Trans>Request review</Trans>
                </Button>
              ) : null}
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}

function DrawerActions({
  alertStatus,
  sourceStatus,
  selectionCount,
  canApply,
  canRequestReview,
  canApplyReviewed,
  reviewedSetReady,
  isMutating,
  onApply,
  onApplyReviewed,
  onDismiss,
  onSnooze,
  onRevert,
  onReactivate,
  onRequestReview,
  onCopyDraft,
}: {
  alertStatus: PulseFirmAlertStatus
  sourceStatus: PulseStatus
  selectionCount: number
  canApply: boolean
  canRequestReview: boolean
  canApplyReviewed: boolean
  reviewedSetReady: boolean
  isMutating: boolean
  onApply: () => void
  onApplyReviewed: () => void
  onDismiss: () => void
  onSnooze: () => void
  onRevert: () => void
  onReactivate: () => void
  onRequestReview: () => void
  onCopyDraft: () => void
}) {
  const showRevert = REVERTABLE_STATUSES.has(alertStatus)
  const showReactivate = alertStatus === 'reverted'
  const isDismissed = alertStatus === 'dismissed'
  const sourceRevoked = sourceStatus === 'source_revoked'
  const isClosed = alertStatus === 'reverted' || isDismissed || sourceRevoked
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="ghost" size="sm" disabled={isMutating} onClick={onCopyDraft}>
        <MailIcon data-icon="inline-start" />
        <Trans>Copy client email draft</Trans>
      </Button>
      {canRequestReview ? (
        <Button size="sm" disabled={isMutating} onClick={onRequestReview}>
          <MessageSquareIcon data-icon="inline-start" />
          <Trans>Request review</Trans>
        </Button>
      ) : null}
      {showRevert ? (
        <Button
          variant="outline"
          size="sm"
          disabled={!canApply || isMutating || sourceRevoked}
          onClick={onRevert}
        >
          <RotateCcwIcon data-icon="inline-start" />
          <Trans>Undo (24h)</Trans>
        </Button>
      ) : null}
      {showReactivate ? (
        <Button
          variant="outline"
          size="sm"
          disabled={!canApply || isMutating || sourceRevoked}
          onClick={onReactivate}
        >
          <RotateCcwIcon data-icon="inline-start" />
          <Trans>Reactivate / Re-apply</Trans>
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        disabled={!canApply || isMutating || isClosed}
        onClick={onDismiss}
      >
        <Trans>Dismiss</Trans>
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!canApply || isMutating || isClosed}
        onClick={onSnooze}
      >
        <Trans>Snooze 24h</Trans>
      </Button>
      <Button
        size="sm"
        variant={canRequestReview ? 'outline' : undefined}
        disabled={!canApply || isMutating || isClosed || selectionCount === 0}
        onClick={onApply}
        aria-busy={isMutating || undefined}
      >
        {selectionCount === 0 ? (
          <Trans>Select obligations to apply</Trans>
        ) : (
          <Plural
            value={selectionCount}
            one="Apply deadline exception to # obligation"
            other="Apply deadline exception to # obligations"
          />
        )}
      </Button>
      {canApplyReviewed ? (
        <Button
          size="sm"
          disabled={isMutating || isClosed || !reviewedSetReady}
          onClick={onApplyReviewed}
        >
          <Trans>Apply reviewed set</Trans>
        </Button>
      ) : null}
    </div>
  )
}

function ManagerReviewPanel({
  canManage,
  reviewStatus,
  selectedCount,
  excludedCount,
  needsReviewCount,
  isMutating,
  onConfirmAll,
  onSave,
}: {
  canManage: boolean
  reviewStatus: string | null
  selectedCount: number
  excludedCount: number
  needsReviewCount: number
  isMutating: boolean
  onConfirmAll: () => void
  onSave: () => void
}) {
  return (
    <section className="grid gap-3 rounded-md border border-divider-subtle bg-background-section p-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-md font-semibold text-text-primary">
            <Trans>Manager review</Trans>
          </h3>
          {reviewStatus ? (
            <Badge variant={reviewStatus === 'reviewed' ? 'success' : 'secondary'}>
              {reviewStatus === 'reviewed' ? <Trans>Reviewed</Trans> : <Trans>Open</Trans>}
            </Badge>
          ) : null}
        </div>
        <span className="font-mono text-xs tabular-nums text-text-tertiary">
          <Trans>
            {selectedCount} selected · {excludedCount} excluded
          </Trans>
        </span>
      </header>
      <p className="text-sm text-text-secondary">
        <Trans>
          Save the reviewed client set before applying when a Pulse has low confidence, review
          flags, or a preparer escalation.
        </Trans>
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canManage || isMutating || needsReviewCount === 0}
          onClick={onConfirmAll}
        >
          <Trans>Confirm all review-needed</Trans>
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canManage || isMutating || selectedCount === 0}
          onClick={onSave}
        >
          <Trans>Save manager review</Trans>
        </Button>
      </div>
    </section>
  )
}

function PulseReviewRequestDialog({
  open,
  note,
  pending,
  onOpenChange,
  onChangeNote,
  onSubmit,
}: {
  open: boolean
  note: string
  pending: boolean
  onOpenChange: (open: boolean) => void
  onChangeNote: (note: string) => void
  onSubmit: () => void
}) {
  const { t } = useLingui()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <DialogHeader>
            <DialogTitle>
              <Trans>Request Pulse review</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>
                Ask an owner or manager to review and apply this Pulse. This does not change any
                deadlines.
              </Trans>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="pulse-review-note">
              <Trans>Optional note</Trans>
            </Label>
            <Textarea
              id="pulse-review-note"
              value={note}
              maxLength={500}
              disabled={pending}
              placeholder={t`Add context for the reviewer`}
              onChange={(event) => onChangeNote(event.target.value)}
            />
            <p className="text-xs text-text-tertiary">
              <Trans>{note.length}/500 characters</Trans>
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Trans>Sending…</Trans> : <Trans>Send request</Trans>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function buildClientEmailDraft(detail: PulseDetail, selection: ReadonlySet<string>): string {
  const affectedClients = detail.affectedClients
    .filter((row) => selection.has(row.obligationId))
    .map((row) => `- ${row.clientName}: ${row.currentDueDate} -> ${row.newDueDate}`)
  return [
    `Subject: Deadline update: ${detail.alert.title}`,
    '',
    'Hi,',
    '',
    detail.alert.summary,
    '',
    `Original due date: ${detail.originalDueDate}`,
    `New due date: ${detail.newDueDate}`,
    '',
    'Affected client deadlines:',
    ...(affectedClients.length > 0
      ? affectedClients
      : ['- No client-specific deadline is selected yet.']),
    '',
    `Source: ${detail.alert.sourceUrl}`,
    '',
    'This is a draft. Please review before sending.',
  ].join('\n')
}

function SelectionSummary({ stats }: { stats: SelectionStats }) {
  return (
    <span className="text-sm text-text-tertiary">
      <Trans>
        {stats.selectedCount} selected · {stats.selectableCount} eligible · {stats.needsReviewCount}{' '}
        need review
      </Trans>
    </span>
  )
}

function ApplySafetyChecklist() {
  const items: Array<[string, React.ReactNode]> = [
    ['audit', <Trans key="audit">Logged to audit trail</Trans>],
    ['evidence', <Trans key="evidence">Pulse evidence linked to each obligation</Trans>],
    [
      'email',
      <Trans key="email">Owner and manager digest will be sent when email is available</Trans>,
    ],
    ['undo', <Trans key="undo">Undo available for 24 hours</Trans>],
  ]
  return (
    <ul className="grid gap-1 rounded-lg border border-dashed border-divider-regular bg-background-section p-3 text-sm text-text-secondary">
      {items.map(([key, node]) => (
        <li key={key} className="flex items-center gap-2">
          <span aria-hidden className="size-1.5 rounded-full bg-text-success" />
          {node}
        </li>
      ))}
    </ul>
  )
}

function DetailHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
    </div>
  )
}
