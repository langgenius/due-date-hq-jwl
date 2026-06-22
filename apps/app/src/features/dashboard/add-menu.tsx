import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import { PlusIcon, UploadIcon, UserPlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import type { ClientCreateInput } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'

import { CreateClientDialog } from '@/features/clients/CreateClientDialog'
import { clientDetailPath } from '@/features/clients/client-url'
import type { ClientEntityType } from '@/features/clients/client-readiness'
import { useMigrationWizard } from '@/features/migration/WizardProvider'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { requiredRolesLabel } from '@/lib/required-roles-label'

/**
 * The /today header "+" — a menu, not a single action (Yuqi 2026-06-14:
 * "the add icon should hover to show add client or import data"). The icon
 * opens a dropdown offering the two ways a CPA grows their workspace:
 *
 *   • Add client   → the single-client CreateClientDialog (everyday path)
 *   • Import data   → the bulk migration wizard (onboarding / batch path)
 *
 * A click-dropdown rather than a hover-menu on purpose: hover-only menus
 * are unreachable by keyboard and touch. The trigger keeps the collapsed
 * primary-icon look from the earlier round; the choice now lives one click
 * in, with each item permission-gated independently.
 */

// Entity labels mirror routes/clients.tsx `useEntityLabels`. Inlined (not
// imported from the route) to avoid a feature→route dependency; the
// `Record<ClientEntityType, string>` type makes tsgo fail if the enum grows,
// so this can't silently drift.
function useEntityLabels(): Record<ClientEntityType, string> {
  const { t } = useLingui()
  return useMemo(
    () => ({
      llc: t`LLC`,
      s_corp: t`S corp`,
      partnership: t`Partnership`,
      c_corp: t`C corp`,
      sole_prop: t`Sole prop`,
      trust: t`Trust`,
      individual: t`Individual`,
      other: t`Other`,
    }),
    [t],
  )
}

export function DashboardAddMenu() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { openWizard } = useMigrationWizard()
  const permission = useFirmPermission()
  const canCreateClient = permission.can('client.write')
  const canRunMigration = permission.can('migration.run')
  const entityLabels = useEntityLabels()
  const [createOpen, setCreateOpen] = useState(false)

  const createMutation = useMutation(
    orpc.clients.create.mutationOptions({
      onSuccess: (client) => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        toast.success(t`Client created`, { description: client.name })
        void navigate(clientDetailPath(client))
      },
      onError: (err) => {
        toast.error(t`Couldn't create client`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="primary"
              size="icon-sm"
              className="shrink-0 rounded-full"
              aria-label={t`Add`}
            >
              <PlusIcon className="size-4 shrink-0" aria-hidden />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-[220px]">
          {/* h-auto + items-start: the items carry a two-line label/caption,
              which the default single-line row height would crush. Icons get
              mt-0.5 so they sit on the title baseline, not centered against
              both lines. */}
          <DropdownMenuItem
            disabled={!canCreateClient}
            onClick={() => {
              if (!canCreateClient) return
              setCreateOpen(true)
            }}
            className="h-auto items-start gap-2.5 py-2"
          >
            <UserPlusIcon className="mt-0.5 size-4" aria-hidden />
            <span className="flex min-w-0 flex-col gap-0.5">
              <Trans>Add client</Trans>
              <span className="text-caption text-text-tertiary">
                {canCreateClient ? (
                  <Trans>Create one client by hand</Trans>
                ) : (
                  <Trans>Requires {requiredRolesLabel('client.write')} access</Trans>
                )}
              </span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canRunMigration}
            onClick={() => {
              if (!canRunMigration) return
              openWizard()
            }}
            className="h-auto items-start gap-2.5 py-2"
          >
            <UploadIcon className="mt-0.5 size-4" aria-hidden />
            <span className="flex min-w-0 flex-col gap-0.5">
              <Trans>Import clients</Trans>
              <span className="text-caption text-text-tertiary">
                {canRunMigration ? (
                  <Trans>Bulk import from a file or another tool</Trans>
                ) : (
                  <Trans>Requires {requiredRolesLabel('migration.run')} access</Trans>
                )}
              </span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateClientDialog
        entityLabels={entityLabels}
        isPending={createMutation.isPending}
        onCreate={(input: ClientCreateInput, callbacks) => createMutation.mutate(input, callbacks)}
        open={createOpen}
        onOpenChange={setCreateOpen}
        hideTrigger
      />
    </>
  )
}
