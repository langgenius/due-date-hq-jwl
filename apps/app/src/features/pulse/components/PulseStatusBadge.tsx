import { useLingui } from '@lingui/react/macro'
import {
  AlarmClock,
  CheckCheck,
  CircleCheckBig,
  FileCheck,
  Undo2,
  type LucideIcon,
} from 'lucide-react'

import type { PulseFirmAlertStatus } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'

interface PulseStatusBadgeProps {
  status: PulseFirmAlertStatus
}

// 2026-05-26 (Yuqi /rules/pulse thirteenth pass): per-status lucide
// icon. Kept distinct from the obligation status icon set (per
// Yuqi's earlier note "you should not use their icons") — this
// vocabulary is pulse-specific: CircleCheckBig = the alert is open
// / active; Undo2 = the alert is in a terminal state that could be
// reversed (applied / partially_applied / reverted / dismissed);
// AlarmClock = snoozed (will return later); FileCheck = reviewed
// (acknowledged + closed).
// 2026-05-26 (Yuqi sixteenth pass #9): `applied` switched from
// `Undo2` to `CheckCheck` — Yuqi flagged that "applied" should
// signal "task completed", not "can be undone". The remaining
// Undo2 family (partially_applied / reverted / dismissed) keeps
// the "reverseable terminal state" semantic.
export const PULSE_STATUS_ICON: Record<PulseFirmAlertStatus, LucideIcon> = {
  matched: CircleCheckBig,
  snoozed: AlarmClock,
  applied: CheckCheck,
  partially_applied: Undo2,
  reviewed: FileCheck,
  reverted: Undo2,
  dismissed: Undo2,
}

// Single source of truth for "what does the firm-level alert state look like".
//
// 2026-05-26 (Yuqi /rules/pulse fifth pass — A#2 + B#3):
//   • Dropped the leading Spotlight/Sparkles icon. Yuqi asked for
//     the status pill to follow the same visual language as the
//     obligation status pills (status-control.tsx) — colour-coded
//     `variant` only, no icon. The obligation pills use icons of
//     their own; here we just borrow the variant palette.
//   • Label for `matched` changed from "New" → "Open". "New" lives
//     as a SEPARATE small `NEW` chip rendered alongside the status
//     pill (see PulseAlertCard) when the alert hasn't been actioned
//     yet. The status pill itself should describe the *workflow*
//     state (Open / Applied / Snoozed / Dismissed / …), not the
//     read-state — the read-state is a different dimension.
//   • Variants mapped per terminal-vs-active semantics, matching the
//     obligation pill tone ladder:
//       matched           → outline   (Open — quiet, no action yet)
//       applied / reviewed → success  (terminal good)
//       partially_applied → warning   (partial, needs attention)
//       snoozed           → secondary (parked, will return)
//       dismissed         → secondary (parked, won't return)
//       reverted          → outline   (undone, back to baseline)
export function PulseStatusBadge({ status }: PulseStatusBadgeProps) {
  const { t } = useLingui()
  const config: Record<
    PulseFirmAlertStatus,
    { label: string; variant: 'outline' | 'success' | 'warning' | 'secondary' }
  > = {
    matched: { label: t`Open`, variant: 'outline' },
    snoozed: { label: t`Snoozed`, variant: 'secondary' },
    partially_applied: { label: t`Partially applied`, variant: 'warning' },
    applied: { label: t`Applied`, variant: 'success' },
    reverted: { label: t`Reverted`, variant: 'outline' },
    dismissed: { label: t`Dismissed`, variant: 'secondary' },
    reviewed: { label: t`Reviewed`, variant: 'success' },
  }
  const entry = config[status]
  const Icon = PULSE_STATUS_ICON[status]
  // 2026-05-26 (Yuqi /rules/pulse eighth pass #4): bump to `h-6
  // text-sm` so the status pill matches PulseSourceBadge's height
  // (also h-6 text-sm) — they sit side-by-side in the drawer
  // header and the card row, and the previous default `h-5`
  // looked shorter than the source pill next to it.
  // 2026-05-26 (Yuqi thirteenth pass): icon added per status —
  // see PULSE_STATUS_ICON map above. Yuqi reversed the earlier
  // "no icons" call now that we have a pulse-specific
  // vocabulary that doesn't collide with obligation status.
  return (
    <Badge variant={entry.variant} className="h-6 text-sm">
      <Icon aria-hidden />
      {entry.label}
    </Badge>
  )
}
