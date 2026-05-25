import { useMemo, useState } from 'react'
import { ChevronDownIcon, ListFilterIcon } from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { Input } from '@duedatehq/ui/components/ui/input'

export interface TableFilterOption {
  value: string
  label: string
  count?: number
}

interface TableHeaderMultiFilterProps {
  // 'toolbar' = wide button with label inline (above-the-table strips)
  // 'header'  = compact uppercase header trigger (legacy column header)
  // 'icon'    = funnel icon button only (2026-05-23: pairs with a
  //             separate sort-arrow control so filter and sort are
  //             visually distinct click targets on the same header cell)
  trigger?: 'toolbar' | 'header' | 'icon'
  label: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  options: readonly TableFilterOption[]
  selected: readonly string[]
  disabled?: boolean
  emptyLabel: string
  searchable?: boolean
  searchPlaceholder?: string
  maxSelections?: number
  onSelectedChange: (selected: string[]) => void
}

const DEFAULT_MAX_SELECTIONS = 16

function TableHeaderMultiFilter({
  trigger = 'toolbar',
  label,
  open: controlledOpen,
  onOpenChange,
  options,
  selected,
  disabled,
  emptyLabel,
  searchable,
  searchPlaceholder,
  maxSelections = DEFAULT_MAX_SELECTIONS,
  onSelectedChange,
}: TableHeaderMultiFilterProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [optionSearch, setOptionSearch] = useState('')
  const open = controlledOpen ?? uncontrolledOpen
  const selectedSet = new Set(selected)
  const selectedCount = selected.length
  const atSelectionLimit = selectedCount >= maxSelections
  const visibleOptions = useMemo(() => {
    const needle = optionSearch.trim().toLowerCase()
    if (!needle) return options
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) || option.value.toLowerCase().includes(needle),
    )
  }, [optionSearch, options])
  const triggerNode =
    trigger === 'header' ? (
      tableHeaderFilterTrigger({ label, activeCount: selectedCount, disabled: disabled ?? false })
    ) : trigger === 'icon' ? (
      tableHeaderFilterIconTrigger({
        label,
        activeCount: selectedCount,
        disabled: disabled ?? false,
      })
    ) : (
      <Button
        variant={selectedCount > 0 ? 'accent' : 'outline'}
        size="sm"
        disabled={disabled}
        className="max-w-52 justify-start"
      >
        <span className="truncate">{label}</span>
        {selectedCount > 0 ? (
          <Badge variant="outline" className="h-4 px-1.5 font-mono tabular-nums">
            {selectedCount}
          </Badge>
        ) : null}
        <ChevronDownIcon data-icon="inline-end" />
      </Button>
    )

  function handleOpenChange(nextOpen: boolean) {
    setOptionSearch('')
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger render={triggerNode} />
      <DropdownMenuContent className="max-h-80 w-64 overflow-y-auto" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {searchable ? (
          <>
            <div className="p-2">
              <Input
                aria-label={searchPlaceholder ?? label}
                className="h-8"
                placeholder={searchPlaceholder ?? label}
                value={optionSearch}
                onChange={(event) => setOptionSearch(event.target.value)}
                // 2026-05-24 (interaction audit): let Escape bubble so
                // the parent dropdown closes on Esc instead of trapping
                // the user inside the search box. Letter-key typing is
                // still swallowed so global J/K-style shortcuts don't
                // fire while filtering.
                onKeyDown={(event) => {
                  if (event.key === 'Escape') return
                  event.stopPropagation()
                }}
              />
            </div>
            <DropdownMenuSeparator />
          </>
        ) : null}
        {visibleOptions.length === 0 ? (
          <DropdownMenuItem disabled>{emptyLabel}</DropdownMenuItem>
        ) : (
          visibleOptions.map((option) => {
            const checked = selectedSet.has(option.value)
            return (
              <DropdownMenuCheckboxItem
                key={`${option.value}:${option.label}`}
                checked={checked}
                disabled={!checked && atSelectionLimit}
                closeOnClick={false}
                className="gap-2"
                onCheckedChange={(nextChecked) => {
                  const nextSelected = nextChecked
                    ? [...selected, option.value].slice(0, maxSelections)
                    : selected.filter((value) => value !== option.value)
                  onSelectedChange(nextSelected)
                }}
              >
                <span className="truncate">{option.label}</span>
                {option.count !== undefined ? (
                  <span className="ml-auto pr-2 font-mono text-xs tabular-nums text-text-tertiary">
                    {option.count}
                  </span>
                ) : null}
              </DropdownMenuCheckboxItem>
            )
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function tableHeaderFilterTrigger({
  label,
  activeCount,
  disabled,
}: {
  label: string
  activeCount: number
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      data-active={activeCount > 0 ? true : undefined}
      className="-mx-2 inline-flex h-7 max-w-40 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium tracking-wider whitespace-nowrap text-text-tertiary uppercase outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:pointer-events-none disabled:opacity-50 data-[active=true]:text-text-accent"
    >
      <span className="truncate">{label}</span>
      {activeCount > 0 ? (
        <Badge variant="outline" className="h-4 px-1.5 font-mono text-caption-xs tabular-nums">
          {activeCount}
        </Badge>
      ) : null}
      <ChevronDownIcon className="size-3 shrink-0" aria-hidden />
    </button>
  )
}

/**
 * 2026-05-23: icon-only filter trigger. Used on table column headers
 * where the LABEL is its own click target for sort, and the FUNNEL
 * icon is the separate click target for filter. Keeps the two
 * concerns distinct visually so a user clicking the column name
 * never accidentally opens the filter dropdown (or vice versa).
 * Active-count dot appears on the icon when filter has selections,
 * matching the dot-as-state pattern used on other badges.
 */
function tableHeaderFilterIconTrigger({
  label,
  activeCount,
  disabled,
}: {
  label: string
  activeCount: number
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Filter by ${label}`}
      title={`Filter by ${label}`}
      data-active={activeCount > 0 ? true : undefined}
      className="relative inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-text-tertiary outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:pointer-events-none disabled:opacity-50 data-[active=true]:text-text-accent"
    >
      <ListFilterIcon className="size-3.5" aria-hidden />
      {activeCount > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 inline-flex size-3 items-center justify-center rounded-full bg-state-accent-active-alt text-[8px] font-medium leading-none text-text-accent-inverse">
          {activeCount}
        </span>
      ) : null}
    </button>
  )
}

export { TableHeaderMultiFilter, tableHeaderFilterTrigger, tableHeaderFilterIconTrigger }
