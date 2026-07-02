import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArchiveIcon, ArchiveRestoreIcon, EyeIcon } from 'lucide-react'
import { toast } from 'sonner'

import type { ClientPublic } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'

import { EmptyState } from '@/components/patterns/empty-state'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

import type { ClientEntityType } from './client-readiness'

/**
 * Archived-clients drawer — the discoverable home for archived clients on
 * /clients. Deliberately a quiet side sheet (like Import history) rather
 * than a directory tab: archived clients are an occasional-recovery surface,
 * not a daily triage lane, so a tab would fight the page's portfolio design.
 *
 * Each row is real: archived date from `archivedAt`, Restore runs the
 * audited `clients.restore` mutation (role-gated to client.write), and View
 * opens the archived client's detail page (still reachable — the detail
 * route loads archived clients and shows the archived banner + Restore).
 *
 * Shared input constant with the route: the drawer owns its own
 * `archived: 'only'` list query so restoring here updates both this list
 * and the active directory via invalidation.
 */

export const ARCHIVED_CLIENTS_LIST_INPUT = { limit: 500, archived: 'only' } as const

// "May 18, 2026" — prose date, no time; archive recency is day-precise.
function formatArchivedDate(value: string | null | undefined, timeZone: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    numberingSystem: 'latn',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function ArchivedClientsDrawer({
  open,
  onOpenChange,
  onViewClient,
  entityLabels,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewClient: (client: ClientPublic) => void
  entityLabels: Record<ClientEntityType, string>
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const practiceTimezone = usePracticeTimezone()
  const permission = useFirmPermission()
  const canRestore = permission.can('client.write')

  const archivedQuery = useQuery({
    ...orpc.clients.listByFirm.queryOptions({ input: ARCHIVED_CLIENTS_LIST_INPUT }),
    enabled: open,
  })
  const archivedClients = archivedQuery.data ?? []

  const restoreMutation = useMutation(
    orpc.clients.restore.mutationOptions({
      onSuccess: (result) => {
        track(ANALYTICS_EVENTS.clientRestored, {})
        // Restore touches the same surfaces archive did: both listByFirm
        // variants (active + archived — .key() covers every input), the
        // usage meter, dashboard counts, and the deadline queue.
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.clients.get.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.clients.usage.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        toast.success(t`Client restored`, {
          description: t`${result.client.name} is back in the client list.`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't restore client`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Sheet `flush` variant — the canonical sectioned-drawer recipe. A
          520px reading width is enough for name + date + two actions. */}
      <SheetContent
        side="right"
        flush
        className="data-[side=right]:w-full data-[side=right]:max-w-[100vw] sm:data-[side=right]:w-[min(520px,calc(100vw-2rem))] sm:data-[side=right]:max-w-[min(520px,calc(100vw-2rem))]"
      >
        <SheetHeader className="border-b border-divider-subtle">
          <SheetTitle className="text-base">
            <Trans>Archived clients</Trans>
          </SheetTitle>
          <SheetDescription>
            <Trans>
              Hidden from active lists, deadlines, and reminders. Restore returns a client — and its
              deadlines — to every active surface.
            </Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          {archivedQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>
                <Trans>Couldn't load archived clients</Trans>
              </AlertTitle>
              <AlertDescription>
                {rpcErrorMessage(archivedQuery.error) ??
                  t`Try again in a moment. If it keeps failing, contact support.`}
              </AlertDescription>
            </Alert>
          ) : null}

          {archivedQuery.isLoading ? (
            <div className="grid gap-2">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} className="h-14 w-full" />
              ))}
            </div>
          ) : null}

          {!archivedQuery.isLoading && !archivedQuery.isError && archivedClients.length === 0 ? (
            <EmptyState
              density="compact"
              icon={ArchiveIcon}
              title={<Trans>No archived clients</Trans>}
              description={
                <Trans>
                  Archive a client from its detail page (the ⋯ menu) to park it here without
                  deleting anything.
                </Trans>
              }
            />
          ) : null}

          {archivedClients.length > 0 ? (
            <ul className="grid gap-1">
              {archivedClients.map((client) => (
                <li
                  key={client.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-background-subtle"
                >
                  <div className="grid min-w-0 gap-0.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">{client.name}</span>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {entityLabels[client.entityType]}
                      </Badge>
                    </span>
                    <span className="text-xs text-text-tertiary">
                      <Trans>
                        Archived {formatArchivedDate(client.archivedAt, practiceTimezone)}
                      </Trans>
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t`View ${client.name}`}
                      onClick={() => onViewClient(client)}
                    >
                      <EyeIcon data-icon="inline-start" />
                      <Trans>View</Trans>
                    </Button>
                    {canRestore ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={t`Restore ${client.name}`}
                        disabled={restoreMutation.isPending}
                        onClick={() => restoreMutation.mutate({ id: client.id })}
                      >
                        <ArchiveRestoreIcon data-icon="inline-start" />
                        <Trans>Restore</Trans>
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {archivedClients.length > 0 ? (
            <p className="mt-3 text-xs text-text-tertiary">
              <Plural
                value={archivedClients.length}
                one="# archived client"
                other="# archived clients"
              />
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
