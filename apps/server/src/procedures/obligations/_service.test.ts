import { describe, expect, it } from 'vitest'
import { ObligationInstancePublicSchema } from '@duedatehq/contracts'
import type { ObligationInstanceRow } from '@duedatehq/ports/obligations'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import { deriveObligationReadiness } from '@duedatehq/core/obligation-workflow'
import { bulkUpdateObligationStatus, toObligationPublic, updateObligationStatus } from './_service'

type Row = ObligationInstanceRow

function unused(name: string): never {
  throw new Error(`Unexpected repo call in updateStatus test: ${name}`)
}

function unusedFilingProfilesRepo(firmId: string): ScopedRepo['filingProfiles'] {
  return {
    firmId,
    async createBatch() {
      return unused('filingProfiles.createBatch')
    },
    async listByClient() {
      return unused('filingProfiles.listByClient')
    },
    async listByClients() {
      return unused('filingProfiles.listByClients')
    },
    async replaceForClient() {
      return unused('filingProfiles.replaceForClient')
    },
    async deleteByBatch() {
      return unused('filingProfiles.deleteByBatch')
    },
  }
}

function buildScoped(firmId: string, rows: Row[]) {
  const audits: Array<{
    action: string
    actorId: string | null
    entityType: string
    entityId: string
    before: unknown
    after: unknown
    reason?: string
  }> = []
  const map = new Map<string, Row>(rows.map((r) => [r.id, r]))
  let auditCounter = 0

  const obligations: ScopedRepo['obligations'] = {
    firmId,
    async createBatch() {
      throw new Error('not used')
    },
    async findById(id: string) {
      return map.get(id)
    },
    async findManyByIds(ids: string[]) {
      return ids.flatMap((id) => map.get(id) ?? [])
    },
    async listByClient() {
      return []
    },
    async listByBatch() {
      return []
    },
    async listAnnualRolloverSeeds() {
      return []
    },
    async listGeneratedByClientAndTaxYears() {
      return []
    },
    async updateDueDate() {},
    async updateExposure() {},
    async updateStatus(id: string, status: Row['status']) {
      const row = map.get(id)
      if (!row) throw new Error('not found')
      map.set(id, {
        ...row,
        status,
        readiness: deriveObligationReadiness({ status }),
        updatedAt: new Date(),
      })
    },
    async updateStatusMany(ids: string[], status: Row['status']) {
      for (const id of ids) {
        const row = map.get(id)
        if (row) {
          map.set(id, {
            ...row,
            status,
            readiness: deriveObligationReadiness({ status }),
            updatedAt: new Date(),
          })
        }
      }
    },
    async unblockChildrenOf() {
      return []
    },
    async updateExtensionDecision() {},
    async deleteByBatch() {
      return 0
    },
  }

  const audit: ScopedRepo['audit'] = {
    firmId,
    async write(event) {
      auditCounter += 1
      audits.push({
        action: event.action,
        actorId: event.actorId ?? null,
        entityType: event.entityType,
        entityId: event.entityId,
        before: event.before ?? null,
        after: event.after ?? null,
        ...(event.reason !== undefined ? { reason: event.reason } : {}),
      })
      return { id: `audit-${auditCounter}` }
    },
    async writeBatch(events) {
      const ids: string[] = []
      for (const e of events) {
        auditCounter += 1
        audits.push({
          action: e.action,
          actorId: e.actorId ?? null,
          entityType: e.entityType,
          entityId: e.entityId,
          before: e.before ?? null,
          after: e.after ?? null,
          ...(e.reason !== undefined ? { reason: e.reason } : {}),
        })
        ids.push(`audit-${auditCounter}`)
      }
      return { ids }
    },
    async listByFirm() {
      return []
    },
    async list() {
      return { rows: [], nextCursor: null }
    },
  }

  const clients: ScopedRepo['clients'] = {
    firmId,
    async create() {
      return unused('clients.create')
    },
    async createBatch() {
      return unused('clients.createBatch')
    },
    async findById() {
      return undefined
    },
    async findManyByIds() {
      return []
    },
    async listByFirm() {
      return []
    },
    async listByBatch() {
      return []
    },
    async updatePenaltyInputs() {},
    async updateJurisdiction() {},
    async updateRiskProfile() {},
    async updateAssigneeMany() {},
    async softDelete() {},
    async deleteByBatch() {
      return 0
    },
  }

  const obligationQueue: ScopedRepo['obligationQueue'] = {
    firmId,
    async list() {
      return { rows: [], nextCursor: null }
    },
    async listByIds() {
      return []
    },
    async facets() {
      return { clients: [], states: [], counties: [], taxTypes: [], assigneeNames: [] }
    },
    async listSavedViews() {
      return []
    },
    async createSavedView() {
      return unused('obligations.createSavedView')
    },
    async updateSavedView() {
      return unused('obligations.updateSavedView')
    },
    async deleteSavedView() {},
  }

  const workload: ScopedRepo['workload'] = {
    firmId,
    async load() {
      return unused('workload.load')
    },
  }

  const migration = {
    firmId,
    async createBatch() {
      return unused('migration.createBatch')
    },
    async updateBatch() {
      return unused('migration.updateBatch')
    },
    async getBatch() {
      return undefined
    },
    async getActiveDraftBatch() {
      return undefined
    },
    async listByFirm() {
      return []
    },
    async listMappings() {
      return []
    },
    async listNormalizations() {
      return []
    },
    async listErrors() {
      return []
    },
    async listStagingRows() {
      return []
    },
    async createMappings() {
      return 0
    },
    async createNormalizations() {
      return 0
    },
    async createErrors() {
      return 0
    },
    async createStagingRows() {
      return 0
    },
    async createExternalReferences() {
      return 0
    },
    async findExternalReferences() {
      return []
    },
    async commitImport() {
      return unused('migration.commitImport')
    },
    async revertImport() {
      return unused('migration.revertImport')
    },
    async singleUndoImport() {
      return unused('migration.singleUndoImport')
    },
  } satisfies ScopedRepo['migration']

  const evidence: ScopedRepo['evidence'] = {
    firmId,
    async write() {
      return unused('evidence.write')
    },
    async writeBatch() {
      return unused('evidence.writeBatch')
    },
    async listByObligation() {
      return []
    },
  }

  const pulse: ScopedRepo['pulse'] = {
    firmId,
    async createSeedAlert() {
      return unused('pulse.createSeedAlert')
    },
    async listAlerts() {
      return unused('pulse.listAlerts')
    },
    async listHistory() {
      return unused('pulse.listHistory')
    },
    async listSourceStates() {
      return unused('pulse.listSourceStates')
    },
    async listSourceSignals() {
      return unused('pulse.listSourceSignals')
    },
    async getSourceSignal() {
      return unused('pulse.getSourceSignal')
    },
    async reviewSourceSignalForRule() {
      return unused('pulse.reviewSourceSignalForRule')
    },
    async getDetail() {
      return unused('pulse.getDetail')
    },
    async listPriorityQueue() {
      return unused('pulse.listPriorityQueue')
    },
    async requestPriorityReview() {
      return unused('pulse.requestPriorityReview')
    },
    async reviewPriorityMatches() {
      return unused('pulse.reviewPriorityMatches')
    },
    async applyReviewed() {
      return unused('pulse.applyReviewed')
    },
    async apply() {
      return unused('pulse.apply')
    },
    async dismiss() {
      return unused('pulse.dismiss')
    },
    async snooze() {
      return unused('pulse.snooze')
    },
    async revert() {
      return unused('pulse.revert')
    },
    async reactivate() {
      return unused('pulse.reactivate')
    },
  }

  const repo: ScopedRepo = {
    firmId,
    filingProfiles: unusedFilingProfilesRepo(firmId),
    ai: {
      firmId,
      async recordRun() {
        return unused('ai.recordRun')
      },
    },
    aiInsights: {
      firmId,
      async findLatest() {
        return null
      },
      async findByHash() {
        return null
      },
      async createPending() {
        return unused('aiInsights.createPending')
      },
      async markReady() {
        return unused('aiInsights.markReady')
      },
      async markFailed() {
        return unused('aiInsights.markFailed')
      },
    },
    calendar: {
      firmId,
      async listForUser() {
        return unused('calendar.listForUser')
      },
      async upsert() {
        return unused('calendar.upsert')
      },
      async find() {
        return unused('calendar.find')
      },
      async regenerate() {
        return unused('calendar.regenerate')
      },
      async disable() {
        return unused('calendar.disable')
      },
    },
    clients,
    dashboard: {
      firmId,
      async load() {
        return unused('dashboard.load')
      },
      async findLatestBrief() {
        return unused('dashboard.findLatestBrief')
      },
      async findBriefByHash() {
        return unused('dashboard.findBriefByHash')
      },
      async createBriefPending() {
        return unused('dashboard.createBriefPending')
      },
      async markBriefReady() {
        return unused('dashboard.markBriefReady')
      },
      async markBriefFailed() {
        return unused('dashboard.markBriefFailed')
      },
    },
    obligations,
    obligationQueue,
    workload,
    pulse,
    readiness: {
      firmId,
      async listByObligation() {
        return unused('readiness.listByObligation')
      },
      async createRequest() {
        return unused('readiness.createRequest')
      },
      async getRequest() {
        return unused('readiness.getRequest')
      },
      async markOpened() {},
      async revokeRequest() {},
      async submitResponses() {
        return unused('readiness.submitResponses')
      },
    },
    rules: {
      firmId,
      async upsertGlobalTemplates() {},
      async listPracticeRules() {
        return []
      },
      async listActivePracticeRules() {
        return []
      },
      async getPracticeRule() {
        return null
      },
      async upsertPracticeRule() {
        return unused('rules.upsertPracticeRule')
      },
      async ensureReviewTasks() {
        return []
      },
      async listReviewTasks() {
        return []
      },
      async getReviewTask() {
        return null
      },
      async decideReviewTask() {
        return unused('rules.decideReviewTask')
      },
      async listDecisions() {
        return []
      },
      async listVerified() {
        return []
      },
      async listTemporaryRules() {
        return []
      },
      async getDecision() {
        return null
      },
      async upsertDecision() {
        return unused('rules.upsertDecision')
      },
    },
    migration,
    evidence,
    audit,
  }

  return { repo, audits, map }
}

const ROW_ID = '11111111-1111-4111-8111-111111111111'
const FIRM = 'firm_a'

function makeRow(over: Partial<Row> = {}): Row {
  const now = new Date('2026-04-26T00:00:00.000Z')
  return {
    id: ROW_ID,
    firmId: FIRM,
    clientId: '22222222-2222-4222-8222-222222222222',
    clientFilingProfileId: null,
    taxType: '1040',
    taxYear: 2026,
    ruleId: null,
    ruleVersion: null,
    rulePeriod: null,
    generationSource: null,
    jurisdiction: 'FED',
    obligationType: 'filing',
    formName: 'Form 1040',
    authority: 'IRS',
    filingDueDate: now,
    paymentDueDate: null,
    sourceEvidenceJson: null,
    recurrence: 'annual',
    riskLevel: 'low',
    baseDueDate: now,
    currentDueDate: now,
    status: 'pending',
    blockedByObligationInstanceId: null,
    readiness: 'ready',
    extensionDecision: 'not_considered',
    extensionMemo: null,
    extensionSource: null,
    extensionExpectedDueDate: null,
    extensionDecidedAt: null,
    extensionDecidedByUserId: null,
    extensionState: 'not_started',
    extensionFormName: null,
    extensionFiledAt: null,
    extensionAcceptedAt: null,
    prepStage: 'not_started',
    reviewStage: 'not_required',
    reviewerUserId: null,
    reviewCompletedAt: null,
    paymentState: 'not_applicable',
    paymentConfirmedAt: null,
    efileState: 'not_applicable',
    efileAuthorizationForm: null,
    efileSubmittedAt: null,
    efileAcceptedAt: null,
    efileRejectedAt: null,
    migrationBatchId: null,
    estimatedTaxDueCents: null,
    estimatedExposureCents: null,
    exposureStatus: 'needs_input',
    penaltyFactsJson: null,
    penaltyFactsVersion: null,
    penaltyBreakdownJson: [],
    penaltyFormulaVersion: null,
    missingPenaltyFactsJson: [],
    penaltySourceRefsJson: [],
    penaltyFormulaLabel: null,
    exposureCalculatedAt: null,
    createdAt: now,
    updatedAt: now,
    ...over,
  }
}

describe('toObligationPublic', () => {
  it('normalizes missing generation metadata from legacy rows to null', () => {
    const legacy: Parameters<typeof toObligationPublic>[0] = { ...makeRow() }
    delete legacy.ruleId
    delete legacy.ruleVersion
    delete legacy.rulePeriod
    delete legacy.generationSource

    const result = toObligationPublic(legacy, { asOfDate: '2026-04-26' })

    expect(result).toMatchObject({
      ruleId: null,
      ruleVersion: null,
      rulePeriod: null,
      generationSource: null,
    })
    expect(() => ObligationInstancePublicSchema.parse(result)).not.toThrow()
  })

  it('falls back missing statutory split dates to the tax authority source-backed date', () => {
    const result = toObligationPublic(
      makeRow({
        filingDueDate: null,
        paymentDueDate: null,
        baseDueDate: new Date('2026-04-15T00:00:00.000Z'),
      }),
      { asOfDate: '2026-04-26' },
    )

    expect(result.filingDueDate).toBe('2026-04-15')
    expect(result.paymentDueDate).toBe('2026-04-15')
    expect(() => ObligationInstancePublicSchema.parse(result)).not.toThrow()
  })

  it('keeps list output contract-valid when accrued penalty is calculated', () => {
    const result = toObligationPublic(
      makeRow({
        taxType: 'federal_1065',
        currentDueDate: new Date('2026-04-15T00:00:00.000Z'),
        penaltyFactsJson: {
          version: 'penalty-facts-v1',
          facts: { partnerCount: 3 },
        },
      }),
      {
        client: {
          id: '22222222-2222-4222-8222-222222222222',
          state: 'CA',
          entityType: 'llc',
          equityOwnerCount: 3,
        },
        asOfDate: '2026-05-04',
      },
    )

    expect(result.ruleId).toBeNull()
    expect(result.generationSource).toBeNull()
    expect(result.accruedPenaltyStatus).toBe('ready')
    expect(() => ObligationInstancePublicSchema.parse(result)).not.toThrow()
  })
})

describe('updateObligationStatus', () => {
  it('updates status and writes a single audit row carrying before/after', async () => {
    const { repo, audits, map } = buildScoped(FIRM, [makeRow()])

    const result = await updateObligationStatus(repo, 'user_1', {
      id: ROW_ID,
      status: 'in_progress',
      reason: 'starting today',
    })

    expect(result.obligation.status).toBe('in_progress')
    expect(result.auditId).toBe('audit-1')
    expect(map.get(ROW_ID)?.status).toBe('in_progress')

    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({
      action: 'obligation.status.updated',
      actorId: 'user_1',
      entityType: 'obligation_instance',
      entityId: ROW_ID,
      before: { status: 'pending', readiness: 'ready' },
      after: { status: 'in_progress', readiness: 'ready' },
      reason: 'starting today',
    })
  })

  it('is a no-op when before === after (no audit row)', async () => {
    const { repo, audits } = buildScoped(FIRM, [makeRow({ status: 'in_progress' })])

    const result = await updateObligationStatus(repo, 'user_1', {
      id: ROW_ID,
      status: 'in_progress',
    })

    expect(result.obligation.status).toBe('in_progress')
    expect(result.auditId).toBe('00000000-0000-0000-0000-000000000000')
    expect(audits).toHaveLength(0)
  })

  it('bulk-updates changed rows and writes per-obligation audit rows', async () => {
    const rowA = makeRow()
    const rowB = makeRow({
      id: '33333333-3333-4333-8333-333333333333',
      status: 'in_progress',
    })
    const rowC = makeRow({
      id: '44444444-4444-4444-8444-444444444444',
      status: 'extended',
    })
    const { repo, audits, map } = buildScoped(FIRM, [rowA, rowB, rowC])

    const result = await bulkUpdateObligationStatus(repo, 'user_1', {
      ids: [rowA.id, rowB.id, rowC.id],
      status: 'extended',
      reason: 'extension memo',
    })

    expect(result.updatedCount).toBe(2)
    expect(result.auditIds).toEqual(['audit-1', 'audit-2'])
    expect(map.get(rowA.id)?.status).toBe('extended')
    expect(map.get(rowB.id)?.status).toBe('extended')
    expect(audits).toEqual([
      expect.objectContaining({
        action: 'obligation.status.updated',
        entityId: rowA.id,
        before: { status: 'pending', readiness: 'ready' },
        after: { status: 'extended', readiness: 'ready' },
        reason: 'extension memo',
      }),
      expect.objectContaining({
        action: 'obligation.status.updated',
        entityId: rowB.id,
        before: { status: 'in_progress', readiness: 'ready' },
        after: { status: 'extended', readiness: 'ready' },
        reason: 'extension memo',
      }),
    ])
  })

  it('returns derived readiness when status implies waiting or review', async () => {
    const { repo, audits, map } = buildScoped(FIRM, [
      makeRow({ status: 'in_progress', readiness: 'ready' }),
    ])

    await updateObligationStatus(repo, 'user_1', {
      id: ROW_ID,
      status: 'waiting_on_client',
    })

    expect(map.get(ROW_ID)?.readiness).toBe('waiting')
    expect(audits[0]).toMatchObject({
      before: { status: 'in_progress', readiness: 'ready' },
      after: { status: 'waiting_on_client', readiness: 'waiting' },
    })
  })

  it('throws NOT_FOUND when the obligation does not belong to the firm', async () => {
    const { repo, audits } = buildScoped(FIRM, [])

    await expect(
      updateObligationStatus(repo, 'user_1', {
        id: ROW_ID,
        status: 'done',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    expect(audits).toHaveLength(0)
  })

  it('omits reason from audit when not provided', async () => {
    const { repo, audits } = buildScoped(FIRM, [makeRow()])

    await updateObligationStatus(repo, 'user_1', {
      id: ROW_ID,
      status: 'review',
    })

    expect(audits[0]).not.toHaveProperty('reason')
  })
})
