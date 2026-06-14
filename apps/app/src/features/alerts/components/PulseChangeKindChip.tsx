import { Trans } from '@lingui/react/macro'
import {
  ArrowRightLeftIcon,
  CalendarClockIcon,
  FilePenIcon,
  FilePlus2Icon,
  GaugeIcon,
  RadioIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  TagIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'

import { cn } from '@duedatehq/ui/lib/utils'

// "Change kind" identifier for a Pulse alert — Deadline shifted,
// Filing rule changed, Scope changed, etc.
//
// Plain inline text in sentence case, not a badge: the change-kind
// reads as a quiet meta-tag inline with the rest of the meta cluster
// (jurisdiction, form, authority), not as a colored SHOUT pill.
function PulseChangeKindChip({ changeKind }: { changeKind: PulseAlertPublic['changeKind'] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
      <ChangeKindIcon changeKind={changeKind} />
      {changeKindLabel(changeKind)}
    </span>
  )
}

// 2026-06-14 (Yuqi "add an icon before Protective claim window"): each
// change-kind carries a small leading glyph so the meta tag reads as
// "icon + change", one mapping shared across the list, rail, and detail
// hero. The icon inherits the surrounding text color (currentColor).
const CHANGE_KIND_ICON: Record<PulseAlertPublic['changeKind'], LucideIcon> = {
  deadline_shift: CalendarClockIcon,
  filing_requirement: ScrollTextIcon,
  applicability_scope: ArrowRightLeftIcon,
  form_instruction: FilePenIcon,
  source_status: RadioIcon,
  rule_source_drift: TriangleAlertIcon,
  new_obligation: FilePlus2Icon,
  protective_claim_window: ShieldCheckIcon,
  threshold_advisory: GaugeIcon,
  other: TagIcon,
}

function ChangeKindIcon({
  changeKind,
  className,
}: {
  changeKind: PulseAlertPublic['changeKind']
  className?: string
}) {
  const Icon = CHANGE_KIND_ICON[changeKind]
  return <Icon className={cn('size-3.5 shrink-0', className)} aria-hidden />
}

function changeKindLabel(kind: PulseAlertPublic['changeKind']) {
  switch (kind) {
    case 'deadline_shift':
      return <Trans>Deadline shifted</Trans>
    case 'filing_requirement':
      return <Trans>Filing rule changed</Trans>
    case 'applicability_scope':
      return <Trans>Scope changed</Trans>
    case 'form_instruction':
      return <Trans>Form updated</Trans>
    case 'source_status':
      return <Trans>Source status</Trans>
    case 'rule_source_drift':
      return <Trans>Source drift</Trans>
    case 'new_obligation':
      return <Trans>New rule added</Trans>
    case 'protective_claim_window':
      return <Trans>Protective claim window</Trans>
    case 'threshold_advisory':
      return <Trans>Threshold advisory</Trans>
    case 'other':
      return <Trans>Other change</Trans>
  }
  // 2026-06-12 (critique: "THRESHOLD_ADVISORY" leaked raw on the list + rail):
  // every PulseChangeKind member is mapped above — this fallback only catches
  // future enum additions.
  return kind
}

export { PulseChangeKindChip, ChangeKindIcon, changeKindLabel }
