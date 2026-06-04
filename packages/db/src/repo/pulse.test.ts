/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused Drizzle chain doubles only implement the query-builder methods used here.
 */
import { describe, expect, it, vi } from 'vitest'
import { makePulseOpsRepo, makePulseRepo, PulseRepoError, scorePulsePriority } from './pulse'

const ALERT = {
  alertId: 'alert-1',
  pulseId: 'pulse-1',
  alertStatus: 'matched' as const,
  matchedCount: 1,
  needsReviewCount: 1,
  source: 'IRS Disaster Relief',
  sourceUrl: 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations',
  publishedAt: new Date('2026-04-15T17:00:00.000Z'),
  changeKind: 'deadline_shift' as const,
  actionMode: 'due_date_overlay' as const,
  aiSummary: 'IRS CA storm relief',
  verbatimQuote: 'Individuals and businesses in Los Angeles County have until October 15, 2026.',
  parsedJurisdiction: 'CA',
  parsedCounties: ['Los Angeles County'],
  parsedForms: ['federal_1065', 'federal_1120s'],
  parsedEntityTypes: ['llc', 's_corp'],
  parsedOriginalDueDate: new Date('2026-03-15T00:00:00.000Z'),
  parsedNewDueDate: new Date('2026-10-15T00:00:00.000Z'),
  parsedEffectiveFrom: new Date('2026-04-15T00:00:00.000Z'),
  parsedEffectiveUntil: null,
  affectedRuleIds: [],
  structuredChange: null,
  confidence: 0.94,
  pulseStatus: 'approved' as const,
  reviewedBy: 'user-1',
  reviewedAt: new Date('2026-04-15T18:00:00.000Z'),
  isSample: true,
}

const ELIGIBLE = {
  obligationId: 'oi-eligible',
  clientId: 'client-eligible',
  clientName: 'Arbor & Vale LLC',
  state: 'CA',
  county: 'Los Angeles',
  entityType: 'llc' as const,
  taxType: 'federal_1065',
  currentDueDate: new Date('2026-03-15T00:00:00.000Z'),
  status: 'pending' as const,
}

const NEEDS_REVIEW = {
  obligationId: 'oi-review',
  clientId: 'client-review',
  clientName: 'Bright Studio S-Corp',
  state: 'CA',
  county: null,
  entityType: 's_corp' as const,
  taxType: 'federal_1120s',
  currentDueDate: new Date('2026-03-15T00:00:00.000Z'),
  status: 'review' as const,
}

function withDeadlineSelection(
  alert: typeof ALERT,
  obligationIds = ['oi-eligible'],
  currentDueDate = '2026-03-15',
) {
  return {
    ...alert,
    structuredChange: {
      deadlineSelectionReview: {
        selectedObligationIds: obligationIds,
        snapshots: obligationIds.map((obligationId) => ({
          obligationId,
          currentDueDate,
        })),
      },
    },
  }
}

function selectChain(response: unknown[]) {
  const chain = response.slice() as unknown[] & {
    from: ReturnType<typeof vi.fn>
    innerJoin: ReturnType<typeof vi.fn>
    leftJoin: ReturnType<typeof vi.fn>
    where: ReturnType<typeof vi.fn>
    orderBy: ReturnType<typeof vi.fn>
    limit: ReturnType<typeof vi.fn>
  }
  chain.from = vi.fn(() => chain)
  chain.innerJoin = vi.fn(() => chain)
  chain.leftJoin = vi.fn(() => chain)
  chain.where = vi.fn(() => chain)
  chain.orderBy = vi.fn(() => chain)
  chain.limit = vi.fn(async () => response)
  return chain
}

function fakeDb(selectResponses: unknown[][]) {
  const batchStatements: unknown[] = []
  const directStatements: unknown[] = []
  const db = {
    select: vi.fn(() => selectChain(selectResponses.shift() ?? [])),
    insert: vi.fn((table: unknown) => ({
      values: (value: unknown) => {
        const statement = {
          kind: 'insert',
          table,
          value,
          onConflictDoUpdate: vi.fn(() => statement),
          onConflictDoNothing: vi.fn(() => statement),
        }
        directStatements.push(statement)
        return statement
      },
    })),
    update: vi.fn((table: unknown) => ({
      set: (value: unknown) => ({
        where: () => {
          const statement = { kind: 'update', table, value }
          directStatements.push(statement)
          return statement
        },
      }),
    })),
    batch: vi.fn(async (statements: [unknown, ...unknown[]]) => {
      batchStatements.push(...statements)
      return []
    }),
  }
  return {
    db: db as unknown as Parameters<typeof makePulseRepo>[0],
    batchStatements,
    directStatements,
  }
}

describe('scorePulsePriority', () => {
  it('scores needs-review, confidence, impact, source, and request factors deterministically', () => {
    const result = scorePulsePriority({
      matchedCount: 4,
      needsReviewCount: 2,
      confidence: 0.58,
      preparerRequested: true,
      sourceNeedsAttention: true,
    })

    expect(result.score).toBe(153)
    expect(result.level).toBe('urgent')
    expect(result.reasons.map((reason) => [reason.key, reason.points])).toEqual([
      ['preparer_requested', 30],
      ['needs_review_matches', 60],
      ['low_confidence', 25],
      ['high_impact', 18],
      ['source_attention', 20],
    ])
  })

  it('keeps review-free high-confidence single matches at normal impact score', () => {
    const result = scorePulsePriority({
      matchedCount: 1,
      needsReviewCount: 0,
      confidence: 0.94,
    })

    expect(result).toMatchObject({ score: 3, level: 'normal' })
  })
})

describe('makePulseRepo', () => {
  it('matches eligible clients and marks missing county rows as needs_review', async () => {
    const { db } = fakeDb([
      [ALERT],
      [
        ELIGIBLE,
        NEEDS_REVIEW,
        {
          ...ELIGIBLE,
          obligationId: 'oi-orange',
          clientId: 'client-orange',
          clientName: 'Orange County LLC',
          county: 'Orange',
        },
      ],
      [],
      [],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    const detail = await repo.getDetail('alert-1')

    expect(detail.affectedClients.map((row) => [row.obligationId, row.matchStatus])).toEqual([
      ['oi-eligible', 'eligible'],
      ['oi-review', 'needs_review'],
    ])
    expect(detail.affectedClients[1]!.reason).toContain('county is missing')
  })

  it('listAlertsForRule matches a rule by jurisdiction + form scope', async () => {
    const { db } = fakeDb([[{ id: 'alert-1' }], [ALERT]])
    const repo = makePulseRepo(db, 'firm-1')

    const matches = await repo.listAlertsForRule({
      ruleId: 'ca.some_rule.candidate.2026',
      jurisdiction: 'CA',
      taxType: 'federal_1065', // present in ALERT.parsedForms
    })

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      matchReason: 'scope',
      newDueDate: ALERT.parsedNewDueDate,
      originalDueDate: ALERT.parsedOriginalDueDate,
      sourceExcerpt: ALERT.verbatimQuote,
    })
    expect(matches[0]!.alert.id).toBe('alert-1')
  })

  it('listAlertsForRule prefers an explicit affected/reverify rule over scope', async () => {
    const { db } = fakeDb([
      [{ id: 'alert-1' }],
      [{ ...ALERT, affectedRuleIds: ['target.rule'], reverifyRuleIds: ['target.rule'] }],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    const matches = await repo.listAlertsForRule({
      ruleId: 'target.rule',
      jurisdiction: 'CA',
      taxType: 'federal_1065',
    })

    expect(matches[0]!.matchReason).toBe('affected_rule')
  })

  it('listAlertsForRule excludes alerts that do not touch the rule', async () => {
    const { db } = fakeDb([[{ id: 'alert-1' }], [ALERT]])
    const repo = makePulseRepo(db, 'firm-1')

    const matches = await repo.listAlertsForRule({
      ruleId: 'unrelated.rule',
      jurisdiction: 'CA',
      taxType: 'state_individual_income_tax', // not in ALERT.parsedForms
    })

    expect(matches).toEqual([])
  })

  it('refreshMatchedCountsForObligations is a no-op for empty input', async () => {
    const { db, directStatements } = fakeDb([])
    const repo = makePulseRepo(db, 'firm-1')

    await repo.refreshMatchedCountsForObligations([])

    expect(directStatements).toHaveLength(0)
  })

  it('marks base-date matches with active overlays as already applied', async () => {
    const { db } = fakeDb([
      [ALERT],
      [ELIGIBLE],
      [
        {
          obligationId: 'oi-eligible',
          overrideDueDate: new Date('2026-10-15T00:00:00.000Z'),
          appliedAt: new Date('2026-04-15T18:30:00.000Z'),
        },
      ],
      [],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    const detail = await repo.getDetail('alert-1')

    expect(detail.affectedClients).toHaveLength(1)
    expect(detail.affectedClients[0]).toMatchObject({
      obligationId: 'oi-eligible',
      currentDueDate: new Date('2026-10-15T00:00:00.000Z'),
      matchStatus: 'already_applied',
    })
  })

  it('keeps source-revoked alerts visible in detail for history review', async () => {
    const { db } = fakeDb([[{ ...ALERT, pulseStatus: 'source_revoked' }], [], []])
    const repo = makePulseRepo(db, 'firm-1')

    const detail = await repo.getDetail('alert-1')

    expect(detail.alert.sourceStatus).toBe('source_revoked')
  })

  it('marks incomplete due-date overlays as needing details', async () => {
    const { db } = fakeDb([
      [
        {
          ...ALERT,
          parsedForms: [],
          parsedEntityTypes: [],
          parsedOriginalDueDate: null,
          parsedNewDueDate: new Date('2026-10-15T00:00:00.000Z'),
        },
      ],
      [],
      [ELIGIBLE],
      [],
      [],
      [],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    const detail = await repo.getDetail('alert-1')

    expect(detail.applyReadiness).toEqual({
      status: 'needs_details',
      missing: ['affected_clients'],
    })
    expect(detail.affectedClients).toHaveLength(1)
  })

  it('returns list-level readiness and duplicate counts for active alerts', async () => {
    const reviewOnlyAlert = {
      ...ALERT,
      alertId: 'alert-review-only',
      pulseId: 'pulse-review-only',
      changeKind: 'form_instruction' as const,
      actionMode: 'review_only' as const,
      matchedCount: 0,
      needsReviewCount: 0,
      parsedOriginalDueDate: null,
      parsedNewDueDate: null,
      duplicateSourceSnapshotCount: 2,
    }
    const needsDetailsAlert = {
      ...ALERT,
      alertId: 'alert-needs-details',
      pulseId: 'pulse-needs-details',
      matchedCount: 0,
      needsReviewCount: 0,
      parsedOriginalDueDate: null,
      duplicateSourceSnapshotCount: 1,
    }
    const { db } = fakeDb([
      [{ ...ALERT, duplicateSourceSnapshotCount: 3 }, reviewOnlyAlert, needsDetailsAlert],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    const alerts = await repo.listAlerts({ limit: 50 })

    expect(alerts[0]?.applyReadiness).toEqual({ status: 'ready', missing: [] })
    expect(alerts[0]?.duplicateSourceSnapshotCount).toBe(3)
    expect(alerts[1]?.applyReadiness).toEqual({ status: 'not_applicable', missing: [] })
    expect(alerts[1]?.duplicateSourceSnapshotCount).toBe(2)
    expect(alerts[2]?.applyReadiness).toEqual({
      status: 'needs_details',
      missing: ['affected_clients'],
    })
    expect(alerts[2]?.duplicateSourceSnapshotCount).toBe(1)
  })

  it('keeps unhandled matched alerts out of alert history', async () => {
    const handledStatuses = [
      'dismissed',
      'snoozed',
      'partially_applied',
      'applied',
      'reverted',
      'reviewed',
    ] as const
    const { db } = fakeDb([
      [
        ALERT,
        ...handledStatuses.map((status) => ({
          ...ALERT,
          alertId: `alert-${status}`,
          alertStatus: status,
        })),
      ],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    const alerts = await repo.listHistory({ limit: 50 })

    expect(alerts.map((alert) => alert.status)).toEqual([...handledStatuses])
  })

  it('updates due-date overlay details and refreshes affected-client counts', async () => {
    const incompleteAlert = {
      ...ALERT,
      matchedCount: 0,
      needsReviewCount: 0,
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: null,
      parsedNewDueDate: new Date('2026-10-15T00:00:00.000Z'),
    }
    const updatedAlert = {
      ...withDeadlineSelection(ALERT),
      reviewedBy: 'user-1',
      reviewedAt: new Date('2026-04-15T18:30:00.000Z'),
    }
    const { db, batchStatements, directStatements } = fakeDb([
      [incompleteAlert],
      [ELIGIBLE],
      [],
      [],
      [
        {
          id: 'priority-1',
          alertId: 'alert-1',
          pulseId: 'pulse-1',
          status: 'reviewed',
          priorityScore: 3,
          priorityReasonsJson: [],
          selectedObligationIdsJson: ['oi-eligible'],
          confirmedObligationIdsJson: ['oi-eligible'],
          excludedObligationIdsJson: [],
          note: 'Verified against source.',
          requestedBy: null,
          reviewedBy: 'user-1',
          reviewedAt: new Date('2026-04-15T18:30:00.000Z'),
        },
      ],
      [updatedAlert],
      [ELIGIBLE],
      [],
      [],
      [],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    const detail = await repo.reviewDueDateOverlayDetails({
      alertId: 'alert-1',
      newDueDate: new Date('2026-10-15T00:00:00.000Z'),
      selectedObligationIds: ['oi-eligible'],
      confirmedObligationIds: ['oi-eligible'],
      note: 'Verified against source.',
      userId: 'user-1',
      now: new Date('2026-04-15T18:30:00.000Z'),
    })

    expect(detail.applyReadiness).toEqual({ status: 'ready', missing: [] })
    expect(detail.alert.matchedCount).toBe(1)
    expect(detail.affectedClients).toHaveLength(1)
    expect(batchStatements.filter((statement) => isKind(statement, 'update'))).toHaveLength(1)
    expect(batchStatements.filter((statement) => isKind(statement, 'insert'))).toHaveLength(1)
    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, { matchedCount: 1, needsReviewCount: 0 }),
      ),
    ).toBe(true)
  })

  it('batch-applies due date overlays with applications, evidence, audit, and outbox', async () => {
    const { db, batchStatements } = fakeDb([
      [ALERT],
      [ELIGIBLE],
      [],
      [],
      [ELIGIBLE],
      [],
      [],
      [],
      [{ email: 'owner@example.com' }],
      [{ ...ALERT, matchedCount: 0 }],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    const result = await repo.apply({
      alertId: 'alert-1',
      obligationIds: ['oi-eligible'],
      userId: 'user-1',
      now: new Date('2026-04-15T18:30:00.000Z'),
    })

    expect(result.appliedCount).toBe(1)
    expect(result.auditIds).toHaveLength(1)
    expect(result.evidenceIds).toHaveLength(1)
    expect(result.applicationIds).toHaveLength(1)
    expect(result.revertExpiresAt.toISOString()).toBe('2026-04-16T18:30:00.000Z')
    expect(batchStatements).toHaveLength(7)
    expect(batchStatements.filter((statement) => isKind(statement, 'insert'))).toHaveLength(6)
    expect(batchStatements.filter((statement) => isKind(statement, 'update'))).toHaveLength(1)
  })

  it('reactivates a reverted compatibility application when reapplying after undo', async () => {
    const { db, batchStatements } = fakeDb([
      [ALERT],
      [ELIGIBLE],
      [],
      [],
      [ELIGIBLE],
      [],
      [],
      [{ id: 'app-1', obligationId: 'oi-eligible' }],
      [{ email: 'owner@example.com' }],
      [{ ...ALERT, matchedCount: 0 }],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    const result = await repo.apply({
      alertId: 'alert-1',
      obligationIds: ['oi-eligible'],
      userId: 'user-1',
      now: new Date('2026-04-15T18:30:00.000Z'),
    })

    expect(result.applicationIds).toEqual(['app-1'])
    expect(batchStatements).toHaveLength(7)
    expect(batchStatements.filter((statement) => isKind(statement, 'insert'))).toHaveLength(5)
    expect(batchStatements.filter((statement) => isKind(statement, 'update'))).toHaveLength(2)
  })

  it('rejects apply when due-date overlay details are incomplete', async () => {
    const { db, batchStatements } = fakeDb([
      [
        {
          ...ALERT,
          parsedOriginalDueDate: null,
          parsedForms: [],
        },
      ],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    await expect(
      repo.apply({
        alertId: 'alert-1',
        obligationIds: ['oi-eligible'],
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({ code: 'needs_details' } satisfies Partial<PulseRepoError>)
    expect(batchStatements).toHaveLength(0)
  })

  it('rejects apply when the requested obligation was already applied', async () => {
    const { db } = fakeDb([
      [ALERT],
      [ELIGIBLE],
      [],
      [
        {
          id: 'app-1',
          obligationId: 'oi-eligible',
          clientId: 'client-eligible',
          clientName: 'Arbor & Vale LLC',
          state: 'CA',
          county: 'Los Angeles',
          entityType: 'llc',
          taxType: 'federal_1065',
          currentDueDate: new Date('2026-10-15T00:00:00.000Z'),
          status: 'pending',
          appliedAt: new Date('2026-04-15T18:30:00.000Z'),
          revertedAt: null,
          beforeDueDate: new Date('2026-03-15T00:00:00.000Z'),
          afterDueDate: new Date('2026-10-15T00:00:00.000Z'),
        },
      ],
      [],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    await expect(
      repo.apply({
        alertId: 'alert-1',
        obligationIds: ['oi-eligible'],
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({ code: 'conflict' } satisfies Partial<PulseRepoError>)
  })

  it('rejects apply when the selected obligation due date changed before write', async () => {
    const { db, batchStatements } = fakeDb([
      [withDeadlineSelection(ALERT)],
      [ELIGIBLE],
      [],
      [],
      [],
      [
        {
          ...ELIGIBLE,
          currentDueDate: new Date('2026-03-16T00:00:00.000Z'),
        },
      ],
      [],
      [],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    await expect(
      repo.apply({
        alertId: 'alert-1',
        obligationIds: ['oi-eligible'],
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({ code: 'conflict' } satisfies Partial<PulseRepoError>)
    expect(batchStatements).toHaveLength(0)
  })

  it('rejects apply when a fresh active application already exists', async () => {
    const { db, batchStatements } = fakeDb([
      [ALERT],
      [ELIGIBLE],
      [],
      [],
      [ELIGIBLE],
      [],
      [{ obligationId: 'oi-eligible' }],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    await expect(
      repo.apply({
        alertId: 'alert-1',
        obligationIds: ['oi-eligible'],
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({ code: 'conflict' } satisfies Partial<PulseRepoError>)
    expect(batchStatements).toHaveLength(0)
  })

  it('rejects apply when the selected obligation needs county review', async () => {
    const { db, batchStatements } = fakeDb([[ALERT], [NEEDS_REVIEW], [], []])
    const repo = makePulseRepo(db, 'firm-1')

    await expect(
      repo.apply({
        alertId: 'alert-1',
        obligationIds: ['oi-review'],
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({ code: 'conflict' } satisfies Partial<PulseRepoError>)
    expect(batchStatements).toHaveLength(0)
  })

  it('applies a needs_review obligation after explicit confirmation', async () => {
    const { db, batchStatements } = fakeDb([
      [ALERT],
      [NEEDS_REVIEW],
      [],
      [],
      [NEEDS_REVIEW],
      [],
      [],
      [],
      [{ email: 'manager@example.com' }],
      [{ ...ALERT, matchedCount: 1, needsReviewCount: 0 }],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    const result = await repo.apply({
      alertId: 'alert-1',
      obligationIds: ['oi-review'],
      confirmedObligationIds: ['oi-review'],
      userId: 'user-1',
      now: new Date('2026-04-15T18:30:00.000Z'),
    })

    expect(result.appliedCount).toBe(1)
    expect(batchStatements).toHaveLength(7)
    expect(batchStatements.filter((statement) => isKind(statement, 'update'))).toHaveLength(1)
  })

  it('saves a manager-reviewed priority selection without applying deadlines', async () => {
    const reviewedAt = new Date('2026-04-15T18:40:00.000Z')
    const { db, batchStatements, directStatements } = fakeDb([
      [ALERT],
      [ELIGIBLE, NEEDS_REVIEW],
      [],
      [],
      [],
      [
        {
          id: 'priority-1',
          alertId: 'alert-1',
          pulseId: 'pulse-1',
          status: 'reviewed',
          priorityScore: 116,
          priorityReasonsJson: [{ key: 'needs_review_matches', points: 55, label: 'Review' }],
          selectedObligationIdsJson: ['oi-eligible', 'oi-review'],
          confirmedObligationIdsJson: ['oi-review'],
          excludedObligationIdsJson: [],
          note: 'Looks applicable.',
          requestedBy: null,
          reviewedBy: 'manager-1',
          reviewedAt,
        },
      ],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    const review = await repo.reviewPriorityMatches({
      alertId: 'alert-1',
      selectedObligationIds: ['oi-eligible', 'oi-review'],
      confirmedObligationIds: ['oi-review'],
      userId: 'manager-1',
      note: 'Looks applicable.',
      now: reviewedAt,
    })

    expect(review).toMatchObject({
      id: 'priority-1',
      status: 'reviewed',
      selectedObligationIds: ['oi-eligible', 'oi-review'],
      confirmedObligationIds: ['oi-review'],
      reviewedBy: 'manager-1',
    })
    expect(batchStatements).toHaveLength(0)
    expect(directStatements.filter((statement) => isKind(statement, 'insert'))).toHaveLength(1)
  })

  it('rejects priority manager review when a selected review row is not confirmed', async () => {
    const { db, directStatements } = fakeDb([[ALERT], [NEEDS_REVIEW], [], []])
    const repo = makePulseRepo(db, 'firm-1')

    await expect(
      repo.reviewPriorityMatches({
        alertId: 'alert-1',
        selectedObligationIds: ['oi-review'],
        userId: 'manager-1',
      }),
    ).rejects.toMatchObject({ code: 'conflict' } satisfies Partial<PulseRepoError>)
    expect(directStatements).toHaveLength(0)
  })

  it('rejects apply with no eligible candidates when selections are outside the alert', async () => {
    const { db, batchStatements } = fakeDb([[ALERT], [ELIGIBLE], [], []])
    const repo = makePulseRepo(db, 'firm-1')

    await expect(
      repo.apply({
        alertId: 'alert-1',
        obligationIds: ['oi-outside-alert'],
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({ code: 'no_eligible' } satisfies Partial<PulseRepoError>)
    expect(batchStatements).toHaveLength(0)
  })

  it('marks review-only Pulse changes reviewed without applying overlays', async () => {
    const reviewOnlyAlert = {
      ...ALERT,
      changeKind: 'form_instruction' as const,
      actionMode: 'review_only' as const,
      parsedOriginalDueDate: null,
      parsedNewDueDate: null,
    }
    const { db, batchStatements } = fakeDb([
      [reviewOnlyAlert],
      [reviewOnlyAlert],
      [{ ...reviewOnlyAlert, alertStatus: 'reviewed' as const }],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    await expect(
      repo.apply({
        alertId: 'alert-1',
        obligationIds: ['oi-eligible'],
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({ code: 'review_only' } satisfies Partial<PulseRepoError>)

    const result = await repo.markReviewed({
      alertId: 'alert-1',
      userId: 'user-1',
      now: new Date('2026-04-15T19:00:00.000Z'),
    })

    expect(result.alert.status).toBe('reviewed')
    expect(batchStatements).toHaveLength(2)
    expect(
      batchStatements.some((statement) =>
        statementHasValue(statement, { status: 'reviewed', dismissedBy: 'user-1' }),
      ),
    ).toBe(true)
    expect(
      batchStatements.some((statement) =>
        statementHasValue(statement, { action: 'pulse.reviewed' }),
      ),
    ).toBe(true)
    expect(
      batchStatements.some((statement) =>
        statementHasValue(statement, { reason: 'Marked reviewed from Pulse detail.' }),
      ),
    ).toBe(true)
  })

  it('acknowledges a no-current-match due-date overlay (mark reviewed → history)', async () => {
    // A `due_date_overlay` pulse approved before the firm activated the matching
    // rule has matchedCount = 0 (firmImpact 'no_current_match'). There is nothing
    // to apply, so the CPA can mark it reviewed to clear it from the active list
    // instead of leaving it stranded forever.
    const noMatchOverlay = {
      ...ALERT,
      matchedCount: 0,
      needsReviewCount: 0,
    }
    const { db, batchStatements } = fakeDb([
      [noMatchOverlay],
      [{ ...noMatchOverlay, alertStatus: 'reviewed' as const }],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    const result = await repo.markReviewed({
      alertId: 'alert-1',
      userId: 'user-1',
      now: new Date('2026-04-15T19:00:00.000Z'),
    })

    expect(result.alert.status).toBe('reviewed')
    expect(batchStatements).toHaveLength(2)
    expect(
      batchStatements.some((statement) =>
        statementHasValue(statement, { status: 'reviewed', dismissedBy: 'user-1' }),
      ),
    ).toBe(true)
  })

  it('still rejects mark-reviewed on a due-date overlay that has live matches', async () => {
    // ALERT is a matched overlay (matchedCount: 1) — reviewing is the wrong
    // action; the CPA must apply or dismiss the matched deadlines instead.
    const { db, batchStatements } = fakeDb([[ALERT]])
    const repo = makePulseRepo(db, 'firm-1')

    await expect(repo.markReviewed({ alertId: 'alert-1', userId: 'user-1' })).rejects.toMatchObject(
      { code: 'conflict' } satisfies Partial<PulseRepoError>,
    )
    expect(batchStatements).toHaveLength(0)
  })

  it('writes default audit reasons for direct dismiss and snooze actions', async () => {
    const { db: dismissDb, batchStatements: dismissStatements } = fakeDb([
      [ALERT],
      [{ ...ALERT, alertStatus: 'dismissed' as const }],
    ])
    const dismissRepo = makePulseRepo(dismissDb, 'firm-1')

    await dismissRepo.dismiss({
      alertId: 'alert-1',
      userId: 'user-1',
      now: new Date('2026-04-15T19:00:00.000Z'),
    })

    expect(
      dismissStatements.some((statement) =>
        statementHasValue(statement, { action: 'pulse.dismiss' }),
      ),
    ).toBe(true)
    expect(
      dismissStatements.some((statement) =>
        statementHasValue(statement, { reason: 'Dismissed from Pulse detail.' }),
      ),
    ).toBe(true)

    const { db: snoozeDb, batchStatements: snoozeStatements } = fakeDb([
      [ALERT],
      [{ ...ALERT, alertStatus: 'snoozed' as const }],
    ])
    const snoozeRepo = makePulseRepo(snoozeDb, 'firm-1')

    await snoozeRepo.snooze({
      alertId: 'alert-1',
      userId: 'user-1',
      until: new Date('2026-04-16T19:00:00.000Z'),
      now: new Date('2026-04-15T19:00:00.000Z'),
    })

    expect(
      snoozeStatements.some((statement) =>
        statementHasValue(statement, { action: 'pulse.snooze' }),
      ),
    ).toBe(true)
    expect(
      snoozeStatements.some((statement) =>
        statementHasValue(statement, { reason: 'Snoozed for 24 hours from Pulse detail.' }),
      ),
    ).toBe(true)
  })

  it('reopens the alert as matched after a successful undo', async () => {
    const appliedAlert = {
      ...ALERT,
      alertStatus: 'applied' as const,
      matchedCount: 0,
      needsReviewCount: 0,
    }
    const application = {
      id: 'app-1',
      obligationId: 'oi-eligible',
      clientId: 'client-eligible',
      appliedAt: new Date('2026-04-15T18:30:00.000Z'),
      beforeDueDate: new Date('2026-03-15T00:00:00.000Z'),
      afterDueDate: new Date('2026-10-15T00:00:00.000Z'),
      currentDueDate: new Date('2026-10-15T00:00:00.000Z'),
    }
    const { db, batchStatements } = fakeDb([
      [appliedAlert],
      [application],
      [
        {
          id: 'oea-1',
          obligationId: 'oi-eligible',
          exceptionRuleId: 'exception-1',
          overrideDueDate: new Date('2026-10-15T00:00:00.000Z'),
        },
      ],
      [{ ...appliedAlert, alertStatus: 'matched' as const }],
      [ELIGIBLE],
      [],
      [{ ...application, revertedAt: new Date('2026-04-15T19:00:00.000Z') }],
      [],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    const result = await repo.revert({
      alertId: 'alert-1',
      userId: 'user-1',
      now: new Date('2026-04-15T19:00:00.000Z'),
    })

    expect(result.revertedCount).toBe(1)
    expect(result.alert).toMatchObject({
      status: 'matched',
      matchedCount: 1,
      needsReviewCount: 0,
    })
    expect(
      batchStatements.some((statement) => statementHasValue(statement, { status: 'matched' })),
    ).toBe(true)
  })

  it('reactivates a historical reverted alert for re-apply', async () => {
    const revertedAlert = {
      ...ALERT,
      alertStatus: 'reverted' as const,
      matchedCount: 0,
      needsReviewCount: 0,
    }
    const revertedApplication = {
      id: 'app-1',
      obligationId: 'oi-eligible',
      clientId: 'client-eligible',
      clientName: 'Arbor & Vale LLC',
      state: 'CA',
      county: 'Los Angeles',
      entityType: 'llc' as const,
      taxType: 'federal_1065',
      currentDueDate: new Date('2026-03-15T00:00:00.000Z'),
      status: 'pending' as const,
      appliedAt: new Date('2026-04-15T18:30:00.000Z'),
      revertedAt: new Date('2026-04-15T19:00:00.000Z'),
      beforeDueDate: new Date('2026-03-15T00:00:00.000Z'),
      afterDueDate: new Date('2026-10-15T00:00:00.000Z'),
    }
    const { db, batchStatements } = fakeDb([
      [revertedAlert],
      [{ ...revertedAlert, alertStatus: 'matched' as const }],
      [ELIGIBLE],
      [],
      [revertedApplication],
      [],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    const result = await repo.reactivate({
      alertId: 'alert-1',
      userId: 'user-1',
      now: new Date('2026-04-15T19:10:00.000Z'),
    })

    expect(result.alert).toMatchObject({
      status: 'matched',
      matchedCount: 1,
      needsReviewCount: 0,
    })
    expect(
      batchStatements.some((statement) => statementHasValue(statement, { status: 'matched' })),
    ).toBe(true)
    expect(
      batchStatements.some((statement) =>
        statementHasValue(statement, { action: 'pulse.reactivate' }),
      ),
    ).toBe(true)
  })

  it('rejects revert when the active overlay no longer matches Pulse apply', async () => {
    const { db, batchStatements } = fakeDb([
      [ALERT],
      [
        {
          id: 'app-1',
          obligationId: 'oi-eligible',
          clientId: 'client-eligible',
          appliedAt: new Date('2026-04-15T18:30:00.000Z'),
          beforeDueDate: new Date('2026-03-15T00:00:00.000Z'),
          afterDueDate: new Date('2026-10-15T00:00:00.000Z'),
          currentDueDate: new Date('2026-03-15T00:00:00.000Z'),
        },
      ],
      [
        {
          id: 'oea-1',
          obligationId: 'oi-eligible',
          exceptionRuleId: 'exception-1',
          overrideDueDate: new Date('2026-10-16T00:00:00.000Z'),
        },
      ],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    await expect(
      repo.revert({
        alertId: 'alert-1',
        userId: 'user-1',
        now: new Date('2026-04-15T19:00:00.000Z'),
      }),
    ).rejects.toMatchObject({ code: 'conflict' } satisfies Partial<PulseRepoError>)
    expect(batchStatements).toHaveLength(0)
  })

  it('rejects revert after the 24h window expires', async () => {
    const { db, batchStatements } = fakeDb([
      [ALERT],
      [
        {
          id: 'app-1',
          obligationId: 'oi-eligible',
          clientId: 'client-eligible',
          appliedAt: new Date('2026-04-15T18:30:00.000Z'),
          beforeDueDate: new Date('2026-03-15T00:00:00.000Z'),
          afterDueDate: new Date('2026-10-15T00:00:00.000Z'),
        },
      ],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    await expect(
      repo.revert({
        alertId: 'alert-1',
        userId: 'user-1',
        now: new Date('2026-04-16T18:30:01.000Z'),
      }),
    ).rejects.toMatchObject({ code: 'revert_expired' } satisfies Partial<PulseRepoError>)
    expect(batchStatements).toHaveLength(0)
  })
})

describe('makePulseOpsRepo', () => {
  it('creates enabled source state as healthy by default', async () => {
    const sourceState = {
      sourceId: 'irs.disaster',
      tier: 'T1',
      jurisdiction: 'FED',
      enabled: true,
      cadenceMs: 60_000,
      healthStatus: 'healthy' as const,
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastChangeDetectedAt: null,
      nextCheckAt: new Date('2026-05-06T10:00:00.000Z'),
      consecutiveFailures: 0,
      lastError: null,
      etag: null,
      lastModified: null,
    }
    const { db, directStatements } = fakeDb([[sourceState]])

    await makePulseOpsRepo(db).ensureSourceState({
      sourceId: 'irs.disaster',
      tier: 'T1',
      jurisdiction: 'FED',
      cadenceMs: 60_000,
      now: new Date('2026-05-06T10:00:00.000Z'),
    })

    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, { sourceId: 'irs.disaster', healthStatus: 'healthy' }),
      ),
    ).toBe(true)
  })

  it('catches a new firm up to the not-expired approved landscape', async () => {
    const { db, batchStatements } = fakeDb([
      [{ id: 'pulse-current' }, { id: 'pulse-also-current' }],
    ])

    const count = await makePulseOpsRepo(db).backfillFirmAlertsForActiveLandscape(
      'firm-new',
      new Date('2026-06-01T00:00:00.000Z'),
    )

    expect(count).toBe(2)
    const inserted = (
      batchStatements.filter((s) => isKind(s, 'insert')) as Array<{ value: unknown }>
    )
      .flatMap((s) => (Array.isArray(s.value) ? s.value : [s.value]))
      .map((row) => row as Record<string, unknown>)
    expect(inserted).toHaveLength(2)
    expect(inserted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pulseId: 'pulse-current', firmId: 'firm-new', matchedCount: 0 }),
        expect.objectContaining({
          pulseId: 'pulse-also-current',
          firmId: 'firm-new',
          matchedCount: 0,
        }),
      ]),
    )
  })

  it('writes no alerts when the active landscape is empty', async () => {
    const { db, batchStatements } = fakeDb([[]])

    const count = await makePulseOpsRepo(db).backfillFirmAlertsForActiveLandscape('firm-new')

    expect(count).toBe(0)
    expect(batchStatements).toHaveLength(0)
  })

  it('records source failures without changing CPA-facing health', async () => {
    const sourceState = {
      sourceId: 'irs.disaster',
      tier: 'T1',
      jurisdiction: 'FED',
      enabled: true,
      cadenceMs: 60_000,
      healthStatus: 'healthy' as const,
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastChangeDetectedAt: null,
      nextCheckAt: null,
      consecutiveFailures: 2,
      lastError: null,
      etag: null,
      lastModified: null,
    }
    const { db, directStatements } = fakeDb([[sourceState]])

    await makePulseOpsRepo(db).recordSourceFailure({
      sourceId: 'irs.disaster',
      checkedAt: new Date('2026-05-06T10:00:00.000Z'),
      nextCheckAt: new Date('2026-05-06T10:15:00.000Z'),
      error: 'selector_drift',
    })

    const update = directStatements.find((statement) => isKind(statement, 'update')) as
      | { value?: Record<string, unknown> }
      | undefined
    expect(update?.value).toMatchObject({
      consecutiveFailures: 3,
      lastError: 'selector_drift',
    })
    expect(update?.value).not.toHaveProperty('healthStatus')
  })

  it('restores watched health when source monitoring is re-enabled', async () => {
    const { db, directStatements } = fakeDb([])

    await makePulseOpsRepo(db).setSourceEnabled({
      sourceId: 'irs.disaster',
      enabled: true,
      now: new Date('2026-05-06T10:00:00.000Z'),
    })

    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, { enabled: true, healthStatus: 'healthy' }),
      ),
    ).toBe(true)
  })

  it('publishes extracted pulses directly to firm review', async () => {
    const extractedPulse = {
      id: 'pulse-created',
      status: 'approved' as const,
      actionMode: 'due_date_overlay' as const,
      parsedForms: [],
      parsedEntityTypes: [],
    }
    const { db, batchStatements } = fakeDb([[extractedPulse], [extractedPulse], []])

    const result = await makePulseOpsRepo(db).createPulseForFirmReviewFromExtract({
      snapshotId: 'snapshot-1',
      source: 'irs.disaster',
      sourceUrl: 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations',
      publishedAt: new Date('2026-04-15T17:00:00.000Z'),
      aiSummary: 'IRS CA storm relief',
      verbatimQuote:
        'Individuals and businesses in Los Angeles County have until October 15, 2026.',
      parsedJurisdiction: 'CA',
      parsedCounties: ['Los Angeles County'],
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: new Date('2026-03-15T00:00:00.000Z'),
      parsedNewDueDate: new Date('2026-10-15T00:00:00.000Z'),
      parsedEffectiveFrom: new Date('2026-04-15T00:00:00.000Z'),
      confidence: 0.94,
      requiresHumanReview: true,
    })

    expect(result.alertCount).toBe(0)
    expect(
      batchStatements.some((statement) =>
        statementHasValue(statement, { status: 'approved', requiresHumanReview: true }),
      ),
    ).toBe(true)
    expect(
      batchStatements.some((statement) =>
        statementHasValue(statement, { parseStatus: 'extracted', failureReason: null }),
      ),
    ).toBe(true)
  })

  it('creates visible due-date alerts for all active firms but notifies only impacted firms', async () => {
    const originalDueDate = new Date('2026-04-15T00:00:00.000Z')
    const extractedPulse = {
      id: 'pulse-created',
      source: 'oh.temporary_announcements',
      sourceUrl: 'https://tax.ohio.gov/help-center/communications/temporary-announcements',
      status: 'approved' as const,
      actionMode: 'due_date_overlay' as const,
      aiSummary: 'Ohio moved IT 1040 deadline',
      parsedJurisdiction: 'OH',
      parsedCounties: [],
      parsedForms: ['oh_it1040'],
      parsedEntityTypes: ['individual'],
      parsedOriginalDueDate: originalDueDate,
      parsedNewDueDate: new Date('2026-05-15T00:00:00.000Z'),
    }
    const refreshCandidate = {
      firmId: 'firm-hit',
      obligationId: 'oi-hit',
      currentDueDate: originalDueDate,
      county: null,
      counties: null,
    }
    const digestCandidate = {
      obligationId: 'oi-hit',
      clientId: 'client-hit',
      clientName: 'Ohio Individual',
      state: 'OH',
      county: null,
      counties: null,
      taxType: 'oh_it1040',
      currentDueDate: originalDueDate,
    }
    const { db, batchStatements, directStatements } = fakeDb([
      [extractedPulse],
      [extractedPulse],
      [{ id: 'firm-hit' }, { id: 'firm-empty' }],
      [refreshCandidate],
      [],
      [
        { id: 'alert-hit', firmId: 'firm-hit', matchedCount: 1, needsReviewCount: 0 },
        { id: 'alert-empty', firmId: 'firm-empty', matchedCount: 0, needsReviewCount: 0 },
      ],
      [{ email: 'owner@example.com' }],
      [digestCandidate],
      [],
      [],
      [
        {
          userId: 'owner-1',
          email: 'owner@example.com',
          inAppEnabled: true,
          pulseEnabled: true,
        },
      ],
    ])

    const result = await makePulseOpsRepo(db).createPulseForFirmReviewFromExtract({
      snapshotId: 'snapshot-1',
      source: 'oh.temporary_announcements',
      sourceUrl: 'https://tax.ohio.gov/help-center/communications/temporary-announcements',
      publishedAt: new Date('2026-04-15T17:00:00.000Z'),
      aiSummary: 'Ohio moved IT 1040 deadline',
      verbatimQuote: 'Ohio IT 1040 filings due April 15 now have until May 15, 2026.',
      parsedJurisdiction: 'OH',
      parsedCounties: [],
      parsedForms: ['oh_it1040'],
      parsedEntityTypes: ['individual'],
      parsedOriginalDueDate: originalDueDate,
      parsedNewDueDate: new Date('2026-05-15T00:00:00.000Z'),
      parsedEffectiveFrom: new Date('2026-04-15T00:00:00.000Z'),
      confidence: 0.94,
      requiresHumanReview: false,
    })

    expect(result.alertCount).toBe(2)
    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, {
          firmId: 'firm-hit',
          matchedCount: 1,
          needsReviewCount: 0,
        }),
      ),
    ).toBe(true)
    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, {
          firmId: 'firm-empty',
          matchedCount: 0,
          needsReviewCount: 0,
        }),
      ),
    ).toBe(true)
    expect(
      batchStatements.some((statement) =>
        statementHasValue(statement, { firmId: 'firm-hit', type: 'pulse_digest' }),
      ),
    ).toBe(true)
    expect(
      batchStatements.some((statement) =>
        statementHasValue(statement, { firmId: 'firm-empty', type: 'pulse_digest' }),
      ),
    ).toBe(false)
    expect(
      batchStatements.some((statement) =>
        statementHasValue(statement, { entityId: 'alert-hit', type: 'pulse_alert' }),
      ),
    ).toBe(true)
    expect(
      batchStatements.some((statement) =>
        statementHasValue(statement, { entityId: 'alert-empty', type: 'pulse_alert' }),
      ),
    ).toBe(false)
  })

  it('keeps review-only fallback alerts visible to all active firms', async () => {
    const reviewOnlyPulse = {
      id: 'pulse-review-only',
      source: 'govdelivery.inbound',
      sourceUrl: 'https://content.govdelivery.com/accounts/example/bulletins/1',
      status: 'approved' as const,
      actionMode: 'review_only' as const,
      aiSummary: 'Generic inbound policy bulletin',
      parsedJurisdiction: 'OH',
      parsedCounties: [],
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: null,
      parsedNewDueDate: null,
    }
    const { db, directStatements } = fakeDb([
      [reviewOnlyPulse],
      [reviewOnlyPulse],
      [{ id: 'firm-a' }, { id: 'firm-b' }],
      [
        { id: 'alert-a', firmId: 'firm-a', matchedCount: 0, needsReviewCount: 0 },
        { id: 'alert-b', firmId: 'firm-b', matchedCount: 0, needsReviewCount: 0 },
      ],
    ])

    const result = await makePulseOpsRepo(db).createPulseForFirmReviewFromExtract({
      snapshotId: 'snapshot-1',
      source: 'govdelivery.inbound',
      sourceUrl: 'https://content.govdelivery.com/accounts/example/bulletins/1',
      publishedAt: new Date('2026-04-15T17:00:00.000Z'),
      aiSummary: 'Generic inbound policy bulletin',
      verbatimQuote: 'A policy bulletin was sent by email.',
      parsedJurisdiction: 'OH',
      parsedCounties: [],
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: null,
      parsedNewDueDate: null,
      parsedEffectiveFrom: new Date('2026-04-15T00:00:00.000Z'),
      confidence: 0.74,
      actionMode: 'review_only',
      changeKind: 'other',
      requiresHumanReview: true,
    })

    expect(result.alertCount).toBe(2)
    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, {
          firmId: 'firm-a',
          matchedCount: 0,
          needsReviewCount: 0,
        }),
      ),
    ).toBe(true)
    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, {
          firmId: 'firm-b',
          matchedCount: 0,
          needsReviewCount: 0,
        }),
      ),
    ).toBe(true)
  })

  it('finds duplicate extracted pulses by normalized policy scope', async () => {
    const { db } = fakeDb([
      [
        {
          id: 'pulse-existing',
          sourceUrl: 'https://www.irs.gov/newsroom/relief?utm_source=email#top',
          parsedCounties: ['Los Angeles County'],
          parsedForms: ['federal_1065'],
          parsedEntityTypes: ['llc'],
        },
      ],
    ])

    const duplicate = await makePulseOpsRepo(db).findDuplicatePulseForExtract({
      publishedAt: new Date('2026-04-15T17:00:00.000Z'),
      sourceUrl: 'https://www.ftb.ca.gov/about-ftb/newsroom/relief.html',
      parsedJurisdiction: 'CA',
      parsedCounties: ['Los Angeles'],
      parsedForms: ['FEDERAL_1065'],
      parsedEntityTypes: ['llc'],
      parsedOriginalDueDate: new Date('2026-03-15T00:00:00.000Z'),
      parsedNewDueDate: new Date('2026-10-15T00:00:00.000Z'),
      changeKind: 'deadline_shift',
      actionMode: 'due_date_overlay',
    })

    expect(duplicate).toBe('pulse-existing')
  })

  it('does not collapse scope-free review-only pulses from different URLs', async () => {
    const { db } = fakeDb([
      [
        {
          id: 'pulse-existing',
          sourceUrl: 'https://tax.example.gov/news/one',
          parsedCounties: [],
          parsedForms: [],
          parsedEntityTypes: [],
        },
      ],
    ])

    const duplicate = await makePulseOpsRepo(db).findDuplicatePulseForExtract({
      publishedAt: new Date('2026-04-15T17:00:00.000Z'),
      sourceUrl: 'https://tax.example.gov/news/two',
      parsedJurisdiction: 'CA',
      parsedCounties: [],
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: null,
      parsedNewDueDate: null,
      changeKind: 'other',
      actionMode: 'review_only',
    })

    expect(duplicate).toBeNull()
  })

  it('does not write synthetic system actor ids into user foreign keys', async () => {
    const approvedPulse = {
      id: 'pulse-approve',
      status: 'approved' as const,
      parsedForms: [],
      parsedEntityTypes: [],
    }
    const approveDb = fakeDb([[], [approvedPulse], [approvedPulse], []])
    await makePulseOpsRepo(approveDb.db).approvePulse({
      pulseId: 'pulse-approve',
      reviewedBy: 'system-web',
    })

    const rejectDb = fakeDb([[{ id: 'pulse-reject', status: 'pending_review' }], [], []])
    await makePulseOpsRepo(rejectDb.db).rejectPulse({
      pulseId: 'pulse-reject',
      reviewedBy: 'system-web',
    })

    const quarantineDb = fakeDb([[{ id: 'pulse-quarantine', status: 'pending_review' }], [], []])
    await makePulseOpsRepo(quarantineDb.db).quarantinePulse({
      pulseId: 'pulse-quarantine',
      actorId: 'system-web',
    })

    const revokeDb = fakeDb([[], [{ id: 'pulse-revoke', status: 'approved' }], []])
    await makePulseOpsRepo(revokeDb.db).revokeSourcePulses({
      sourceId: 'irs.disaster',
      actorId: 'system-web',
    })

    for (const statements of [
      approveDb.directStatements,
      rejectDb.directStatements,
      quarantineDb.directStatements,
      revokeDb.directStatements,
    ]) {
      expect(
        statements.find((statement) => statementHasValue(statement, { reviewedBy: null })),
      ).toBeTruthy()
    }
  })

  it('writes Pulse approval notifications for opted-in owner and manager users', async () => {
    const approvedPulse = {
      id: 'pulse-approve',
      source: 'IRS Disaster Relief',
      sourceUrl: 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations',
      status: 'approved' as const,
      actionMode: 'due_date_overlay' as const,
      aiSummary: 'IRS CA storm relief',
      parsedJurisdiction: 'CA',
      parsedCounties: ['Los Angeles County'],
      parsedForms: ['federal_1065'],
      parsedEntityTypes: ['llc'],
      parsedOriginalDueDate: new Date('2026-03-15T00:00:00.000Z'),
      parsedNewDueDate: new Date('2026-10-15T00:00:00.000Z'),
    }
    const alert = {
      id: 'alert-1',
      firmId: 'firm-1',
      matchedCount: 1,
      needsReviewCount: 0,
    }
    const noMatchAlert = {
      id: 'alert-empty',
      firmId: 'firm-empty',
      matchedCount: 0,
      needsReviewCount: 0,
    }
    const candidate = {
      firmId: 'firm-1',
      obligationId: 'oi-eligible',
      clientId: 'client-eligible',
      clientName: 'Arbor & Vale LLC',
      state: 'CA',
      county: 'Los Angeles',
      entityType: 'llc',
      taxType: 'federal_1065',
      currentDueDate: new Date('2026-03-15T00:00:00.000Z'),
      status: 'pending',
    }
    const { db, batchStatements } = fakeDb([
      [{ id: 'reviewer-1' }],
      [approvedPulse],
      [approvedPulse],
      [{ id: 'firm-1' }, { id: 'firm-empty' }],
      [candidate],
      [],
      [alert, noMatchAlert],
      [{ email: 'owner@example.com' }],
      [candidate],
      [],
      [],
      [
        {
          userId: 'owner-1',
          email: 'owner@example.com',
          inAppEnabled: true,
          pulseEnabled: true,
        },
        {
          userId: 'manager-muted',
          email: 'manager@example.com',
          inAppEnabled: true,
          pulseEnabled: false,
        },
      ],
    ])

    await makePulseOpsRepo(db).approvePulse({
      pulseId: 'pulse-approve',
      reviewedBy: 'reviewer-1',
      now: new Date('2026-04-15T18:30:00.000Z'),
    })

    expect(
      batchStatements.some((statement) =>
        statementHasValue(statement, {
          type: 'pulse_alert',
          userId: 'owner-1',
          entityId: 'alert-1',
          href: '/alerts?alert=alert-1',
        }),
      ),
    ).toBe(true)
    expect(
      batchStatements.some((statement) =>
        statementHasValue(statement, {
          type: 'pulse_alert',
          entityId: 'alert-empty',
        }),
      ),
    ).toBe(false)
    expect(
      batchStatements.some((statement) =>
        statementHasValue(statement, {
          type: 'pulse_digest',
          firmId: 'firm-empty',
        }),
      ),
    ).toBe(false)
    expect(
      batchStatements.some((statement) =>
        statementHasValue(statement, {
          type: 'pulse_alert',
          userId: 'manager-muted',
        }),
      ),
    ).toBe(false)
  })
})

function isKind(statement: unknown, kind: 'insert' | 'update'): boolean {
  return (
    typeof statement === 'object' &&
    statement !== null &&
    (statement as { kind?: string }).kind === kind
  )
}

function statementHasValue(statement: unknown, expected: Record<string, unknown>): boolean {
  if (typeof statement !== 'object' || statement === null) return false
  const value = (statement as { value?: unknown }).value
  const rows = Array.isArray(value) ? value : [value]
  return rows.some((row) => {
    if (typeof row !== 'object' || row === null) return false
    return Object.entries(expected).every(
      ([key, item]) => (row as Record<string, unknown>)[key] === item,
    )
  })
}
