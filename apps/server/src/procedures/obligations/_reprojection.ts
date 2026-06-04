import { ObligationRuleSchema, type ReprojectionOutput } from '@duedatehq/contracts'
import { expandDueDateLogic } from '@duedatehq/core/date-logic'
import { federalHolidaysForYears } from '@duedatehq/core/federal-holidays'
import {
  DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS,
  internalDeadlineFromBaseDueDate,
} from '@duedatehq/core/deadlines'
import type { ObligationRule } from '@duedatehq/core/rules'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import { toCoreRule } from '../rules/runtime'

type ReprojectionMode = 'preview' | 'apply'

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Re-project rule-backed deadlines: recompute the statutory date from the current
 * verified rule's due-date logic (re-using the obligation's own stored tax period)
 * plus federal holidays, and compare to the stored baseDueDate.
 *
 * - Unchanged dates are dropped from the output.
 * - Projected (confirmed=false) drift → 'will_update'; in 'apply' mode baseDueDate +
 *   currentDueDate are rewritten in place (they were never client-facing).
 * - Confirmed drift → 'requires_review' (report-only): baseDueDate is immutable and
 *   shifts through the pulse / exception-overlay path so client dates stay auditable.
 * - A rule that no longer resolves → 'no_verified_rule'.
 */
export async function runReprojection(input: {
  scoped: ScopedRepo
  userId: string
  mode: ReprojectionMode
  params: { targetFilingYear?: number | undefined; obligationIds?: string[] | undefined }
  internalDeadlineOffsetDays?: number
  now?: Date
  rules?: readonly ObligationRule[]
}): Promise<ReprojectionOutput> {
  const candidateInput: { taxYears?: number[]; obligationIds?: string[] } = {}
  if (input.params.targetFilingYear !== undefined) {
    candidateInput.taxYears = [input.params.targetFilingYear]
  }
  if (input.params.obligationIds !== undefined) {
    candidateInput.obligationIds = input.params.obligationIds
  }
  const candidates = await input.scoped.obligations.listReprojectionCandidates(candidateInput)

  // Current verified rules indexed by id. Read directly (no review-task side effects
  // — preview must not write); tests may inject rules to bypass practice-rule parsing.
  const ruleById = new Map<string, ObligationRule>()
  if (input.rules) {
    for (const rule of input.rules) {
      if (rule.status === 'verified') ruleById.set(rule.id, rule)
    }
  } else {
    for (const row of await input.scoped.rules.listActivePracticeRules()) {
      const parsed = ObligationRuleSchema.safeParse(row.ruleJson)
      if (!parsed.success) continue
      const rule = toCoreRule(parsed.data)
      if (rule.status === 'verified') ruleById.set(rule.id, rule)
    }
  }

  const clients = await input.scoped.clients.findManyByIds([
    ...new Set(candidates.map((candidate) => candidate.clientId)),
  ])
  const clientNameById = new Map(clients.map((client) => [client.id, client.name]))

  const offsetDays = input.internalDeadlineOffsetDays ?? DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS
  const rows: ReprojectionOutput['rows'] = []
  const updates: Array<{ id: string; baseDueDate: Date; currentDueDate: Date }> = []

  for (const candidate of candidates) {
    if (!candidate.ruleId) continue
    const oldBaseDueDate = isoDay(candidate.baseDueDate)
    const clientName = clientNameById.get(candidate.clientId) ?? candidate.clientId
    const rule = ruleById.get(candidate.ruleId)

    if (!rule) {
      rows.push({
        obligationId: candidate.id,
        clientId: candidate.clientId,
        clientName,
        taxType: candidate.taxType,
        taxYear: candidate.taxYear,
        confirmed: candidate.confirmed,
        oldBaseDueDate,
        newBaseDueDate: null,
        disposition: 'no_verified_rule',
        updated: false,
      })
      continue
    }

    // Recompute from the current rule logic, re-using the obligation's own tax
    // period, with federal holidays around the stored due-date year.
    const dueYear = candidate.baseDueDate.getUTCFullYear()
    const expandInput: {
      taxYearStart?: string
      taxYearEnd?: string
      holidays?: readonly string[]
    } = { holidays: federalHolidaysForYears([dueYear - 1, dueYear, dueYear + 1]) }
    if (candidate.taxPeriodStart) expandInput.taxYearStart = isoDay(candidate.taxPeriodStart)
    if (candidate.taxPeriodEnd) expandInput.taxYearEnd = isoDay(candidate.taxPeriodEnd)

    const expanded = expandDueDateLogic(rule.dueDateLogic, expandInput)
    const match = expanded.find((entry) => entry.period === candidate.rulePeriod) ?? expanded[0]
    const newBaseDueDate = match?.dueDate ?? null

    // Unchanged or not concretely computable — nothing to surface.
    if (!newBaseDueDate || newBaseDueDate === oldBaseDueDate) continue

    if (candidate.confirmed) {
      rows.push({
        obligationId: candidate.id,
        clientId: candidate.clientId,
        clientName,
        taxType: candidate.taxType,
        taxYear: candidate.taxYear,
        confirmed: true,
        oldBaseDueDate,
        newBaseDueDate,
        disposition: 'requires_review',
        updated: false,
      })
      continue
    }

    const willUpdate = input.mode === 'apply'
    if (willUpdate) {
      const base = new Date(`${newBaseDueDate}T00:00:00.000Z`)
      updates.push({
        id: candidate.id,
        baseDueDate: base,
        currentDueDate: internalDeadlineFromBaseDueDate(base, offsetDays),
      })
    }
    rows.push({
      obligationId: candidate.id,
      clientId: candidate.clientId,
      clientName,
      taxType: candidate.taxType,
      taxYear: candidate.taxYear,
      confirmed: false,
      oldBaseDueDate,
      newBaseDueDate,
      disposition: 'will_update',
      updated: willUpdate,
    })
  }

  let auditId: string | null = null
  if (input.mode === 'apply' && updates.length > 0) {
    await input.scoped.obligations.updateProjectedDueDates(updates)
    const audit = await input.scoped.audit.write({
      actorId: input.userId,
      entityType: 'obligation_batch',
      entityId: updates[0]?.id ?? 'empty',
      action: 'obligation.reprojected',
      after: {
        updatedCount: updates.length,
        updatedObligationIds: updates.map((update) => update.id),
        ...(input.params.targetFilingYear !== undefined
          ? { targetFilingYear: input.params.targetFilingYear }
          : {}),
      },
    })
    auditId = audit.id
  }

  return {
    summary: {
      candidateCount: candidates.length,
      changedCount: rows.filter((row) => row.disposition !== 'no_verified_rule').length,
      willUpdateCount: rows.filter((row) => row.disposition === 'will_update').length,
      requiresReviewCount: rows.filter((row) => row.disposition === 'requires_review').length,
      updatedCount: updates.length,
    },
    rows,
    auditId,
  }
}
