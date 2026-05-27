// 2026-05-27 (D12 — Agent ω, journey-audit drain): canonical
// payment-overdue helper used by the dashboard "Needs attention"
// surface and any future surface that wants to surface
// filed-but-payment-overdue rows.
//
// Why this exists: anti-pattern #1 in the product model — "extension
// does not extend payment." A row whose filing is done (status =
// 'done' / 'paid' / 'completed') can still be payment-overdue if its
// `paymentDueDate` is in the past. Today's dashboard top-rows treat
// `'done'` as terminal and drop those rows from "Needs attention",
// hiding genuinely-late payments. The helpers below give every
// surface one canonical predicate so the rule is consistent
// regardless of which component renders the chip.
//
// API kept dead-simple — the dashboard contract already emits ISO
// date strings, so this module takes strings, not Date objects, to
// match the row shape the render layer actually sees.

/**
 * Number of whole days the payment is overdue, measured from the
 * payment due date to the "as of" date. Returns 0 when the payment
 * isn't overdue (yet) or when no payment date exists.
 *
 * The math uses ceil so a payment due yesterday reads as "1 day late"
 * the moment the day rolls over — same direction the rest of the app
 * uses for late counters (see ClientSummaryStrip, ClientDetailDrawer).
 */
export function paymentOverdueDays(
  paymentDueDate: string | null | undefined,
  asOfDate: string | null,
): number {
  if (!paymentDueDate) return 0
  const dueMs = Date.parse(paymentDueDate)
  if (Number.isNaN(dueMs)) return 0
  const asOfMs = asOfDate ? Date.parse(asOfDate) : Date.now()
  if (Number.isNaN(asOfMs)) return 0
  const days = Math.ceil((asOfMs - dueMs) / 86_400_000)
  return days > 0 ? days : 0
}

/**
 * True when the row has a payment side AND that side's due date is in
 * the past relative to `asOfDate`. Independent of filing status — a
 * filed row whose payment hasn't cleared still counts as
 * payment-overdue.
 */
export function isPaymentOverdue(
  paymentDueDate: string | null | undefined,
  asOfDate: string | null,
): boolean {
  return paymentOverdueDays(paymentDueDate, asOfDate) > 0
}
