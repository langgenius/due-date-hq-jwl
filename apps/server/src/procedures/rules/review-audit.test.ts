/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused service test double implements only the repos used by rule review acceptance.
 */
import { describe, expect, it, vi } from 'vitest'
import { findRuleById } from '@duedatehq/core/rules'
import type { PracticeRuleInput, PracticeRuleReviewTaskDecisionInput } from '@duedatehq/ports/rules'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import type { RpcContext } from '../_context'
import { acceptTemplateRule } from './index'

const REVIEWED_AT = new Date('2026-05-23T14:08:09.000Z')

function makeContext() {
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
  const writeAudit = vi.fn(async () => ({ id: 'audit_123' }))
  const scoped = {
    firmId: 'firm_123',
    rules: {
      upsertPracticeRule,
      decideReviewTask,
    },
    audit: {
      write: writeAudit,
    },
  } as unknown as ScopedRepo
  const context = {
    env: {},
    request: new Request('http://localhost/rpc'),
    vars: {
      scoped,
      tenantContext: {
        firmId: 'firm_123',
        plan: 'team',
        seatLimit: 10,
        timezone: 'America/New_York',
        internalDeadlineOffsetDays: 14,
        monitoringStartDate: '2026-05-29',
        status: 'active',
        ownerUserId: 'user_owner',
        coordinatorCanSeeDollars: false,
      },
      userId: 'user_123',
    },
  } as unknown as RpcContext

  return { context, upsertPracticeRule, decideReviewTask, writeAudit }
}

describe('rule review audit metadata', () => {
  it('keeps audit actor ids while exposing reviewer display metadata on accepted rules', async () => {
    const rule = findRuleById('ca.llc.annual_tax.2026')
    if (!rule) throw new Error('Missing CA annual tax rule fixture.')
    const { context, upsertPracticeRule, decideReviewTask, writeAudit } = makeContext()

    const task = await acceptTemplateRule({
      context,
      rule,
      reviewNote: 'Accepted after source review.',
      reviewedBy: 'user_123',
      reviewedByName: 'Sarah Martinez',
      reviewedAt: REVIEWED_AT,
      catalogSeeded: true,
      generateObligations: false,
    })

    expect(upsertPracticeRule).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: rule.id,
        status: 'active',
        reviewedBy: 'user_123',
        reviewedAt: REVIEWED_AT,
        ruleJson: expect.objectContaining({
          verifiedBy: 'Sarah Martinez',
          reviewedByName: 'Sarah Martinez',
          reviewedAt: '2026-05-23T14:08:09.000Z',
        }),
      }),
    )
    expect(decideReviewTask).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: rule.id,
        status: 'accepted',
        reviewedBy: 'user_123',
        reviewedAt: REVIEWED_AT,
      }),
    )
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user_123',
        entityType: 'rule',
        entityId: rule.id,
        action: 'rules.accepted',
      }),
    )
    expect(task.rule.reviewedByName).toBe('Sarah Martinez')
    expect(task.rule.reviewedAt).toBe('2026-05-23T14:08:09.000Z')
  })
})
