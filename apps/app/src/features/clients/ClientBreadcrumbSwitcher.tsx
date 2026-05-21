import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ChevronDownIcon } from 'lucide-react'

import type { ClientPublic } from '@duedatehq/contracts'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@duedatehq/ui/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@duedatehq/ui/components/ui/popover'

import { orpc } from '@/lib/rpc'

const CLIENTS_LIST_INPUT = { limit: 500 } as const
const EMPTY_CLIENTS: readonly ClientPublic[] = []

/**
 * Breadcrumb-position client switcher for `/clients/[id]`. Replaces the
 * static "Clients" parent crumb with a searchable popover so a CPA can
 * jump from one client's detail page to another without bouncing through
 * the list.
 *
 * Triggered via the `render` prop on the parent BreadcrumbItem (the crumb
 * still labels "Clients" + a chevron-down so it reads as both
 * "go to list" affordance and "switch client" trigger).
 *
 * Selecting a client calls `navigate()` to the destination detail page.
 * The "Back to client list" item lets the user fall through to `/clients`
 * itself when they actually want the list view rather than a switch.
 */
export function ClientBreadcrumbSwitcher({ currentClientId }: { currentClientId: string }) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const clientsQuery = useQuery({
    ...orpc.clients.listByFirm.queryOptions({ input: CLIENTS_LIST_INPUT }),
    enabled: open,
  })
  const clients = clientsQuery.data ?? EMPTY_CLIENTS

  const sortedClients = useMemo(
    () => [...clients].toSorted((a, b) => a.name.localeCompare(b.name)),
    [clients],
  )

  function goToClient(clientId: string) {
    if (clientId === currentClientId) {
      setOpen(false)
      return
    }
    setOpen(false)
    void navigate(`/clients/${clientId}`)
  }

  function goToList() {
    setOpen(false)
    void navigate('/clients')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={t`Switch client or go back to the client list`}
            className="inline-flex items-center gap-0.5 rounded-sm text-[11px] font-medium tracking-[0.08em] text-text-tertiary uppercase outline-none transition-colors hover:text-text-primary focus-visible:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Trans>Clients</Trans>
            <ChevronDownIcon className="size-3" aria-hidden />
          </button>
        }
      />
      <PopoverContent
        align="start"
        className="w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
      >
        <Command loop>
          <CommandInput autoFocus placeholder={t`Search clients…`} />
          <CommandList className="max-h-[360px]">
            <CommandEmpty>
              {clientsQuery.isLoading ? (
                <Trans>Loading clients…</Trans>
              ) : (
                <Trans>No clients match your search.</Trans>
              )}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem value="__all-clients__" onSelect={goToList}>
                <span className="text-sm font-medium text-text-primary">
                  <Trans>Back to client list</Trans>
                </span>
              </CommandItem>
            </CommandGroup>
            {sortedClients.length > 0 ? (
              <CommandGroup heading={t`Switch to client`}>
                {sortedClients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={[client.name, client.state ?? '', client.ein ?? ''].join(' ')}
                    onSelect={() => goToClient(client.id)}
                    aria-current={client.id === currentClientId ? 'page' : undefined}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text-primary">
                        {client.name}
                      </span>
                      <span className="block truncate text-xs text-text-tertiary">
                        {[client.state, client.entityType]
                          .filter((value): value is string => Boolean(value))
                          .join(' · ')}
                      </span>
                    </span>
                    {client.id === currentClientId ? (
                      <span className="text-[10px] font-medium uppercase text-text-tertiary">
                        <Trans>Current</Trans>
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
