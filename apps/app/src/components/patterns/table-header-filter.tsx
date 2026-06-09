import { useMemo, useState } from 'react'
import { ChevronDownIcon, ListFilterIcon, SearchIcon, XIcon } from 'lucide-react'
import { useLingui } from '@lingui/react/macro'

import { Badge } from '@duedatehq/ui/components/ui/badge'
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
import { cn } from '@duedatehq/ui/lib/utils'

import { FilterTrigger } from './filter-trigger'

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
  const { t } = useLingui()
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
      // 2026-05-26 (Yuqi macro→micro audit, Fix #5 / §3.1): toolbar
      // trigger now uses the canonical `FilterTrigger` primitive so
      // /clients filter dropdowns read identically to /deadlines and
      // /alerts (32px h-8, accent border+bg when active, divider
      // border+default bg at rest). Previously the toolbar variant
      // rendered a `Button variant="accent"|"outline"` with its own
      // ChevronDown — visually adjacent but inconsistent.
      <FilterTrigger active={selectedCount > 0} disabled={disabled} className="max-w-52">
        <span className="truncate">{label}</span>
        {selectedCount > 0 ? (
          <Badge
            variant="outline"
            className="h-4 border-state-accent-solid px-1.5 text-text-accent tabular-nums"
          >
            {selectedCount}
          </Badge>
        ) : null}
      </FilterTrigger>
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
              {/* 2026-05-27 (Yuqi step-8 data-finding audit — F-HF02
                  + F-X08): raw `<Input>` previously had no leading
                  search icon and no inline clear-X. The canonical
                  SearchInput primitive is the right adopt, but the
                  popover has different needs:
                   • Escape must bubble so the dropdown closes; the
                     primitive captures Escape to clear instead.
                   • No `/` hotkey wiring — the popover only exists
                     while open.
                  So we mirror the primitive's visual spec inline
                  (SearchIcon left, X clear right) without inheriting
                  the Escape-to-clear behaviour. h-8 matches the
                  popover's compact rhythm; the page-level h-9 stays
                  on the route-level SearchInput. */}
              <div className="relative">
                <SearchIcon
                  aria-hidden
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary"
                />
                <Input
                  aria-label={searchPlaceholder ?? label}
                  className={cn('h-8 pl-8', optionSearch.length > 0 ? 'pr-8' : 'pr-2')}
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
                {optionSearch.length > 0 ? (
                  <button
                    type="button"
                    aria-label={t`Clear search`}
                    onClick={() => setOptionSearch('')}
                    className="absolute right-1.5 top-1/2 inline-flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-text-tertiary hover:bg-state-base-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                  >
                    <XIcon className="size-3" aria-hidden />
                  </button>
                ) : null}
              </div>
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
                  <span className="ml-auto pr-2 text-xs tabular-nums text-text-tertiary">
                    {option.count}
                  </span>
                ) : null}
              </DropdownMenuCheckboxItem>
            )
          })
        )}
        {/* 2026-05-27 (Yuqi step-8 data-finding audit — F-HF01):
            surface the silent 16-selection cap. Previously the 17th
            checkbox just rendered `disabled` with no explanation;
            CPAs hitting the limit on a long facet list (>=16 clients
            / states selected) couldn't tell why the next box wouldn't
            tick. Inline footer note explains the cap and points at
            the path forward (refine the visible list with the
            popover search). */}
        {atSelectionLimit ? (
          <>
            <DropdownMenuSeparator />
            <p role="status" className="px-2 py-1.5 text-caption-xs text-text-tertiary">
              {t`Showing first ${maxSelections} selections — refine the list to add more.`}
            </p>
          </>
        ) : null}
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
      // 2026-05-26 (Yuqi /deadlines #5): dropped explicit
      // `text-xs font-medium tracking-wider uppercase text-text-tertiary`
      // — those should INHERIT from the parent <th>'s Table primitive
      // styles (which set `text-xs font-medium tracking-eyebrow
      // uppercase text-text-tertiary`). Setting them locally with
      // `tracking-wider` (=0.05em) made the Client column header
      // render at a slightly different letter-spacing than the
      // sibling SortableHeader columns. Now the trigger inherits,
      // every column header reads at the same typographic spec.
      className="-mx-2 inline-flex h-7 max-w-40 cursor-pointer items-center gap-1 rounded-md px-2 whitespace-nowrap outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:pointer-events-none disabled:opacity-50 data-[active=true]:text-text-accent"
    >
      <span className="truncate">{label}</span>
      {activeCount > 0 ? (
        <Badge variant="outline" className="h-4 px-1.5 text-caption-xs tabular-nums">
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
