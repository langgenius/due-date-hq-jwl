import { cn } from '@duedatehq/ui/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'

import { describeTaxCode } from '@/lib/tax-codes'

/**
 * Inline human-readable tax-code label with a tooltip exposing the raw
 * code, jurisdiction, and a plain-English description. Use this in
 * text-heavy spots (drawer subtitles, table cells, alt-line under a
 * client name) where the user needs to read a form name, not a
 * snake_case identifier.
 *
 * For chip-style placements that need a bordered surface use
 * `<TaxCodeBadge>` from the same module.
 */
function TaxCodeLabel({
  code,
  className,
  asChild = false,
}: {
  code: string | null | undefined
  className?: string
  asChild?: boolean
}) {
  const meta = describeTaxCode(code)
  if (!meta.code) return null

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
        className={cn(
          'inline-flex h-5 cursor-help items-center rounded-sm border border-divider-regular bg-background-subtle px-1.5 text-caption font-medium text-text-secondary',
          className,
        )}
      >
        {meta.label}
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
      <span className="text-caption-xs uppercase tracking-[0.06em] opacity-70">{jurisdiction}</span>
      {description ? <span className="mt-1 text-xs leading-snug">{description}</span> : null}
    </div>
  )
}

export { TaxCodeLabel, TaxCodeBadge }
