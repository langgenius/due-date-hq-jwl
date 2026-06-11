import { useLingui } from '@lingui/react/macro'
import { CheckCheck, CircleCheckBig, FileCheck, Undo2, type LucideIcon } from 'lucide-react'

import type { PulseFirmAlertStatus } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'

interface AlertStatusBadgeProps {
  status: PulseFirmAlertStatus
}

// Per-status lucide icon, kept distinct from the obligation status icon
// set — this vocabulary is alert-specific: CircleCheckBig = the alert
// is open / active; CheckCheck = applied ("task completed"); Undo2 = a
// reverseable terminal state (partially_applied / reverted / dismissed);
// FileCheck = reviewed (acknowledged + closed).
export const ALERT_STATUS_ICON: Record<PulseFirmAlertStatus, LucideIcon> = {
  matched: CircleCheckBig,
  applied: CheckCheck,
  partially_applied: Undo2,
  reviewed: FileCheck,
  reverted: Undo2,
  dismissed: Undo2,
}

// Single source of truth for "what does the firm-level alert state look like".
//
//   • `matched` is labelled "Open". "New" lives as a SEPARATE small
//     `NEW` chip rendered alongside the status pill (see AlertCard) when
//     the alert hasn't been actioned yet. The status pill describes the
//     *workflow* state (Open / Applied / Dismissed / …), not the
//     read-state — the read-state is a different dimension.
//   • Variants mapped per terminal-vs-active semantics, matching the
//     obligation pill tone ladder:
//       matched           → outline   (Open — quiet, no action yet)
//       applied / reviewed → success  (terminal good)
//       partially_applied → warning   (partial, needs attention)
//       dismissed         → secondary (parked, won't return)
//       reverted          → outline   (undone, back to baseline)
//
// Exported so every alert-status pill (card footer, drawer hero chip)
// paints the SAME status the SAME tone — per-surface remapping is what
// the §4.10 tone ladder bans.
export const ALERT_STATUS_VARIANT: Record<
  PulseFirmAlertStatus,
  'outline' | 'success' | 'warning' | 'secondary'
> = {
  matched: 'outline',
  partially_applied: 'warning',
  applied: 'success',
  reverted: 'outline',
  dismissed: 'secondary',
  reviewed: 'success',
}

export function AlertStatusBadge({ status }: AlertStatusBadgeProps) {
  const { t } = useLingui()
  const labels: Record<PulseFirmAlertStatus, string> = {
    matched: t`Open`,
    partially_applied: t`Partially applied`,
    applied: t`Applied`,
    reverted: t`Reverted`,
    dismissed: t`Dismissed`,
    reviewed: t`Reviewed`,
  }
  const entry = { label: labels[status], variant: ALERT_STATUS_VARIANT[status] }
  const Icon = ALERT_STATUS_ICON[status]
  // `h-6 text-sm` so the status pill matches AlertSourceBadge's height
  // (also h-6 text-sm) — they sit side-by-side in the drawer header and
  // the card row. Icon per status — see ALERT_STATUS_ICON map above.
  return (
    <Badge variant={entry.variant} className="h-6 text-sm">
      <Icon aria-hidden />
      {entry.label}
    </Badge>
  )
}
