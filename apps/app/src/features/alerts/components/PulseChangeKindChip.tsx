import { Trans } from '@lingui/react/macro'

import type { PulseAlertPublic } from '@duedatehq/contracts'

// "Change kind" identifier for a Pulse alert — Deadline shifted,
// Filing rule changed, Scope changed, etc.
//
// Plain inline text in sentence case, not a badge: the change-kind
// reads as a quiet meta-tag inline with the rest of the meta cluster
// (jurisdiction, form, authority), not as a colored SHOUT pill.
function PulseChangeKindChip({ changeKind }: { changeKind: PulseAlertPublic['changeKind'] }) {
  return (
    <span className="text-xs font-medium text-text-secondary">{changeKindLabel(changeKind)}</span>
  )
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
    case 'new_obligation':
      return <Trans>New rule added</Trans>
    case 'protective_claim_window':
      return <Trans>Protective claim window</Trans>
    case 'other':
      return <Trans>Other change</Trans>
  }
  return kind
}

export { PulseChangeKindChip, changeKindLabel }
