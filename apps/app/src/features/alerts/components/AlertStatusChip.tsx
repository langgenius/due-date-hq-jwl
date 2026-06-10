import { useLingui } from '@lingui/react/macro'
import {
  BadgeCheck,
  CheckCheck,
  CircleDot,
  Clock3,
  RotateCcw,
  Undo2,
  type LucideIcon,
} from 'lucide-react'

import type { PulseFirmAlertStatus } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `AlertStatusChip` — the lifecycle status pill for a firm alert (Pencil
 * `w4DBr` / `b75I5W` / `GzVzj` / `g770iB` / `Cirrk` / `OMxu3`).
 *
 * A rounded-full chip with a per-status icon, a label, and an optional
 * pre-formatted timestamp suffix — "Awaiting decision · 2h", "Applied · Mar 4".
 * `matched` reads as **"Awaiting decision"** (a display-only rename; the DB
 * status stays `matched`, no migration).
 *
 * Tone ladder (matches the canvas): awaiting / partially-applied → warning,
 * applied / reviewed → success, dismissed / reverted → muted (reverted carries
 * a hairline border so it reads distinct against the bg-subtle fill). The
 * canvas's bespoke hex is mapped onto design-system tokens.
 *
 * Visual = `RuleStatusChip` (the rule-review hero/decision chip reuses these
 * variants).
 */
type ChipTone = 'warning' | 'success' | 'muted'

const TONE_CLASS: Record<ChipTone, string> = {
  warning: 'bg-state-warning-hover text-text-warning',
  success: 'bg-state-success-hover text-text-success',
  muted: 'bg-background-subtle text-text-tertiary',
}

const STATUS_CONFIG: Record<
  PulseFirmAlertStatus,
  { icon: LucideIcon; tone: ChipTone; bordered?: boolean }
> = {
  matched: { icon: Clock3, tone: 'warning' },
  applied: { icon: CheckCheck, tone: 'success' },
  partially_applied: { icon: CircleDot, tone: 'warning' },
  reviewed: { icon: BadgeCheck, tone: 'success' },
  reverted: { icon: RotateCcw, tone: 'muted', bordered: true },
  dismissed: { icon: Undo2, tone: 'muted' },
}

/** Status → human label. Exported so list rows / filters can reuse it. */
export function useAlertStatusLabels(): Record<PulseFirmAlertStatus, string> {
  const { t } = useLingui()
  return {
    matched: t`Awaiting decision`,
    applied: t`Applied`,
    partially_applied: t`Partially applied`,
    reviewed: t`Reviewed`,
    reverted: t`Reverted`,
    dismissed: t`Dismissed`,
  }
}

export function AlertStatusChip({
  status,
  timestamp,
  className,
}: {
  status: PulseFirmAlertStatus
  /** Pre-formatted suffix, e.g. "2h" or "Mar 4" — rendered after a "·". */
  timestamp?: string
  className?: string
}) {
  const labels = useAlertStatusLabels()
  const { icon: Icon, tone, bordered } = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-semibold whitespace-nowrap',
        TONE_CLASS[tone],
        bordered && 'border border-divider-regular',
        className,
      )}
    >
      <Icon aria-hidden className="size-[11px] shrink-0" />
      <span>
        {labels[status]}
        {timestamp ? ` · ${timestamp}` : ''}
      </span>
    </span>
  )
}
