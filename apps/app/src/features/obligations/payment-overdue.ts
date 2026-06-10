// Canonical payment-overdue helpers. Two public signatures:
//
// - object-based (takes obligation + today timestamp). Filters by
//   PAYMENT_TERMINAL_STATUSES ('completed', 'not_applicable').
//   Used by client-side peek/drawer/strip.
// - string-based (takes paymentDueDate + asOfDate strings). Used by
//   the dashboard "Needs attention" RowMeta which only has the ISO
//   strings the contract emits.
//
// Internal `paymentOverdueDaysFromDates` does the date math once; the
// two public signatures wrap it.
//
// Anti-pattern #1 from the product model: extension/filing ≠ payment.
// A row whose filing is done (status='done'/'paid') can still be
// payment-overdue if its paymentDueDate is in the past. These helpers
// give every surface one canonical predicate so the rule is consistent.

import type { ObligationInstancePublic, ObligationStatus } from '@duedatehq/contracts'

// Statuses where the obligation as a whole is closed (no more
// follow-up payment expected). 'done' is "filing work done" (payment
// may still be outstanding); 'completed' is the only status that
// means "every leg of this obligation is closed."
const PAYMENT_TERMINAL_STATUSES: ReadonlySet<ObligationStatus> = new Set([
  'completed',
  'not_applicable',
])

function paymentOverdueDaysFromDates(
  paymentDueDate: string | null | undefined,
  asOfDate: string | null | number,
): number {
  if (!paymentDueDate) return 0
  const dueMs = Date.parse(paymentDueDate)
  if (Number.isNaN(dueMs)) return 0
  const asOfMs =
    typeof asOfDate === 'number' ? asOfDate : asOfDate ? Date.parse(asOfDate) : Date.now()
  if (Number.isNaN(asOfMs)) return 0
  const days = Math.ceil((asOfMs - dueMs) / 86_400_000)
  return days > 0 ? days : 0
}

/**
 * paymentOverdueDays — two overloads:
 *  - (obligation, today: number) → number | null  (φ style; null when not overdue)
 *  - (paymentDueDate: string|null, asOfDate: string|null) → number  (ω style; 0 when not overdue)
 */
export function paymentOverdueDays(
  obligation: Pick<ObligationInstancePublic, 'status' | 'paymentDueDate'>,
  today: number,
): number | null
export function paymentOverdueDays(
  paymentDueDate: string | null | undefined,
  asOfDate: string | null,
): number
export function paymentOverdueDays(
  arg1: Pick<ObligationInstancePublic, 'status' | 'paymentDueDate'> | string | null | undefined,
  arg2: number | string | null,
): number | null {
  if (typeof arg1 === 'object' && arg1 !== null && 'status' in arg1) {
    // φ style: object + numeric timestamp. Returns null when not overdue.
    if (PAYMENT_TERMINAL_STATUSES.has(arg1.status)) return null
    const days = paymentOverdueDaysFromDates(arg1.paymentDueDate, arg2)
    return days > 0 ? days : null
  }
  // ω style: strings. Returns 0 when not overdue.
  return paymentOverdueDaysFromDates(arg1, arg2)
}

/**
 * isPaymentOverdue — two overloads, mirroring paymentOverdueDays.
 */
export function isPaymentOverdue(
  obligation: Pick<ObligationInstancePublic, 'status' | 'paymentDueDate'>,
  today: number,
): boolean
export function isPaymentOverdue(
  paymentDueDate: string | null | undefined,
  asOfDate: string | null,
): boolean
export function isPaymentOverdue(
  arg1: Pick<ObligationInstancePublic, 'status' | 'paymentDueDate'> | string | null | undefined,
  arg2: number | string | null,
): boolean {
  if (typeof arg1 === 'object' && arg1 !== null && 'status' in arg1) {
    if (PAYMENT_TERMINAL_STATUSES.has(arg1.status)) return false
    return paymentOverdueDaysFromDates(arg1.paymentDueDate, arg2) > 0
  }
  return paymentOverdueDaysFromDates(arg1, arg2) > 0
}
