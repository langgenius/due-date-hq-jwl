export const TAX_PERIOD_KINDS = ['calendar', 'fiscal', 'short', '52_53_week', 'unknown'] as const
export type TaxPeriodKind = (typeof TAX_PERIOD_KINDS)[number]

export const TAX_PERIOD_SOURCES = [
  'client_default',
  'prior_obligation',
  'migration',
  'manual_cpa_confirmed',
  'unknown',
] as const
export type TaxPeriodSource = (typeof TAX_PERIOD_SOURCES)[number]
export type TaxPeriodMissingClientFact = 'fiscalYearEnd'

export interface TaxPeriodResolution {
  taxPeriodStart: string | null
  taxPeriodEnd: string | null
  taxPeriodKind: TaxPeriodKind
  taxPeriodSource: TaxPeriodSource
  taxPeriodReviewReason: string | null
  missingClientFacts: readonly TaxPeriodMissingClientFact[]
}

export interface ClientTaxPeriodFacts {
  taxYearType?: 'calendar' | 'fiscal' | null
  fiscalYearEndMonth?: number | null
  fiscalYearEndDay?: number | null
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE_RE.test(value)) return null
  const parts = value.split('-').map(Number)
  const year = parts[0]
  const month = parts[1]
  const day = parts[2]
  if (!year || !month || !day) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return date
}

function formatIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function dateFromParts(year: number, month: number, day: number): Date | null {
  return parseIsoDate(`${year}-${pad2(month)}-${pad2(day)}`)
}

function addUtcDays(value: Date, days: number): Date {
  const out = new Date(value.getTime())
  out.setUTCDate(out.getUTCDate() + days)
  return out
}

function addUtcYears(value: Date, years: number): Date {
  const out = new Date(value.getTime())
  out.setUTCFullYear(out.getUTCFullYear() + years)
  return out
}

function isCalendarPeriod(start: string, end: string): boolean {
  return start.endsWith('-01-01') && end.endsWith('-12-31')
}

function inferPeriodKind(start: string, end: string): TaxPeriodKind {
  if (isCalendarPeriod(start, end)) return 'calendar'

  const startDate = parseIsoDate(start)
  const endDate = parseIsoDate(end)
  if (!startDate || !endDate || startDate > endDate) return 'unknown'

  const oneYearLater = addUtcYears(startDate, 1)
  oneYearLater.setUTCDate(oneYearLater.getUTCDate() - 1)
  return formatIsoDate(oneYearLater) === end ? 'fiscal' : 'short'
}

export function resolveTaxPeriodFromExplicitDates(input: {
  taxPeriodStart?: string | null
  taxPeriodEnd?: string | null
  source: TaxPeriodSource
  reviewReason?: string | null
}): TaxPeriodResolution {
  const startDate = input.taxPeriodStart ? parseIsoDate(input.taxPeriodStart) : null
  const endDate = input.taxPeriodEnd ? parseIsoDate(input.taxPeriodEnd) : null
  if (
    !input.taxPeriodStart ||
    !input.taxPeriodEnd ||
    !startDate ||
    !endDate ||
    startDate > endDate
  ) {
    return {
      taxPeriodStart: null,
      taxPeriodEnd: null,
      taxPeriodKind: 'unknown',
      taxPeriodSource: input.source,
      taxPeriodReviewReason: input.reviewReason ?? 'Tax period needs CPA confirmation.',
      missingClientFacts: [],
    }
  }

  return {
    taxPeriodStart: input.taxPeriodStart,
    taxPeriodEnd: input.taxPeriodEnd,
    taxPeriodKind: inferPeriodKind(input.taxPeriodStart, input.taxPeriodEnd),
    taxPeriodSource: input.source,
    taxPeriodReviewReason: input.reviewReason ?? null,
    missingClientFacts: [],
  }
}

export function resolveClientReturnTaxPeriod(input: {
  taxYear: number
  client?: ClientTaxPeriodFacts
  source?: TaxPeriodSource
}): TaxPeriodResolution {
  const source = input.source ?? 'client_default'
  const taxYearType = input.client?.taxYearType ?? 'calendar'

  if (taxYearType !== 'fiscal') {
    return {
      taxPeriodStart: `${input.taxYear}-01-01`,
      taxPeriodEnd: `${input.taxYear}-12-31`,
      taxPeriodKind: 'calendar',
      taxPeriodSource: source,
      taxPeriodReviewReason: null,
      missingClientFacts: [],
    }
  }

  const month = input.client?.fiscalYearEndMonth
  const day = input.client?.fiscalYearEndDay
  if (!month || !day) {
    return {
      taxPeriodStart: null,
      taxPeriodEnd: null,
      taxPeriodKind: 'fiscal',
      taxPeriodSource: source,
      taxPeriodReviewReason:
        'Fiscal-year client is missing a confirmed tax year end month and day.',
      missingClientFacts: ['fiscalYearEnd'],
    }
  }

  const endYear = month === 12 && day === 31 ? input.taxYear : input.taxYear + 1
  const endDate = dateFromParts(endYear, month, day)
  const previousEndDate = dateFromParts(endYear - 1, month, day)
  if (!endDate || !previousEndDate) {
    return {
      taxPeriodStart: null,
      taxPeriodEnd: null,
      taxPeriodKind: 'fiscal',
      taxPeriodSource: source,
      taxPeriodReviewReason: 'Fiscal-year client has an invalid tax year end date.',
      missingClientFacts: ['fiscalYearEnd'],
    }
  }

  const taxPeriodStart = formatIsoDate(addUtcDays(previousEndDate, 1))
  const taxPeriodEnd = formatIsoDate(endDate)
  const calendarEquivalent = isCalendarPeriod(taxPeriodStart, taxPeriodEnd)
  return {
    taxPeriodStart,
    taxPeriodEnd,
    taxPeriodKind: calendarEquivalent ? 'calendar' : 'fiscal',
    taxPeriodSource: source,
    taxPeriodReviewReason: null,
    missingClientFacts: [],
  }
}

export function rollTaxPeriodForward(input: {
  taxPeriodStart: string | null
  taxPeriodEnd: string | null
  years?: number
}): { taxPeriodStart: string; taxPeriodEnd: string; taxPeriodKind: TaxPeriodKind } | null {
  const start = input.taxPeriodStart ? parseIsoDate(input.taxPeriodStart) : null
  const end = input.taxPeriodEnd ? parseIsoDate(input.taxPeriodEnd) : null
  if (!start || !end || start > end) return null

  const years = input.years ?? 1
  const nextStart = formatIsoDate(addUtcYears(start, years))
  const nextEnd = formatIsoDate(addUtcYears(end, years))
  return {
    taxPeriodStart: nextStart,
    taxPeriodEnd: nextEnd,
    taxPeriodKind: inferPeriodKind(nextStart, nextEnd),
  }
}
