import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'

import { describeTaxCode } from '@/lib/tax-codes'

/**
 * Inline human-readable tax-code label. By default it includes a
 * tooltip exposing the raw code, jurisdiction, and a plain-English
 * description; set `tooltip={false}` when the surrounding row already
 * owns the interaction affordance.
 *
 * Use this in text-heavy spots (drawer subtitles, table cells, alt-line
 * under a client name) where the user needs to read a form name, not a
 * snake_case identifier.
 *
 * For chip-style placements that need a bordered surface use
 * `<TaxCodeBadge>` from the same module.
 */
function TaxCodeLabel({
  code,
  className,
  asChild = false,
  tooltip = true,
}: {
  code: string | null | undefined
  className?: string
  asChild?: boolean
  tooltip?: boolean
}) {
  const meta = describeTaxCode(code)
  if (!meta.code) return null

  if (!tooltip) {
    return <span className={className}>{meta.label}</span>
  }

  const inner = asChild ? (
    <>{meta.label}</>
  ) : (
    <span className={cn('cursor-help underline-offset-2 hover:underline', className)}>
      {meta.label}
    </span>
  )

  return (
    <Tooltip>
      <TooltipTrigger
        render={asChild ? (props) => <span {...props}>{meta.label}</span> : undefined}
        className={asChild ? cn('cursor-help', className) : undefined}
      >
        {asChild ? null : inner}
      </TooltipTrigger>
      <TooltipContent>
        <TaxCodeTooltipBody
          code={meta.code}
          jurisdiction={meta.jurisdiction}
          description={meta.description}
        />
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Bordered chip variant — use in dense rows where the tax-code is the
 * primary read for the column (rules console preview, generation row).
 *
 * 2026-05-31 (Yuqi DS-first revision): now wraps the canonical
 * `<Badge variant="outline" />` primitive instead of a hand-rolled
 * Tooltip+span chrome. The badge's `rounded-full` + h-5 + px-2 +
 * `border-divider-regular text-text-secondary` shape replaces the
 * previous `rounded-sm`/`px-1.5`/`bg-background-subtle` one-off so
 * tax-code chips now read with the same shape as every other badge
 * in the app. Behavior parity: still renders a tooltip with the
 * raw code + jurisdiction + description; the Badge's `render` prop
 * threads the `<TooltipTrigger>` into the badge element so the
 * hover affordance survives the wrap.
 */
function TaxCodeBadge({
  code,
  className,
}: {
  code: string | null | undefined
  className?: string
}) {
  const meta = describeTaxCode(code)
  if (!meta.code) return null
  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <Badge variant="outline" className={cn('cursor-help', className)} {...props}>
            {meta.label}
          </Badge>
        )}
      />
      <TooltipContent>
        <TaxCodeTooltipBody
          code={meta.code}
          jurisdiction={meta.jurisdiction}
          description={meta.description}
        />
      </TooltipContent>
    </Tooltip>
  )
}

function TaxCodeTooltipBody({
  code,
  jurisdiction,
  description,
}: {
  code: string
  jurisdiction: string
  description: string
}) {
  return (
    <div className="flex max-w-[240px] flex-col gap-0.5 text-left">
      <span className="font-mono text-caption text-components-tooltip-text">{code}</span>
      <span className="text-caption-xs uppercase tracking-eyebrow-tight opacity-70">
        {jurisdiction}
      </span>
      {description ? <span className="mt-1 text-xs leading-snug">{description}</span> : null}
    </div>
  )
}

export { TaxCodeLabel, TaxCodeBadge }
