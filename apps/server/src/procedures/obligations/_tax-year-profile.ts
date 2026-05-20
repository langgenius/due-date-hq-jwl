import type { ObligationInstancePublic } from '@duedatehq/contracts'
import { internalDeadlineFromBaseDueDate } from '@duedatehq/core/deadlines'
import {
  findRuleById,
  listObligationRules,
  normalizeRuleTaxTypeCandidates,
  previewObligationsFromRules,
  STATE_RULE_JURISDICTIONS,
  type ObligationGenerationPreview,
  type ObligationRule,
  type RuleGenerationState,
} from '@duedatehq/core/rules'
import { resolveClientReturnTaxPeriod } from '@duedatehq/core/tax-periods'
import type { ClientRow } from '@duedatehq/ports/clients'
import type { ObligationInstanceRow } from '@duedatehq/ports/obligations'

const RULE_GENERATION_STATES = new Set<string>(STATE_RULE_JURISDICTIONS)

function isRuleGenerationState(value: string | null | undefined): value is RuleGenerationState {
  return typeof value === 'string' && RULE_GENERATION_STATES.has(value)
}

export function dateOrNull(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null
}

export function paymentDueDateForTaxYearPreview(
  preview: ObligationGenerationPreview,
  rule: ObligationRule,
  dueDate: Date,
): Date | null {
  if (preview.isPayment) return dueDate
  if (rule.extensionPolicy.paymentExtended) return null
  if (
    rule.taxType === 'federal_1040' ||
    rule.taxType === 'federal_1040_extension' ||
    rule.taxType === 'federal_1041' ||
    rule.taxType === 'federal_1120' ||
    rule.taxType === 'federal_1120s'
  ) {
    return dueDate
  }
  return null
}

function resolveProfileRule(input: {
  row: ObligationInstanceRow
  client: ClientRow
}): ObligationRule | null {
  if (input.row.ruleId) return findRuleById(input.row.ruleId) ?? null

  const candidates = normalizeRuleTaxTypeCandidates(input.row.taxType).map(
    (candidate) => candidate.taxType,
  )
  const candidateSet = new Set([input.row.taxType, ...candidates])
  const rowJurisdiction = input.row.jurisdiction
  return (
    listObligationRules().find((rule) => {
      if (!candidateSet.has(rule.taxType)) return false
      if (rule.jurisdiction === 'FED') return true
      if (rowJurisdiction) return rule.jurisdiction === rowJurisdiction
      return input.client.state === rule.jurisdiction
    }) ?? null
  )
}

export function resolveUpdatedTaxYearProfilePlan(input: {
  row: ObligationInstanceRow
  client: ClientRow
  taxYearType: ObligationInstancePublic['taxYearType']
  fiscalYearEndMonth: number | null
  fiscalYearEndDay: number | null
  internalDeadlineOffsetDays: number
}): {
  taxPeriodStart: Date | null
  taxPeriodEnd: Date | null
  taxPeriodKind: ObligationInstancePublic['taxPeriodKind']
  taxPeriodSource: ObligationInstancePublic['taxPeriodSource']
  taxPeriodReviewReason: string | null
  baseDueDate: Date
  currentDueDate: Date
  filingDueDate: Date | null
  paymentDueDate: Date | null
} | null {
  const rule = resolveProfileRule({ row: input.row, client: input.client })
  if (!rule) return null

  const taxPeriod = resolveClientReturnTaxPeriod({
    taxYear: rule.taxYear,
    client: {
      taxYearType: input.taxYearType,
      fiscalYearEndMonth: input.fiscalYearEndMonth,
      fiscalYearEndDay: input.fiscalYearEndDay,
    },
    source: 'manual_cpa_confirmed',
  })
  const generationState =
    input.row.jurisdiction === 'FED' || !isRuleGenerationState(input.row.jurisdiction)
      ? input.client.state
      : input.row.jurisdiction
  if (!isRuleGenerationState(generationState)) return null

  const previews = previewObligationsFromRules({
    client: {
      id: input.client.id,
      entityType: input.client.entityType,
      state: generationState,
      taxTypes: [input.row.taxType],
      taxYearType: input.taxYearType,
      fiscalYearEndMonth: input.fiscalYearEndMonth,
      fiscalYearEndDay: input.fiscalYearEndDay,
      taxPeriodSource: 'manual_cpa_confirmed',
      ...(taxPeriod.taxPeriodStart ? { taxYearStart: taxPeriod.taxPeriodStart } : {}),
      ...(taxPeriod.taxPeriodEnd ? { taxYearEnd: taxPeriod.taxPeriodEnd } : {}),
      ...(input.client.taxClassification
        ? { taxClassification: input.client.taxClassification }
        : {}),
    },
    rules: [rule],
  })
  const preview =
    previews.find(
      (candidate) =>
        candidate.ruleId === rule.id &&
        (input.row.rulePeriod === null || candidate.period === input.row.rulePeriod),
    ) ?? previews[0]
  if (!preview?.dueDate) return null

  const baseDueDate = new Date(`${preview.dueDate}T00:00:00.000Z`)
  return {
    taxPeriodStart: dateOrNull(taxPeriod.taxPeriodStart),
    taxPeriodEnd: dateOrNull(taxPeriod.taxPeriodEnd),
    taxPeriodKind: taxPeriod.taxPeriodKind,
    taxPeriodSource: taxPeriod.taxPeriodSource,
    taxPeriodReviewReason: taxPeriod.taxPeriodReviewReason,
    baseDueDate,
    currentDueDate: internalDeadlineFromBaseDueDate(baseDueDate, input.internalDeadlineOffsetDays),
    filingDueDate: preview.isFiling ? baseDueDate : null,
    paymentDueDate: paymentDueDateForTaxYearPreview(preview, rule, baseDueDate),
  }
}
