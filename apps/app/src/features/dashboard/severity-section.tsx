import { Trans, useLingui } from '@lingui/react/macro'
import type { ReactNode } from 'react'
import type { DashboardSeverity } from '@duedatehq/contracts'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

// Top-level severity tier shown on /today. Per Yuqi's 2026-06-04
// triage redesign:
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
    // 2026-06-04 (Yuqi alignment fix): removed `px-3` so the tier
    // header's left edge sits at the page padding edge — same as
    // the table's outer wrapper directly below it. Section
    // headers + table outer border align; cells inside the table
    // get their own `px-5` inner padding.
    // 2026-06-04 round 3 (Yuqi feedback #9 "bad layout and
    // position"): restructured so tier label + count chip sit as
    // an h3 on row 1, with the plain-language explainer as a
    // SUBTITLE on row 2. Previously the explainer was
    // inline-baseline'd next to the chip — it read as a footnote
    // squeezed between the chip and the right slot, and the
    // truncation kicked in at every viewport below ~1280px.
    // Vertical stack keeps both lines fully visible.
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
        'flex items-center gap-2 px-5 py-2 text-[11px] font-semibold tracking-[0.5px] text-text-tertiary uppercase',
        // Quiet subhead — sits inside the section's row container
        // so it reads as a horizontal divider with a label, not as
        // a parallel section header.
        'bg-background-section/60 border-b border-divider-subtle',
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums text-text-muted">({count})</span>
    </div>
  )
}

export { ReadinessSubgroupHeader, SeveritySectionHeader, TIER_ORDER, severityToTier, useTierCopy }
