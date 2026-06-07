import { describe, expect, it } from 'vitest'
import { ObligationInstancePublicSchema } from '@duedatehq/contracts'
import type { ObligationInstanceRow } from '@duedatehq/ports/obligations'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import { deriveObligationReadiness } from '@duedatehq/core/obligation-workflow'
import { statutoryPenaltyDueDate } from '@duedatehq/core/deadlines'
import {
  backfillObligationSignatureLoop,
  bulkDecideObligationExtension,
  bulkPreviewObligationExtensionDecision,
  bulkPreviewObligationSignatureReminder,
  bulkRemindObligationSignature,
  bulkUpdateObligationStatus,
  decideObligationExtension,
  markObligationFiledRejected,
  previewObligationSignatureReminder,
  remindObligationSignature,
  toObligationPublic,
  updateObligationEfileState,
  updateObligationPrepStage,
  updateObligationReviewStage,
  updateObligationStatus,
} from './_service'

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
  const evidences: Array<{
    obligationInstanceId: string | null
    sourceType: string
    rawValue: string | null
    normalizedValue: string | null
    appliedBy: string | null
  }> = []
  const map = new Map<string, Row>(rows.map((r) => [r.id, r]))
  let auditCounter = 0
  let evidenceCounter = 0

  const obligations: ScopedRepo['obligations'] = {
    firmId,
    async confirmByIds() {
      return { confirmedIds: [] }
    },
    async supersedeByIds() {
      return { supersededIds: [] }
    },
    async listReprojectionCandidates() {
      return []
    },
    async listAffectedClientsByRules() {
      return new Map()
    },
    async updateProjectedDueDates() {},
    async listProjected() {
      return []
    },
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
    async listSignatureLoopBackfillCandidates() {
      return [...map.values()].filter(
        (r) => r.status === 'done' && (r.efileState ?? 'not_applicable') === 'not_applicable',
      )
    },
    async listGeneratedByClientAndTaxYears() {
      return []
    },
    async updateDueDate() {},
    async updateTaxYearProfile() {},
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
    async setEfileRejected(id: string, patch: { rejectedAt: Date; nextStatus: Row['status'] }) {
      const row = map.get(id)
      if (!row) throw new Error('not found')
      map.set(id, {
        ...row,
        status: patch.nextStatus,
        efileRejectedAt: patch.rejectedAt,
        efileAcceptedAt: null,
        readiness: deriveObligationReadiness({ status: patch.nextStatus }),
        updatedAt: new Date(),
      })
    },
    async setBlockedBy(id: string, patch: { blockedBy: string | null; nextStatus: Row['status'] }) {
      const row = map.get(id)
      if (!row) throw new Error('not found')
      map.set(id, {
        ...row,
        blockedByObligationInstanceId: patch.blockedBy,
        status: patch.nextStatus,
        readiness: deriveObligationReadiness({ status: patch.nextStatus }),
        updatedAt: new Date(),
      })
    },
    async setPrepStage(id: string, prepStage: Row['prepStage']) {
      const row = map.get(id)
      if (!row) throw new Error('not found')
      map.set(id, { ...row, prepStage, updatedAt: new Date() })
    },
    async setReviewStage(id: string, reviewStage: Row['reviewStage']) {
      const row = map.get(id)
      if (!row) throw new Error('not found')
      map.set(id, { ...row, reviewStage, updatedAt: new Date() })
    },
    async setEfileState(id: string, efileState: Row['efileState']) {
      const row = map.get(id)
      if (!row) throw new Error('not found')
      map.set(id, { ...row, efileState, updatedAt: new Date() })
    },
    async unblockChildrenOf() {
      return []
    },
    async updateExtensionDecision(id, patch) {
      const row = map.get(id)
      if (!row) throw new Error('not found')
      const status = patch.status ?? row.status
      map.set(id, {
        ...row,
        extensionDecision: patch.decision,
        extensionMemo: patch.memo,
        extensionSource: patch.source,
        extensionExpectedDueDate: patch.internalTargetDate,
        extensionDecidedAt: patch.decidedAt,
        extensionDecidedByUserId: patch.decidedByUserId,
        extensionState: patch.decision === 'applied' ? 'filed' : 'rejected',
        status,
        ...(patch.filingDueDate !== undefined ? { filingDueDate: patch.filingDueDate } : {}),
        ...(patch.currentDueDate !== undefined ? { currentDueDate: patch.currentDueDate } : {}),
        ...(patch.paymentDueDate !== undefined ? { paymentDueDate: patch.paymentDueDate } : {}),
        readiness: deriveObligationReadiness({ status }),
        updatedAt: new Date(),
      })
    },
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
    // Derive "last reminded" from captured audits: any entity with a matching
    // action gets a fresh (recent) timestamp, which is enough to exercise the
    // single "lastRemindedAt" + bulk "recentlyReminded" paths.
    async latestByEntityIds(action, ids) {
      const latest = new Map<string, Date>()
      for (const a of audits) {
        if (a.action === action && a.entityId && ids.includes(a.entityId)) {
          latest.set(a.entityId, new Date())
        }
      }
      return latest
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
    async updateSourceDetails() {},
    async updateClassification() {},
    async updateNotes() {},
    async updateTaxYearProfile() {},
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
      return {
        clients: [],
        states: [],
        counties: [],
        taxTypes: [],
        assigneeNames: [],
        statuses: [],
      }
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
    async createMappings() {
      return 0
    },
    async createNormalizations() {
      return 0
    },
    async createErrors() {
      return 0
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
    async write(event) {
      evidenceCounter += 1
      evidences.push({
        obligationInstanceId: event.obligationInstanceId ?? null,
        sourceType: event.sourceType,
        rawValue: event.rawValue ?? null,
        normalizedValue: event.normalizedValue ?? null,
        appliedBy: event.appliedBy ?? null,
      })
      return { id: `evidence-${evidenceCounter}` }
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
    async countActiveAlerts() {
      return unused('pulse.countActiveAlerts')
    },
    async refreshMatchedCountsForObligations() {
      return unused('pulse.refreshMatchedCountsForObligations')
    },
    async listAlertsForRule() {
      return unused('pulse.listAlertsForRule')
    },
    async listHistory() {
      return unused('pulse.listHistory')
    },
    async listSourceStates() {
      return unused('pulse.listSourceStates')
    },
    async getLatestSourceSnapshotBySourceId() {
      return unused('pulse.getLatestSourceSnapshotBySourceId')
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
    async reviewDueDateOverlayDetails() {
      return unused('pulse.reviewDueDateOverlayDetails')
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
    async markReviewed() {
      return unused('pulse.markReviewed')
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
    clientTaxYearProfiles: {
      firmId,
      async listByClient() {
        return []
      },
      async listByClients() {
        return new Map()
      },
      async upsert() {},
    },
    ai: {
      firmId,
      async findSuccessfulRun() {
        return null
      },
      async findSuccessfulGlobalRun() {
        return null
      },
      async findSuccessfulRunsByContextRefs() {
        return []
      },
      async findSuccessfulGlobalRunsByContextRefs() {
        return []
      },
      async recordRun() {
        return unused('ai.recordRun')
      },
      async recordGlobalRun() {
        return unused('ai.recordGlobalRun')
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
      async welcomeRecap() {
        return unused('dashboard.welcomeRecap')
      },
      async recordDashboardVisit() {
        return unused('dashboard.recordDashboardVisit')
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
      async listDocumentChecklistByObligation() {
        return unused('readiness.listDocumentChecklistByObligation')
      },
      async createDocumentChecklistItems() {
        return unused('readiness.createDocumentChecklistItems')
      },
      async reconcileDocumentChecklistItems() {
        return unused('readiness.reconcileDocumentChecklistItems')
      },
      async updateDocumentChecklistItem() {
        return unused('readiness.updateDocumentChecklistItem')
      },
      async deleteDocumentChecklistItem() {
        return unused('readiness.deleteDocumentChecklistItem')
      },
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
      async syncDocumentChecklistFromResponses() {},
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
      async listUnclearedDriftRuleIds() {
        return []
      },
      async clearRuleSourceDrift() {},
    },
    migration,
    evidence,
    audit,
  }

  return { repo, audits, evidences, map }
}

const ROW_ID = '11111111-1111-4111-8111-111111111111'
const FIRM = 'firm_a'

function makeRow(over: Partial<Row> = {}): Row {
  const now = new Date('2026-04-26T00:00:00.000Z')
  return {
    id: ROW_ID,
    firmId: FIRM,
    confirmed: true,
    clientId: '22222222-2222-4222-8222-222222222222',
    clientFilingProfileId: null,
    taxType: '1040',
    taxYear: 2026,
    taxYearType: 'calendar',
    fiscalYearEndMonth: null,
    fiscalYearEndDay: null,
    taxPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
    taxPeriodEnd: new Date('2026-12-31T00:00:00.000Z'),
    taxPeriodKind: 'calendar',
    taxPeriodSource: 'client_default',
    taxPeriodReviewReason: null,
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

describe('decideObligationExtension', () => {
  // fed.1040.return.2025 carries extensionPolicy.durationMonths = 6 (Form 4868),
  // so an extension from April 15 pushes the filing deadline to Oct 15.
  const RULE_1040 = 'fed.1040.return.2025'
  const OFFSET = 14

  it('applies the decision AND moves the filing deadline to the extended date', async () => {
    const { repo, audits, evidences, map } = buildScoped(FIRM, [
      makeRow({
        ruleId: RULE_1040,
        baseDueDate: new Date('2026-04-15T00:00:00.000Z'),
        filingDueDate: new Date('2026-04-15T00:00:00.000Z'),
      }),
    ])

    const result = await decideObligationExtension(
      repo,
      'user_1',
      {
        id: ROW_ID,
        internalTargetDate: '2026-08-01',
        source: 'Partner approval',
        memo: 'Client materials are late.',
      },
      OFFSET,
    )

    expect(result.auditId).toBe('audit-1')
    expect(result.evidenceId).toBe('evidence-1')
    expect(result.obligation.status).toBe('extended')
    expect(result.obligation.extensionDecision).toBe('applied')
    expect(result.obligation.extensionInternalTargetDate).toBe('2026-08-01')
    // Filing deadline pushed to Oct 15; the internal target becomes the working
    // (current) deadline; payment + base stay on the original date.
    expect(result.obligation.filingDueDate).toBe('2026-10-15')
    expect(result.obligation.currentDueDate).toBe('2026-08-01')
    expect(result.obligation.paymentDueDate).toBe('2026-04-15')
    expect(result.obligation.baseDueDate).toBe('2026-04-15')

    const stored = map.get(ROW_ID)
    expect(stored?.filingDueDate?.toISOString().slice(0, 10)).toBe('2026-10-15')
    expect(stored?.currentDueDate?.toISOString().slice(0, 10)).toBe('2026-08-01')
    expect(stored?.paymentDueDate?.toISOString().slice(0, 10)).toBe('2026-04-15')
    expect(stored).toMatchObject({
      status: 'extended',
      extensionDecision: 'applied',
      extensionMemo: 'Client materials are late.',
      extensionSource: 'Partner approval',
      extensionState: 'filed',
    })

    const [evidence] = evidences
    if (!evidence) throw new Error('Expected extension evidence')
    expect(JSON.parse(evidence.normalizedValue ?? '{}')).toMatchObject({
      decision: 'applied',
      internalTargetDate: '2026-08-01',
      originalFilingDeadline: '2026-04-15',
      extendedFilingDeadline: '2026-10-15',
      durationMonths: 6,
      paymentDeadline: '2026-04-15',
      paymentStillDue: true,
    })
    expect(audits[0]).toMatchObject({
      action: 'obligation.extension.decided',
      after: {
        status: 'extended',
        extensionDecision: 'applied',
        filingDeadline: '2026-10-15',
        originalFilingDeadline: '2026-04-15',
        paymentDeadline: '2026-04-15',
        paymentStillDue: true,
      },
      reason: 'Client materials are late.',
    })
  })

  it('allows an internal target AFTER the original deadline (up to the extended date)', async () => {
    const { repo } = buildScoped(FIRM, [
      makeRow({
        ruleId: RULE_1040,
        baseDueDate: new Date('2026-04-15T00:00:00.000Z'),
        filingDueDate: new Date('2026-04-15T00:00:00.000Z'),
      }),
    ])

    // 2026-09-30 is after the original April 15 deadline but before Oct 15 —
    // exactly the realistic post-extension target the old capped flow rejected.
    const result = await decideObligationExtension(
      repo,
      'user_1',
      { id: ROW_ID, internalTargetDate: '2026-09-30' },
      OFFSET,
    )

    expect(result.obligation.extensionDecision).toBe('applied')
    expect(result.obligation.extensionInternalTargetDate).toBe('2026-09-30')
    expect(result.obligation.filingDueDate).toBe('2026-10-15')
  })

  it('rejects an internal target date after the EXTENDED filing deadline', async () => {
    const { repo, audits, evidences, map } = buildScoped(FIRM, [
      makeRow({
        ruleId: RULE_1040,
        baseDueDate: new Date('2026-04-15T00:00:00.000Z'),
        filingDueDate: new Date('2026-04-15T00:00:00.000Z'),
      }),
    ])

    await expect(
      decideObligationExtension(
        repo,
        'user_1',
        { id: ROW_ID, internalTargetDate: '2026-10-16' },
        OFFSET,
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })

    expect(map.get(ROW_ID)?.extensionDecision).toBe('not_considered')
    expect(audits).toHaveLength(0)
    expect(evidences).toHaveLength(0)
  })

  it('keeps the penalty anchored on the original payment date after extending', async () => {
    const { repo, map } = buildScoped(FIRM, [
      makeRow({
        ruleId: RULE_1040,
        baseDueDate: new Date('2026-04-15T00:00:00.000Z'),
        filingDueDate: new Date('2026-04-15T00:00:00.000Z'),
        paymentDueDate: null,
      }),
    ])

    await decideObligationExtension(
      repo,
      'user_1',
      { id: ROW_ID, internalTargetDate: '2026-08-01' },
      OFFSET,
    )

    const stored = map.get(ROW_ID)
    if (!stored) throw new Error('row missing')
    // Filing moved to Oct 15, but the statutory penalty date stays April 15
    // because paymentDueDate was pinned to the original date.
    expect(statutoryPenaltyDueDate(stored).toISOString().slice(0, 10)).toBe('2026-04-15')
  })

  it('requires a manual extended date when the rule has no statutory duration', async () => {
    const { repo, map } = buildScoped(FIRM, [
      makeRow({ ruleId: null, baseDueDate: new Date('2026-04-15T00:00:00.000Z') }),
    ])

    await expect(
      decideObligationExtension(
        repo,
        'user_1',
        { id: ROW_ID, internalTargetDate: '2026-09-01' },
        OFFSET,
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(map.get(ROW_ID)?.extensionDecision).toBe('not_considered')
  })

  it('uses a manually-entered extended date for rules without a duration', async () => {
    const { repo, map } = buildScoped(FIRM, [
      makeRow({ ruleId: null, baseDueDate: new Date('2026-04-15T00:00:00.000Z') }),
    ])

    const result = await decideObligationExtension(
      repo,
      'user_1',
      { id: ROW_ID, internalTargetDate: '2026-10-01', extendedFilingDate: '2026-11-15' },
      OFFSET,
    )

    expect(result.obligation.extensionDecision).toBe('applied')
    expect(result.obligation.filingDueDate).toBe('2026-11-15')
    expect(result.obligation.currentDueDate).toBe('2026-10-01')
    expect(map.get(ROW_ID)?.filingDueDate?.toISOString().slice(0, 10)).toBe('2026-11-15')
  })
})

describe('bulkDecideObligationExtension', () => {
  const RULE_1040 = 'fed.1040.return.2025'
  const OFFSET = 14
  const ROW_A = ROW_ID
  const ROW_B = '55555555-5555-4555-8555-555555555555'
  const ROW_C = '66666666-6666-4666-8666-666666666666'

  function row1040(id: string, baseIso: string, over: Partial<Row> = {}): Row {
    return makeRow({
      id,
      ruleId: RULE_1040,
      baseDueDate: new Date(`${baseIso}T00:00:00.000Z`),
      filingDueDate: new Date(`${baseIso}T00:00:00.000Z`),
      ...over,
    })
  }

  it('decides every eligible row, moving each filing deadline, and skips already-extended', async () => {
    const { repo, audits, map } = buildScoped(FIRM, [
      row1040(ROW_A, '2026-04-15'), // → extended 2026-10-15
      row1040(ROW_B, '2026-03-15'), // → extended 2026-09-15
      makeRow({ id: ROW_C, ruleId: RULE_1040, extensionDecision: 'applied' }),
    ])

    const result = await bulkDecideObligationExtension(
      repo,
      'user_1',
      { ids: [ROW_A, ROW_B, ROW_C], memo: 'Busy season backlog.' },
      OFFSET,
    )

    expect(result.decidedCount).toBe(2)
    expect(result.skippedCount).toBe(1)
    expect(result.auditIds).toHaveLength(2)
    expect(map.get(ROW_A)?.filingDueDate?.toISOString().slice(0, 10)).toBe('2026-10-15')
    expect(map.get(ROW_B)?.filingDueDate?.toISOString().slice(0, 10)).toBe('2026-09-15')
    expect(map.get(ROW_A)).toMatchObject({ status: 'extended', extensionDecision: 'applied' })
    // The already-extended row is untouched (no status flip to 'extended' here).
    expect(map.get(ROW_C)?.status).toBe('pending')
    expect(audits.filter((a) => a.action === 'obligation.extension.decided')).toHaveLength(2)
  })

  it('skips rows whose extended deadline is earlier than the shared target date', async () => {
    const { repo, map } = buildScoped(FIRM, [
      row1040(ROW_A, '2026-04-15'), // extended 2026-10-15
      row1040(ROW_B, '2026-09-15'), // extended 2027-03-15
    ])

    const result = await bulkDecideObligationExtension(
      repo,
      'user_1',
      { ids: [ROW_A, ROW_B], internalTargetDate: '2026-12-01' },
      OFFSET,
    )

    expect(result.decidedCount).toBe(1) // only ROW_B (extended 2027-03-15 >= target)
    expect(result.skippedCount).toBe(1) // ROW_A extended 2026-10-15 < 2026-12-01
    expect(map.get(ROW_A)?.extensionDecision).toBe('not_considered')
    expect(map.get(ROW_B)).toMatchObject({ status: 'extended', extensionDecision: 'applied' })
  })

  it('skips rows whose rule has no statutory duration (need a manual date)', async () => {
    const { repo, map } = buildScoped(FIRM, [
      makeRow({ id: ROW_A, ruleId: null, baseDueDate: new Date('2026-04-15T00:00:00.000Z') }),
      row1040(ROW_B, '2026-04-15'),
    ])

    const result = await bulkDecideObligationExtension(
      repo,
      'user_1',
      { ids: [ROW_A, ROW_B], memo: 'note' },
      OFFSET,
    )

    expect(result.decidedCount).toBe(1)
    expect(result.skippedCount).toBe(1)
    expect(map.get(ROW_A)?.extensionDecision).toBe('not_considered')
    expect(map.get(ROW_B)?.extensionDecision).toBe('applied')
  })

  it('counts a missing id as skipped', async () => {
    const { repo } = buildScoped(FIRM, [row1040(ROW_A, '2026-04-15')])
    const result = await bulkDecideObligationExtension(
      repo,
      'user_1',
      { ids: [ROW_A, ROW_B], memo: 'note' },
      OFFSET,
    )
    expect(result.decidedCount).toBe(1)
    expect(result.skippedCount).toBe(1)
  })
})

describe('bulkPreviewObligationExtensionDecision', () => {
  const RULE_1040 = 'fed.1040.return.2025'
  const ROW_A = ROW_ID
  const ROW_B = '55555555-5555-4555-8555-555555555555'
  const ROW_C = '66666666-6666-4666-8666-666666666666'
  const MISSING = '77777777-7777-4777-8777-777777777777'

  function row1040(id: string, baseIso: string, over: Partial<Row> = {}): Row {
    return makeRow({
      id,
      ruleId: RULE_1040,
      baseDueDate: new Date(`${baseIso}T00:00:00.000Z`),
      filingDueDate: new Date(`${baseIso}T00:00:00.000Z`),
      ...over,
    })
  }

  it('reports counts plus the earliest original and extended deadlines', async () => {
    const { repo } = buildScoped(FIRM, [
      row1040(ROW_A, '2026-04-15'), // extended 2026-10-15
      row1040(ROW_B, '2026-03-15'), // extended 2026-09-15
      makeRow({ id: ROW_C, ruleId: RULE_1040, extensionDecision: 'applied' }),
    ])

    const preview = await bulkPreviewObligationExtensionDecision(repo, {
      ids: [ROW_A, ROW_B, ROW_C, MISSING],
    })

    expect(preview.eligibleCount).toBe(2)
    expect(preview.alreadyExtendedCount).toBe(1)
    expect(preview.skippedCount).toBe(1)
    expect(preview.earliestFilingDeadline).toBe('2026-03-15')
    expect(preview.earliestExtendedFilingDeadline).toBe('2026-09-15')
    expect(preview.needsManualDeadlineCount).toBe(0)
  })

  it('counts eligible rows without a duration as needing a manual deadline', async () => {
    const { repo } = buildScoped(FIRM, [
      makeRow({
        id: ROW_A,
        ruleId: null,
        baseDueDate: new Date('2026-04-15T00:00:00.000Z'),
        filingDueDate: new Date('2026-04-15T00:00:00.000Z'),
      }),
      row1040(ROW_B, '2026-04-15'),
    ])

    const preview = await bulkPreviewObligationExtensionDecision(repo, { ids: [ROW_A, ROW_B] })

    expect(preview.eligibleCount).toBe(2)
    expect(preview.needsManualDeadlineCount).toBe(1)
    expect(preview.earliestExtendedFilingDeadline).toBe('2026-10-15')
    expect(preview.earliestFilingDeadline).toBe('2026-04-15')
  })

  it('returns null earliest deadlines when nothing is eligible', async () => {
    const { repo } = buildScoped(FIRM, [makeRow({ id: ROW_A, extensionDecision: 'applied' })])
    const preview = await bulkPreviewObligationExtensionDecision(repo, { ids: [ROW_A] })
    expect(preview).toMatchObject({
      eligibleCount: 0,
      alreadyExtendedCount: 1,
      skippedCount: 0,
      earliestFilingDeadline: null,
      earliestExtendedFilingDeadline: null,
      needsManualDeadlineCount: 0,
    })
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
    expect(result.skippedCount).toBe(0)
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

  it('skips rows whose source status cannot reach the target instead of failing the batch', async () => {
    const rowOpen = makeRow({ status: 'in_progress' })
    const rowClosed = makeRow({
      id: '55555555-5555-4555-8555-555555555555',
      status: 'completed',
    })
    const { repo, audits, map } = buildScoped(FIRM, [rowOpen, rowClosed])

    const result = await bulkUpdateObligationStatus(repo, 'user_1', {
      ids: [rowOpen.id, rowClosed.id],
      status: 'waiting_on_client',
    })

    expect(result.updatedCount).toBe(1)
    expect(result.skippedCount).toBe(1)
    expect(map.get(rowOpen.id)?.status).toBe('waiting_on_client')
    expect(map.get(rowClosed.id)?.status).toBe('completed')
    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({ entityId: rowOpen.id })
  })

  it('returns updatedCount:0 / skippedCount:N when every changed row is illegal', async () => {
    const rowClosed = makeRow({ status: 'completed' })
    const { repo, audits } = buildScoped(FIRM, [rowClosed])

    const result = await bulkUpdateObligationStatus(repo, 'user_1', {
      ids: [rowClosed.id],
      status: 'waiting_on_client',
    })

    expect(result.updatedCount).toBe(0)
    expect(result.skippedCount).toBe(1)
    expect(result.auditIds).toEqual([])
    expect(audits).toHaveLength(0)
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

  it('starts review sub-steps at reviewer review when a row re-enters In Review', async () => {
    const { repo, map } = buildScoped(FIRM, [
      makeRow({
        status: 'waiting_on_client',
        readiness: 'waiting',
        prepStage: 'prepared',
        reviewStage: 'approved',
      }),
    ])

    const result = await updateObligationStatus(repo, 'user_1', {
      id: ROW_ID,
      status: 'review',
    })

    expect(result.obligation.status).toBe('review')
    expect(result.obligation.prepStage).toBe('prepared')
    expect(result.obligation.reviewStage).toBe('in_review')
    expect(map.get(ROW_ID)?.prepStage).toBe('prepared')
    expect(map.get(ROW_ID)?.reviewStage).toBe('in_review')
  })

  it('starts review sub-steps in bulk at reviewer review when rows re-enter In Review', async () => {
    const rowA = makeRow({
      status: 'waiting_on_client',
      readiness: 'waiting',
      prepStage: 'prepared',
      reviewStage: 'approved',
    })
    const rowB = makeRow({
      id: '33333333-3333-4333-8333-333333333333',
      status: 'pending',
      prepStage: 'in_prep',
      reviewStage: 'notes_open',
    })
    const { repo, map } = buildScoped(FIRM, [rowA, rowB])

    const result = await bulkUpdateObligationStatus(repo, 'user_1', {
      ids: [rowA.id, rowB.id],
      status: 'review',
    })

    expect(result.updatedCount).toBe(2)
    expect(map.get(rowA.id)?.prepStage).toBe('prepared')
    expect(map.get(rowA.id)?.reviewStage).toBe('in_review')
    expect(map.get(rowB.id)?.prepStage).toBe('prepared')
    expect(map.get(rowB.id)?.reviewStage).toBe('in_review')
  })

  it('starts review sub-steps at reviewer review when a rejected filing re-enters In Review', async () => {
    const { repo, audits, map } = buildScoped(FIRM, [
      makeRow({
        status: 'done',
        prepStage: 'prepared',
        reviewStage: 'approved',
        efileAcceptedAt: new Date('2026-04-20T00:00:00.000Z'),
      }),
    ])

    const result = await markObligationFiledRejected(repo, 'user_1', {
      id: ROW_ID,
      rejectedAt: '2026-04-21',
      authority: 'IRS',
      reference: 'R0000-932-02',
      reason: 'Dependent EIN mismatch on the transmitted return.',
      nextStep: 'correct_resubmit',
    })

    expect(result.obligation.status).toBe('review')
    expect(result.obligation.prepStage).toBe('prepared')
    expect(result.obligation.reviewStage).toBe('in_review')
    expect(result.obligation.efileRejectedAt).toBe('2026-04-21T00:00:00.000Z')
    expect(map.get(ROW_ID)?.prepStage).toBe('prepared')
    expect(map.get(ROW_ID)?.reviewStage).toBe('in_review')
    expect(map.get(ROW_ID)?.efileAcceptedAt).toBeNull()
    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({
      action: 'obligation.efile.rejected',
      actorId: 'user_1',
      entityType: 'obligation_instance',
      entityId: ROW_ID,
      before: {
        status: 'done',
        efileAcceptedAt: '2026-04-20T00:00:00.000Z',
      },
      after: {
        status: 'review',
        efileRejectedAt: '2026-04-21T00:00:00.000Z',
        authority: 'IRS',
        reference: 'R0000-932-02',
        reason: 'Dependent EIN mismatch on the transmitted return.',
        nextStep: 'correct_resubmit',
      },
      reason: 'Dependent EIN mismatch on the transmitted return.',
    })
  })

  it('rejects authority rejection records unless the deadline is Filed', async () => {
    const { repo, audits, map } = buildScoped(FIRM, [makeRow({ status: 'review' })])

    await expect(
      markObligationFiledRejected(repo, 'user_1', {
        id: ROW_ID,
        reason: 'Authority notice arrived before a Filed state existed.',
        nextStep: 'request_client_input',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })

    expect(map.get(ROW_ID)?.status).toBe('review')
    expect(map.get(ROW_ID)?.efileRejectedAt).toBeNull()
    expect(audits).toHaveLength(0)
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

  it('enters the 8879 signature loop when an e-file return is marked Filed', async () => {
    const { repo, audits, map } = buildScoped(FIRM, [
      makeRow({ status: 'review', taxType: 'federal_1120s', efileState: 'not_applicable' }),
    ])

    const result = await updateObligationStatus(repo, 'user_1', {
      id: ROW_ID,
      status: 'done',
    })

    expect(result.obligation.status).toBe('done')
    expect(result.obligation.efileState).toBe('authorization_requested')
    expect(map.get(ROW_ID)?.efileState).toBe('authorization_requested')
    // Status audit + a companion efile-state audit explaining the jump.
    expect(audits).toHaveLength(2)
    expect(audits[1]).toMatchObject({
      action: 'obligation.efile.state.updated',
      entityId: ROW_ID,
      before: { efileState: 'not_applicable' },
      after: { efileState: 'authorization_requested' },
      reason: 'Awaiting Form 8879 signature after filing.',
    })
  })

  it('does not enter the signature loop for a non-8879 filing (e.g. payroll)', async () => {
    const { repo, audits, map } = buildScoped(FIRM, [
      makeRow({ status: 'review', taxType: 'federal_941', efileState: 'not_applicable' }),
    ])

    await updateObligationStatus(repo, 'user_1', { id: ROW_ID, status: 'done' })

    expect(map.get(ROW_ID)?.efileState).toBe('not_applicable')
    expect(audits).toHaveLength(1)
    expect(audits.some((a) => a.action === 'obligation.efile.state.updated')).toBe(false)
  })

  it('never clobbers a return already walking the e-file pipeline', async () => {
    const { repo, audits, map } = buildScoped(FIRM, [
      makeRow({ status: 'review', taxType: 'federal_1120s', efileState: 'submitted' }),
    ])

    await updateObligationStatus(repo, 'user_1', { id: ROW_ID, status: 'done' })

    expect(map.get(ROW_ID)?.efileState).toBe('submitted')
    expect(audits).toHaveLength(1)
  })

  it('bulk Mark filed enters the signature loop only for e-file returns', async () => {
    const rowReturn = makeRow({ id: ROW_ID, status: 'review', taxType: 'federal_1120s' })
    const rowPayroll = makeRow({
      id: '33333333-3333-4333-8333-333333333333',
      status: 'review',
      taxType: 'federal_941',
    })
    const { repo, audits, map } = buildScoped(FIRM, [rowReturn, rowPayroll])

    const result = await bulkUpdateObligationStatus(repo, 'user_1', {
      ids: [rowReturn.id, rowPayroll.id],
      status: 'done',
    })

    expect(result.updatedCount).toBe(2)
    expect(map.get(rowReturn.id)?.efileState).toBe('authorization_requested')
    expect(map.get(rowPayroll.id)?.efileState).toBe('not_applicable')
    // Exactly one efile companion audit (the return), alongside the two
    // status-update audits.
    expect(audits.filter((a) => a.action === 'obligation.efile.state.updated')).toHaveLength(1)
  })
})

describe('updateObligationPrepStage', () => {
  it('updates prepStage and writes one audit row with before/after', async () => {
    const { repo, audits, map } = buildScoped(FIRM, [makeRow({ prepStage: 'ready_for_prep' })])

    const result = await updateObligationPrepStage(repo, 'user_1', {
      id: ROW_ID,
      prepStage: 'in_prep',
      reason: 'started drafting',
    })

    expect(result.obligation.prepStage).toBe('in_prep')
    expect(result.auditId).toBe('audit-1')
    expect(map.get(ROW_ID)?.prepStage).toBe('in_prep')

    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({
      action: 'obligation.prep_stage.updated',
      actorId: 'user_1',
      entityType: 'obligation_instance',
      entityId: ROW_ID,
      before: { prepStage: 'ready_for_prep' },
      after: { prepStage: 'in_prep' },
      reason: 'started drafting',
    })
  })

  it('permits backward transitions — slider model has no guards', async () => {
    const { repo, audits, map } = buildScoped(FIRM, [makeRow({ prepStage: 'prepared' })])

    const result = await updateObligationPrepStage(repo, 'user_1', {
      id: ROW_ID,
      prepStage: 'ready_for_prep',
    })

    expect(result.obligation.prepStage).toBe('ready_for_prep')
    expect(map.get(ROW_ID)?.prepStage).toBe('ready_for_prep')
    expect(audits[0]).toMatchObject({
      before: { prepStage: 'prepared' },
      after: { prepStage: 'ready_for_prep' },
    })
  })

  it('is a no-op when before === after (no audit row)', async () => {
    const { repo, audits } = buildScoped(FIRM, [makeRow({ prepStage: 'in_prep' })])

    const result = await updateObligationPrepStage(repo, 'user_1', {
      id: ROW_ID,
      prepStage: 'in_prep',
    })

    expect(result.auditId).toBe('00000000-0000-0000-0000-000000000000')
    expect(audits).toHaveLength(0)
  })

  it('throws NOT_FOUND when the obligation is not in this firm', async () => {
    const { repo, audits } = buildScoped(FIRM, [])

    await expect(
      updateObligationPrepStage(repo, 'user_1', {
        id: ROW_ID,
        prepStage: 'in_prep',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    expect(audits).toHaveLength(0)
  })

  it('omits reason from audit when not provided', async () => {
    const { repo, audits } = buildScoped(FIRM, [makeRow({ prepStage: 'ready_for_prep' })])

    await updateObligationPrepStage(repo, 'user_1', {
      id: ROW_ID,
      prepStage: 'prepared',
    })

    expect(audits[0]).not.toHaveProperty('reason')
  })
})

describe('updateObligationReviewStage', () => {
  it('updates reviewStage and writes one audit row with before/after', async () => {
    const { repo, audits, map } = buildScoped(FIRM, [makeRow({ reviewStage: 'ready_for_review' })])

    const result = await updateObligationReviewStage(repo, 'user_1', {
      id: ROW_ID,
      reviewStage: 'in_review',
      reason: 'reviewer picked it up',
    })

    expect(result.obligation.reviewStage).toBe('in_review')
    expect(map.get(ROW_ID)?.reviewStage).toBe('in_review')

    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({
      action: 'obligation.review_stage.updated',
      actorId: 'user_1',
      entityType: 'obligation_instance',
      entityId: ROW_ID,
      before: { reviewStage: 'ready_for_review' },
      after: { reviewStage: 'in_review' },
      reason: 'reviewer picked it up',
    })
  })

  it('permits the notes_open ↔ in_review round-trip', async () => {
    const { repo, audits, map } = buildScoped(FIRM, [makeRow({ reviewStage: 'in_review' })])

    await updateObligationReviewStage(repo, 'user_1', {
      id: ROW_ID,
      reviewStage: 'notes_open',
    })
    await updateObligationReviewStage(repo, 'user_1', {
      id: ROW_ID,
      reviewStage: 'in_review',
    })

    expect(map.get(ROW_ID)?.reviewStage).toBe('in_review')
    expect(audits).toHaveLength(2)
    expect(audits[0]).toMatchObject({
      before: { reviewStage: 'in_review' },
      after: { reviewStage: 'notes_open' },
    })
    expect(audits[1]).toMatchObject({
      before: { reviewStage: 'notes_open' },
      after: { reviewStage: 'in_review' },
    })
  })

  it('is a no-op when before === after', async () => {
    const { repo, audits } = buildScoped(FIRM, [makeRow({ reviewStage: 'in_review' })])

    const result = await updateObligationReviewStage(repo, 'user_1', {
      id: ROW_ID,
      reviewStage: 'in_review',
    })

    expect(result.auditId).toBe('00000000-0000-0000-0000-000000000000')
    expect(audits).toHaveLength(0)
  })

  it('throws NOT_FOUND when the obligation is not in this firm', async () => {
    const { repo } = buildScoped(FIRM, [])

    await expect(
      updateObligationReviewStage(repo, 'user_1', {
        id: ROW_ID,
        reviewStage: 'approved',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('updateObligationEfileState', () => {
  it('advances authorization_requested → authorization_signed, writes an audit, leaves status untouched', async () => {
    const { repo, audits, map } = buildScoped(FIRM, [
      makeRow({ status: 'done', efileState: 'authorization_requested' }),
    ])
    const result = await updateObligationEfileState(repo, 'user_1', {
      id: ROW_ID,
      efileState: 'authorization_signed',
    })
    expect(result.obligation.efileState).toBe('authorization_signed')
    expect(result.obligation.status).toBe('done')
    expect(map.get(ROW_ID)?.efileState).toBe('authorization_signed')
    expect(audits.some((a) => a.action === 'obligation.efile.state.updated')).toBe(true)
  })

  it('rejects an illegal e-file transition (authorization_requested → accepted)', async () => {
    const { repo } = buildScoped(FIRM, [
      makeRow({ status: 'done', efileState: 'authorization_requested' }),
    ])
    await expect(
      updateObligationEfileState(repo, 'user_1', { id: ROW_ID, efileState: 'accepted' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('throws NOT_FOUND for an unknown obligation', async () => {
    const { repo } = buildScoped(FIRM, [])
    await expect(
      updateObligationEfileState(repo, 'user_1', {
        id: ROW_ID,
        efileState: 'authorization_signed',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

const SIGNATURE_CLIENT_ID = '22222222-2222-4222-8222-222222222222'

// The default harness has no client email and no notifications repo, so the
// email-substitution path never runs. This wraps a scoped repo with a client
// lookup (by id) + a capturing notifications stub. `notifications` is readonly
// on ScopedRepo, so we spread a fresh object rather than mutate.
function withEmailClients(
  base: ScopedRepo,
  clientsById: Record<string, { name: string; email: string | null }>,
): {
  scoped: ScopedRepo
  emails: Array<{ recipients: string[]; subject: string; text: string }>
} {
  const emails: Array<{ recipients: string[]; subject: string; text: string }> = []
  const scoped = {
    ...base,
    clients: {
      ...base.clients,
      async findById(id: string) {
        const c = clientsById[id]
        return c ? { id, name: c.name, email: c.email, primaryContactEmail: null } : undefined
      },
    },
    notifications: {
      firmId: base.firmId,
      async enqueueEmail(input: { payloadJson: unknown }) {
        emails.push(input.payloadJson as { recipients: string[]; subject: string; text: string })
        return { id: `email-${emails.length}`, created: true }
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- test stub
  } as unknown as ScopedRepo
  return { scoped, emails }
}

describe('remindObligationSignature', () => {
  it('rejects a row that is not awaiting a signature', async () => {
    const { repo } = buildScoped(FIRM, [makeRow({ status: 'pending' })])
    await expect(remindObligationSignature(repo, 'user_1', { id: ROW_ID })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
  })

  it('no-ops (emailQueued=false, no audit) when the client has no email on file', async () => {
    // buildScoped's clients.findById returns undefined → no email on file.
    const { repo, audits } = buildScoped(FIRM, [
      makeRow({ status: 'done', efileState: 'authorization_requested' }),
    ])
    const result = await remindObligationSignature(repo, 'user_1', { id: ROW_ID })
    expect(result.emailQueued).toBe(false)
    expect(result.auditId).toBeNull()
    expect(audits.some((a) => a.action === 'obligation.signature.reminded')).toBe(false)
  })

  it('substitutes the CPA-edited template against the recipient (not verbatim)', async () => {
    const base = buildScoped(FIRM, [
      makeRow({
        status: 'done',
        efileState: 'authorization_requested',
        taxType: 'federal_1120s',
        formName: null,
      }),
    ]).repo
    const { scoped, emails } = withEmailClients(base, {
      [SIGNATURE_CLIENT_ID]: { name: 'Bright Studio S-Corp', email: 'cfo@bright.example' },
    })
    const result = await remindObligationSignature(scoped, 'user_1', {
      id: ROW_ID,
      body: 'Hi {{client_name}}, please sign your {{form}}.',
    })
    expect(result.emailQueued).toBe(true)
    expect(emails).toHaveLength(1)
    expect(emails[0]?.recipients).toEqual(['cfo@bright.example'])
    // The edited template is RENDERED per recipient, not sent literally.
    expect(emails[0]?.text).toBe('Hi Bright Studio S-Corp, please sign your Form 1120-S.')
  })
})

describe('bulkRemindObligationSignature', () => {
  it('skips non-awaiting rows and counts awaiting rows with no client email', async () => {
    const OTHER_ID = '33333333-3333-4333-8333-333333333333'
    const { repo } = buildScoped(FIRM, [
      makeRow({ id: ROW_ID, status: 'done', efileState: 'authorization_requested' }),
      makeRow({ id: OTHER_ID, status: 'pending' }),
    ])
    const result = await bulkRemindObligationSignature(repo, 'user_1', {
      ids: [ROW_ID, OTHER_ID],
    })
    // Awaiting row → no client email (harness default) → noEmail; pending
    // row → not awaiting signature → skipped.
    expect(result).toEqual({ remindedCount: 0, skippedCount: 1, noEmailCount: 1 })
  })

  it('renders one edited template per client with each row’s own values', async () => {
    const CLIENT_B = '33333333-3333-4333-8333-333333333333'
    const ROW_B = '44444444-4444-4444-8444-444444444444'
    const base = buildScoped(FIRM, [
      makeRow({
        id: ROW_ID,
        clientId: SIGNATURE_CLIENT_ID,
        status: 'done',
        efileState: 'authorization_requested',
        taxType: 'federal_1120s',
        formName: null,
      }),
      makeRow({
        id: ROW_B,
        clientId: CLIENT_B,
        status: 'done',
        efileState: 'authorization_requested',
        taxType: 'federal_1065',
        formName: null,
      }),
    ]).repo
    const { scoped, emails } = withEmailClients(base, {
      [SIGNATURE_CLIENT_ID]: { name: 'Acme S-Corp', email: 'a@x.example' },
      [CLIENT_B]: { name: 'Belle Partners', email: 'b@y.example' },
    })
    const result = await bulkRemindObligationSignature(scoped, 'user_1', {
      ids: [ROW_ID, ROW_B],
      subject: 'Sign {{form}} now, {{client_name}}',
    })
    expect(result.remindedCount).toBe(2)
    // One template → each client's OWN name + form (ids processed in order).
    expect(emails.map((e) => e.subject)).toEqual([
      'Sign Form 1120-S now, Acme S-Corp',
      'Sign Form 1065 now, Belle Partners',
    ])
  })
})

describe('previewObligationSignatureReminder', () => {
  it('renders the default subject/body and reports no recipient when the client has no email', async () => {
    const { repo } = buildScoped(FIRM, [
      // formName empty so the subject exercises the taxType → friendly-label
      // fallback (federal_1120s -> "Form 1120-S") rather than the form name.
      makeRow({
        status: 'done',
        efileState: 'authorization_requested',
        taxType: 'federal_1120s',
        formName: null,
      }),
    ])
    const preview = await previewObligationSignatureReminder(repo, { id: ROW_ID })
    // The editable field now holds the TOKEN template…
    expect(preview.subjectTemplate).toContain('{{form}}')
    expect(preview.bodyTemplate).toContain('{{client_name}}')
    expect(preview.tokens).toContain('form')
    // …while the live-preview sample resolves the friendly form label
    // (federal_1120s → "Form 1120-S"), not the raw snake_case.
    expect(preview.sample.vars.form).toBe('Form 1120-S')
    expect(preview.recipientEmail).toBeNull()
    // Never reminded → no throttle warning.
    expect(preview.lastRemindedAt).toBeNull()
  })

  it('reports lastRemindedAt once a reminder has been sent', async () => {
    const base = buildScoped(FIRM, [
      makeRow({
        id: ROW_ID,
        clientId: SIGNATURE_CLIENT_ID,
        status: 'done',
        efileState: 'authorization_requested',
      }),
    ]).repo
    const { scoped } = withEmailClients(base, {
      [SIGNATURE_CLIENT_ID]: { name: 'Acme', email: 'a@x.example' },
    })
    expect(
      (await previewObligationSignatureReminder(scoped, { id: ROW_ID })).lastRemindedAt,
    ).toBeNull()
    await remindObligationSignature(scoped, 'user_1', { id: ROW_ID })
    expect(
      (await previewObligationSignatureReminder(scoped, { id: ROW_ID })).lastRemindedAt,
    ).not.toBeNull()
  })

  it('throws NOT_FOUND for an unknown obligation', async () => {
    const { repo } = buildScoped(FIRM, [])
    await expect(previewObligationSignatureReminder(repo, { id: ROW_ID })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})

describe('bulkPreviewObligationSignatureReminder', () => {
  it('counts eligible / not-awaiting / no-email and samples an eligible client', async () => {
    const ROW_NO_EMAIL = '33333333-3333-4333-8333-333333333333'
    const ROW_PENDING = '44444444-4444-4444-8444-444444444444'
    const base = buildScoped(FIRM, [
      makeRow({
        id: ROW_ID,
        clientId: SIGNATURE_CLIENT_ID,
        status: 'done',
        efileState: 'authorization_requested',
        taxType: 'federal_1120s',
        formName: null,
      }),
      makeRow({
        id: ROW_NO_EMAIL,
        clientId: 'client-without-email',
        status: 'done',
        efileState: 'authorization_requested',
      }),
      makeRow({ id: ROW_PENDING, status: 'pending' }),
    ]).repo
    // Only the first client is in the map → the second resolves to no email.
    const { scoped } = withEmailClients(base, {
      [SIGNATURE_CLIENT_ID]: { name: 'Acme S-Corp', email: 'a@x.example' },
    })
    const preview = await bulkPreviewObligationSignatureReminder(scoped, {
      ids: [ROW_ID, ROW_NO_EMAIL, ROW_PENDING],
    })
    expect(preview.eligibleCount).toBe(1)
    expect(preview.noEmailCount).toBe(1)
    expect(preview.skippedCount).toBe(1)
    expect(preview.samples).toHaveLength(1)
    expect(preview.samples[0]?.clientName).toBe('Acme S-Corp')
    expect(preview.samples[0]?.vars.form).toBe('Form 1120-S')
    expect(preview.subjectTemplate).toContain('{{form}}')
  })

  it('returns one sample per eligible client, in selection order', async () => {
    const ROW_B = '55555555-5555-4555-8555-555555555555'
    const CLIENT_B = 'client-birch'
    const base = buildScoped(FIRM, [
      makeRow({
        id: ROW_ID,
        clientId: SIGNATURE_CLIENT_ID,
        status: 'done',
        efileState: 'authorization_requested',
        taxType: 'federal_1120s',
        formName: null,
      }),
      makeRow({
        id: ROW_B,
        clientId: CLIENT_B,
        status: 'done',
        efileState: 'authorization_requested',
        taxType: 'federal_1065',
        formName: null,
      }),
    ]).repo
    const { scoped } = withEmailClients(base, {
      [SIGNATURE_CLIENT_ID]: { name: 'Acme S-Corp', email: 'a@x.example' },
      [CLIENT_B]: { name: 'Birch Partners', email: 'b@x.example' },
    })
    const preview = await bulkPreviewObligationSignatureReminder(scoped, {
      ids: [ROW_ID, ROW_B],
    })
    expect(preview.eligibleCount).toBe(2)
    // Selection order preserved so the dialog's paging is stable.
    expect(preview.samples.map((sample) => sample.clientName)).toEqual([
      'Acme S-Corp',
      'Birch Partners',
    ])
    expect(preview.samples[0]?.vars.form).toBe('Form 1120-S')
    expect(preview.samples[1]?.vars.form).toBeTruthy()
  })

  it('returns no samples when nothing is eligible', async () => {
    const { repo } = buildScoped(FIRM, [makeRow({ status: 'pending' })])
    const preview = await bulkPreviewObligationSignatureReminder(repo, { ids: [ROW_ID] })
    expect(preview).toMatchObject({
      eligibleCount: 0,
      skippedCount: 1,
      noEmailCount: 0,
      samples: [],
    })
  })

  it('flags eligible rows reminded within the throttle window', async () => {
    const ROW_B = '55555555-5555-4555-8555-555555555555'
    const CLIENT_B = 'client-birch'
    const base = buildScoped(FIRM, [
      makeRow({
        id: ROW_ID,
        clientId: SIGNATURE_CLIENT_ID,
        status: 'done',
        efileState: 'authorization_requested',
      }),
      makeRow({
        id: ROW_B,
        clientId: CLIENT_B,
        status: 'done',
        efileState: 'authorization_requested',
      }),
    ]).repo
    const { scoped } = withEmailClients(base, {
      [SIGNATURE_CLIENT_ID]: { name: 'Acme', email: 'a@x.example' },
      [CLIENT_B]: { name: 'Birch', email: 'b@x.example' },
    })
    // Remind only ROW_ID, then preview both.
    await remindObligationSignature(scoped, 'user_1', { id: ROW_ID })
    const preview = await bulkPreviewObligationSignatureReminder(scoped, { ids: [ROW_ID, ROW_B] })
    expect(preview.eligibleCount).toBe(2)
    expect(preview.recentlyRemindedCount).toBe(1)
    expect(preview.recentlyRemindedIds).toEqual([ROW_ID])
  })
})

describe('backfillObligationSignatureLoop', () => {
  it('enters only eligible filed rows and is idempotent', async () => {
    const ROW_FED = ROW_ID
    const ROW_PAYROLL = '55555555-5555-4555-8555-555555555555'
    const ROW_INLOOP = '66666666-6666-4666-8666-666666666666'
    const ROW_PENDING = '77777777-7777-4777-8777-777777777777'
    const { repo, audits, map } = buildScoped(FIRM, [
      makeRow({
        id: ROW_FED,
        status: 'done',
        efileState: 'not_applicable',
        taxType: 'federal_1120s',
      }),
      makeRow({
        id: ROW_PAYROLL,
        status: 'done',
        efileState: 'not_applicable',
        taxType: 'federal_941',
      }),
      makeRow({
        id: ROW_INLOOP,
        status: 'done',
        efileState: 'authorization_requested',
        taxType: 'federal_1120s',
      }),
      makeRow({
        id: ROW_PENDING,
        status: 'pending',
        efileState: 'not_applicable',
        taxType: 'federal_1120s',
      }),
    ])

    const result = await backfillObligationSignatureLoop(repo, 'user_1')
    // Scans only done + not_applicable rows (FED + PAYROLL); enters only the
    // tax type that carries an 8879 loop (1120s, not payroll 941).
    expect(result).toEqual({ scannedCount: 2, enteredCount: 1 })
    expect(map.get(ROW_FED)?.efileState).toBe('authorization_requested')
    expect(map.get(ROW_PAYROLL)?.efileState).toBe('not_applicable')
    expect(map.get(ROW_INLOOP)?.efileState).toBe('authorization_requested')
    expect(audits.filter((a) => a.action === 'obligation.efile.state.updated')).toHaveLength(1)

    // Idempotent: re-running enters nothing (FED already advanced; payroll
    // remains scanned-but-ineligible).
    const again = await backfillObligationSignatureLoop(repo, 'user_1')
    expect(again).toEqual({ scannedCount: 1, enteredCount: 0 })
  })
})
