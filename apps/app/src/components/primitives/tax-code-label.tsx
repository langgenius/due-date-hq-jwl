import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'

import { describeTaxCode } from '@/lib/tax-codes'

/**
 * Inline human-readable tax-code label. By default it includes a
 * tooltip with the human label, jurisdiction, and a plain-English
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
        className={asChild ? cn('cursor-help', className) : 'cursor-help'}
      >
        {asChild ? null : inner}
      </TooltipTrigger>
      <TooltipContent>
        <TaxCodeTooltipBody
          label={meta.label}
          jurisdiction={meta.jurisdiction}
          description={meta.description}
        />
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Bordered chip variant — use in dense rows where the tax-code is the
 * primary read for the column (rules console preview, generation row,
 * dashboard ActionsTable FILING column).
 *
 * Chip chrome is a true code-chip:
 *   • `bg-background-subtle` (soft surface, not white)
 *   • `font-mono` (JetBrains Mono) + `font-medium` (500) at `text-xs`
 *   • `rounded-sm` — between pill and square — matches Pencil's
 *     5px corner radius on form-code chips
 *   • `px-3 py-1` (Pencil's [4, 12])
 *   • `border-divider-subtle` hairline border (subtle, not regular)
 *
 * The Badge primitive's `variant="outline"` still drives focus +
 * hover behavior; only the chrome (bg, font, radius, padding) is
 * overridden via className. Tooltip behavior unchanged.
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
          <Badge
            variant="outline"
            // `font-medium` (500), not bold: the mono face + the
            // tight tracking already give the code chip enough
            // identity; bold made it shout next to the row's
            // body text.
            className={cn(
              'cursor-help border-divider-subtle bg-background-subtle px-3 py-1 font-mono font-medium tracking-tight rounded-sm',
              className,
            )}
            {...props}
          >
            {meta.label}
          </Badge>
        )}
      />
      <TooltipContent>
        <TaxCodeTooltipBody
          label={meta.label}
          jurisdiction={meta.jurisdiction}
          description={meta.description}
        />
      </TooltipContent>
    </Tooltip>
  )
}

function TaxCodeTooltipBody({
  label,
  jurisdiction,
  description,
}: {
  label: string
  jurisdiction: string
  description: string
}) {
  return (
    <div className="flex max-w-[240px] flex-col gap-0.5 text-left">
      <span className="text-caption font-semibold text-components-tooltip-text">{label}</span>
      <span className="text-caption-xs uppercase tracking-eyebrow-tight opacity-70">
        {jurisdiction}
      </span>
      {description ? <span className="mt-1 text-xs leading-snug">{description}</span> : null}
    </div>
  )
}

export { TaxCodeLabel, TaxCodeBadge }
