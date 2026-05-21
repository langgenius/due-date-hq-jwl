/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused service tests use a narrow scoped-repo double for the rule
 * activation paths under test.
 */
import { describe, expect, it, vi } from 'vitest'
import { listObligationRules } from '@duedatehq/core/rules'
import type {
  PracticeRuleInput,
  PracticeRuleReviewTaskDecisionInput,
  PracticeRuleReviewTaskInput,
} from '@duedatehq/ports/rules'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import {
  activateOnboardingJurisdictionRules,
  isOnboardingActivatableRule,
  isPracticeRuleBehindTemplate,
  onboardingActivationJurisdictions,
} from './index'

const USER_ID = 'user_123'
const REVIEWED_AT = new Date('2026-05-21T00:00:00.000Z')

function makeScoped() {
  const upsertPracticeRule = vi.fn(async (input: PracticeRuleInput) => ({
    id: `practice_${input.ruleId}`,
    firmId: 'firm_123',
    ruleId: input.ruleId,
    templateId: input.templateId ?? null,
    templateVersion: input.templateVersion,
    status: input.status,
    ruleJson: input.ruleJson,
    reviewNote: input.reviewNote,
    reviewedBy: input.reviewedBy ?? null,
    reviewedAt: input.reviewedAt ?? null,
    createdAt: REVIEWED_AT,
    updatedAt: REVIEWED_AT,
  }))
  const decideReviewTask = vi.fn(async (input: PracticeRuleReviewTaskDecisionInput) => ({
    id: `task_${input.ruleId}`,
    firmId: 'firm_123',
    ruleId: input.ruleId,
    templateVersion: input.templateVersion,
    status: input.status,
    reason: 'new_template' as const,
    reviewNote: input.reviewNote,
    reviewedBy: input.reviewedBy,
    reviewedAt: input.reviewedAt ?? REVIEWED_AT,
    createdAt: REVIEWED_AT,
    updatedAt: REVIEWED_AT,
  }))
  const ensureReviewTasks = vi.fn(async (inputs: PracticeRuleReviewTaskInput[]) =>
    inputs.map((input) => ({
      id: `task_${input.ruleId}`,
      firmId: 'firm_123',
      ruleId: input.ruleId,
      templateVersion: input.templateVersion,
      status: 'open' as const,
      reason: input.reason,
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: REVIEWED_AT,
      updatedAt: REVIEWED_AT,
    })),
  )
  const writeAudit = vi.fn(async () => ({ id: 'audit_123' }))

  const scoped = {
    firmId: 'firm_123',
    rules: {
      upsertPracticeRule,
      decideReviewTask,
      ensureReviewTasks,
    },
    audit: {
      write: writeAudit,
    },
  } as unknown as ScopedRepo

  return { scoped, upsertPracticeRule, decideReviewTask, ensureReviewTasks, writeAudit }
}

describe('onboarding rule activation', () => {
  it('derives FED plus selected states only when at least one state is selected', () => {
    expect(onboardingActivationJurisdictions([])).toEqual([])
    expect(onboardingActivationJurisdictions(['CA', 'TX', 'CA'])).toEqual(['FED', 'CA', 'TX'])
  })

  it('keeps only deprecated templates out of onboarding auto-activation', () => {
    expect(isOnboardingActivatableRule({ status: 'verified' })).toBe(true)
    expect(isOnboardingActivatableRule({ status: 'candidate' })).toBe(true)
    expect(isOnboardingActivatableRule({ status: 'deprecated' })).toBe(false)
  })

  it('does not treat accepted concrete drafts as stale template reviews', () => {
    expect(isPracticeRuleBehindTemplate({ practiceVersion: 1, templateVersion: 2 })).toBe(true)
    expect(isPracticeRuleBehindTemplate({ practiceVersion: 1, templateVersion: 1 })).toBe(false)
    expect(isPracticeRuleBehindTemplate({ practiceVersion: 2, templateVersion: 1 })).toBe(false)
  })

  it('activates FED and selected-state rules while reporting source-defined review needs', async () => {
    const { scoped, upsertPracticeRule, decideReviewTask, writeAudit } = makeScoped()
    const generateObligations = vi.fn(async () => ({
      candidateCount: 0,
      createdCount: 0,
      duplicateCount: 0,
      clientCount: 0,
    }))
    const ensureCatalog = vi.fn(async () => undefined)

    const result = await activateOnboardingJurisdictionRules({
      scoped,
      userId: USER_ID,
      internalDeadlineOffsetDays: 14,
      states: ['CA', 'TX'],
      now: REVIEWED_AT,
      ensureCatalog,
      generateObligations,
    })

    const matchingRules = listObligationRules({ includeCandidates: true }).filter(
      (rule) =>
        rule.jurisdiction === 'FED' || rule.jurisdiction === 'CA' || rule.jurisdiction === 'TX',
    )
    const expectedRules = matchingRules.filter(isOnboardingActivatableRule)
    const expectedReviewRules = expectedRules.filter(
      (rule) => rule.dueDateLogic.kind === 'source_defined_calendar',
    )
    const expectedActiveRules = expectedRules.filter(
      (rule) => rule.dueDateLogic.kind !== 'source_defined_calendar',
    )

    expect(result).toMatchObject({
      selectedStates: ['CA', 'TX'],
      jurisdictions: ['FED', 'CA', 'TX'],
      activatedCount: expectedActiveRules.length,
      skippedCount: matchingRules.length - expectedRules.length,
      reviewRequiredCount: expectedReviewRules.length,
      reviewRequiredJurisdictions: ['FED', 'CA', 'TX'],
      generatedObligationCount: 0,
    })
    expect(ensureCatalog).toHaveBeenCalledOnce()
    expect(upsertPracticeRule).toHaveBeenCalledTimes(expectedRules.length)
    expect(decideReviewTask).toHaveBeenCalledTimes(expectedActiveRules.length)
    expect(generateObligations).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        internalDeadlineOffsetDays: 14,
        rules: expect.arrayContaining([
          expect.objectContaining({
            id: 'ca.llc.annual_tax.2026',
            status: 'verified',
          }),
        ]),
      }),
    )
    expect(generateObligations).toHaveBeenCalledWith(
      expect.objectContaining({
        rules: expect.not.arrayContaining([
          expect.objectContaining({
            id: 'tx.sales_use_tax.candidate.2026',
          }),
        ]),
      }),
    )

    expect(upsertPracticeRule).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: 'tx.sales_use_tax.candidate.2026',
        status: 'pending_review',
        ruleJson: expect.objectContaining({
          status: 'pending_review',
          dueDateLogic: expect.objectContaining({ kind: 'source_defined_calendar' }),
        }),
      }),
    )
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'rules.onboarding_activated',
        after: expect.objectContaining({
          selectedStates: ['CA', 'TX'],
          jurisdictions: ['FED', 'CA', 'TX'],
          activatedCount: expectedActiveRules.length,
          skippedCount: matchingRules.length - expectedRules.length,
          reviewRequiredCount: expectedReviewRules.length,
          reviewRequiredJurisdictions: ['FED', 'CA', 'TX'],
          generatedObligationCount: 0,
        }),
      }),
    )
  })

  it('queues Alaska source-defined rules for due-date review without activating them', async () => {
    const { scoped, upsertPracticeRule, decideReviewTask, ensureReviewTasks } = makeScoped()
    const generateObligations = vi.fn(async () => ({
      candidateCount: 0,
      createdCount: 0,
      duplicateCount: 0,
      clientCount: 0,
    }))

    const result = await activateOnboardingJurisdictionRules({
      scoped,
      userId: USER_ID,
      internalDeadlineOffsetDays: 14,
      states: ['AK'],
      now: REVIEWED_AT,
      generateObligations,
    })

    const matchingRules = listObligationRules({ includeCandidates: true }).filter(
      (rule) => rule.jurisdiction === 'FED' || rule.jurisdiction === 'AK',
    )
    const expectedRules = matchingRules.filter(isOnboardingActivatableRule)
    const expectedReviewRules = expectedRules.filter(
      (rule) => rule.dueDateLogic.kind === 'source_defined_calendar',
    )
    const expectedActiveRules = expectedRules.filter(
      (rule) => rule.dueDateLogic.kind !== 'source_defined_calendar',
    )

    expect(result).toMatchObject({
      selectedStates: ['AK'],
      jurisdictions: ['FED', 'AK'],
      activatedCount: expectedActiveRules.length,
      skippedCount: matchingRules.length - expectedRules.length,
      reviewRequiredCount: expectedReviewRules.length,
      reviewRequiredJurisdictions: ['FED', 'AK'],
    })
    expect(upsertPracticeRule.mock.calls.some(([input]) => input.ruleId.startsWith('ak.'))).toBe(
      true,
    )
    expect(
      upsertPracticeRule.mock.calls.some(
        ([input]) => input.ruleId.startsWith('ak.') && input.status === 'pending_review',
      ),
    ).toBe(true)
    expect(decideReviewTask.mock.calls.some(([input]) => input.ruleId.startsWith('ak.'))).toBe(
      false,
    )
    expect(
      ensureReviewTasks.mock.calls.some(([inputs]) =>
        inputs.some((input) => input.ruleId.startsWith('ak.')),
      ),
    ).toBe(true)
  })

  it('returns an empty summary without writes when no states are selected', async () => {
    const { scoped, upsertPracticeRule, decideReviewTask, ensureReviewTasks, writeAudit } =
      makeScoped()

    const result = await activateOnboardingJurisdictionRules({
      scoped,
      userId: USER_ID,
      internalDeadlineOffsetDays: 14,
      states: [],
      now: REVIEWED_AT,
    })

    expect(result).toEqual({
      selectedStates: [],
      jurisdictions: [],
      activatedCount: 0,
      skippedCount: 0,
      reviewRequiredCount: 0,
      reviewRequiredJurisdictions: [],
      generatedObligationCount: 0,
    })
    expect(upsertPracticeRule).not.toHaveBeenCalled()
    expect(decideReviewTask).not.toHaveBeenCalled()
    expect(ensureReviewTasks).not.toHaveBeenCalled()
    expect(writeAudit).not.toHaveBeenCalled()
  })
})
