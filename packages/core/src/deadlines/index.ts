export const DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS = 14
export const MIN_INTERNAL_DEADLINE_OFFSET_DAYS = 0
export const MAX_INTERNAL_DEADLINE_OFFSET_DAYS = 365

function utcDateOnly(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

export function internalDeadlineFromBaseDueDate(baseDueDate: Date, offsetDays: number): Date {
  const date = utcDateOnly(baseDueDate)
  date.setUTCDate(date.getUTCDate() - offsetDays)
  return date
}

export interface StatutoryPenaltyDueDateInput {
  paymentDueDate?: Date | null
  filingDueDate?: Date | null
  baseDueDate?: Date | null
  currentDueDate: Date
}

export function statutoryPenaltyDueDate(input: StatutoryPenaltyDueDateInput): Date {
  return input.paymentDueDate ?? input.filingDueDate ?? input.baseDueDate ?? input.currentDueDate
}
