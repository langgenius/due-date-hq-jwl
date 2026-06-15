import type { ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { ExternalLinkIcon } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `AlertSourceLink` — the ONE source-link treatment for alerts (list row,
 * detail rail, detail pane). Previously hand-rolled three times (two
 * `role="link"` spans + a raw `<a>`); this is the single home.
 *
 * Behaviour: text-first + trailing ↗ (the app-wide external-link order),
 * opens the source in a new tab, and — because the row/rail variants sit
 * INSIDE a clickable row — uses a `role="link"` span with
 * `stopPropagation` so opening the source never also triggers the row's
 * navigation (a plain `<a>` would). When there is no `sourceUrl`, renders
 * a plain non-clickable caption (never a dead `window.open(null)` tab).
 */
export function AlertSourceLink({
  source,
  sourceUrl,
  className,
  withTooltip = false,
  standalone = false,
}: {
  source: ReactNode
  sourceUrl: string | null
  className?: string
  /** Wrap in an "Open source · <url>" tooltip (the list-row variant). */
  withTooltip?: boolean
  /**
   * `standalone` (the detail masthead) renders a real `<a>` so middle-click
   * and open-in-new-tab work natively. The default (`false`) is the in-row
   * variant: a `role="link"` span that `stopPropagation`s so opening the
   * source never also fires the surrounding row's navigation.
   */
  standalone?: boolean
}) {
  const base = 'inline-flex min-w-0 items-center gap-1 text-sm font-medium text-text-tertiary'

  if (!sourceUrl) {
    // No URL → a plain caption with NO ↗ icon: a trailing external-link
    // glyph on something that isn't clickable is a dishonest affordance.
    return (
      <span className={cn(base, className)}>
        <span className="truncate">{source}</span>
      </span>
    )
  }

  const open = (event: { stopPropagation: () => void }) => {
    event.stopPropagation()
    window.open(sourceUrl, '_blank', 'noopener,noreferrer')
  }

  // 2026-06-15 (Yuqi "hover to blue (link). apply to all links"): a real link
  // reveals itself on hover by going accent (blue) + underline, instead of the
  // quiet gray darken it used before. One shared component → every source link
  // (row, rail, detail) gets the affordance.
  const interactive =
    'shrink cursor-pointer truncate rounded-sm outline-none transition-colors hover:text-text-accent hover:underline focus-visible:text-text-accent focus-visible:ring-2 focus-visible:ring-state-accent-active-alt'

  const link = standalone ? (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className={cn(base, interactive, className)}
    >
      <span className="truncate">{source}</span>
      <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
    </a>
  ) : (
    <span
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          open(event)
        }
      }}
      className={cn(base, interactive, className)}
    >
      <span className="truncate">{source}</span>
      <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
    </span>
  )

  if (!withTooltip) return link

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent>
        <div className="flex max-w-[320px] flex-col gap-0.5 text-left">
          <span className="font-semibold">
            <Trans>Open source</Trans>
          </span>
          <span className="break-all text-text-secondary">{sourceUrl}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
