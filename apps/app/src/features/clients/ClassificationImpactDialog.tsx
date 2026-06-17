import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon, MinusCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

import type { ClientPublic } from '@duedatehq/contracts'
import type {
  ClassificationRecomputeRow,
  ClientClassificationCandidate,
  ClientClassificationReason,
} from '@duedatehq/contracts/clients'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '@duedatehq/ui/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatTaxCode } from '@/lib/tax-codes'

import {
  currentTaxYearForDate,
  hasUnconfirmedCurrentTaxYearConfirmations,
} from './classification-impact-dialog-model'

// Maps the server's `workflowFlags` strings into localized, human-
// readable badge labels for the "Needs your confirmation" rows. The
// preview emits machine tokens (`efile_in_progress`, `in_review`, …)
// plus `status:<value>` for the underlying obligation status; anything
// unrecognized falls through to a humanized version of the raw token so
// a new server flag never renders as a blank chip.
function useWorkflowFlagLabel(): (flag: string) => string {
  const { t } = useLingui()
  return (flag: string): string => {
    if (flag.startsWith('status:')) {
      const value = flag.slice('status:'.length).replace(/_/g, ' ')
      return t`Status: ${value}`
    }
    switch (flag) {
      case 'efile_in_progress':
        return t`E-file in progress`
      case 'in_review':
        return t`In review`
      case 'extension_in_progress':
        return t`Extension in progress`
      case 'payment_in_progress':
        return t`Payment in progress`
      case 'prep_started':
        return t`Prep started`
      case 'extension_decided':
        return t`Extension decided`
      default:
        return flag.replace(/_/g, ' ')
    }
  }
}

function formatRowLine(row: ClassificationRecomputeRow): string {
  // taxType — formName — jurisdiction (skip empty segments so a
  // federal-only row without an explicit jurisdiction doesn't render a
  // dangling separator).
  return [formatTaxCode(row.taxType), row.formName, row.jurisdiction]
    .filter((part): part is string => Boolean(part && part.trim().length > 0))
    .join(' · ')
}

export function ClassificationImpactDialog({
  clientId,
  candidate,
  reason,
  effectiveFromTaxYear,
  client,
  open,
  onOpenChange,
  onApplied,
}: {
  clientId: string
  candidate: ClientClassificationCandidate
  reason: ClientClassificationReason
  // `| undefined` (not just `?:`) so callers may pass an explicit undefined
  // under exactOptionalPropertyTypes — the panel always passes the value,
  // which is undefined for corrections (recompute the whole horizon).
  effectiveFromTaxYear?: number | undefined
  client: ClientPublic
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplied: (result: { client: ClientPublic; addedCount: number; supersededCount: number }) => void
}) {
  const { t } = useLingui()
  const workflowFlagLabel = useWorkflowFlagLabel()
  // Confirmed deadline ids start empty every time the dialog opens — the
  // CPA must explicitly opt in before removing current-tax-year deadlines.
  // Reset is keyed off `open` via the Dialog remount of its children (the
  // dialog content unmounts on close), but we also clear on a fresh open
  // to be safe against any retained state.
  const [confirmedOrphanIds, setConfirmedOrphanIds] = useState<ReadonlySet<string>>(new Set())
  const previewQuery = useQuery({
    ...orpc.clients.previewClassificationRecompute.queryOptions({
      input: { clientId, candidate, effectiveFromTaxYear },
    }),
    enabled: open,
  })

  // The impact preview dialog is shown — fire once on each open transition.
  useEffect(() => {
    if (open) track(ANALYTICS_EVENTS.clientClassificationImpactPreviewed, {})
  }, [open])

  const rows = useMemo<ClassificationRecomputeRow[]>(
    () => previewQuery.data?.rows ?? [],
    [previewQuery.data],
  )
  const summary = previewQuery.data?.summary
  const existingDeadlineCount = previewQuery.data?.existingDeadlineCount ?? 0
  const orphanSafeRows = useMemo(
    () => rows.filter((row) => row.disposition === 'orphan_safe'),
    [rows],
  )
  const orphanConfirmRows = useMemo(
    () => rows.filter((row) => row.disposition === 'orphan_needs_confirmation'),
    [rows],
  )
  const currentTaxYear = currentTaxYearForDate()
  const applyRequiresCurrentYearConfirmation = hasUnconfirmedCurrentTaxYearConfirmations({
    rows: orphanConfirmRows,
    confirmedOrphanIds,
    currentTaxYear,
  })

  // This dialog serves BOTH reason kinds — a data-entry correction and a
  // genuine reclassification. The header/description are already neutral
  // ("entity type"); branch the action verbs too so a correction isn't
  // mislabeled as a reclassification in the toast / apply button.
  const isCorrection = reason.kind === 'correction'

  const applyMutation = useMutation(
    orpc.clients.applyClassificationRecompute.mutationOptions({
      onSuccess: (result) => {
        // Category enums only (entity type / tax classification) + counts —
        // no PII. The panel edits the entityType axis; fall back to the tax
        // classification axis when the candidate carries it instead.
        track(ANALYTICS_EVENTS.clientClassificationChanged, {
          from_class: candidate.taxClassification ? client.taxClassification : client.entityType,
          to_class: candidate.taxClassification ?? candidate.entityType,
          added_deadline_count: result.addedCount,
          removed_deadline_count: result.supersededCount,
        })
        toast.success(isCorrection ? t`Entity type updated` : t`Reclassified`, {
          description: t`${result.addedCount} added, ${result.supersededCount} removed`,
        })
        onApplied({
          client: result.client,
          addedCount: result.addedCount,
          supersededCount: result.supersededCount,
        })
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error(
          isCorrection ? t`Couldn't update entity type` : t`Couldn't apply reclassification`,
          {
            description:
              rpcErrorMessage(error) ??
              t`Try again in a moment. If it keeps failing, contact support.`,
          },
        )
      },
    }),
  )

  function toggleOrphan(obligationId: string) {
    setConfirmedOrphanIds((previous) => {
      const next = new Set(previous)
      if (next.has(obligationId)) {
        next.delete(obligationId)
      } else {
        next.add(obligationId)
      }
      return next
    })
  }

  function handleApply() {
    applyMutation.mutate({
      clientId,
      candidate,
      reason,
      effectiveFromTaxYear,
      confirmedOrphanObligationIds: Array.from(confirmedOrphanIds),
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          // Drop any opt-in selections so the next open starts from a
          // clean, deliberately-unchecked state.
          setConfirmedOrphanIds(new Set())
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="flex max-h-[calc(100vh-4rem)] w-[40rem] max-w-[calc(100vw-2rem)] flex-col">
        <DialogHeader>
          <DialogTitle>
            <Trans>Review classification impact</Trans>
          </DialogTitle>
          <DialogDescription>
            {/* Bridges the abstract "reclassification" to the concrete
                consequence the CPA cares about: what the new type files and
                which existing deadlines fall away. */}
            <Trans>Check what changes for {client.name} before applying.</Trans>
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {previewQuery.isLoading ? (
            <div className="grid gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : previewQuery.isError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>
                <Trans>Couldn't load the impact preview</Trans>
              </AlertTitle>
              <AlertDescription>
                {rpcErrorMessage(previewQuery.error) ??
                  t`Try again in a moment. If it keeps failing, contact support.`}{' '}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 align-baseline"
                  onClick={() => void previewQuery.refetch()}
                >
                  <Trans>Retry</Trans>
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {existingDeadlineCount > 0 ? (
                <p className="text-sm text-text-secondary">
                  <Plural
                    value={existingDeadlineCount}
                    one="This client has # existing deadline across the current and projected tax years."
                    other="This client has # existing deadlines across the current and projected tax years."
                  />
                </p>
              ) : null}

              {orphanConfirmRows.length > 0 ? (
                <ImpactSection
                  icon={<AlertCircleIcon className="size-4 text-text-warning" aria-hidden />}
                  title={<Trans>Needs your confirmation</Trans>}
                >
                  <p className="text-xs text-text-tertiary">
                    <Trans>
                      These current-year deadlines will be removed. Check each one before applying.
                    </Trans>
                  </p>
                  <ul className="grid gap-2">
                    {orphanConfirmRows.map((row) => {
                      const obligationId = row.obligationId
                      if (!obligationId) return null
                      const checked = confirmedOrphanIds.has(obligationId)
                      return (
                        <li
                          key={obligationId}
                          className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-1 rounded-lg border border-divider-regular bg-background-default p-3"
                        >
                          <Checkbox
                            id={`orphan-${obligationId}`}
                            checked={checked}
                            onCheckedChange={() => toggleOrphan(obligationId)}
                            className="mt-0.5"
                            aria-label={t`Remove ${formatRowLine(row)}`}
                          />
                          <div className="min-w-0">
                            <label
                              htmlFor={`orphan-${obligationId}`}
                              className="block cursor-pointer text-sm text-text-primary"
                            >
                              {formatRowLine(row)}
                              {row.taxYear ? (
                                <span className="ml-1.5 text-xs tabular-nums text-text-tertiary">
                                  {row.taxYear}
                                </span>
                              ) : null}
                            </label>
                            {row.workflowFlags.length > 0 ? (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {row.workflowFlags.map((flag) => (
                                  <Badge key={flag} variant="warning" className="text-xs">
                                    {workflowFlagLabel(flag)}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </ImpactSection>
              ) : null}

              <Alert variant="info">
                <AlertTitle>
                  <Trans>Deadlines aren't added automatically</Trans>
                </AlertTitle>
                <AlertDescription>
                  <Trans>
                    Changing the entity type won't create new deadlines. Add any that apply to this
                    client manually.
                  </Trans>
                </AlertDescription>
              </Alert>

              {orphanSafeRows.length > 0 ? (
                <Collapsible>
                  <div className="rounded-lg border border-divider-regular">
                    <CollapsibleTrigger
                      render={
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary outline-none transition-colors hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                        >
                          <MinusCircleIcon className="size-4 text-text-tertiary" aria-hidden />
                          <span className="font-medium text-text-primary">
                            <Trans>Will remove</Trans>
                          </span>
                          <Badge variant="secondary" size="sm" className="tabular-nums">
                            {orphanSafeRows.length}
                          </Badge>
                        </button>
                      }
                    />
                    <CollapsiblePanel>
                      <ul className="grid gap-1 px-3 pt-1 pb-3 text-sm text-text-secondary">
                        {orphanSafeRows.map((row) => (
                          <li
                            key={row.obligationId ?? `${row.taxType}:${row.taxYear ?? ''}`}
                            className="flex flex-wrap items-baseline justify-between gap-x-2"
                          >
                            <span>{formatRowLine(row)}</span>
                            {row.taxYear ? (
                              <span className="text-xs tabular-nums text-text-tertiary">
                                {row.taxYear}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </CollapsiblePanel>
                  </div>
                </Collapsible>
              ) : null}

              {summary && summary.unchangedCount > 0 ? (
                <p className="flex items-center gap-2 text-sm text-text-tertiary">
                  <CheckCircle2Icon className="size-4" aria-hidden />
                  <Plural
                    value={summary.unchangedCount}
                    one="# obligation unchanged"
                    other="# obligations unchanged"
                  />
                </p>
              ) : null}
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={
              applyMutation.isPending ||
              previewQuery.isLoading ||
              previewQuery.isError ||
              applyRequiresCurrentYearConfirmation
            }
            aria-busy={applyMutation.isPending || undefined}
          >
            {applyMutation.isPending ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
            ) : null}
            {applyMutation.isPending
              ? t`Applying…`
              : isCorrection
                ? t`Apply change`
                : t`Apply reclassification`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImpactSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: ReactNode
  children: ReactNode
}) {
  return (
    <section className="grid gap-2">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-medium text-text-primary">{title}</h3>
      </div>
      {children}
    </section>
  )
}
