import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, EyeIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react'
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
import { useOptionalSidebar } from '@duedatehq/ui/components/ui/sidebar'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import { DestructiveChangePreview } from '@/components/patterns/destructive-change-preview'
import { EmptyState } from '@/components/patterns/empty-state'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { PermissionInlineNotice, useFirmPermission } from '@/features/permissions/permission-gate'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

import { useMigrationWizard } from './WizardProvider'

type ImportHistoryDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewClient: (clientId: string) => void
}

type PendingRecovery =
  | { kind: 'draft'; batchId: string }
  | { kind: 'batch'; batchId: string }
  | { kind: 'client'; batchId: string; client: ClientPublic }

// "May 18, 2026, 2:20 AM PDT" — the app's prose date vocabulary, not the
// audit-ledger "2026-05-18 02:20:00 PDT" machine shape. Time + zone stay
// because the undo window is hour-precise.
function formatMigrationDate(value: string | null, timeZone: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    numberingSystem: 'latn',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}

function useMigrationBatchStatusLabels(): Record<MigrationBatch['status'], string> {
  const { t } = useLingui()
  return {
    draft: t`Draft`,
    mapping: t`Mapping`,
    reviewing: t`In review`,
    applied: t`Applied`,
    reverted: t`Reverted`,
    failed: t`Failed`,
  }
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
  const batchStatusLabels = useMigrationBatchStatusLabels()
  const queryClient = useQueryClient()
  const permission = useFirmPermission()
  // 820-880px wide drawer — auto-collapse the sidebar while open, restore on
  // close. This drawer mounts in TWO contexts: the /clients route (inside
  // AppShell → SidebarProvider present) AND the migration wizard, which renders
  // ABOVE AppShell (MigrationWizardProvider wraps it), so NO sidebar is in scope
  // there. `useOptionalSidebar` returns null instead of throwing, so opening
  // "Import history" from inside the wizard no longer crashes — it just skips the
  // auto-collapse (the wizard already owns the full viewport).
  const sidebar = useOptionalSidebar()
  useEffect(() => {
    sidebar?.setAutoCollapsed(open)
    return () => {
      sidebar?.setAutoCollapsed(false)
    }
  }, [open, sidebar])
  const canRevertMigration = permission.can('migration.revert')
  const canRunMigration = permission.can('migration.run')
  const { openWizard } = useMigrationWizard()
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
        toast.success(t`Import undone`)
      },
      onError: (error) => {
        toast.error(t`Couldn't revert import`, {
          description:
            rpcErrorMessage(error) ??
            t`Try again in a moment. If it keeps failing, contact support.`,
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
            t`Try again in a moment. If it keeps failing, contact support.`,
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
            t`Try again in a moment. If it keeps failing, contact support.`,
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
        {/* Sheet `flush` variant owns the canonical sectioned-drawer recipe
            (gap-0 overflow-hidden p-0). Width overrides stay because this
            drawer's 820–880px size is route-specific, not a default. */}
        <SheetContent
          side="right"
          flush
          className="data-[side=right]:w-full data-[side=right]:max-w-[100vw] sm:data-[side=right]:w-[calc(100vw-2rem)] sm:data-[side=right]:max-w-[calc(100vw-2rem)] md:data-[side=right]:w-[min(820px,calc(100vw-2rem))] md:data-[side=right]:max-w-[min(820px,calc(100vw-2rem))] xl:data-[side=right]:w-[min(880px,calc(100vw-2rem))] xl:data-[side=right]:max-w-[min(880px,calc(100vw-2rem))]"
        >
          <SheetHeader className="border-b border-divider-subtle">
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
                    t`Try again in a moment. If it keeps failing, contact support.`}
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
              // EmptyState pattern at compact density (no section frame, since
              // this already lives inside the drawer body).
              <EmptyState
                density="compact"
                title={<Trans>No import batches yet</Trans>}
                description={
                  <Trans>New client imports will appear here when you need batch recovery.</Trans>
                }
              />
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
                  const isInProgress =
                    batch.status === 'draft' ||
                    batch.status === 'mapping' ||
                    batch.status === 'reviewing'
                  const canDiscardInProgress = canRunMigration && isInProgress
                  return (
                    <Card key={batch.id}>
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="grid min-w-0 gap-1">
                          {/* Batch UUID demoted to the title attribute — hover
                              (or the audit log) for forensics; the filename is
                              the name a CPA recognizes. */}
                          <CardTitle className="truncate text-base" title={batch.id}>
                            {batchLabel(batch)}
                          </CardTitle>
                        </div>
                        <Badge variant="outline">{batchStatusLabels[batch.status]}</Badge>
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
                            {/* Live "Undo expires in Xh Ym" that ticks once a
                                minute so the user can see the window shrinking
                                — a static timestamp would force the user to
                                mentally diff against "now". The Revert button
                                below already disables on expiry. */}
                            <RelativeUndoCountdown
                              revertExpiresAt={batch.revertExpiresAt}
                              status={batch.status}
                            />
                          </span>
                        </div>
                        <BatchClients
                          batchId={batch.id}
                          enabled={open && batch.status === 'applied'}
                          // Same window as the batch-level "Undo import"
                          // button: once revertExpiresAt passes, per-client
                          // Undo must disable too — both revert paths are
                          // gated by the same server-side expiry.
                          canUndo={canRevertMigration && isBatchRevertible(batch)}
                          successCount={batch.successCount}
                          recoveryPending={recoveryPending}
                          onViewClient={onViewClient}
                          onUndo={(client) =>
                            setPendingRecovery({ kind: 'client', batchId: batch.id, client })
                          }
                        />
                        <div className="flex justify-end gap-2">
                          {isInProgress ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  onOpenChange(false)
                                  openWizard({ resumeBatchId: batch.id })
                                }}
                                disabled={!canRunMigration || recoveryPending}
                              >
                                <ArrowRightIcon data-icon="inline-start" />
                                <Trans>Resume</Trans>
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  setPendingRecovery({
                                    kind: 'draft',
                                    batchId: batch.id,
                                  })
                                }
                                disabled={!canDiscardInProgress || recoveryPending}
                              >
                                <Trash2Icon data-icon="inline-start" />
                                <Trans>Discard</Trans>
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="secondary"
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
                              <Trans>Undo import</Trans>
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
            <AlertDialogCancel disabled={recoveryPending}>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              disabled={recoveryPending}
              onClick={handleConfirmRecovery}
            >
              {pendingRecovery?.kind === 'client' ? (
                <Trans>Undo client (1)</Trans>
              ) : pendingRecovery?.kind === 'draft' ? (
                <Trans>Discard draft</Trans>
              ) : (
                <Trans>Undo import ({pendingBatch?.successCount ?? 0})</Trans>
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
  // Window closed: explain why the (now-disabled) Undo can't fire, instead
  // of vanishing and leaving a greyed button with no stated reason.
  if (Number.isNaN(remainingMs) || remainingMs <= 0) {
    return (
      <span className="text-xs text-text-tertiary">
        <Trans>Revert window closed — undo no longer available</Trans>
      </span>
    )
  }

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
  successCount,
  recoveryPending,
  onViewClient,
  onUndo,
}: {
  batchId: string
  enabled: boolean
  canUndo: boolean
  successCount: number
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
  const shownClients = clients.slice(0, 8)
  // "Success: 10" above a 2-row list reads like a bug. When the import
  // created more clients than this list shows (long batches are truncated,
  // and some rows may no longer link back to the batch), say so.
  const unlistedCount = Math.max(clients.length, successCount) - shownClients.length
  // Card xs already sets py-3; CardContent supplies px-3. gap-2 stays for the
  // dense row rhythm (Card xs default gap is gap-2, applied via the card flex
  // column).
  return (
    <Card size="xs" tone="muted" radius="md">
      <CardContent className="grid gap-2">
        {shownClients.map((client) => (
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
        {unlistedCount > 0 ? (
          <p className="text-xs text-text-tertiary">
            <Plural
              value={unlistedCount}
              one="and # more client from this import"
              other="and # more clients from this import"
            />
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
