import { Plural, Trans } from '@lingui/react/macro'

import type { ObligationStatus } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

import { isPaymentOverdue, paymentOverdueDays } from '@/features/obligations/payment-overdue'

// Canonical "how soon / how late" relative date label used by every
// dashboard row, obligations queue row, and client filing-plan row.
//
// Replaces the per-surface `RowMeta` / `NextDueRelativeLabel` forks
// that had drifted in font-weight, color tokens, plural strings, and
// payment-overdue precedence. One primitive, one truth.
//
// Pencil VmcdD spec:
//   • 14/normal text in the "INTERNAL DUE DATE" column → tone
//     `text-text-tertiary` for `Filed 76 days late` (a quality-stat
//     reading on terminal rows) and `text-text-destructive` for
//     pre-terminal lateness ("5d late").
//   • Payment-late chip rendered as a SEPARATE caption next to the
//     status pill (handled by the caller — this primitive only
//     emits the date countdown).
//
// Modes:
//   • `terminal=true` — "filed/paid Nd late/early". Tertiary tone.
//   • `terminal=false` — "in 3d / today / 5d late". Live tone:
//     destructive for past, secondary for future, accent for today.
//
// The caller computes `days = (dueDate - asOfDate)` and passes it in.
// This primitive owns the rendering — plural, tone, lingui macros.
function DueDateLabel({
  days,
  status,
  paymentDueDate,
  asOfDate,
  className,
}: {
  days: number
  status: ObligationStatus
  paymentDueDate: string | null
  asOfDate: string | null
  className?: string
}) {
  const paymentLate = isPaymentOverdue(paymentDueDate, asOfDate)
  const paymentLateDays = paymentOverdueDays(paymentDueDate, asOfDate)
  // Payment-overdue precedence: a filed-but-payment-overdue row's
  // "filing days late" reading is misleading — the urgent signal is
  // the unpaid payment. When both apply, render the payment chip.
  if (paymentLate) {
    return (
      // 2026-06-04 round 10 (Yuqi "internal due can be medium
      // weight"): all DueDateLabel render variants now share
      // `font-medium` weight. Body weight reads as content-tier
      // emphasis without competing with the row's primary
      // anchors (Action / Client).
      <span
        className={cn(
          'inline-flex shrink-0 items-baseline whitespace-nowrap text-sm font-medium tabular-nums text-text-destructive',
          className,
        )}
      >
        <Plural value={paymentLateDays} one="Payment # day late" other="Payment # days late" />
      </span>
    )
  }
  // Terminal-state quality stat: "filed/completed Nd late/early"
  // reads as a quality stat in tertiary tone — the row is done, the
  // signal is informational.
  const isTerminal = TERMINAL_STATUSES.has(status)
  if (isTerminal) {
    if (days === 0) return null
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-baseline whitespace-nowrap text-sm font-medium tabular-nums text-text-tertiary',
          className,
        )}
      >
        {days < 0 ? (
          <Plural value={-days} one="filed #d late" other="filed #d late" />
        ) : (
          <Plural value={days} one="filed #d early" other="filed #d early" />
        )}
      </span>
    )
  }
  // Pre-terminal countdown — destructive for past dates, secondary
  // for future. `today` renders as a single Trans-string so locales
  // can translate it as a word.
  const past = days < 0
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-baseline whitespace-nowrap text-sm font-medium tabular-nums',
        past ? 'text-text-destructive' : 'text-text-secondary',
        className,
      )}
    >
      {past ? (
        <Plural value={-days} one="#d late" other="#d late" />
      ) : days === 0 ? (
        <Trans>today</Trans>
      ) : (
        <Plural value={days} one="in #d" other="in #d" />
      )}
    </span>
  )
}

// Per the dashboard's terminal-set decision (D12 — Agent ω): `done`
// is NOT in the terminal set because a filed return doesn't imply
// the payment side cleared (anti-pattern §10.1). `paid` and
// `completed` ARE terminal — `paid` explicitly closed the payment
// side, `completed` is the end state covering both.
const TERMINAL_STATUSES: ReadonlySet<ObligationStatus> = new Set(['paid', 'completed'])

// Used by callers that want to subtract dueDate − asOfDate without
// re-implementing date math. Returns whole days, rounded.
function daysUntilDue(dueDate: string, asOfDate: string | null): number {
  if (!asOfDate) return 0
  const due = new Date(dueDate).getTime()
  const as = new Date(asOfDate).getTime()
  return Math.round((due - as) / (1000 * 60 * 60 * 24))
}

// 2026-06-03 (Yuqi /today polish round 2): hint that suppresses the
// label when there is nothing to say. `null` short-circuits when:
//   • Row is terminal AND days === 0 — "filed today" doesn't add
//     info; suppress and let the status chip carry the signal.
function hasMeaningfulLabel(days: number, status: ObligationStatus): boolean {
  if (TERMINAL_STATUSES.has(status) && days === 0) return false
  return true
}

export { DueDateLabel, daysUntilDue, hasMeaningfulLabel }
