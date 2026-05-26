import type { ReactNode } from 'react'

/**
 * Compact label / value tile used at the top of migration-wizard steps
 * (Step 2 Mapping, Step 3 Normalize). Renders as a small bordered card
 * with an uppercase kicker label and a bold metric value — the format
 * the wizard uses for "rows parsed", "columns mapped", "groups
 * normalized" summary stats.
 */
export function SummaryMetric({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="min-h-20 rounded-lg border border-divider-regular bg-background-section px-3 py-2">
      <div className="text-xs font-medium tracking-eyebrow text-text-secondary uppercase">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-text-primary">{value}</div>
    </div>
  )
}
