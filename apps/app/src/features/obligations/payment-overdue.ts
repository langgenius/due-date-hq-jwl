import type { ObligationInstancePublic, ObligationStatus } from '@duedatehq/contracts'

/**
 * Payment-overdue helpers.
 *
 * 2026-05-27 (phi journey audit J1):
 *
 * An obligation row has two independent due signals:
 *   1. `status` lifecycle (pending → in_progress → review → done / completed)
 *   2. `paymentDueDate` (the authority-payment deadline)
 *
 * A row can be `status='done'` (Filed) but still have a `paymentDueDate`
 * in the past — "I e-filed the return on April 15, but the client never
 * sent the wire transfer." Before this audit, every surface treated
 * `status === 'done'` as terminal and suppressed lateness signals on
 * the row, which buried payment-overdue under 4+ clicks (queue → row →
 * drawer → Payment due tile).
 *
 * This module is the single source of truth for "is the row's PAYMENT
 * still outstanding past its date?" Call sites can use:
 *
 *   isPaymentOverdue(o, todayTs) → boolean
 *   isObligationAtRisk(o, todayTs) → boolean (status-stuck OR payment-overdue)
 *   paymentOverdueDays(o, todayTs) → number (positive = days past, null = no flag)
 *
 * Why a separate helper instead of folding into `TERMINAL_STATUSES`:
 *   The status `'done'` legitimately means "the filing work is done."
 *   The Filed pill / green-success tone / "Filed N days late" stat ARE
 *   correct UI signals. We don't want to repaint those as red active
 *   alarms. The payment-overdue signal is an ADDITIONAL urgency layer
 *   stacked on top of the status — surfaces should render the Filed
 *   pill AND a separate "Payment overdue N days" chip when both apply.
 */

// Statuses where the obligation as a whole is closed (no more
// follow-up payment expected). 2026-05-27 (phi): mirrors the
// ClientSummaryStrip TERMINAL_STATUSES set but deliberately drops
// 'done' and 'paid'. 'done' is "filing work done" (payment may
// still be outstanding); 'completed' is the only status that means
// "every leg of this obligation is closed."
const PAYMENT_TERMINAL_STATUSES: ReadonlySet<ObligationStatus> = new Set([
  'completed',
  'not_applicable',
])

function paymentOverdueDays(
  obligation: Pick<ObligationInstancePublic, 'status' | 'paymentDueDate'>,
  today: number,
): number | null {
  if (PAYMENT_TERMINAL_STATUSES.has(obligation.status)) return null
  if (!obligation.paymentDueDate) return null
  const dueTs = Date.parse(obligation.paymentDueDate)
  if (Number.isNaN(dueTs) || dueTs >= today) return null
  const days = Math.ceil((today - dueTs) / 86_400_000)
  return days > 0 ? days : null
}

function isPaymentOverdue(
  obligation: Pick<ObligationInstancePublic, 'status' | 'paymentDueDate'>,
  today: number,
): boolean {
  return paymentOverdueDays(obligation, today) !== null
}

export { isPaymentOverdue, paymentOverdueDays }
