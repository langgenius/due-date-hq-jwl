import { Trans } from '@lingui/react/macro'
import { SparklesIcon, UserCheckIcon } from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'

// Deferred [方向] items combined:
//   • Group 6: "AI 永不自动判 verified(必须人类签字)"
//   • Group 5: "alert customization 粒度与 AI 建议、人拍板边界"
//
// On any alert / extracted fact, surface a single chip making the
// AI/human-authority boundary explicit:
//
//   "AI suggests · Human verifies"
//
// The chip uses `<UserCheckIcon>` (human authority) on the leading
// edge to anchor the eye on the human side; the AI sparkle trails
// to emphasize "AI is auxiliary, not the verifier."
//
// Renders only when the underlying fact has AI provenance — i.e.
// when the alert has an extraction confidence < 1. Callers gate
// the chip; the primitive itself always renders when called.

function PulseAIBoundaryChip() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <Badge
            variant="outline"
            className="cursor-help gap-1 border-divider-subtle bg-background-section text-[11px]"
            {...props}
          >
            <UserCheckIcon className="size-3 shrink-0 text-text-secondary" aria-hidden />
            <Trans>Human verifies</Trans>
            <SparklesIcon className="size-3 shrink-0 text-text-tertiary" aria-hidden />
          </Badge>
        )}
      />
      <TooltipContent>
        <Trans>
          AI extracted this from the source. A reviewer must confirm before applying — DueDateHQ
          never marks an alert verified automatically.
        </Trans>
      </TooltipContent>
    </Tooltip>
  )
}

export { PulseAIBoundaryChip }
