import { useMemo, useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'

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
  trigger?: 'toolbar' | 'header'
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
                onKeyDown={(event) => event.stopPropagation()}
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
      className="-mx-2 inline-flex h-7 max-w-40 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium tracking-[0.08em] whitespace-nowrap text-text-tertiary uppercase outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:pointer-events-none disabled:opacity-50 data-[active=true]:text-text-accent"
    >
      <span className="truncate">{label}</span>
      {activeCount > 0 ? (
        <Badge variant="outline" className="h-4 px-1.5 font-mono text-[10px] tabular-nums">
          {activeCount}
        </Badge>
      ) : null}
      <ChevronDownIcon className="size-3 shrink-0" aria-hidden />
    </button>
  )
}

export { TableHeaderMultiFilter, tableHeaderFilterTrigger }
