import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'

import { US_FIRM_TIMEZONE_OPTIONS, type USFirmTimezone } from '@duedatehq/contracts'
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

import { isUSFirmTimezone } from './timezone-model'

export { DEFAULT_US_FIRM_TIMEZONE, isUSFirmTimezone, resolveUSFirmTimezone } from './timezone-model'

const TIMEZONE_GROUPS = [
  'Eastern',
  'Central',
  'Mountain',
  'Pacific',
  'Alaska',
  'Hawaii-Aleutian',
  'Atlantic',
  'Chamorro',
  'Samoa',
  'Wake',
] as const

function timezoneOptionLabel(option: (typeof US_FIRM_TIMEZONE_OPTIONS)[number]): string {
  return `${option.region} (${option.value})`
}

function selectedTimezoneLabel(value: USFirmTimezone): string {
  const option = US_FIRM_TIMEZONE_OPTIONS.find((entry) => entry.value === value)
  return option ? timezoneOptionLabel(option) : value
}

export function FirmTimezoneSelect({
  id,
  value,
  onValueChange,
  disabled,
}: {
  id: string
  value: USFirmTimezone
  onValueChange: (value: USFirmTimezone) => void
  disabled?: boolean
}) {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)

  function selectTimezone(nextValue: string) {
    if (!isUSFirmTimezone(nextValue)) return
    onValueChange(nextValue)
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
            <span className="min-w-0 flex-1 truncate text-left">
              {selectedTimezoneLabel(value)}
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
          <CommandInput autoFocus placeholder={t`Search timezone…`} />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>
              <Trans>No timezone found.</Trans>
            </CommandEmpty>
            {TIMEZONE_GROUPS.map((group) => {
              const options = US_FIRM_TIMEZONE_OPTIONS.filter((option) => option.group === group)
              if (options.length === 0) return null
              return (
                <CommandGroup key={group} heading={group}>
                  {options.map((option) => {
                    const label = timezoneOptionLabel(option)
                    const selected = option.value === value
                    return (
                      <CommandItem
                        key={option.value}
                        value={`${label} ${group}`}
                        onSelect={() => selectTimezone(option.value)}
                        className="grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-text-primary">
                            {option.region}
                          </span>
                          <span className="block truncate font-mono text-xs text-text-tertiary">
                            {option.value}
                          </span>
                        </span>
                        <CheckIcon
                          className={cn(
                            'size-4 text-text-accent',
                            selected ? 'opacity-100' : 'opacity-0',
                          )}
                          aria-hidden
                        />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
