import { useLingui } from '@lingui/react/macro'
import { AlarmClockOffIcon, ArchiveIcon, XIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'

// Pencil node xxNFC replaces the kebab DropdownMenu with three
// individual icon buttons stacked horizontally in the alert card's
// top-right corner. Each button is a single-purpose action — Snooze,
// Archive, Dismiss — discoverable without an extra tap.
//
// Why three icon buttons instead of a kebab:
//   • Kebab forces a CPA to open a menu just to learn the actions
//     exist. Inline icons let the available verbs scan in one pass.
//   • Snooze + Archive + Dismiss are the only three non-Review
//     actions ever offered on an alert — the menu was always
//     two or three items. Hiding three buttons behind a "more"
//     menu is reverse minimalism.
//   • Pencil's design treats the row's actions as parallel verbs,
//     not a "more" overflow.
//
// Each button uses the canonical `<Button>` primitive so chrome
// (radius, hover, focus ring) propagates from the design system.
//
// 2026-06-04 round 42 (Yuqi "the buttons look ugly tho"): chrome
// dropped from `variant="outline"` + `size-8` to `variant="ghost"`
// + `size-7` + ghost text/bg tints. The outline borders read as
// three loud 1px rectangles sitting on top of the alert card —
// "ugly" was an accurate description. The ghost variant has no
// border, no fill at rest; hover paints a quiet `state-base-hover`
// tint behind just the icon. Smaller icon (`size-3` instead of
// `size-3.5`) drops another bit of visual weight. The hover-only
// reveal pattern + ghost chrome together make these read as
// "available actions" rather than "things to click NOW".
//
// Buttons whose handler is undefined render as disabled — the row's
// column width stays stable across alerts in different terminal
// states (e.g. an already-archived alert hides Archive; the Snooze
// + X buttons still anchor the right edge).
function PulseAlertActionsRow({
  alertTitle,
  onSnooze,
  onArchive,
  onDismiss,
}: {
  alertTitle: string
  onSnooze?: (() => void) | undefined
  onArchive?: (() => void) | undefined
  onDismiss?: (() => void) | undefined
}) {
  const { t } = useLingui()
  return (
    <div className="flex shrink-0 items-center gap-1">
      {onSnooze ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="size-7 rounded-md p-0 text-text-tertiary hover:bg-state-base-hover hover:text-text-primary"
                aria-label={t`Snooze alert: ${alertTitle}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onSnooze()
                }}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <AlarmClockOffIcon className="size-3" aria-hidden />
              </Button>
            }
          />
          <TooltipContent>{t`Snooze 24h`}</TooltipContent>
        </Tooltip>
      ) : null}
      {onArchive ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="size-7 rounded-md p-0 text-text-tertiary hover:bg-state-base-hover hover:text-text-primary"
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
                className="size-7 rounded-md p-0 text-text-tertiary hover:bg-state-base-hover hover:text-text-primary"
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
