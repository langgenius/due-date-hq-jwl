import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { EyeIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import type { ClientPublic, MigrationBatch } from '@duedatehq/contracts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@duedatehq/ui/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@duedatehq/ui/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'
import { useSidebar } from '@duedatehq/ui/components/ui/sidebar'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import { DestructiveChangePreview } from '@/components/patterns/destructive-change-preview'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { PermissionInlineNotice, useFirmPermission } from '@/features/permissions/permission-gate'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatDateTimeWithTimezone } from '@/lib/utils'

type ImportHistoryDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewClient: (clientId: string) => void
}

type PendingRecovery =
  | { kind: 'draft'; batchId: string }
  | { kind: 'batch'; batchId: string }
  | { kind: 'client'; batchId: string; client: ClientPublic }

function formatMigrationDate(value: string | null, timeZone: string): string {
  if (!value) return '—'
  return formatDateTimeWithTimezone(value, timeZone)
}

function batchLabel(batch: MigrationBatch): string {
  return batch.rawInputFileName ?? batch.presetUsed ?? batch.source
}

function isBatchRevertible(batch: MigrationBatch): boolean {
  return (
    batch.status === 'applied' &&
    !!batch.revertExpiresAt &&
    Date.parse(batch.revertExpiresAt) > Date.now()
  )
}

export function ImportHistoryDrawer({
  open,
  onOpenChange,
  onViewClient,
}: ImportHistoryDrawerProps) {
  const { t } = useLingui()
  const practiceTimezone = usePracticeTimezone()
  const queryClient = useQueryClient()
  const permission = useFirmPermission()
  // 2026-05-26 (Yuqi sidebar mental-model pass — consistency):
  // 820-880px wide drawer — auto-collapse the sidebar while open,
  // restore on close. Mounted inside /clients route which is inside
  // AppShell, so `useSidebar` is always available.
  const { setAutoCollapsed } = useSidebar()
  useEffect(() => {
    setAutoCollapsed(open)
    return () => {
      setAutoCollapsed(false)
    }
  }, [open, setAutoCollapsed])
  const canRevertMigration = permission.can('migration.revert')
  const canRunMigration = permission.can('migration.run')
  const [pendingRecovery, setPendingRecovery] = useState<PendingRecovery | null>(null)
  const batchesQuery = useQuery({
    ...orpc.migration.listBatches.queryOptions({ input: { limit: 50 } }),
    enabled: open,
  })

  const refreshAfterRecovery = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: orpc.migration.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
  }, [queryClient])

  const revert = useMutation(
    orpc.migration.revert.mutationOptions({
      onSuccess: () => {
        refreshAfterRecovery()
        setPendingRecovery(null)
        toast.success(t`Import reverted`)
      },
      onError: (error) => {
        toast.error(t`Couldn't revert import`, {
          description:
            rpcErrorMessage(error) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const singleUndo = useMutation(
    orpc.migration.singleUndo.mutationOptions({
      onSuccess: () => {
        refreshAfterRecovery()
        setPendingRecovery(null)
        toast.success(t`Client import undone`)
      },
      onError: (error) => {
        toast.error(t`Couldn't undo client`, {
          description:
            rpcErrorMessage(error) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const discardDraft = useMutation(
    orpc.migration.discardDraft.mutationOptions({
      onSuccess: () => {
        refreshAfterRecovery()
        setPendingRecovery(null)
        toast.success(t`Draft import discarded`)
      },
      onError: (error) => {
        toast.error(t`Couldn't discard draft import`, {
          description:
            rpcErrorMessage(error) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )

  const batches = batchesQuery.data?.batches ?? []
  const recoveryPending = revert.isPending || singleUndo.isPending || discardDraft.isPending
  const hasRevertibleBatch = batches.some(isBatchRevertible)
  const pendingBatch = pendingRecovery
    ? batches.find((batch) => batch.id === pendingRecovery.batchId)
    : null

  const handleConfirmRecovery = useCallback(() => {
    if (!pendingRecovery) return
    if (pendingRecovery.kind === 'draft') {
      discardDraft.mutate({ batchId: pendingRecovery.batchId })
      return
    }
    if (pendingRecovery.kind === 'batch') {
      revert.mutate({ batchId: pendingRecovery.batchId })
      return
    }
    singleUndo.mutate({
      batchId: pendingRecovery.batchId,
      clientId: pendingRecovery.client.id,
    })
  }, [discardDraft, pendingRecovery, revert, singleUndo])

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="data-[side=right]:w-full data-[side=right]:max-w-[100vw] gap-0 overflow-hidden p-0 sm:data-[side=right]:w-[calc(100vw-2rem)] sm:data-[side=right]:max-w-[calc(100vw-2rem)] md:data-[side=right]:w-[min(820px,calc(100vw-2rem))] md:data-[side=right]:max-w-[min(820px,calc(100vw-2rem))] xl:data-[side=right]:w-[min(880px,calc(100vw-2rem))] xl:data-[side=right]:max-w-[min(880px,calc(100vw-2rem))]"
        >
          <SheetHeader className="border-b border-divider-subtle px-5 py-4">
            <SheetTitle className="text-base">
              <Trans>Import history</Trans>
            </SheetTitle>
            <SheetDescription>
              <Trans>
                Recover mistaken batch imports. Edit individual client facts from Clients.
              </Trans>
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
            {batchesQuery.isError ? (
              <Alert variant="destructive">
                <AlertTitle>
                  <Trans>Couldn't load import history</Trans>
                </AlertTitle>
                <AlertDescription>
                  {rpcErrorMessage(batchesQuery.error) ??
                    t`Check your network and try again. If this keeps happening, contact support.`}
                </AlertDescription>
              </Alert>
            ) : null}

            {batchesQuery.isLoading ? (
              <div className="grid gap-3">
                {[0, 1, 2].map((item) => (
                  <Skeleton key={item} className="h-40 w-full" />
                ))}
              </div>
            ) : null}

            {!batchesQuery.isLoading && batches.length === 0 ? (
              <div className="grid min-h-[260px] place-items-center rounded-md border border-dashed border-divider-regular p-6 text-center">
                <div className="grid max-w-sm gap-2">
                  <p className="text-sm font-medium text-text-primary">
                    <Trans>No import batches yet</Trans>
                  </p>
                  <p className="text-sm text-text-tertiary">
                    <Trans>New client imports will appear here when you need batch recovery.</Trans>
                  </p>
                </div>
              </div>
            ) : null}

            {!batchesQuery.isLoading && batches.length > 0 ? (
              <div className="grid gap-4">
                {!canRevertMigration && hasRevertibleBatch ? (
                  // ρ ROH-D8: dropped the stale override copy ("Only
                  // owners and managers…") so the default
                  // PermissionInlineNotice body derives the required-role
                  // text from FIRM_PERMISSION_ROLES['migration.revert'].
                  // ψ ROH-D11's helper-driven override is therefore
                  // redundant here — the default already covers it.
                  <PermissionInlineNotice
                    permission="migration.revert"
                    currentRole={permission.firm?.role}
                  />
                ) : null}
                {batches.map((batch) => {
                  const canRevertBatch = canRevertMigration && isBatchRevertible(batch)
                  const canDiscardDraft = canRunMigration && batch.status === 'draft'
                  return (
                    <Card key={batch.id}>
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="grid min-w-0 gap-1">
                          <CardTitle className="truncate text-base">{batchLabel(batch)}</CardTitle>
                          <p className="truncate font-mono text-xs text-text-tertiary">
                            {batch.id}
                          </p>
                        </div>
                        <Badge variant="outline">{batch.status}</Badge>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        <div className="grid gap-2 text-sm text-text-secondary sm:grid-cols-4">
                          <span>
                            <Trans>Rows</Trans>: {batch.rowCount}
                          </span>
                          <span>
                            <Trans>Success</Trans>: {batch.successCount}
                          </span>
                          <span>
                            <Trans>Applied</Trans>:{' '}
                            {formatMigrationDate(batch.appliedAt, practiceTimezone)}
                          </span>
                          <span className="flex flex-col gap-0.5">
                            <span>
                              <Trans>Revert until</Trans>:{' '}
                              {formatMigrationDate(batch.revertExpiresAt, practiceTimezone)}
                            </span>
                            {/* 2026-05-27 (Step 7 onboarding audit
                                F6-21): static `Revert until: <timestamp>`
                                was the only undo cue on the drawer
                                — the user had to mentally diff the
                                timestamp against "now". Step 4's
                                pre-import promise says "can be
                                undone for 24 hours"; this is the
                                post-import realisation of that
                                promise. Added a live "Undo expires
                                in Xh Ym" that ticks once a minute
                                so the user can see the window
                                shrinking. The Revert button below
                                already disables on expiry. */}
                            <RelativeUndoCountdown
                              revertExpiresAt={batch.revertExpiresAt}
                              status={batch.status}
                            />
                          </span>
                        </div>
                        <BatchClients
                          batchId={batch.id}
                          enabled={open && batch.status === 'applied'}
                          canUndo={canRevertMigration && batch.status === 'applied'}
                          recoveryPending={recoveryPending}
                          onViewClient={onViewClient}
                          onUndo={(client) =>
                            setPendingRecovery({ kind: 'client', batchId: batch.id, client })
                          }
                        />
                        <div className="flex justify-end">
                          {batch.status === 'draft' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setPendingRecovery({
                                  kind: 'draft',
                                  batchId: batch.id,
                                })
                              }
                              disabled={!canDiscardDraft || recoveryPending}
                            >
                              <Trash2Icon data-icon="inline-start" />
                              <Trans>Discard draft</Trans>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setPendingRecovery({
                                  kind: 'batch',
                                  batchId: batch.id,
                                })
                              }
                              disabled={!canRevertBatch || recoveryPending}
                            >
                              <RotateCcwIcon data-icon="inline-start" />
                              <Trans>Revert batch</Trans>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={pendingRecovery !== null}
        onOpenChange={(next) => {
          if (!next && !recoveryPending) setPendingRecovery(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRecovery?.kind === 'client' ? (
                <Trans>Undo this imported client?</Trans>
              ) : pendingRecovery?.kind === 'draft' ? (
                <Trans>Discard this draft import?</Trans>
              ) : (
                <Trans>Revert this import batch?</Trans>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {pendingRecovery?.kind === 'client' ? (
                <Trans>
                  This removes the client and deadlines created by this import. Use Clients to edit
                  facts instead.
                </Trans>
              ) : pendingRecovery?.kind === 'draft' ? (
                <Trans>
                  This clears the unfinished draft so you can start a new import. No clients or
                  deadlines have been created yet.
                </Trans>
              ) : (
                <Trans>
                  This removes every client and deadline created by this import. Use Clients to edit
                  individual records instead.
                </Trans>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingRecovery ? (
            <DestructiveChangePreview
              title={
                pendingRecovery.kind === 'client' ? (
                  <Trans>Undoing this import will commit these changes</Trans>
                ) : pendingRecovery.kind === 'draft' ? (
                  <Trans>Discarding this draft will commit these changes</Trans>
                ) : (
                  <Trans>Reverting this batch will commit these changes</Trans>
                )
              }
              lines={[
                {
                  tone: 'remove',
                  label: <Trans>Removes</Trans>,
                  detail:
                    pendingRecovery.kind === 'client' ? (
                      <Trans>{pendingRecovery.client.name} and its imported deadlines</Trans>
                    ) : pendingRecovery.kind === 'draft' ? (
                      <Trans>One unfinished draft import</Trans>
                    ) : (
                      <Trans>
                        {pendingBatch?.successCount ?? 0} imported clients and their generated
                        deadlines
                      </Trans>
                    ),
                },
                {
                  tone: 'add',
                  label: <Trans>Adds</Trans>,
                  detail:
                    pendingRecovery.kind === 'draft' ? (
                      <Trans>No production records</Trans>
                    ) : (
                      <Trans>No replacement client or deadline records</Trans>
                    ),
                },
                {
                  tone: 'keep',
                  label: <Trans>Keeps</Trans>,
                  detail: <Trans>Audit history retained for compliance</Trans>,
                },
              ]}
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel size="sm" disabled={recoveryPending}>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              size="sm"
              disabled={recoveryPending}
              onClick={handleConfirmRecovery}
            >
              {pendingRecovery?.kind === 'client' ? (
                <Trans>Undo client (1)</Trans>
              ) : pendingRecovery?.kind === 'draft' ? (
                <Trans>Discard draft</Trans>
              ) : (
                <Trans>Revert batch ({pendingBatch?.successCount ?? 0})</Trans>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * Live "Undo expires in Xh Ym" countdown.
 *
 * Renders nothing if the batch isn't in a revertible state, has no
 * expiry, or the window has already closed (the Revert button below
 * already handles those by being disabled). Ticks every 60s so the
 * value stays fresh without thrashing on a busy drawer.
 *
 * Step 7 onboarding audit F6-21.
 */
function RelativeUndoCountdown({
  revertExpiresAt,
  status,
}: {
  revertExpiresAt: string | null
  status: MigrationBatch['status']
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (status !== 'applied' || !revertExpiresAt) return undefined
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [revertExpiresAt, status])

  if (status !== 'applied' || !revertExpiresAt) return null
  const remainingMs = Date.parse(revertExpiresAt) - now
  if (Number.isNaN(remainingMs) || remainingMs <= 0) return null

  const remainingMinutesTotal = Math.floor(remainingMs / 60_000)
  const hours = Math.floor(remainingMinutesTotal / 60)
  const minutes = remainingMinutesTotal % 60

  return (
    <span className="text-xs text-text-tertiary tabular-nums">
      {hours > 0 ? (
        <Trans>
          Undo expires in {hours}h {minutes}m
        </Trans>
      ) : minutes > 0 ? (
        <Trans>Undo expires in {minutes}m</Trans>
      ) : (
        <Trans>Undo expires in &lt;1m</Trans>
      )}
    </span>
  )
}

function BatchClients({
  batchId,
  enabled,
  canUndo,
  recoveryPending,
  onViewClient,
  onUndo,
}: {
  batchId: string
  enabled: boolean
  canUndo: boolean
  recoveryPending: boolean
  onViewClient: (clientId: string) => void
  onUndo: (client: ClientPublic) => void
}) {
  const { t } = useLingui()
  const clientsQuery = useQuery({
    ...orpc.migration.listBatchClients.queryOptions({ input: { batchId } }),
    enabled,
  })
  const clients = clientsQuery.data?.clients ?? []
  if (clientsQuery.isLoading) return <Skeleton className="h-16 w-full" />
  if (clients.length === 0) return null
  return (
    <div className="grid gap-2 rounded-md border border-divider-subtle p-3">
      {clients.slice(0, 8).map((client) => (
        <div key={client.id} className="flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0 truncate">{client.name}</span>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label={t`View ${client.name}`}
              onClick={() => onViewClient(client.id)}
            >
              <EyeIcon data-icon="inline-start" />
              <Trans>View</Trans>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUndo(client)}
              disabled={!canUndo || recoveryPending}
            >
              <Trash2Icon data-icon="inline-start" />
              <Trans>Undo</Trans>
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
