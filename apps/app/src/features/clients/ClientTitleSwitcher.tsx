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

import { clientDetailPath } from './client-url'

const CLIENTS_LIST_INPUT = { limit: 500 } as const
const EMPTY_CLIENTS: readonly ClientPublic[] = []

/**
 * Title-position client switcher for `/clients/[id]`. Renders the
 * client's name at H1 scale with a chevron-down button immediately
 * after it — tapping the chevron opens a searchable popover for
 * jumping to another client's detail page.
 *
 * The "back to /clients" action lives in a separate eyebrow link above
 * the title (see `ClientFactsWorkspace` where this is wired). Putting
 * the switcher next to the title is the cleaner mental model: title
 * answers "which client am I on?", chevron answers "switch to which
 * other client?". Earlier revision crammed both into a breadcrumb and
 * users mistook the whole eyebrow for a back link.
 */
export function ClientTitleSwitcher({ client }: { client: Pick<ClientPublic, 'id' | 'name'> }) {
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

  function goToClient(nextClient: Pick<ClientPublic, 'id' | 'name'>) {
    if (nextClient.id === client.id) {
      setOpen(false)
      return
    }
    setOpen(false)
    void navigate(clientDetailPath(nextClient))
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span>{client.name}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={t`Switch to another client`}
              className="inline-flex size-7 items-center justify-center rounded-md text-text-tertiary outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:bg-state-base-hover focus-visible:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <ChevronDownIcon className="size-5" aria-hidden />
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
              {sortedClients.length > 0 ? (
                <CommandGroup heading={t`Switch to client`}>
                  {sortedClients.map((entry) => (
                    <CommandItem
                      key={entry.id}
                      value={[entry.name, entry.state ?? '', entry.ein ?? ''].join(' ')}
                      onSelect={() => goToClient(entry)}
                      aria-current={entry.id === client.id ? 'page' : undefined}
                    >
                      {/* Force a flex row so `min-w-0` + `flex-1` propagate to
                          the name column — without this wrapper, CommandItem's
                          own intrinsic layout collapses the truncated name to
                          3-4 characters before the ellipsis kicks in. */}
                      <div className="flex w-full items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-text-primary">
                            {entry.name}
                          </span>
                          <span className="block truncate text-xs text-text-tertiary">
                            {[entry.state, entry.entityType]
                              .filter((value): value is string => Boolean(value))
                              .join(' · ')}
                          </span>
                        </div>
                        {entry.id === client.id ? (
                          <span className="shrink-0 text-caption-xs font-medium uppercase text-text-tertiary">
                            <Trans>Current</Trans>
                          </span>
                        ) : null}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </span>
  )
}
