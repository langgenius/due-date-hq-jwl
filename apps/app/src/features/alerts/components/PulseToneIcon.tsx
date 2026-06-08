import {
  AlertTriangleIcon,
  BellIcon,
  CalendarClockIcon,
  CrosshairIcon,
  FileEditIcon,
  FilePenLineIcon,
  PlusCircleIcon,
  SatelliteDishIcon,
  type LucideIcon,
} from 'lucide-react'

import type { PulsingDotTone } from '@/features/alerts/components/PulsingDot'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

import { isLowAiConfidence } from '@/features/_surface-vocabulary/ai-confidence'
import { alertTone } from '@/features/alerts/alert-tone'

// Canonical leading icon for a Pulse alert card. Picks the icon
// SHAPE off `alert.changeKind` (calendar-clock for a deadline shift,
// file-pen for a filing-rule change, satellite-dish for a source
// status update, etc.) and picks the COLOR off `pulseAlertTone()`
// + low-confidence detection.
//
// Per Pencil node VVMj9: the /today alerts section uses a leading
// 18×18 tone icon as the row anchor. Pencil's two examples are:
//   • Triangle-alert (destructive) — fires when AI confidence falls
//     below the canonical LOW threshold (0.5). Confidence dominates
//     the visual regardless of change kind.
//   • Calendar-clock (warning) — `deadline_shift` change kind, the
//     most common change kind in the wild.
//
// Why low-confidence overrides change-kind:
//   A CPA scanning the alerts section needs to spot "AI isn't sure
//   about this one" instantly — that's the highest-friction work
//   on the page. Painting the deadline-shift icon next to a low-
//   confidence alert would bury the AI-quality flag inside the
//   change-kind classification; the tone-icon's job is to lift
//   that flag.
const ICON_BY_CHANGE_KIND: Record<PulseAlertPublic['changeKind'], LucideIcon> = {
  deadline_shift: CalendarClockIcon,
  filing_requirement: FilePenLineIcon,
  applicability_scope: CrosshairIcon,
  form_instruction: FileEditIcon,
  source_status: SatelliteDishIcon,
  rule_source_drift: SatelliteDishIcon,
  new_obligation: PlusCircleIcon,
  protective_claim_window: AlertTriangleIcon,
  threshold_advisory: AlertTriangleIcon,
  other: BellIcon,
}

// Pencil tone tokens → semantic text-color classes. The tone palette
// matches `pulseAlertTone()`'s vocabulary so the icon and the dot
// (when both render) tell the same story. `disabled` (returned for
// some terminal states) maps to the same quiet tertiary tone as
// `normal`; the icon never needs to be greyed out beyond that.
const TONE_COLOR_CLASS: Record<PulsingDotTone, string> = {
  warning: 'text-text-warning',
  normal: 'text-text-tertiary',
  success: 'text-text-success',
  error: 'text-text-destructive',
  disabled: 'text-text-tertiary',
}

function PulseToneIcon({ alert, className }: { alert: PulseAlertPublic; className?: string }) {
  const tone = alertTone(alert)
  const lowConfidence = isLowAiConfidence(alert.confidence)
  // Low-confidence overrides — destructive tone + triangle-alert
  // regardless of change kind. This matches Pencil's first card
  // shape ("FL DOR bulletin has very-low-confidence extracted
  // deadline details").
  const Icon = lowConfidence
    ? AlertTriangleIcon
    : (ICON_BY_CHANGE_KIND[alert.changeKind] ?? BellIcon)
  const colorClass = lowConfidence ? 'text-text-destructive' : TONE_COLOR_CLASS[tone]
  return <Icon className={cn('size-[18px] shrink-0', colorClass, className)} aria-hidden />
}

export { PulseToneIcon }
