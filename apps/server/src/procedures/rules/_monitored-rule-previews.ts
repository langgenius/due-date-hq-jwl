import { rollTaxPeriodForward } from '@duedatehq/core/tax-periods'
import {
  previewObligationsFromRules,
  type ObligationGenerationPreview,
  type ObligationRule,
  type RuleGenerationClientFacts,
} from '@duedatehq/core/rules'
import { isOnOrAfterDateOnly } from '../../lib/date-only'

export const MONITORED_PREVIEW_ROLL_FORWARD_YEARS = 5

export interface MonitoredRulePreview {
  preview: ObligationGenerationPreview
  rule: ObligationRule
  sourceRule: ObligationRule
  effectiveTaxYear: number
  rolledForwardYears: number
}

export interface MonitoredRulePreviewResult {
  previews: MonitoredRulePreview[]
  historicalSkippedPreviews: MonitoredRulePreview[]
  historicalSkippedCount: number
  rolledForwardDeadlineCount: number
}

export function resolveMonitoredRulePreviews(input: {
  client: RuleGenerationClientFacts
  rules: readonly ObligationRule[]
  monitoringStartDate?: string
  holidays?: readonly string[]
}): MonitoredRulePreviewResult {
  const ruleById = new Map(input.rules.map((rule) => [rule.id, rule]))
  const rawPreviews = previewObligationsFromRules({
    client: input.client,
    rules: input.rules,
    ...(input.holidays !== undefined ? { holidays: input.holidays } : {}),
  })
  const previews: MonitoredRulePreview[] = []
  const historicalSkippedPreviews: MonitoredRulePreview[] = []
  let rolledForwardDeadlineCount = 0

  for (const preview of rawPreviews) {
    const sourceRule = ruleById.get(preview.ruleId)
    if (!sourceRule || !preview.dueDate) continue

    if (
      !input.monitoringStartDate ||
      isOnOrAfterDateOnly(preview.dueDate, input.monitoringStartDate)
    ) {
      previews.push({
        preview,
        rule: sourceRule,
        sourceRule,
        effectiveTaxYear: sourceRule.taxYear,
        rolledForwardYears: 0,
      })
      continue
    }

    const rolled = resolveRolledForwardPreview({
      client: input.client,
      sourceRule,
      monitoringStartDate: input.monitoringStartDate,
      ...(input.holidays !== undefined ? { holidays: input.holidays } : {}),
    })
    if (rolled) {
      previews.push(rolled)
      rolledForwardDeadlineCount += 1
      continue
    }

    historicalSkippedPreviews.push({
      preview,
      rule: sourceRule,
      sourceRule,
      effectiveTaxYear: sourceRule.taxYear,
      rolledForwardYears: 0,
    })
  }

  return {
    previews,
    historicalSkippedPreviews,
    historicalSkippedCount: historicalSkippedPreviews.length,
    rolledForwardDeadlineCount,
  }
}

function resolveRolledForwardPreview(input: {
  client: RuleGenerationClientFacts
  sourceRule: ObligationRule
  monitoringStartDate: string
  holidays?: readonly string[]
}): MonitoredRulePreview | null {
  if (!canRollRuleForward(input.sourceRule)) return null

  for (let years = 1; years <= MONITORED_PREVIEW_ROLL_FORWARD_YEARS; years += 1) {
    const rule = rollRuleForward(input.sourceRule, years)
    const client = rollClientFactsForward(input.client, years)
    const preview = previewObligationsFromRules({
      client,
      rules: [rule],
      ...(input.holidays !== undefined ? { holidays: input.holidays } : {}),
    }).find(
      (candidate) =>
        candidate.dueDate && isOnOrAfterDateOnly(candidate.dueDate, input.monitoringStartDate),
    )

    if (!preview || !preview.dueDate) continue

    return {
      preview,
      rule,
      sourceRule: input.sourceRule,
      effectiveTaxYear: rule.taxYear,
      rolledForwardYears: years,
    }
  }

  return null
}

function canRollRuleForward(rule: ObligationRule): boolean {
  return (
    rule.dueDateLogic.kind === 'fixed_date' ||
    rule.dueDateLogic.kind === 'nth_day_after_tax_year_end' ||
    rule.dueDateLogic.kind === 'nth_day_after_tax_year_begin'
  )
}

function rollRuleForward(rule: ObligationRule, years: number): ObligationRule {
  return {
    ...rule,
    taxYear: rule.taxYear + years,
    applicableYear: rule.applicableYear + years,
    dueDateLogic:
      rule.dueDateLogic.kind === 'fixed_date'
        ? {
            ...rule.dueDateLogic,
            date: shiftDateOnlyYears(rule.dueDateLogic.date, years),
          }
        : rule.dueDateLogic,
  }
}

function rollClientFactsForward(
  client: RuleGenerationClientFacts,
  years: number,
): RuleGenerationClientFacts {
  if (client.taxYearStart === undefined || client.taxYearEnd === undefined) return client

  const rolled = rollTaxPeriodForward({
    taxPeriodStart: client.taxYearStart,
    taxPeriodEnd: client.taxYearEnd,
    years,
  })
  if (!rolled) return client

  return {
    ...client,
    taxYearStart: rolled.taxPeriodStart,
    taxYearEnd: rolled.taxPeriodEnd,
  }
}

function shiftDateOnlyYears(value: string, years: number): string {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value

  return new Date(Date.UTC(year + years, month - 1, day)).toISOString().slice(0, 10)
}
