import { useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { INTL_LOCALE } from '@duedatehq/i18n'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@duedatehq/ui/components/ui/popover'

import { currentLocale } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const CALENDAR_DAY_MS = 24 * 60 * 60 * 1000
const CALENDAR_GRID_DAY_COUNT = 42
const CALENDAR_WEEKDAY_COUNT = 7
const CALENDAR_WEEKDAY_ANCHOR_UTC = Date.UTC(2026, 0, 4)

interface IsoDatePickerProps {
  id?: string
  value: string
  invalid?: boolean
  disabled?: boolean
  className?: string
  displayValue?: string
  ariaLabel?: string
  maxIsoDate?: string
  placeholder?: string
  onValueChange: (value: string) => void
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0')
}

function isoDateFromUtcDate(date: Date): string {
  return `${date.getUTCFullYear()}-${padDatePart(date.getUTCMonth() + 1)}-${padDatePart(date.getUTCDate())}`
}

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false

  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

export function isIsoDateAfterMax(value: string, maxIsoDate?: string): boolean {
  return Boolean(
    maxIsoDate && isValidIsoDate(value) && isValidIsoDate(maxIsoDate) && value > maxIsoDate,
  )
}

function parseIsoDate(value: string): Date | null {
  if (!isValidIsoDate(value)) return null
  return new Date(
    Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10))),
  )
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
}

function visibleCalendarMonth(value: string): Date {
  return startOfUtcMonth(parseIsoDate(value) ?? new Date())
}

function buildCalendarDays(month: Date): Date[] {
  const monthStart = startOfUtcMonth(month)
  const gridStartTime = monthStart.getTime() - monthStart.getUTCDay() * CALENDAR_DAY_MS
  return Array.from(
    { length: CALENDAR_GRID_DAY_COUNT },
    (_, index) => new Date(gridStartTime + index * CALENDAR_DAY_MS),
  )
}

function appIntlLocale(): string {
  return INTL_LOCALE[currentLocale()]
}

export function IsoDatePicker({
  id,
  value,
  invalid = false,
  disabled = false,
  className,
  displayValue,
  ariaLabel,
  maxIsoDate,
  placeholder,
  onValueChange,
}: IsoDatePickerProps) {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => visibleCalendarMonth(value))
  const locale = appIntlLocale()
  const selectedDate = parseIsoDate(value)
  const selectedIsoDate = selectedDate ? isoDateFromUtcDate(selectedDate) : null
  const todayIsoDate = isoDateFromUtcDate(new Date())
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth])
  const monthLabelFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: 'long',
        numberingSystem: 'latn',
        timeZone: 'UTC',
        year: 'numeric',
      }),
    [locale],
  )
  const weekdayLabelFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        numberingSystem: 'latn',
        timeZone: 'UTC',
        weekday: 'short',
      }),
    [locale],
  )
  const dayLabelFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        numberingSystem: 'latn',
        timeZone: 'UTC',
      }),
    [locale],
  )
  const weekdays = useMemo(
    () =>
      Array.from({ length: CALENDAR_WEEKDAY_COUNT }, (_, index) =>
        weekdayLabelFormatter.format(
          new Date(CALENDAR_WEEKDAY_ANCHOR_UTC + index * CALENDAR_DAY_MS),
        ),
      ),
    [weekdayLabelFormatter],
  )

  function changeOpen(nextOpen: boolean) {
    if (disabled) return
    setOpen(nextOpen)
    if (nextOpen) setVisibleMonth(visibleCalendarMonth(value))
  }

  function selectDate(date: Date) {
    const isoDate = isoDateFromUtcDate(date)
    if (isIsoDateAfterMax(isoDate, maxIsoDate)) return
    onValueChange(isoDate)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            aria-label={ariaLabel ?? t`Select date`}
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            className={cn(
              'flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-divider-regular bg-components-input-bg-normal px-3 py-1 text-sm text-components-input-text-filled transition-colors outline-none',
              'hover:bg-components-input-bg-hover',
              'focus-visible:border-components-input-border-active focus-visible:bg-components-input-bg-active focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-2 focus-visible:ring-offset-background-default',
              'aria-invalid:border-components-input-border-destructive aria-invalid:bg-components-input-bg-destructive aria-invalid:ring-2 aria-invalid:ring-state-destructive-active aria-invalid:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-components-input-bg-normal',
              className,
            )}
          >
            <span
              className={cn(
                'min-w-0 truncate font-mono tabular-nums',
                value
                  ? 'text-components-input-text-filled'
                  : 'text-components-input-text-placeholder',
              )}
            >
              {displayValue || value || placeholder || t`Select date`}
            </span>
            <CalendarDaysIcon className="size-4 shrink-0 text-text-tertiary" aria-hidden />
          </button>
        }
      />
      <PopoverContent align="start" className="w-72 gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t`Previous month`}
            onClick={() => setVisibleMonth((current) => addUtcMonths(current, -1))}
          >
            <ChevronLeftIcon aria-hidden />
          </Button>
          <div className="text-sm font-medium text-text-primary">
            {monthLabelFormatter.format(visibleMonth)}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t`Next month`}
            onClick={() => setVisibleMonth((current) => addUtcMonths(current, 1))}
          >
            <ChevronRightIcon aria-hidden />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-caption-xs font-medium text-text-tertiary uppercase">
          {weekdays.map((weekday) => (
            <div key={weekday}>{weekday}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date) => {
            const isoDate = isoDateFromUtcDate(date)
            const selected = isoDate === selectedIsoDate
            const currentMonth = date.getUTCMonth() === visibleMonth.getUTCMonth()
            const dateDisabled = isIsoDateAfterMax(isoDate, maxIsoDate)
            return (
              <Button
                key={isoDate}
                type="button"
                variant={selected ? 'accent' : 'ghost'}
                size="xs"
                aria-pressed={selected}
                disabled={dateDisabled}
                className={cn(
                  'h-8 rounded-md px-0 font-mono text-xs tabular-nums',
                  !currentMonth && !selected ? 'text-text-muted' : undefined,
                  dateDisabled ? 'opacity-40' : undefined,
                  isoDate === todayIsoDate && !selected ? 'border-divider-regular' : undefined,
                )}
                onClick={() => selectDate(date)}
              >
                {dayLabelFormatter.format(date)}
              </Button>
            )
          })}
        </div>

        {value ? (
          <div className="border-t border-divider-subtle pt-3">
            <Button type="button" variant="ghost" size="xs" onClick={() => onValueChange('')}>
              <Trans>Clear</Trans>
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
