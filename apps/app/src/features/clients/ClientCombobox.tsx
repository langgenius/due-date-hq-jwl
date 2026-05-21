import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'

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
import { cn } from '@duedatehq/ui/lib/utils'

import { orpc } from '@/lib/rpc'

const CLIENTS_LIST_INPUT = { limit: 500 } as const
const EMPTY_CLIENTS: readonly ClientPublic[] = []

/**
 * Combobox for picking a client. Used by surfaces that need a "+ Add
 * obligation" entry — the Today / Dashboard header (no preselected
 * client) and the Client detail page (preselected + locked to current
 * client).
 *
 * The "create a new client" branch is intentionally NOT inside this
 * popover — opening a Dialog from a Popover causes focus and z-index
 * fights. Callers render the linked `CreateClientDialog` alongside the
 * combobox and pass the newly-created client's id back via `value`.
 */
export function ClientCombobox({
  id,
  value,
  onValueChange,
  disabled,
  placeholder,
}: {
  id?: string
  value: string | null
  onValueChange: (clientId: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)

  const clientsQuery = useQuery({
    ...orpc.clients.listByFirm.queryOptions({ input: CLIENTS_LIST_INPUT }),
    enabled: open || value !== null,
  })
  const clients = clientsQuery.data ?? EMPTY_CLIENTS

  const sortedClients = useMemo(
    () => [...clients].toSorted((a, b) => a.name.localeCompare(b.name)),
    [clients],
  )

  const selected = useMemo(
    () => (value ? (clients.find((client) => client.id === value) ?? null) : null),
    [clients, value],
  )
  const triggerLabel = selected?.name ?? placeholder ?? t`Pick a client…`

  function handleSelect(clientId: string) {
    onValueChange(clientId)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-transparent bg-components-input-bg-normal py-2 pr-2 pl-3 text-sm text-text-primary transition-colors outline-none hover:bg-components-input-bg-hover focus-visible:border-components-input-border-active focus-visible:bg-components-input-bg-active focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:bg-components-input-bg-disabled disabled:text-components-input-text-filled-disabled"
          >
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-left',
                selected ? 'text-text-primary' : 'text-text-tertiary',
              )}
            >
              {triggerLabel}
            </span>
            <ChevronDownIcon className="size-4 shrink-0 text-text-tertiary" aria-hidden />
          </button>
        }
      />
      <PopoverContent
        align="start"
        className="w-(--anchor-width) min-w-(--anchor-width) max-w-[calc(100vw-2rem)] overflow-hidden p-0"
      >
        <Command loop>
          <CommandInput autoFocus placeholder={t`Search clients…`} />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>
              {clientsQuery.isLoading ? (
                <Trans>Loading clients…</Trans>
              ) : (
                <Trans>No clients match your search.</Trans>
              )}
            </CommandEmpty>
            {sortedClients.length > 0 ? (
              <CommandGroup heading={t`Existing clients`}>
                {sortedClients.map((client) => (
                  <ClientCommandItem
                    key={client.id}
                    client={client}
                    selected={client.id === value}
                    onSelect={() => handleSelect(client.id)}
                  />
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function ClientCommandItem({
  client,
  selected,
  onSelect,
}: {
  client: ClientPublic
  selected: boolean
  onSelect: () => void
}) {
  // The CommandItem `value` includes the EIN + state so partial typing
  // ("CA", "12-3456789") still surfaces the client.
  const itemValue = [client.name, client.state ?? '', client.ein ?? ''].join(' ')
  return (
    <CommandItem value={itemValue} onSelect={onSelect} className="grid-cols-[minmax(0,1fr)_auto]">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-text-primary">{client.name}</span>
        <span className="block truncate text-xs text-text-tertiary">
          {[client.state, client.entityType]
            .filter((value): value is string => Boolean(value))
            .join(' · ')}
        </span>
      </span>
      <CheckIcon
        className={cn('size-4 text-text-accent', selected ? 'opacity-100' : 'opacity-0')}
        aria-hidden
      />
    </CommandItem>
  )
}
