import { Trans } from '@lingui/react/macro'
import { CheckIcon, MinusIcon } from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

// Deferred [方向] item: "可解释 relevance score: dimensions (state /
// county / entity / tax type / service line) + per-dimension evidence".
//
// Shows WHY an alert matched a firm's clients across 5 dimensions:
//   • State match  (e.g. CA ✓)
//   • County match (Los Angeles ✓ — only when alert is county-scoped)
//   • Entity type  (LLC / partnership ✓)
//   • Tax type     (1065 ✓)
//   • Service line (Tax Filing ✓ — only when firm scopes by service)
//
// Renders as a compact chip "Match 4/5" on alert cards; hover reveals
// the per-dimension breakdown. When `verbose` is set the chip
// expands inline (use this on the alert drawer where space allows).
//
// Data model — the relevance dimensions are derived per-alert per-
// firm. Callers must pre-compute the 5 booleans on the back-end (or
// stub them on the front-end for demo purposes — the chip itself
// is data-agnostic). When the contract gains a
// `relevanceDimensions` field on PulseAlertPublic, this primitive
// reads it directly with no signature change.

export interface RelevanceDimensions {
  state: boolean
  county: boolean | null // null = not applicable (alert isn't county-scoped)
  entityType: boolean
  taxType: boolean
  serviceLine: boolean | null // null = firm doesn't scope by service
}

function countMatched(dims: RelevanceDimensions): { matched: number; total: number } {
  let matched = 0
  let total = 0
  for (const value of Object.values(dims)) {
    if (value === null) continue
    total++
    if (value) matched++
  }
  return { matched, total }
}

function PulseRelevanceMatrix({
  dimensions,
  verbose = false,
  className,
}: {
  dimensions: RelevanceDimensions
  verbose?: boolean
  className?: string
}) {
  const { matched, total } = countMatched(dimensions)
  const isPerfect = matched === total
  if (verbose) {
    return (
      <ul className={cn('flex flex-wrap items-center gap-1.5', className)}>
        <DimensionItem label={<Trans>State</Trans>} value={dimensions.state} />
        {dimensions.county !== null && (
          <DimensionItem label={<Trans>County</Trans>} value={dimensions.county} />
        )}
        <DimensionItem label={<Trans>Entity</Trans>} value={dimensions.entityType} />
        <DimensionItem label={<Trans>Form</Trans>} value={dimensions.taxType} />
        {dimensions.serviceLine !== null && (
          <DimensionItem label={<Trans>Service</Trans>} value={dimensions.serviceLine} />
        )}
      </ul>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <Badge
            variant={isPerfect ? 'success' : 'outline'}
            className={cn('cursor-help tabular-nums', className)}
            {...props}
          >
            <Trans>
              Match {matched}/{total}
            </Trans>
          </Badge>
        )}
      />
      <TooltipContent>
        <PulseRelevanceMatrix dimensions={dimensions} verbose />
      </TooltipContent>
    </Tooltip>
  )
}

function DimensionItem({ label, value }: { label: React.ReactNode; value: boolean }) {
  return (
    <li
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs',
        value
          ? 'border-state-success-border bg-state-success-hover text-text-success'
          : 'border-divider-subtle bg-background-section text-text-tertiary',
      )}
    >
      {value ? (
        <CheckIcon className="size-3 shrink-0" aria-hidden />
      ) : (
        <MinusIcon className="size-3 shrink-0" aria-hidden />
      )}
      <span>{label}</span>
    </li>
  )
}

export { PulseRelevanceMatrix }
