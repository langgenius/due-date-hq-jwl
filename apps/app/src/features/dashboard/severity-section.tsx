import { Trans, useLingui } from '@lingui/react/macro'
import type { ReactNode } from 'react'
import type { DashboardSeverity } from '@duedatehq/contracts'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

// Top-level severity tier shown on /today:
//   • Critical → "Act today or risk missing the deadline"
//   • High     → "Move this week to stay ahead"
//   • Upcoming → "On your radar — not urgent yet"
//
// Severity is carried by the SECTION HEADER (chip color + tier
// label + plain-language urgency copy). Rows inside each section
// stay visually neutral — no per-row rail, no per-row tone.
export type SeverityTier = 'critical' | 'high' | 'upcoming'

// Maps the contract-side `DashboardSeverity` enum to a 3-tier
// triage taxonomy. `medium` collapses into `upcoming` because the
// CPA's mental model is "Critical / High / Other" — not 4 levels.
// `neutral` rows also land in upcoming.
function severityToTier(severity: DashboardSeverity): SeverityTier {
  if (severity === 'critical') return 'critical'
  if (severity === 'high') return 'high'
  return 'upcoming'
}

const TIER_ORDER: readonly SeverityTier[] = ['critical', 'high', 'upcoming']

// Plain-language explanation rendered next to the section header.
// Reads as a sentence the CPA can scan ("yes I know what this
// tier means"), not jargon ("severity=critical").
function useTierCopy(): Record<SeverityTier, { label: string; explainer: string }> {
  const { t } = useLingui()
  return {
    critical: {
      label: t`Critical`,
      explainer: t`Act today or risk missing the deadline`,
    },
    high: {
      label: t`High`,
      explainer: t`Move this week to stay ahead`,
    },
    upcoming: {
      label: t`Upcoming`,
      explainer: t`On your radar — not urgent yet`,
    },
  }
}

// Chip variant + dot tone per tier — tier identity is the badge,
// the row chrome stays neutral. Critical gets destructive-tinted
// chip; high gets warning; upcoming gets quiet outline.
const TIER_CHIP_VARIANT: Record<SeverityTier, 'destructive' | 'warning' | 'outline'> = {
  critical: 'destructive',
  high: 'warning',
  upcoming: 'outline',
}

function SeveritySectionHeader({
  tier,
  count,
  rightSlot,
}: {
  tier: SeverityTier
  count: number
  rightSlot?: ReactNode
}) {
  const copy = useTierCopy()[tier]
  return (
    // No `px-3` so the tier header's left edge aligns with the table's
    // outer wrapper directly below it. Tier label + count chip sit as an
    // h3 on row 1, with the plain-language explainer as a subtitle on row
    // 2 — a vertical stack keeps both lines fully visible rather than
    // truncating the explainer next to the chip on narrow viewports.
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight text-text-primary">
          {copy.label}
          <Badge variant={TIER_CHIP_VARIANT[tier]} className="tabular-nums">
            {count}
          </Badge>
        </h3>
        <p className="text-xs text-text-tertiary">{copy.explainer}</p>
      </div>
      {rightSlot}
    </div>
  )
}

// Sub-section header used inside a severity tier to split "Ready to
// work" from "Waiting on client". The 2D triage axis answers the
// CPA's "can I make progress right now?" question by showing the
// ready bucket before the blocked bucket.
function ReadinessSubgroupHeader({
  kind,
  count,
}: {
  kind: 'ready' | 'waiting' | 'blocked'
  count: number
}) {
  const label =
    kind === 'ready' ? (
      <Trans>Ready to work</Trans>
    ) : kind === 'waiting' ? (
      <Trans>Waiting on client</Trans>
    ) : (
      <Trans>Blocked</Trans>
    )
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-5 py-2 text-column-label text-text-tertiary uppercase',
        // Quiet subhead — sits inside the section's row container
        // so it reads as a horizontal divider with a label, not as
        // a parallel section header.
        'bg-background-section/60 border-b border-divider-subtle',
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums text-text-tertiary">({count})</span>
    </div>
  )
}

export { ReadinessSubgroupHeader, SeveritySectionHeader, TIER_ORDER, severityToTier, useTierCopy }
