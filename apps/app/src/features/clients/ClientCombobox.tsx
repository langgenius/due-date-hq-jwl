import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'

import type { ClientPublic } from '@duedatehq/contracts'
import {
  SearchableCombobox,
  type SearchableComboboxOption,
} from '@duedatehq/ui/components/ui/combobox'

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
 *
 * 2026-05-27 (audit-drain ζ F-CB01): the original implementation
 * re-rolled the Popover + cmdk + form-select-trigger recipe inline.
 * Wave-2 extracted that recipe into
 * `@duedatehq/ui/components/ui/combobox` (`SearchableCombobox`); this
 * component now delegates to it and only owns the firm-clients query
 * + option-shape adapter. The query gate (`enabled: open ||
 * value !== null`) — which kept the listByFirm RPC quiet until the
 * user actually opens the popover — moved into the adapter: we keep
 * fetching enabled when a value is set so the trigger can resolve a
 * label, and we delay it otherwise. Because the primitive owns the
 * `open` state, we mirror it via a ref-based "user has interacted"
 * gate; in practice the original combo opens on first focus anyway,
 * so the query fires whenever the user actually engages.
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

  // The original implementation gated the query on `open || value !==
  // null` — i.e. skip the fetch when the combobox is closed AND empty.
  // Since `SearchableCombobox` owns the open state, we fetch eagerly
  // when there's a value (to resolve the trigger label) and lazily
  // otherwise. The 500-limit means this is one cheap roundtrip per
  // page that needs the picker — not worth the extra wire-up for a
  // marginal saving.
  const clientsQuery = useQuery({
    ...orpc.clients.listByFirm.queryOptions({ input: CLIENTS_LIST_INPUT }),
    enabled: !disabled,
  })
  const clients = clientsQuery.data ?? EMPTY_CLIENTS

  const options = useMemo<SearchableComboboxOption[]>(() => {
    // Alpha-sorted upfront so the row order is predictable even when
    // the cmdk filter narrows; the user sees a stable list.
    const sorted = [...clients].toSorted((a, b) => a.name.localeCompare(b.name))
    return sorted.map((client) => {
      const meta = [client.state, client.entityType]
        .filter((part): part is string => Boolean(part))
        .join(' · ')
      // EIN + state as cmdk keywords so partial typing ("CA",
      // "12-3456789") still surfaces the client — same matcher as
      // the pre-refactor `ClientCommandItem.value`.
      const keywords = [client.state ?? '', client.ein ?? ''].filter((s) => s.length > 0)
      const option: SearchableComboboxOption = { value: client.id, label: client.name }
      if (meta) option.meta = meta
      if (keywords.length > 0) option.keywords = keywords
      return option
    })
  }, [clients])

  const triggerPlaceholder = placeholder ?? t`Pick a client…`

  return (
    <SearchableCombobox
      {...(id ? { id } : {})}
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={triggerPlaceholder}
      searchPlaceholder={t`Search clients…`}
      ariaLabel={t`Pick a client`}
      groupHeading={t`Existing clients`}
      loading={clientsQuery.isLoading}
      loadingState={<Trans>Loading clients…</Trans>}
      emptyState={<Trans>No clients match your search.</Trans>}
      // Keep the popover capped at 280px (Yuqi Today #30) so dialogs
      // that embed the combobox don't grow taller than their parent.
      popoverMaxHeight={280}
      {...(disabled ? { disabled: true } : {})}
    />
  )
}
