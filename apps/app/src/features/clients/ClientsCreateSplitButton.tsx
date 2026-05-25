import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { ChevronDownIcon, FileSearchIcon, PlusIcon } from 'lucide-react'

import type { ClientCreateInput } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'

import type { ClientEntityType } from './client-readiness'
import { CreateClientDialog } from './CreateClientDialog'

/**
 * Split-button cluster for the /clients page header. Replaces the
 * earlier pair `[Import clients] [+ Add client]` — two peer buttons
 * gave equal visual weight to an everyday-create action and an
 * onboarding-only import. The split button keeps create as the primary
 * action, demotes import into a chevron-dropdown alternative.
 *
 * Visual:  `[ + New client ][ ▾ ]`
 *
 * Pattern: the chevron menu lists ONLY non-default alternatives
 * (currently just "Import from CSV"). Clicking the main button is
 * always "create manually" — the most common path — without a 2-step
 * detour through the dropdown. Same convention as GitHub's "Merge"
 * button or Linear's "New issue" split.
 *
 * `Import history` (viewing past migration runs) stays as its own
 * ghost button in the header. It's a "view past" action, not part of
 * the create-or-import cluster.
 *
 * See `docs/Design/clients-list-and-detail-critique-2026-05-22.md`
 * L-1 for the rationale.
 */
export function ClientsCreateSplitButton({
  entityLabels,
  isPending,
  onCreate,
  onImport,
  canImport,
}: {
  entityLabels: Record<ClientEntityType, string>
  isPending: boolean
  onCreate: (input: ClientCreateInput, callbacks: { onSuccess: () => void }) => void
  onImport: () => void
  canImport: boolean
}) {
  const { t } = useLingui()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <div className="inline-flex items-stretch">
        <Button
          type="button"
          size="sm"
          className="rounded-r-none border-r border-r-state-accent-active-alt/30"
          onClick={() => setDialogOpen(true)}
        >
          <PlusIcon data-icon="inline-start" />
          <Trans>New client</Trans>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                size="sm"
                aria-label={t`More create options`}
                className="rounded-l-none px-2"
              >
                <ChevronDownIcon className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuItem onClick={onImport} disabled={!canImport}>
              <FileSearchIcon className="size-4" aria-hidden />
              <Trans>Import from CSV…</Trans>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CreateClientDialog
        entityLabels={entityLabels}
        isPending={isPending}
        onCreate={onCreate}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        hideTrigger
      />
    </>
  )
}
