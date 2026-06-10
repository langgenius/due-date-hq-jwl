import { Plural, Trans, useLingui } from '@lingui/react/macro'

import type { ObligationType } from '@duedatehq/contracts/shared/enums'
import { cn } from '@duedatehq/ui/lib/utils'

// Readiness "Docs N/M · missing X" signal — promoted from a hover
// detail to a primary triage column per the 2026-06-04 redesign
// ("资料齐备度 % 升为分诊主信号").
//
// Data model gap acknowledged: the canonical readiness model (PDF
// §3.2 checklist — organizer / W-2 / 1099 / K-1 / TB / bank rec /
// payroll / owner approval / payment instruction) does not yet
// exist on the contract. Until it does, this primitive infers the
// denominator from `obligationType` using the per-type
// `READINESS_TOTAL` map below — a deterministic stand-in so the UI
// is ready when the contract gains a proper `readinessTotal` /
// `readinessAttached` pair.
//
// State machine support (item 1.7): the primitive accepts an
// optional `verified` count. When provided, the chip splits
// "attached but unverified" from "verified-usable" with a small
// trailing icon (check / alert). When not provided, the chip
// renders attachment count only.
const READINESS_TOTAL: Record<ObligationType, number> = {
  filing: 3, // organizer + W-2 batch + prior-return
  payment: 1, // payment instruction
  deposit: 0, // no client docs collected for payroll deposit
  information: 2, // source forms (e.g. 1099 backup, recipient list)
  client_action: 1, // the requested document
  internal_review: 0, // no client docs — internal sign-off
}

function ReadinessIndicator({
  obligationType,
  attached,
  verified,
  className,
}: {
  obligationType: ObligationType
  attached: number
  // Optional: when the source state machine exists, callers pass
  // verified-usable count. Without it the chip renders attachment
  // count only.
  verified?: number | undefined
  className?: string
}) {
  const { t } = useLingui()
  const total = READINESS_TOTAL[obligationType] ?? 0
  // Suppress the chip entirely for obligation types that don't
  // gather client docs (deposit / internal_review). The CPA
  // doesn't expect a "0/0" reading for those rows.
  if (total === 0) {
    return null
  }
  const complete = attached >= total
  // Tone follows readiness:
  //   • Complete (attached === total)  → success (green)
  //   • Partial  (0 < attached < total) → tertiary (gray) — round 43
  //     (Yuqi /today feedback #4 — "docs 1/3 can be in gray"). The
  //     count itself ("1/3") already names the gap and the
  //     AlertCircleIcon trailing flags incompleteness; the loud
  //     warning yellow was claiming more weight than a "partial"
  //     state warrants in a scan. Quieter gray lets the row's
  //     other signals (due-date, status, action verb) lead.
  //   • Empty    (attached === 0)      → tertiary (gray) — 2026-06-07
  //     (Yuqi audit: "don't have Docs 0/3 in red"). The Pencil VJbaH
  //     readiness cell renders the count in muted gray (#98a2b2) at
  //     every fill level, never red — the AlertCircle trailing icon +
  //     the count itself ("0/3") already name the gap. Red here piled
  //     onto the due-countdown red and over-saturated the row. The
  //     due-date column carries the row's single intentional red.
  const toneClass = complete ? 'text-text-success' : 'text-text-tertiary'
  return (
    <span
      className={cn(
        'inline-flex min-w-0 cursor-help items-center gap-1.5 text-xs font-medium tabular-nums',
        className,
      )}
      // 2026-06-10 (Yuqi /today #8 "Docs 0/3 到底代表了什么?"): spell out the
      // ratio on hover — it's source documents attached vs. expected for this
      // filing, so a CPA scanning the column knows what the count tracks.
      title={t`${attached} of ${total} expected source documents attached for this filing`}
    >
      {/* 2026-06-08 (Yuqi "docs 前面不要圆圈表示了"): the per-doc dots
          were removed — the "Docs N/M" count already names the gap, and the
          dots added visual texture the row didn't need. The count tone
          (success when complete, else tertiary) carries the state. */}
      <span className={cn('inline-flex items-center', toneClass)}>
        <Trans>
          Docs {attached}/{total}
        </Trans>
      </span>
      {/* 2026-06-04 round 3 (Yuqi feedback #10 "Docs 1/3 still
          showing missing 2? we know it is 1/3 and missing 2"):
          the "· missing N" tail is redundant — the user can do
          the subtraction "1 of 3 = 2 missing" instantly. Dropped
          so the row reads cleaner. The destructive/warning tone
          on the count itself already carries the urgency. */}
      {/* Source state machine: when verified count is provided,
          surface the gap between attached and verified-usable.
          "attached" includes "uploaded but not yet checked" — the
          CPA's eye should land on whether the docs are actually
          ready, not whether they exist on disk. */}
      {typeof verified === 'number' && verified < attached ? (
        <span className="text-text-warning text-[11px]">
          <Plural value={attached - verified} one="(# unverified)" other="(# unverified)" />
        </span>
      ) : null}
    </span>
  )
}

export { ReadinessIndicator, READINESS_TOTAL }
