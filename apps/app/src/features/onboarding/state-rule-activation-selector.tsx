import { useMemo } from 'react'
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

interface StateRuleActivationSelectorProps {
  selected: readonly RuleGenerationState[]
  onChange: (states: RuleGenerationState[]) => void
}

export function StateRuleActivationSelector({
  selected,
  onChange,
}: StateRuleActivationSelectorProps) {
  const { t } = useLingui()
  const selectedSet = useMemo(() => new Set(selected), [selected])
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
      {/* Vertical header layout: the field name + helper sit on top in the
          canonical Label style; the controls drop below at full width with
          [Select all] taking the lead edge and [0/56] anchoring the trailing
          edge — same visual grammar as a typical settings row. A horizontal
          row would let the two controls compete with the two-line description
          for horizontal room at max-w-[400px] and squash everything. */}
      <div className="flex flex-col gap-1.5">
        {/* Mirrors the canonical <Label> token (text-sm font-medium
            leading-none text-text-primary) — using a <p> instead of
            <label> because this title covers a multi-tile grid, not
            a single named input. */}
        <p className="text-sm font-medium leading-none text-text-primary">
          <Trans>State rule coverage</Trans>{' '}
          <span className="font-normal text-text-muted">
            <Trans>(optional)</Trans>
          </span>
        </p>
        <p className="text-sm leading-relaxed text-text-muted">
          <Trans>
            Add state rules alongside federal. Start with federal only and add states later from the
            Rule Library.
          </Trans>
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={toggleAllStates}
          aria-label={allStatesSelected ? t`Clear all states` : t`Select all states`}
          aria-pressed={allStatesSelected}
          className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-sm border border-divider-subtle bg-background-default px-2 text-caption font-medium text-text-secondary outline-none transition-colors hover:border-divider-solid-alt hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <CheckIcon className="size-3.5" aria-hidden />
          <span>{allStatesSelected ? <Trans>Clear all</Trans> : <Trans>Select all</Trans>}</span>
        </button>
        <span className="rounded-sm border border-divider-subtle bg-background-subtle px-2 py-1 font-mono text-caption text-text-secondary tabular-nums">
          {selectedSet.size}/{ALL_RULE_GENERATION_STATES.length}
        </span>
      </div>

      <div className="rounded-lg border border-divider-regular bg-background-default p-3">
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
                        aria-label={selectedState ? t`${label}, selected` : label}
                        aria-pressed={selectedState}
                        style={{ gridRow: row, gridColumn: column }}
                        // Tile label is text-[10px] +
                        // font-medium so the 2-letter code reads
                        // as a state abbreviation, not a button
                        // label competing with the tile itself.
                        className={cn(
                          'relative flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm border font-mono text-[10px] font-medium transition-colors outline-none',
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

      {sourceDefinedReviewStates.length > 0 ? (
        // Copy names the source ("state's own calendar") and uses the concrete
        // verb "approve" instead of abstract "review" — "source-defined
        // calendar" / "pending rules" is internal vocab a first-run user has
        // no context for. Size is text-sm (canonical).
        <div className="rounded-lg border border-state-warning-hover-alt bg-state-warning-hover px-3 py-2 text-sm leading-relaxed text-text-secondary">
          <span className="font-medium text-text-primary">
            <Trans>Rule Library review required.</Trans>
          </span>{' '}
          <Trans>
            These states publish their own deadline calendars. After setup, review those rules in
            the Rule Library — deadlines generate once you approve them.
          </Trans>
        </div>
      ) : null}
    </div>
  )
}
