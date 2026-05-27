import { useMemo } from 'react'

import type { ObligationInstancePublic } from '@duedatehq/contracts'

import { useFirmAsOfDate } from '@/features/firm/use-firm-as-of-date'
import { isPaymentOverdue } from '@/features/obligations/payment-overdue'

/**
 * Terminal states per the 6-state lifecycle v2.
 *
 * - `done` is "Filed" — filing event shipped but payment may still be
 *   outstanding, so it is NOT terminal at the obligation level.
 * - Only `completed` / `not_applicable` are obligation-wide terminal.
 * - Legacy `paid` stays in the set because it means filing + payment
 *   both done.
 *
 * The three client peek surfaces — `/clients/[id]` summary strip, the
 * `ClientDetailDrawer`, and `ClientPeekHoverCard` — each used to ship
 * their own copy of this set. Audit (Q5) called out the drift risk
 * after the `'done'` re-classification was once propagated by hand.
 * Single export here so the next status taxonomy change touches one
 * place.
 */
export const CLIENT_TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'paid',
  'completed',
  'not_applicable',
])

export interface ClientNextDueResult {
  /** Earliest non-terminal obligation by `currentDueDate`, or null. */
  nextDue: ObligationInstancePublic | null
  /** Count of non-terminal obligations. */
  openCount: number
  /** Count of obligations whose payment is past due (additive signal). */
  paymentOverdueCount: number
}

/**
 * `useClientNextDue` — single source of truth for the three peek
 * surfaces' next-due / open-count / payment-overdue math.
 *
 * Anchors day math to the firm's "as of" date (matches the dashboard);
 * falls back to real `Date.now()` when the firm clock is unavailable.
 *
 * Memoized on `obligations` + `asOfDate`.
 */
export function useClientNextDue(
  obligations: readonly ObligationInstancePublic[],
): ClientNextDueResult {
  const asOfDate = useFirmAsOfDate()
  return useMemo(() => {
    const asOfMs = (() => {
      if (!asOfDate) return Date.now()
      const parsed = Date.parse(asOfDate)
      return Number.isNaN(parsed) ? Date.now() : parsed
    })()
    const open = obligations.filter((o) => !CLIENT_TERMINAL_STATUSES.has(o.status))
    let nextDue: ObligationInstancePublic | null = null
    let bestTs = Infinity
    for (const o of open) {
      const ts = Date.parse(o.currentDueDate)
      if (!Number.isNaN(ts) && ts < bestTs) {
        bestTs = ts
        nextDue = o
      }
    }
    const paymentOverdueCount = obligations.filter((o) => isPaymentOverdue(o, asOfMs)).length
    return { nextDue, openCount: open.length, paymentOverdueCount }
  }, [obligations, asOfDate])
}
