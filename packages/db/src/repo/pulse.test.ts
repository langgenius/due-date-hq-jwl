/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused Drizzle chain doubles only implement the query-builder methods used here.
 */
import { describe, expect, it, vi } from 'vitest'
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core'
import type { SQL } from 'drizzle-orm'
import {
  computePulseDedupeKey,
  makePulseOpsRepo,
  makePulseRepo,
  pulseChangeKindFamily,
  PulseRepoError,
  scorePulsePriority,
} from './pulse'

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
    selectDistinct: vi.fn(() => selectChain(selectResponses.shift() ?? [])),
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

  it('prioritizes rights-window protective claim alerts with near action deadlines', () => {
    const result = scorePulsePriority({
      matchedCount: 0,
      needsReviewCount: 0,
      confidence: 0.86,
      sourceId: 'fed.taxpayer_advocate_blog',
      changeKind: 'protective_claim_window',
      structuredChange: {
        kind: 'protective_claim_window',
        actionDeadline: '2026-07-10',
      },
      now: new Date('2026-06-08T00:00:00.000Z'),
    })

    expect(result.level).toBe('high')
    expect(result.reasons.map((reason) => [reason.key, reason.points])).toEqual([
      ['low_confidence', 10],
      ['rights_window_source', 10],
      ['protective_claim_deadline', 45],
    ])
  })

  it('does not earn the rights-window bonus or a source-diagnostics signal below the confidence floor', () => {
    const result = scorePulsePriority({
      matchedCount: 0,
      needsReviewCount: 0,
      confidence: 0.4,
      sourceId: 'fed.taxpayer_advocate_blog',
      changeKind: 'applicability_scope',
    })

    const keys = result.reasons.map((reason) => reason.key)
    expect(keys).not.toContain('rights_window_source')
    expect(keys).not.toContain('source_attention')
    expect(keys).toEqual(['low_confidence'])
  })

  it('keeps the source-diagnostics signal independent of rights-window sources', () => {
    const result = scorePulsePriority({
      matchedCount: 0,
      needsReviewCount: 0,
      confidence: 0.92,
      sourceId: 'fed.taxpayer_advocate_blog',
      changeKind: 'applicability_scope',
      sourceNeedsAttention: true,
    })

    const reasons = result.reasons.map((reason) => [reason.key, reason.points])
    expect(reasons).toContainEqual(['rights_window_source', 10])
    expect(reasons).toContainEqual(['source_attention', 20])
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

  it('re-awakens a reviewed no-match overlay alert once accept creates a match', async () => {
    const { db, directStatements } = fakeDb([
      [{ jurisdiction: 'CA' }], // obligations -> jurisdictions
      [{ id: 'alert-1' }], // candidate alerts for the jurisdiction (now includes reviewed)
      [{ ...ALERT, alertStatus: 'reviewed', matchedCount: 0, needsReviewCount: 0 }], // getAlert
      [ELIGIBLE], // listCandidateRows: the freshly generated obligation now matches
      [], // withEffectiveDueDates: no active overlay -> stays eligible
      [], // listApplicationRows
    ])
    const repo = makePulseRepo(db, 'firm-1')

    await repo.refreshMatchedCountsForObligations(['oi-eligible'])

    // The acknowledged alert flips back to `matched` so it returns to the active
    // list and the rule-review drawer banner for the CPA to apply the new date.
    expect(
      directStatements.some(
        (statement) =>
          isKind(statement, 'update') && statementHasValue(statement, { status: 'matched' }),
      ),
    ).toBe(true)
  })

  it('does not flip status for an already-active alert that gains a match', async () => {
    const { db, directStatements } = fakeDb([
      [{ jurisdiction: 'CA' }],
      [{ id: 'alert-1' }],
      [{ ...ALERT, alertStatus: 'matched', matchedCount: 0, needsReviewCount: 0 }], // already active
      [ELIGIBLE],
      [],
      [],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    await repo.refreshMatchedCountsForObligations(['oi-eligible'])

    // Re-activation is reserved for `reviewed` alerts; an already-active alert
    // only gets its count recomputed, never a status flip.
    expect(
      directStatements.some(
        (statement) =>
          isKind(statement, 'update') && statementHasValue(statement, { status: 'matched' }),
      ),
    ).toBe(false)
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

    const { alerts } = await repo.listAlerts({ limit: 50 })

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

  it('surfaces expired matched alerts in history alongside handled ones', async () => {
    // A 'matched' alert that aged out of the active queue (deadline passed) is
    // neither active nor handled; listHistory's SQL re-includes it via
    // `and(status='matched', pulseExpiredCondition)`. The chain double can't model
    // the SQL date filter, so this asserts the JS guard no longer drops matched
    // rows — SQL is what bounds them to expired ones in production.
    const handledStatuses = [
      'dismissed',
      'partially_applied',
      'applied',
      'reverted',
      'reviewed',
    ] as const
    const { db } = fakeDb([
      [
        ALERT, // alertStatus 'matched' — stands in for an expired-out-of-active row
        ...handledStatuses.map((status) => ({
          ...ALERT,
          alertId: `alert-${status}`,
          alertStatus: status,
        })),
      ],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    const { alerts } = await repo.listHistory({ limit: 50 })

    expect(alerts.map((alert) => alert.status)).toEqual(['matched', ...handledStatuses])
  })

  it('paginates active alerts with a keyset cursor and reports the next page', async () => {
    // Three rows already in (publishedAt DESC) order — the chain double's
    // `.limit()` returns them all regardless of the limit+1 over-fetch, so a
    // limit of 2 must trim to a 2-row page and surface a cursor for the rest.
    const rows = [
      { ...ALERT, alertId: 'alert-a', publishedAt: new Date('2026-04-15T00:00:00.000Z') },
      { ...ALERT, alertId: 'alert-b', publishedAt: new Date('2026-04-14T00:00:00.000Z') },
      { ...ALERT, alertId: 'alert-c', publishedAt: new Date('2026-04-13T00:00:00.000Z') },
    ]
    const { db } = fakeDb([rows])
    const repo = makePulseRepo(db, 'firm-1')

    const firstPage = await repo.listAlerts({ limit: 2 })

    expect(firstPage.alerts.map((alert) => alert.id)).toEqual(['alert-a', 'alert-b'])
    expect(firstPage.nextCursor).not.toBeNull()
    // The opaque cursor decodes to the last returned row's (publishedAt, id).
    expect(Buffer.from(firstPage.nextCursor as string, 'base64url').toString('utf8')).toBe(
      '2026-04-14T00:00:00.000Z|alert-b',
    )

    // A short final page (fewer rows than the limit) ends pagination.
    const { db: lastDb } = fakeDb([[{ ...ALERT, alertId: 'alert-c' }]])
    const lastPage = await makePulseRepo(lastDb, 'firm-1').listAlerts({ limit: 2 })
    expect(lastPage.alerts.map((alert) => alert.id)).toEqual(['alert-c'])
    expect(lastPage.nextCursor).toBeNull()
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

  it('writes a default audit reason for direct dismiss actions', async () => {
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

  it('reverts 100 applications by chunking the exception reads and updates', async () => {
    // Locks the D1 100-bound-param fix: an un-chunked exception select (N+4
    // params) or update (M+3) would throw at this size, making the pulse
    // permanently un-revertible inside its 24h window.
    const appliedAlert = {
      ...ALERT,
      alertStatus: 'applied' as const,
      matchedCount: 0,
      needsReviewCount: 0,
    }
    const overrideDueDate = new Date('2026-10-15T00:00:00.000Z')
    const applications = Array.from({ length: 100 }, (_, i) => ({
      id: `app-${i}`,
      obligationId: `oi-${i}`,
      clientId: `client-${i}`,
      appliedAt: new Date('2026-04-15T18:30:00.000Z'),
      beforeDueDate: new Date('2026-03-15T00:00:00.000Z'),
      afterDueDate: overrideDueDate,
      currentDueDate: overrideDueDate,
    }))
    const exceptionRowFor = (i: number) => ({
      id: `oea-${i}`,
      obligationId: `oi-${i}`,
      exceptionRuleId: 'exception-1',
      overrideDueDate,
    })
    const { db, batchStatements } = fakeDb([
      [appliedAlert],
      applications,
      // exception select: two 90/10 id-chunks
      applications.slice(0, 90).map((row, i) => exceptionRowFor(i)),
      applications.slice(90).map((row, i) => exceptionRowFor(90 + i)),
      [{ ...appliedAlert, alertStatus: 'matched' as const }],
      [],
      [],
      [],
    ])
    const repo = makePulseRepo(db, 'firm-1')

    const result = await repo.revert({
      alertId: 'alert-1',
      userId: 'user-1',
      now: new Date('2026-04-15T19:00:00.000Z'),
    })

    expect(result.revertedCount).toBe(100)
    // 1 pulseApplication + 2 chunked obligationExceptionApplication +
    // 1 exceptionRule + 1 pulseFirmAlert update inside the single atomic batch.
    expect(batchStatements.filter((statement) => isKind(statement, 'update'))).toHaveLength(5)
  })

  it('chunks the jurisdiction lookup for >90 freshly created obligations', async () => {
    const selectResponses = [[{ jurisdiction: 'CA' }], [{ jurisdiction: 'CA' }], []]
    const { db } = fakeDb(selectResponses)
    const repo = makePulseRepo(db, 'firm-1')

    await expect(
      repo.refreshMatchedCountsForObligations(Array.from({ length: 91 }, (_, i) => `oi-${i}`)),
    ).resolves.toBeUndefined()
    // Two 90/1 id-chunks + the alert-id lookup — an un-chunked read would have
    // issued a single >100-param select and consumed only the first response.
    expect(selectResponses).toHaveLength(0)
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

  it('catches a new firm up to the still-open landscape with real review counts', async () => {
    // Reworked catch-up reuses the live fan-out (scoped to one firm) so a
    // protective-claim window materializes with a REAL needsReviewCount from the
    // firm's 2019-2022 clients — not the old count-0 firm-wide noise row.
    const protectivePulse = {
      id: 'pulse-protective',
      status: 'approved' as const,
      actionMode: 'review_only' as const,
      changeKind: 'protective_claim_window' as const,
      parsedJurisdiction: 'FED',
      parsedCounties: [],
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: null,
      reverifyRuleIdsJson: [],
      structuredChangeJson: { kind: 'protective_claim_window', actionDeadline: '2026-07-10' },
    }
    const { db, directStatements } = fakeDb([
      [{ id: 'pulse-protective', changeKind: 'protective_claim_window' }], // still-open candidates
      [protectivePulse], // getPulse inside the fan-out
      [{ id: 'firm-new' }], // active firms
      [{ firmId: 'firm-new', clientId: 'client-a', taxType: 'federal_1040' }], // protective scan
    ])

    const count = await makePulseOpsRepo(db).backfillFirmAlertsForActiveLandscape(
      'firm-new',
      new Date('2026-06-01T00:00:00.000Z'),
    )

    expect(count).toBe(1)
    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, {
          pulseId: 'pulse-protective',
          firmId: 'firm-new',
          matchedCount: 0,
          needsReviewCount: 1,
          origin: 'catchup',
        }),
      ),
    ).toBe(true)
    // State, not news: catch-up only materializes alert rows — no digest email
    // or in-app notification writes ride along (those are live-approval-only).
    expect(directStatements).toHaveLength(1)
  })

  it('runs the first-obligations catch-up only when the firm total equals the created count', async () => {
    // First materialization (total 5 == created 5): catch-up runs and lands a
    // catchup-origin row. Selects: obligation count → still-open candidates →
    // getPulse → active firms → protective scan.
    const protectivePulse = {
      id: 'pulse-protective',
      status: 'approved' as const,
      actionMode: 'review_only' as const,
      changeKind: 'protective_claim_window' as const,
      parsedJurisdiction: 'FED',
      parsedCounties: [],
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: null,
      reverifyRuleIdsJson: [],
      structuredChangeJson: { kind: 'protective_claim_window', actionDeadline: '2026-07-10' },
    }
    const first = fakeDb([
      [{ value: 5 }], // firm obligation total == createdCount
      [{ id: 'pulse-protective', changeKind: 'protective_claim_window' }],
      [protectivePulse],
      [{ id: 'firm-new' }],
      [{ firmId: 'firm-new', clientId: 'client-a', taxType: 'federal_1040' }],
    ])
    const firstCount = await makePulseRepo(
      first.db,
      'firm-new',
    ).catchUpStillOpenWindowsOnFirstObligations(5, new Date('2026-06-01T00:00:00.000Z'))
    expect(firstCount).toBe(1)
    expect(
      first.directStatements.some((statement) =>
        statementHasValue(statement, { firmId: 'firm-new', origin: 'catchup' }),
      ),
    ).toBe(true)

    // Later additions (total 8 != created 3): no catch-up — tomorrow's sweep
    // reaches them as origin='live' news instead.
    const later = fakeDb([[{ value: 8 }]])
    const laterCount = await makePulseRepo(
      later.db,
      'firm-old',
    ).catchUpStillOpenWindowsOnFirstObligations(3, new Date('2026-06-01T00:00:00.000Z'))
    expect(laterCount).toBe(0)
    expect(later.directStatements).toHaveLength(0)

    // Zero created: no-op without even a count query.
    const noop = fakeDb([])
    const noopCount = await makePulseRepo(
      noop.db,
      'firm-x',
    ).catchUpStillOpenWindowsOnFirstObligations(0)
    expect(noopCount).toBe(0)
  })

  it('keeps origin out of the upsert SET so a refresh never relabels a row', async () => {
    // First-writer-wins: the daily sweep refreshing a firm's 'live' row must not
    // flip it to 'catchup' (it would vanish from new-alert counters), and a
    // dup-fold re-fan-out must not flip a 'catchup' row back to 'live' (it would
    // resurface months-old news as "new").
    const protectivePulse = {
      id: 'pulse-protective',
      status: 'approved' as const,
      actionMode: 'review_only' as const,
      changeKind: 'protective_claim_window' as const,
      parsedJurisdiction: 'FED',
      parsedCounties: [],
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: null,
      reverifyRuleIdsJson: [],
      structuredChangeJson: { kind: 'protective_claim_window', actionDeadline: '2026-07-10' },
    }
    const { db, directStatements } = fakeDb([
      [{ id: 'pulse-protective', changeKind: 'protective_claim_window' }], // still-open candidates
      [protectivePulse], // getPulse inside the fan-out
      [{ id: 'firm-new' }], // active firms
      [{ firmId: 'firm-new', clientId: 'client-a', taxType: 'federal_1040' }], // protective scan
    ])

    await makePulseOpsRepo(db).backfillFirmAlertsForActiveLandscape(
      'firm-new',
      new Date('2026-06-01T00:00:00.000Z'),
    )

    const insertStatement = directStatements.find((statement) =>
      statementHasValue(statement, { pulseId: 'pulse-protective', firmId: 'firm-new' }),
    ) as { onConflictDoUpdate: ReturnType<typeof vi.fn> } | undefined
    expect(insertStatement).toBeDefined()
    const conflictSet = insertStatement?.onConflictDoUpdate.mock.calls[0]?.[0] as
      | { set: Record<string, unknown> }
      | undefined
    expect(conflictSet).toBeDefined()
    expect(Object.keys(conflictSet?.set ?? {})).not.toContain('origin')
  })

  it('quiet fan-out materializes impact-scoped catchup rows and queues no messages', async () => {
    // Backfill seed: approved pulse, fanOutMode 'quiet' → rows only where the
    // firm has impact, origin='catchup', and zero email/notification writes.
    const overlayPulse = {
      id: 'pulse-backfill',
      status: 'approved' as const,
      actionMode: 'due_date_overlay' as const,
      changeKind: 'deadline_shift' as const,
      parsedJurisdiction: 'GA',
      parsedCounties: [],
      parsedForms: ['federal_1040'],
      parsedEntityTypes: ['individual'],
      parsedOriginalDueDate: new Date('2026-05-01T00:00:00.000Z'),
      reverifyRuleIdsJson: [],
      structuredChangeJson: null,
    }
    const { db, directStatements } = fakeDb([
      [overlayPulse], // getPulse inside the fan-out
      [{ id: 'firm-hit' }, { id: 'firm-miss' }], // active firms
      [
        {
          firmId: 'firm-hit',
          obligationId: 'oi-1',
          currentDueDate: new Date('2026-05-01T00:00:00.000Z'),
          county: null,
          counties: null,
        },
      ], // overlay candidate scan
      [], // active overlay due dates for firm-hit
    ])

    const created = await makePulseOpsRepo(db).createPulseForFirmReviewFromExtract({
      snapshotId: 'snapshot-seed',
      source: 'irs.disaster',
      sourceUrl: 'https://www.irs.gov/newsroom/ga-relief',
      publishedAt: new Date('2026-05-08T00:00:00.000Z'),
      aiSummary: 'GA wildfire relief postpones deadlines to Aug 20.',
      verbatimQuote: 'postponed to Aug. 20, 2026',
      parsedJurisdiction: 'GA',
      parsedCounties: [],
      parsedForms: ['federal_1040'],
      parsedEntityTypes: ['individual'],
      parsedOriginalDueDate: new Date('2026-05-01T00:00:00.000Z'),
      parsedNewDueDate: new Date('2026-08-20T00:00:00.000Z'),
      confidence: 0.8,
      status: 'approved',
      fanOutMode: 'quiet',
    })

    expect(created.alertCount).toBe(1)
    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, {
          pulseId: created.pulseId,
          firmId: 'firm-hit',
          origin: 'catchup',
          matchedCount: 1,
        }),
      ),
    ).toBe(true)
    // No row for the zero-impact firm, and no email/notification writes: the
    // only statements are the pulse insert, the snapshot-status update, and
    // one alert upsert.
    expect(
      directStatements.some((statement) => statementHasValue(statement, { firmId: 'firm-miss' })),
    ).toBe(false)
    expect(directStatements).toHaveLength(3)
  })

  it('quiet promotion of a quarantined survivor also skips messages', async () => {
    const quarantined = {
      id: 'pulse-q-seed',
      status: 'quarantined' as const,
      reviewedAt: null,
      confidence: 0.4,
      parsedCounties: [],
      actionMode: 'review_only' as const,
      changeKind: 'protective_claim_window' as const,
      parsedJurisdiction: 'FED',
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: null,
      reverifyRuleIdsJson: [],
      structuredChangeJson: { kind: 'protective_claim_window', actionDeadline: '2026-07-10' },
    }
    const promoted = { ...quarantined, status: 'approved' as const, confidence: 0.8 }
    const { db, directStatements } = fakeDb([
      [quarantined], // fold reads the survivor
      [promoted], // fan-out status guard re-reads
      [{ id: 'firm-a' }], // active firms
      [{ firmId: 'firm-a', clientId: 'client-a', taxType: 'federal_1040' }], // protective scan
    ])

    const result = await makePulseOpsRepo(db).applyDuplicateExtractToPulse({
      pulseId: 'pulse-q-seed',
      incomingStatus: 'approved',
      confidence: 0.8,
      parsedCounties: [],
      fanOutMode: 'quiet',
    })

    expect(result.promoted).toBe(true)
    expect(result.alertCount).toBe(1)
    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, { firmId: 'firm-a', origin: 'catchup' }),
      ),
    ).toBe(true)
    // Statements: the status-promotion update + one alert upsert. A live
    // promotion would add review/digest message writes here.
    expect(directStatements).toHaveLength(2)
  })

  it('lists baseline-ignored snapshots and marks them as backfill seeds in chunks', async () => {
    const seedRows = Array.from({ length: 60 }, (_, index) => ({
      id: `snapshot-${index}`,
      sourceId: 'irs.disaster',
      parseStatus: 'ignored',
      failureReason: 'monitoring_baseline_established',
    }))
    const { db, directStatements } = fakeDb([seedRows])
    const repo = makePulseOpsRepo(db)

    const candidates = await repo.listBackfillSeedCandidates({ sourceIds: ['irs.disaster'] })
    expect(candidates).toHaveLength(60)

    const marked = await repo.markSnapshotsForBackfillExtract(candidates.map((row) => row.id))
    expect(marked).toBe(60)
    // 60 ids chunk into 2 UPDATEs (50 + 10), each flipping to pending_extract
    // and stamping ingest_method='backfill_seed'.
    const updates = directStatements.filter(
      (statement) =>
        statementHasValue(statement, {
          parseStatus: 'pending_extract',
          ingestMethod: 'backfill_seed',
        }) && (statement as { kind?: string }).kind === 'update',
    )
    expect(updates).toHaveLength(2)

    const empty = await repo.listBackfillSeedCandidates({ sourceIds: [] })
    expect(empty).toHaveLength(0)
    expect(await repo.markSnapshotsForBackfillExtract([])).toBe(0)
  })

  it('stamps live re-fan-out rows origin=live', async () => {
    const protectivePulse = {
      id: 'pulse-protective',
      status: 'approved' as const,
      actionMode: 'review_only' as const,
      changeKind: 'protective_claim_window' as const,
      parsedJurisdiction: 'FED',
      parsedCounties: [],
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: null,
      reverifyRuleIdsJson: [],
      structuredChangeJson: { kind: 'protective_claim_window', actionDeadline: '2026-07-10' },
    }
    const { db, directStatements } = fakeDb([
      [protectivePulse], // getPulse in refreshFirmAlertsForApprovedPulse
      [protectivePulse], // getPulse inside the fan-out
      [{ id: 'firm-a' }], // active firms
      [{ firmId: 'firm-a', clientId: 'client-a', taxType: 'federal_1040' }], // protective scan
    ])

    await makePulseOpsRepo(db).refreshFirmAlertsForApprovedPulse('pulse-protective')

    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, {
          pulseId: 'pulse-protective',
          firmId: 'firm-a',
          origin: 'live',
        }),
      ),
    ).toBe(true)
  })

  it('writes no alerts when the still-open landscape is empty', async () => {
    const { db, directStatements } = fakeDb([[]])

    const count = await makePulseOpsRepo(db).backfillFirmAlertsForActiveLandscape('firm-new')

    expect(count).toBe(0)
    expect(directStatements).toHaveLength(0)
  })

  it('catch-up materializes zero-impact rows so a clientless firm still sees the landscape', async () => {
    // Owner decision 2026-06-11: the "Already in effect" band shows the FULL
    // still-open landscape — matches or not — so a fresh/free account sees
    // the breadth of monitoring on day one. Safe because catch-up rows are
    // state, not news (origin='catchup': no "new" counters, no emails). The
    // daily sweep keeps skipZeroImpact — its rows land 'live' and would read
    // as fresh news.
    const overlayPulse = {
      id: 'pulse-ga-relief',
      status: 'approved' as const,
      actionMode: 'due_date_overlay' as const,
      changeKind: 'deadline_shift' as const,
      parsedJurisdiction: 'GA',
      parsedCounties: [],
      parsedForms: ['federal_1040'],
      parsedEntityTypes: ['individual'],
      parsedOriginalDueDate: new Date('2026-05-01T00:00:00.000Z'),
      reverifyRuleIdsJson: [],
      structuredChangeJson: null,
    }
    const { db, directStatements } = fakeDb([
      [{ id: 'pulse-ga-relief', changeKind: 'deadline_shift' }], // still-open candidates
      [overlayPulse], // getPulse inside the fan-out
      [{ id: 'firm-clientless' }], // active firms
      [], // overlay candidate scan — no matching obligations at all
    ])

    const count = await makePulseOpsRepo(db).backfillFirmAlertsForActiveLandscape(
      'firm-clientless',
      new Date('2026-06-01T00:00:00.000Z'),
    )

    expect(count).toBe(1)
    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, {
          pulseId: 'pulse-ga-relief',
          firmId: 'firm-clientless',
          matchedCount: 0,
          needsReviewCount: 0,
          origin: 'catchup',
        }),
      ),
    ).toBe(true)
  })

  it('promotes a system-quarantined survivor and runs the first-publication fan-out', async () => {
    const quarantinedPulse = {
      id: 'pulse-q',
      status: 'quarantined' as const,
      reviewedAt: null,
      confidence: 0.4,
      parsedCounties: [],
      actionMode: 'review_only' as const,
      changeKind: 'protective_claim_window' as const,
      parsedJurisdiction: 'FED',
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: null,
      reverifyRuleIdsJson: [],
      structuredChangeJson: { kind: 'protective_claim_window', actionDeadline: '2026-07-10' },
    }
    const promotedPulse = { ...quarantinedPulse, status: 'approved' as const, confidence: 0.8 }
    const { db, directStatements } = fakeDb([
      [quarantinedPulse], // fold reads the survivor
      [promotedPulse], // finalize re-reads
      [promotedPulse], // fan-out status guard re-reads
      [{ id: 'firm-a' }], // active firms
      [{ firmId: 'firm-a', clientId: 'client-a', taxType: 'federal_1040' }], // protective scan
    ])

    const result = await makePulseOpsRepo(db).applyDuplicateExtractToPulse({
      pulseId: 'pulse-q',
      incomingStatus: 'approved',
      confidence: 0.8,
      parsedCounties: [],
    })

    expect(result).toEqual({ promoted: true, countiesExpanded: false, alertCount: 1 })
    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, { status: 'approved', confidence: 0.8 }),
      ),
    ).toBe(true)
  })

  it('never overrides a human quarantine or reject decision', async () => {
    const { db, directStatements } = fakeDb([
      [
        {
          id: 'pulse-q',
          status: 'quarantined' as const,
          reviewedAt: new Date('2026-06-01T00:00:00.000Z'),
          confidence: 0.4,
          parsedCounties: [],
        },
      ],
      [
        {
          id: 'pulse-r',
          status: 'rejected' as const,
          reviewedAt: null,
          confidence: 0.4,
          parsedCounties: [],
        },
      ],
    ])
    const repo = makePulseOpsRepo(db)

    await expect(
      repo.applyDuplicateExtractToPulse({
        pulseId: 'pulse-q',
        incomingStatus: 'approved',
        confidence: 0.9,
        parsedCounties: [],
      }),
    ).resolves.toEqual({ promoted: false, countiesExpanded: false, alertCount: 0 })
    await expect(
      repo.applyDuplicateExtractToPulse({
        pulseId: 'pulse-r',
        incomingStatus: 'approved',
        confidence: 0.9,
        parsedCounties: [],
      }),
    ).resolves.toEqual({ promoted: false, countiesExpanded: false, alertCount: 0 })
    expect(directStatements).toHaveLength(0)
  })

  it('unions newly-named counties into an approved survivor without re-fan-out', async () => {
    const { db, directStatements } = fakeDb([
      [
        {
          id: 'pulse-a',
          status: 'approved' as const,
          reviewedAt: null,
          confidence: 0.9,
          parsedCounties: ['Los Angeles County'],
        },
      ],
    ])

    const result = await makePulseOpsRepo(db).applyDuplicateExtractToPulse({
      pulseId: 'pulse-a',
      incomingStatus: 'approved',
      confidence: 0.9,
      // 'los angeles' normalizes onto the existing entry; Orange County is new.
      parsedCounties: ['los angeles', 'Orange County'],
    })

    expect(result).toEqual({ promoted: false, countiesExpanded: true, alertCount: 0 })
    const update = directStatements.find((statement) => isKind(statement, 'update')) as {
      value: { parsedCounties: string[] }
    }
    expect(update.value.parsedCounties).toEqual(['Los Angeles County', 'Orange County'])
  })

  it('keeps statewide scope and is idempotent when nothing changes', async () => {
    const approvedStatewide = {
      id: 'pulse-s',
      status: 'approved' as const,
      reviewedAt: null,
      confidence: 0.9,
      parsedCounties: [],
    }
    const { db, directStatements } = fakeDb([
      [approvedStatewide], // statewide survivor + incoming counties → no scope change
      [{ ...approvedStatewide, parsedCounties: ['Orange County'] }], // county survivor + empty incoming
      [{ ...approvedStatewide, parsedCounties: ['Orange County'] }], // same county re-fold
    ])
    const repo = makePulseOpsRepo(db)

    await expect(
      repo.applyDuplicateExtractToPulse({
        pulseId: 'pulse-s',
        incomingStatus: 'approved',
        confidence: 0.9,
        parsedCounties: ['Orange County'],
      }),
    ).resolves.toEqual({ promoted: false, countiesExpanded: false, alertCount: 0 })
    await expect(
      repo.applyDuplicateExtractToPulse({
        pulseId: 'pulse-s',
        incomingStatus: 'approved',
        confidence: 0.9,
        parsedCounties: [],
      }),
    ).resolves.toEqual({ promoted: false, countiesExpanded: false, alertCount: 0 })
    await expect(
      repo.applyDuplicateExtractToPulse({
        pulseId: 'pulse-s',
        incomingStatus: 'approved',
        confidence: 0.9,
        parsedCounties: ['orange'],
      }),
    ).resolves.toEqual({ promoted: false, countiesExpanded: false, alertCount: 0 })
    expect(directStatements).toHaveLength(0)
  })

  it('refreshes an approved pulse after a duplicate fold without resurrecting handled alerts', async () => {
    // Duplicate-extract folds re-run the fan-out for counts; the conflict
    // update must NOT include status, or every tenant's dismissed/applied
    // alert flips back to 'matched' whenever a page re-snapshots.
    const approvedPulse = {
      id: 'pulse-approved',
      status: 'approved' as const,
      actionMode: 'review_only' as const,
      changeKind: 'protective_claim_window' as const,
      parsedJurisdiction: 'FED',
      parsedCounties: [],
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: null,
      reverifyRuleIdsJson: [],
      structuredChangeJson: { kind: 'protective_claim_window', actionDeadline: '2026-07-10' },
    }
    const { db, directStatements } = fakeDb([
      [approvedPulse], // wrapper status guard
      [approvedPulse], // getPulse inside the fan-out
      [{ id: 'firm-a' }], // active firms
      [{ firmId: 'firm-a', clientId: 'client-a', taxType: 'federal_1040' }], // protective scan
    ])

    const count = await makePulseOpsRepo(db).refreshFirmAlertsForApprovedPulse('pulse-approved')

    expect(count).toBe(1)
    const upsert = directStatements.find(
      (statement) =>
        isKind(statement, 'insert') && statementHasValue(statement, { firmId: 'firm-a' }),
    ) as { onConflictDoUpdate: ReturnType<typeof vi.fn> }
    const conflictArg = upsert.onConflictDoUpdate.mock.calls[0]?.[0] as {
      set: Record<string, unknown>
    }
    expect(conflictArg.set).not.toHaveProperty('status')
    expect(conflictArg.set).toHaveProperty('needsReviewCount')
  })

  it('sweeps still-open windows to all active firms without resurrecting dismissals', async () => {
    // Periodic sweep fans out to ALL firms; preserveStatus means the conflict
    // update refreshes counts but does not flip a dismissed alert to 'matched'.
    const protectivePulse = {
      id: 'pulse-protective',
      status: 'approved' as const,
      actionMode: 'review_only' as const,
      changeKind: 'protective_claim_window' as const,
      parsedJurisdiction: 'FED',
      parsedCounties: [],
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: null,
      reverifyRuleIdsJson: [],
      structuredChangeJson: { kind: 'protective_claim_window', actionDeadline: '2026-07-10' },
    }
    const { db, directStatements } = fakeDb([
      [{ id: 'pulse-protective', changeKind: 'protective_claim_window' }], // still-open candidates
      [protectivePulse], // getPulse inside the fan-out
      [{ id: 'firm-a' }, { id: 'firm-b' }], // all active firms
      [{ firmId: 'firm-a', clientId: 'client-a', taxType: 'federal_1040' }], // protective scan
    ])

    const count = await makePulseOpsRepo(db).refreshStillOpenWindowsForAllFirms(
      new Date('2026-06-01T00:00:00.000Z'),
    )

    expect(count).toBe(1)
    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, { firmId: 'firm-a', needsReviewCount: 1 }),
      ),
    ).toBe(true)
    // Zero-impact protective rows are skipped (skipZeroImpact covers both
    // kinds): firm-b has no in-scope client, so no count-0 noise row — and no
    // false "new alert" via the sweep.
    expect(
      directStatements.some((statement) => statementHasValue(statement, { firmId: 'firm-b' })),
    ).toBe(false)
  })

  it('records early source failures without changing CPA-facing health', async () => {
    // First two failures stay quiet (transient blips); the streak-derived
    // degraded/failing transitions are covered in the dedicated test below.
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
      consecutiveFailures: 1,
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
      consecutiveFailures: 2,
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
    const { db, directStatements } = fakeDb([[extractedPulse], [extractedPulse], []])

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
    expect(result.deduped).toBe(false)
    // Insert + snapshot update now run as direct statements (race-safe
    // onConflictDoNothing) rather than a db.batch.
    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, { status: 'approved', requiresHumanReview: true }),
      ),
    ).toBe(true)
    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, { parseStatus: 'extracted', failureReason: null }),
      ),
    ).toBe(true)
  })

  it('folds an AI extract onto the survivor when the dedupe key already exists (race)', async () => {
    // The keyed insert no-ops; the re-read by key returns a different id (a
    // sibling extraction won), so we point the snapshot at the survivor and
    // never create a second alert or fan out.
    const { db, directStatements } = fakeDb([[{ id: 'pulse-winner' }]])

    const result = await makePulseOpsRepo(db).createPulseForFirmReviewFromExtract({
      snapshotId: 'snapshot-2',
      source: 'irs.disaster',
      sourceUrl: 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations',
      publishedAt: new Date('2026-02-10T00:00:00.000Z'),
      aiSummary: 'IRS GA wildfire relief',
      verbatimQuote: 'postponed to August 20, 2026',
      parsedJurisdiction: 'GA',
      parsedCounties: [],
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: null,
      parsedNewDueDate: new Date('2026-08-20T00:00:00.000Z'),
      confidence: 0.9,
      dedupe: true,
    })

    expect(result).toEqual({ pulseId: 'pulse-winner', alertCount: 0, deduped: true })
    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, { dedupeKey: 'v1::GA::deadline::::2026-08-20' }),
      ),
    ).toBe(true)
    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, { parseStatus: 'duplicate', pulseId: 'pulse-winner' }),
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

  it('rough-counts protective claim review clients without matched due-date overlays', async () => {
    const protectivePulse = {
      id: 'pulse-protective',
      source: 'fed.taxpayer_advocate_blog',
      sourceUrl: 'https://www.taxpayeradvocate.irs.gov/taxnews-information/blogs-nta/',
      status: 'approved' as const,
      changeKind: 'protective_claim_window' as const,
      actionMode: 'review_only' as const,
      aiSummary: 'Review whether protective refund claims are needed before July 10, 2026.',
      parsedJurisdiction: 'FED',
      parsedCounties: [],
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: null,
      parsedNewDueDate: null,
      reverifyRuleIdsJson: [],
    }
    const { db, directStatements } = fakeDb([
      [protectivePulse],
      [protectivePulse],
      [{ id: 'firm-hit' }, { id: 'firm-empty' }],
      [
        { firmId: 'firm-hit', clientId: 'client-a', taxType: 'federal_1040' },
        { firmId: 'firm-hit', clientId: 'client-a', taxType: 'federal_941' },
        { firmId: 'firm-hit', clientId: 'client-b', taxType: 'federal_1099_misc' },
        { firmId: 'firm-empty', clientId: 'client-c', taxType: 'ca_sales_use' },
      ],
      [
        { id: 'alert-hit', firmId: 'firm-hit', matchedCount: 0, needsReviewCount: 2 },
        { id: 'alert-empty', firmId: 'firm-empty', matchedCount: 0, needsReviewCount: 0 },
      ],
      [{ email: 'owner@example.com' }],
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
      snapshotId: 'snapshot-protective',
      source: 'fed.taxpayer_advocate_blog',
      sourceUrl: 'https://www.taxpayeradvocate.irs.gov/taxnews-information/blogs-nta/',
      publishedAt: new Date('2026-06-08T00:00:00.000Z'),
      aiSummary: 'Review whether protective refund claims are needed before July 10, 2026.',
      verbatimQuote: 'protective claims before July 10, 2026',
      parsedJurisdiction: 'FED',
      parsedCounties: [],
      parsedForms: [],
      parsedEntityTypes: [],
      parsedOriginalDueDate: null,
      parsedNewDueDate: null,
      parsedEffectiveFrom: new Date('2020-03-13T00:00:00.000Z'),
      parsedEffectiveUntil: new Date('2022-04-10T00:00:00.000Z'),
      confidence: 0.9,
      actionMode: 'review_only',
      changeKind: 'protective_claim_window',
      structuredChange: {
        kind: 'protective_claim_window',
        actionDeadline: '2026-07-10',
      },
      requiresHumanReview: true,
    })

    expect(result.alertCount).toBe(2)
    expect(
      directStatements.some((statement) =>
        statementHasValue(statement, {
          firmId: 'firm-hit',
          matchedCount: 0,
          needsReviewCount: 2,
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

  it('lists an item’s prior content hashes scoped to source+external id', async () => {
    const { db } = fakeDb([[{ contentHash: 'a'.repeat(64) }, { contentHash: 'item-v2:abcd' }]])

    const hashes = await makePulseOpsRepo(db).listItemSnapshotContentHashes({
      sourceId: 'tx.temporary_announcements',
      externalId: 'https://comptroller.texas.gov/news/20260408-deadline',
      excludeId: 'snapshot-new',
    })

    expect(hashes).toEqual(['a'.repeat(64), 'item-v2:abcd'])
    const select = (db as unknown as { select: ReturnType<typeof vi.fn> }).select
    const chain = select.mock.results[0]?.value as { where: ReturnType<typeof vi.fn> }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- focused Drizzle test double.
    const query = new SQLiteSyncDialect().sqlToQuery(chain.where.mock.calls[0]?.[0] as SQL)
    expect(query.params).toContain('tx.temporary_announcements')
    expect(query.params).toContain('snapshot-new')
    expect(query.sql).toContain('<>')
  })

  it('derives degraded/failing health from the failure streak and respects paused', async () => {
    const failureUpdate = async (row: Record<string, unknown>) => {
      const { db, directStatements } = fakeDb([[row]])
      await makePulseOpsRepo(db).recordSourceFailure({
        sourceId: 'oh.sales_tax_rate_changes',
        nextCheckAt: new Date('2026-06-10T01:00:00.000Z'),
        error: 'HTTP 404',
      })
      const update = directStatements.find((statement) => isKind(statement, 'update')) as {
        value: Record<string, unknown>
      }
      return update.value
    }

    // 3rd consecutive failure → degraded; 12th → failing.
    expect(await failureUpdate({ consecutiveFailures: 2, healthStatus: 'healthy' })).toMatchObject({
      consecutiveFailures: 3,
      healthStatus: 'degraded',
    })
    expect(
      await failureUpdate({ consecutiveFailures: 11, healthStatus: 'degraded' }),
    ).toMatchObject({ consecutiveFailures: 12, healthStatus: 'failing' })
    // Early failures leave the stored health untouched.
    expect(
      'healthStatus' in (await failureUpdate({ consecutiveFailures: 0, healthStatus: 'healthy' })),
    ).toBe(false)
    // Operator-paused sources are never overwritten by failure streaks.
    expect(
      'healthStatus' in (await failureUpdate({ consecutiveFailures: 30, healthStatus: 'paused' })),
    ).toBe(false)
  })

  it('re-drives excerpt-location guard rejections but keeps other guard rejections dead', async () => {
    const { db } = fakeDb([[]])

    await makePulseOpsRepo(db).listRetryableFailedSnapshots({
      limit: 25,
      maxAgeMs: 14 * 24 * 60 * 60 * 1000,
      now: new Date('2026-06-10T00:00:00.000Z'),
    })

    const select = (db as unknown as { select: ReturnType<typeof vi.fn> }).select
    const chain = select.mock.results[0]?.value as { where: ReturnType<typeof vi.fn> }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- focused Drizzle test double.
    const query = new SQLiteSyncDialect().sqlToQuery(chain.where.mock.calls[0]?.[0] as SQL)
    expect(query.params).toContain('GUARD_REJECTED: Pulse%could not be located%')
    // Pre-prefix-era rows carry the bare guard message — the actual stranded backlog.
    expect(query.params).toContain('Pulse extract rejected because source e%')
    expect(query.params).toContain('AI_GATEWAY_ERROR%')
    // The Pulse-anchored pattern is the only GUARD_REJECTED pattern — every other guard
    // rejection class stays deterministic-dead so the sweep converges.
    expect(
      query.params.filter(
        (param) => typeof param === 'string' && param.startsWith('GUARD_REJECTED'),
      ),
    ).toHaveLength(1)
    // D1 caps LIKE patterns at 50 chars (SQLITE_LIMIT_LIKE_PATTERN_LENGTH); an
    // over-long pattern crashes the whole retry sweep with "pattern too complex".
    for (const param of query.params) {
      if (typeof param === 'string' && param.includes('%')) {
        expect(param.length).toBeLessThanOrEqual(50)
      }
    }
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

describe('computePulseDedupeKey', () => {
  // The three real production duplicate clusters this key is designed to fold.
  const dated = (over: Partial<Parameters<typeof computePulseDedupeKey>[0]>) =>
    computePulseDedupeKey({
      parsedJurisdiction: 'FED',
      changeKind: 'deadline_shift',
      parsedOriginalDueDate: null,
      parsedNewDueDate: new Date('2026-07-06T00:00:00.000Z'),
      parsedForms: [],
      parsedCounties: [],
      publishedAt: new Date('2026-05-06T12:00:00.000Z'),
      ...over,
    })

  it('collapses the 6× LITC race despite form-string drift and differing publish time', () => {
    const a = dated({ parsedForms: ['LITC_Grant_Application'] })
    const b = dated({ parsedForms: ['LITC matching grant application'] })
    const c = dated({ parsedForms: [], publishedAt: new Date('2026-06-01T09:00:00.000Z') })
    expect(a).toBe(b)
    expect(b).toBe(c)
    expect(a).toBe('v1::FED::deadline::::2026-07-06')
  })

  it('collapses the GA wildfire across feeds: ignores forms ([] vs ["various"]) and source URL', () => {
    const base = {
      parsedJurisdiction: 'GA',
      changeKind: 'deadline_shift' as const,
      parsedOriginalDueDate: null,
      parsedNewDueDate: new Date('2026-08-20T00:00:00.000Z'),
      parsedCounties: [],
      publishedAt: new Date('2026-02-10T00:00:00.000Z'),
    }
    const empty = computePulseDedupeKey({ ...base, parsedForms: [] })
    const various = computePulseDedupeKey({ ...base, parsedForms: ['various'] })
    expect(empty).toBe(various)
    expect(empty).toBe('v1::GA::deadline::::2026-08-20')
  })

  it('folds an undated county tax change re-classified across kinds (Mecklenburg)', () => {
    const base = {
      parsedJurisdiction: 'NC',
      parsedOriginalDueDate: null,
      parsedNewDueDate: null,
      parsedForms: ['Sales and Use Tax'],
      parsedCounties: ['Mecklenburg County'],
      publishedAt: new Date('2026-03-01T00:00:00.000Z'),
    }
    const scope = computePulseDedupeKey({ ...base, changeKind: 'applicability_scope' })
    const other = computePulseDedupeKey({ ...base, changeKind: 'other' })
    expect(scope).toBe(other) // both → 'scope' family
    expect(scope).toBe('v1::NC::scope::2026::sales and use tax::mecklenburg')
  })

  it('keeps genuinely distinct events apart (jurisdiction / due date)', () => {
    const ga820 = dated({ parsedJurisdiction: 'GA', parsedNewDueDate: new Date('2026-08-20') })
    const ga901 = dated({ parsedJurisdiction: 'GA', parsedNewDueDate: new Date('2026-09-01') })
    const tx820 = dated({ parsedJurisdiction: 'TX', parsedNewDueDate: new Date('2026-08-20') })
    expect(new Set([ga820, ga901, tx820]).size).toBe(3)
  })

  it('separates undated changes by normalized forms', () => {
    const base = {
      parsedJurisdiction: 'CA',
      changeKind: 'applicability_scope' as const,
      parsedOriginalDueDate: null,
      parsedNewDueDate: null,
      parsedCounties: [],
      publishedAt: new Date('2026-03-01T00:00:00.000Z'),
    }
    expect(computePulseDedupeKey({ ...base, parsedForms: ['Sales Tax'] })).not.toBe(
      computePulseDedupeKey({ ...base, parsedForms: ['Income Tax'] }),
    )
  })

  it('keys protective claim windows by action deadline', () => {
    const base = {
      parsedJurisdiction: 'FED',
      changeKind: 'protective_claim_window' as const,
      parsedOriginalDueDate: null,
      parsedNewDueDate: null,
      parsedForms: [],
      parsedCounties: [],
      publishedAt: new Date('2026-06-08T00:00:00.000Z'),
    }

    expect(
      computePulseDedupeKey({
        ...base,
        structuredChange: {
          kind: 'protective_claim_window',
          actionDeadline: '2026-07-10',
        },
      }),
    ).toBe('v1::FED::protective_claim::2026-07-10::2026::::')
    expect(
      computePulseDedupeKey({
        ...base,
        structuredChange: {
          kind: 'protective_claim_window',
          actionDeadline: '2026-08-01',
        },
      }),
    ).not.toBe(
      computePulseDedupeKey({
        ...base,
        structuredChange: {
          kind: 'protective_claim_window',
          actionDeadline: '2026-07-10',
        },
      }),
    )
  })
})

describe('pulseChangeKindFamily', () => {
  it('groups the kinds the extractor swaps for the same underlying event', () => {
    expect(pulseChangeKindFamily('deadline_shift')).toBe('deadline')
    expect(pulseChangeKindFamily('threshold_advisory')).toBe('deadline')
    for (const kind of [
      'applicability_scope',
      'filing_requirement',
      'form_instruction',
      'source_status',
      'other',
    ] as const) {
      expect(pulseChangeKindFamily(kind)).toBe('scope')
    }
    expect(pulseChangeKindFamily('new_obligation')).toBe('new_obligation')
    expect(pulseChangeKindFamily('protective_claim_window')).toBe('protective_claim')
    expect(pulseChangeKindFamily('rule_source_drift')).toBe('drift')
    expect(pulseChangeKindFamily(undefined)).toBe('deadline')
  })
})
