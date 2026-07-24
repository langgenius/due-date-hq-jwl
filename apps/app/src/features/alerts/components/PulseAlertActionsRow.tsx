import { useLingui } from '@lingui/react/macro'
import { ArchiveIcon, XIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'

// Pencil node xxNFC replaces the kebab DropdownMenu with individual
// icon buttons stacked horizontally in the alert card's top-right
// corner. Each button is a single-purpose action — Archive, Dismiss —
// discoverable without an extra tap.
//
// Why inline icon buttons instead of a kebab:
//   • Kebab forces a CPA to open a menu just to learn the actions
//     exist. Inline icons let the available verbs scan in one pass.
//   • Archive + Dismiss are the only non-Review actions ever offered
//     on an alert — the menu was always one or two items. Hiding them
//     behind a "more" menu is reverse minimalism.
//   • Pencil's design treats the row's actions as parallel verbs,
//     not a "more" overflow.
//
// Each button uses the canonical `<Button>` primitive so chrome
// (radius, hover, focus ring) propagates from the design system.
//
// The buttons use `variant="ghost"` + `size-7` + ghost text/bg tints:
// no border, no fill at rest; hover paints a quiet `state-base-hover`
// tint behind just the icon. Outline borders would read as three loud
// 1px rectangles on top of the alert card. The hover-only reveal
// pattern + ghost chrome together make these read as "available
// actions" rather than "things to click NOW".
//
// Buttons whose handler is undefined render as disabled — the row's
// column width stays stable across alerts in different terminal
// states (e.g. an already-archived alert hides Archive; the X button
// still anchors the right edge).
function PulseAlertActionsRow({
  alertTitle,
  onArchive,
  onDismiss,
}: {
  alertTitle: string
  onArchive?: (() => void) | undefined
  onDismiss?: (() => void) | undefined
}) {
  const { t } = useLingui()
  return (
    <div className="flex shrink-0 items-center gap-1">
      {onArchive ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="relative size-7 rounded-lg p-0 text-text-tertiary before:absolute before:-inset-1.5 before:content-[''] hover:bg-state-base-hover hover:text-text-primary"
                aria-label={t`Archive alert: ${alertTitle}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onArchive()
                }}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <ArchiveIcon className="size-3" aria-hidden />
              </Button>
            }
          />
          <TooltipContent>{t`Archive`}</TooltipContent>
        </Tooltip>
      ) : null}
      {onDismiss ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="relative size-7 rounded-lg p-0 text-text-tertiary before:absolute before:-inset-1.5 before:content-[''] hover:bg-state-base-hover hover:text-text-primary"
                aria-label={t`Dismiss alert: ${alertTitle}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onDismiss()
                }}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <XIcon className="size-3" aria-hidden />
              </Button>
            }
          />
          <TooltipContent>{t`Dismiss`}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}

export { PulseAlertActionsRow }
