import { Trans } from '@lingui/react/macro'
import { CalendarPlusIcon } from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'

// Small "Extended" chip surfaced on rows that have a legally-
// recognized extension applied (Form 4868/7004).
//
// The chip's presence on a row signals to the triage logic that the
// FILING side should be demoted from Critical → High; the row's
// payment-overdue state (when applicable) is handled separately by
// `<DueDateLabel>` and the status-cell payment-late caption.
//
// Anti-pattern §10.1 still holds — extension extends FILING, not
// PAYMENT. The chip carries the canonical messaging in its tooltip
// so a CPA hovering it doesn't misread the row as "fully extended."
function ExtensionChip() {
  return (
    <Badge
      variant="info"
      className="gap-1 text-xs"
      title="Filing extension applied — payment is not extended."
    >
      <CalendarPlusIcon className="size-3" aria-hidden />
      <Trans>Extended</Trans>
    </Badge>
  )
}

export { ExtensionChip }
