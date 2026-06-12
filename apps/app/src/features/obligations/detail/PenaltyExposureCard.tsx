import { Trans, useLingui } from '@lingui/react/macro'
import { ExternalLinkIcon } from 'lucide-react'
import type { ObligationQueueRow } from '@duedatehq/contracts'
import { smartPriorityBand } from '@duedatehq/core/priority'
import { cn } from '@duedatehq/ui/lib/utils'

import { DetailSectionCard } from '@/components/patterns/detail-section-card'
import { formatCents } from '@/lib/utils'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  const label = MONTHS[Number(month) - 1]
  if (!label || !day || !year) return iso
  return `${label} ${Number(day)}, ${year}`
}

/**
 * Penalty exposure card on the deadline Status tab (Pencil rzzww `wSTTh`).
 *
 * 100% backed by the real penalty engine output already on the row
 * (`packages/core/src/penalty` → repo → `penaltyBreakdown[]`,
 * `accruedPenaltyBreakdown[]`, `penaltySourceRefs[]`, …). We render the
 * computed breakdown verbatim — never re-derive formulas or hardcode
 * percentages.
 *
 * Honest empty states (no fiction):
 *  - No breakdown + missing facts → a "needs input" prompt listing what
 *    the engine is missing to compute exposure.
 *  - No breakdown + no missing facts → the card returns `null` (payment-
 *    only / information / unsupported-jurisdiction / not-yet-late rows
 *    genuinely have no §6651-style exposure).
 *
 * The rzzww mock's "First-Time Abatement · ELIGIBLE" + "Reasonable cause"
 * block is intentionally omitted — there is no abatement-eligibility
 * field, and asserting "ELIGIBLE" would be fabricated. The mock's "Risk
 * score 62/100" is rendered as the REAL Priority score (`smartPriority`)
 * + risk level, relabelled so it doesn't imply a non-existent risk model.
 */
export function PenaltyExposureCard({ row }: { row: ObligationQueueRow }) {
  const { t } = useLingui()

  const projected = row.penaltyBreakdown
  const accrued = row.accruedPenaltyBreakdown
  const hasExposure = projected.length > 0 || accrued.length > 0

  // Nothing to compute and nothing missing → no penalty applies. Render
  // nothing rather than an empty shell.
  if (!hasExposure && row.missingPenaltyFacts.length === 0) return null

  const primarySource = row.penaltySourceRefs[0] ?? null
  // Projected (horizon) is the headline; accrued is "as of today".
  const items = projected.length > 0 ? projected : accrued

  return (
    // Pencil `u2jxP`: the shared <DetailSectionCard> chrome (gray #f9fafb header
    // band + "View schedule →" link). `flush` because the body owns its own
    // padding + the needs-input / 2-column variants.
    <DetailSectionCard
      title={<Trans>Penalty exposure</Trans>}
      headerRight={
        primarySource ? (
          <a
            href={primarySource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-sm font-medium text-text-accent outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Trans>View schedule</Trans>
            <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
          </a>
        ) : undefined
      }
      flush
    >
      {!hasExposure ? (
        // Needs-input honest empty state.
        <div className="flex flex-col gap-1.5 px-5 py-4">
          <p className="text-sm font-medium text-text-secondary">
            <Trans>Exposure can't be computed yet</Trans>
          </p>
          <p className="text-caption text-text-tertiary">
            {t`Missing: ${row.missingPenaltyFacts.join(', ')}`}
          </p>
        </div>
      ) : (
        // 2-column body (Pencil ne4Fd): exposure math on the left, the
        // priority/mitigation panel on the right. Stacks below lg.
        <div className="flex flex-col gap-5 px-5 py-4 lg:flex-row lg:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {/* Headline numbers — projected vs accrued-to-date, both real. */}
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              {row.estimatedExposureCents !== null ? (
                <div className="flex flex-col gap-0.5">
                  <span className="text-2xl font-semibold leading-none tracking-tight text-text-destructive tabular-nums">
                    {formatCents(row.estimatedExposureCents)}
                  </span>
                  <span className="text-caption text-text-tertiary">
                    <Trans>projected exposure</Trans>
                  </span>
                </div>
              ) : null}
              {row.accruedPenaltyCents !== null ? (
                <div className="flex flex-col gap-0.5">
                  <span className="text-lg font-semibold leading-none tracking-tight text-text-primary tabular-nums">
                    {formatCents(row.accruedPenaltyCents)}
                  </span>
                  <span className="text-caption text-text-tertiary">
                    {t`accrued as of ${formatIsoDate(row.penaltyAsOfDate)}`}
                  </span>
                </div>
              ) : null}
            </div>

            {row.penaltyFormulaLabel ? (
              <p className="text-caption-xs font-semibold uppercase tracking-wide text-text-tertiary">
                {row.penaltyFormulaLabel}
              </p>
            ) : null}

            {/* Item table — label + real formula + amount, straight from the engine. */}
            <div className="overflow-hidden rounded-lg border border-divider-subtle">
              {items.map((item, index) => (
                <div
                  key={item.key}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5',
                    index > 0 && 'border-t border-divider-subtle',
                  )}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-base font-medium text-text-primary">{item.label}</span>
                    <span className="truncate font-mono text-caption-xs text-text-tertiary">
                      {item.formula}
                    </span>
                  </div>
                  <span className="shrink-0 text-base font-semibold tabular-nums text-text-primary">
                    {formatCents(item.amountCents)}
                  </span>
                </div>
              ))}
            </div>

            {/* Source provenance — real citations from the rule. */}
            {primarySource ? (
              <p className="text-caption-xs text-text-tertiary">
                {t`Source: ${primarySource.label} · effective ${formatIsoDate(primarySource.effectiveDate)} · reviewed ${formatIsoDate(primarySource.lastReviewedDate)}`}
              </p>
            ) : null}
          </div>

          {/* Right column — Priority panel (real smartPriority). The word
              next to the score is derived FROM the score via the canonical
              smartPriorityBand — pairing the score with the unrelated
              riskLevel field produced "94/100 · Moderate risk", which reads
              as a broken scale. Replaces ne4Fd's fabricated "First-Time
              Abatement / Risk score" mitigation block. */}
          <div className="flex w-full shrink-0 flex-col gap-1.5 rounded-lg bg-background-subtle p-4 lg:w-[220px]">
            <span className="text-caption-xs font-semibold uppercase tracking-wide text-text-tertiary">
              <Trans>Priority score</Trans>
            </span>
            <span className="text-xl font-semibold leading-none tracking-tight text-text-primary tabular-nums">
              {Math.round(row.smartPriority.score)}/100
            </span>
            {(() => {
              const band = smartPriorityBand(row.smartPriority.score)
              return (
                <span
                  className={cn(
                    'w-fit rounded-full px-2 py-0.5 text-caption-xs font-medium',
                    band === 'high'
                      ? 'bg-state-destructive-hover text-text-destructive'
                      : band === 'elevated'
                        ? 'bg-state-warning-hover text-text-warning'
                        : 'bg-background-default text-text-tertiary',
                  )}
                >
                  {band === 'high' ? (
                    <Trans>High priority</Trans>
                  ) : band === 'elevated' ? (
                    <Trans>Elevated priority</Trans>
                  ) : (
                    <Trans>Normal priority</Trans>
                  )}
                </span>
              )
            })()}
          </div>
        </div>
      )}
    </DetailSectionCard>
  )
}
