import { useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { CheckIcon } from 'lucide-react'

import { RuleGenerationStateValues, type RuleGenerationState } from '@duedatehq/contracts'
import { listObligationRules } from '@duedatehq/core/rules'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'
import { jurisdictionLabel } from '@/features/rules/rules-console-model'

const STATE_GRID: readonly (readonly (RuleGenerationState | '')[])[] = [
  ['', '', '', '', '', '', '', '', '', '', 'ME'],
  ['AK', '', '', '', '', '', '', '', 'VT', 'NH', ''],
  ['', '', '', '', '', '', '', '', 'MA', '', ''],
  ['WA', 'MT', 'ND', 'MN', 'IL', 'WI', 'MI', '', 'NY', 'RI', 'CT'],
  ['OR', 'ID', 'SD', 'IA', 'IN', 'OH', 'PA', 'NJ', '', '', ''],
  ['CA', 'NV', 'UT', 'WY', 'MO', 'KY', 'WV', 'VA', 'MD', 'DC', 'DE'],
  ['', 'AZ', 'CO', 'NE', 'KS', 'TN', 'NC', 'SC', '', '', ''],
  ['', '', 'NM', 'OK', 'AR', 'MS', 'AL', 'GA', '', '', ''],
  ['HI', '', '', 'TX', 'LA', '', '', '', 'FL', '', ''],
]

const STATE_TILES = STATE_GRID.flatMap((row, rowIndex) =>
  row.flatMap((code, columnIndex) =>
    code
      ? [
          {
            code,
            row: rowIndex + 1,
            column: columnIndex + 1,
          },
        ]
      : [],
  ),
)

const RULE_GENERATION_STATE_SET = new Set<string>(RuleGenerationStateValues)
const ALL_RULE_GENERATION_STATES: RuleGenerationState[] = [...RuleGenerationStateValues]

function isRuleGenerationState(value: string): value is RuleGenerationState {
  return RULE_GENERATION_STATE_SET.has(value)
}

const SOURCE_DEFINED_CALENDAR_REVIEW_STATE_SET = new Set<RuleGenerationState>(
  listObligationRules({ includeCandidates: true }).reduce<RuleGenerationState[]>((states, rule) => {
    if (
      rule.status !== 'deprecated' &&
      rule.dueDateLogic.kind === 'source_defined_calendar' &&
      isRuleGenerationState(rule.jurisdiction)
    ) {
      states.push(rule.jurisdiction)
    }
    return states
  }, []),
)

export function sourceDefinedCalendarReviewStates(
  selected: readonly RuleGenerationState[],
): RuleGenerationState[] {
  return selected.filter(
    (state, index) =>
      selected.indexOf(state) === index && SOURCE_DEFINED_CALENDAR_REVIEW_STATE_SET.has(state),
  )
}

export interface StateRuleActivationSelectorProps {
  selected: readonly RuleGenerationState[]
  onChange: (states: RuleGenerationState[]) => void
}

export function StateRuleActivationSelector({
  selected,
  onChange,
}: StateRuleActivationSelectorProps) {
  const { t } = useLingui()
  const [hoverCode, setHoverCode] = useState<RuleGenerationState | null>(null)
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const hoveredLabel = hoverCode ? jurisdictionLabel(hoverCode) : null
  const allStatesSelected = ALL_RULE_GENERATION_STATES.every((state) => selectedSet.has(state))
  const sourceDefinedReviewStates = useMemo(
    () => sourceDefinedCalendarReviewStates(selected),
    [selected],
  )

  function toggleState(code: RuleGenerationState) {
    if (selectedSet.has(code)) {
      onChange(selected.filter((state) => state !== code))
      return
    }
    onChange([...selected, code])
  }

  function toggleAllStates() {
    onChange(allStatesSelected ? [] : ALL_RULE_GENERATION_STATES)
  }

  return (
    <div className="mt-5 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption font-medium tracking-[0.08em] text-text-secondary uppercase">
            <Trans>State rule coverage</Trans>
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
            <Trans>
              Selected states activate with federal rules after this practice is created.
            </Trans>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleAllStates}
            aria-label={allStatesSelected ? t`Clear all states` : t`Select all states`}
            aria-pressed={allStatesSelected}
            className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-divider-subtle bg-background-default px-2 text-caption font-medium text-text-secondary outline-none transition-colors hover:border-divider-solid-alt hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <CheckIcon className="size-3.5" aria-hidden />
            <span>{allStatesSelected ? <Trans>Clear all</Trans> : <Trans>Select all</Trans>}</span>
          </button>
          <span className="rounded-sm border border-divider-subtle bg-background-subtle px-2 py-1 font-mono text-caption text-text-secondary tabular-nums">
            {selectedSet.size}/{ALL_RULE_GENERATION_STATES.length}
          </span>
        </div>
      </div>

      <div className="rounded-md border border-divider-regular bg-background-default p-3">
        <TooltipProvider delay={100}>
          <div className="grid grid-cols-11 grid-rows-9 justify-center gap-1">
            {STATE_TILES.map(({ code, row, column }) => {
              if (!RULE_GENERATION_STATE_SET.has(code)) return null

              const selectedState = selectedSet.has(code)
              const label = jurisdictionLabel(code)

              return (
                <Tooltip key={code}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => toggleState(code)}
                        onMouseEnter={() => setHoverCode(code)}
                        onMouseLeave={() =>
                          setHoverCode((current) => (current === code ? null : current))
                        }
                        aria-label={selectedState ? t`${label}, selected` : label}
                        aria-pressed={selectedState}
                        style={{ gridRow: row, gridColumn: column }}
                        className={cn(
                          'relative flex size-7 shrink-0 items-center justify-center rounded-sm border font-mono text-caption-xs font-semibold transition-colors outline-none',
                          'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-2 focus-visible:ring-offset-background-default',
                          selectedState
                            ? 'border-state-accent-active-alt bg-state-accent-solid text-text-inverted shadow-sm'
                            : 'border-divider-subtle bg-background-subtle text-text-muted hover:border-divider-solid-alt hover:bg-state-base-hover hover:text-text-primary',
                        )}
                      >
                        {code}
                        {selectedState ? (
                          <CheckIcon
                            className="absolute -top-1 -right-1 size-3 rounded-full bg-background-default p-0.5 text-text-accent"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    }
                  />
                  <TooltipContent side="top">{label}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </TooltipProvider>
      </div>

      <p className="min-h-[18px] text-caption leading-[18px] text-text-muted">
        {hoverCode && hoveredLabel ? (
          <>
            <span className="font-mono font-medium text-text-secondary">{hoverCode}</span>
            <span aria-hidden> · </span>
            {hoveredLabel}
          </>
        ) : null}
      </p>

      {sourceDefinedReviewStates.length > 0 ? (
        <div className="rounded-md border border-state-warning-hover-alt bg-state-warning-hover px-3 py-2 text-[12px] leading-relaxed text-text-secondary">
          <span className="font-medium text-text-primary">
            <Trans>Rule Library review required.</Trans>
          </span>{' '}
          <Trans>
            Some selected states publish deadlines through official calendars that need practice
            review. After entering the product, open Rule Library and review the pending rules
            before those due dates can be generated.
          </Trans>
        </div>
      ) : null}
    </div>
  )
}
