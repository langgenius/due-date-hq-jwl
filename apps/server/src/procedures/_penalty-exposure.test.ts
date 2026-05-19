import { describe, expect, it } from 'vitest'
import { PENALTY_FACTS_VERSION, PENALTY_FORMULA_VERSION } from '@duedatehq/core/penalty'
import type { ClientRow } from '@duedatehq/ports/clients'
import type { ObligationInstanceRow } from '@duedatehq/ports/obligations'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import { backfillPenaltyFactsAndExposure } from './_penalty-exposure'

type ExposurePatch = Parameters<ScopedRepo['obligations']['updateExposure']>[1]

const FIRM_ID = 'firm_penalty_backfill'
const CREATED_AT = new Date('2026-03-01T00:00:00.000Z')

function unused(name: string): never {
  throw new Error(`Unexpected repo call in penalty exposure test: ${name}`)
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

function makeClient(over: Partial<ClientRow>): ClientRow {
  return {
    id: 'client',
    firmId: FIRM_ID,
    name: 'Client',
    ein: null,
    state: 'CA',
    county: null,
    entityType: 'partnership',
    legalEntity: 'partnership',
    taxClassification: 'partnership',
    taxYearType: 'calendar',
    fiscalYearEndMonth: null,
    fiscalYearEndDay: null,
    email: null,
    notes: null,
    assigneeId: null,
    assigneeName: null,
    ownerCount: 3,
    hasForeignAccounts: false,
    hasPayroll: false,
    hasSalesTax: false,
    has1099Vendors: false,
    hasK1Activity: true,
    primaryContactName: null,
    primaryContactEmail: null,
    importanceWeight: 3,
    lateFilingCountLast12mo: 0,
    estimatedTaxLiabilityCents: null,
    estimatedTaxLiabilitySource: null,
    equityOwnerCount: null,
    migrationBatchId: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    deletedAt: null,
    ...over,
  }
}

function makeObligation(over: Partial<ObligationInstanceRow>): ObligationInstanceRow {
  return {
    id: 'obligation',
    firmId: FIRM_ID,
    clientId: 'client',
    clientFilingProfileId: null,
    taxType: 'federal_1065',
    taxYear: 2026,
    ruleId: null,
    ruleVersion: null,
    rulePeriod: null,
    generationSource: null,
    jurisdiction: 'FED',
    obligationType: 'filing',
    formName: 'Form 1065',
    authority: 'IRS',
    filingDueDate: new Date('2026-03-15T00:00:00.000Z'),
    paymentDueDate: null,
    sourceEvidenceJson: null,
    recurrence: 'annual',
    riskLevel: 'med',
    baseDueDate: new Date('2026-03-15T00:00:00.000Z'),
    currentDueDate: new Date('2026-03-15T00:00:00.000Z'),
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
    estimatedExposureCents: 12_345,
    exposureStatus: 'ready',
    penaltyFactsJson: null,
    penaltyFactsVersion: null,
    penaltyBreakdownJson: [],
    penaltyFormulaVersion: 'penalty-v1-2026q2',
    missingPenaltyFactsJson: [],
    penaltySourceRefsJson: [],
    penaltyFormulaLabel: null,
    exposureCalculatedAt: new Date('2026-03-20T00:00:00.000Z'),
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...over,
  }
}

function normalizeUpdates(updates: Array<{ id: string; patch: ExposurePatch }>) {
  return updates.map(({ id, patch }) => ({
    id,
    patch: {
      ...patch,
      exposureCalculatedAt: patch.exposureCalculatedAt?.toISOString() ?? null,
    },
  }))
}

function buildScopedRepo(input: {
  clients: ClientRow[]
  obligationsByClient: Map<string, ObligationInstanceRow[]>
  updates: Array<{ id: string; patch: ExposurePatch }>
}): ScopedRepo {
  return {
    firmId: FIRM_ID,
    filingProfiles: unusedFilingProfilesRepo(FIRM_ID),
    ai: {
      firmId: FIRM_ID,
      async recordRun() {
        return unused('ai.recordRun')
      },
    },
    aiInsights: {
      firmId: FIRM_ID,
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
      firmId: FIRM_ID,
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
    clients: {
      firmId: FIRM_ID,
      async create() {
        return unused('clients.create')
      },
      async createBatch() {
        return unused('clients.createBatch')
      },
      async findById(id: string) {
        return input.clients.find((client) => client.id === id)
      },
      async findManyByIds(ids: string[]) {
        return ids.flatMap((id) => input.clients.find((client) => client.id === id) ?? [])
      },
      async listByFirm() {
        return input.clients
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
    },
    dashboard: {
      firmId: FIRM_ID,
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
    obligations: {
      firmId: FIRM_ID,
      async createBatch() {
        return unused('obligations.createBatch')
      },
      async findById() {
        return undefined
      },
      async findManyByIds() {
        return []
      },
      async listByClient(clientId: string) {
        return input.obligationsByClient.get(clientId) ?? []
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
      async updateExposure(id: string, patch: ExposurePatch) {
        input.updates.push({ id, patch })
      },
      async updateStatus() {},
      async updateExtensionDecision() {},
      async updateStatusMany() {},
      async deleteByBatch() {
        return 0
      },
    },
    obligationQueue: {
      firmId: FIRM_ID,
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
    },
    workload: {
      firmId: FIRM_ID,
      async load() {
        return unused('workload.load')
      },
    },
    pulse: {
      firmId: FIRM_ID,
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
    },
    readiness: {
      firmId: FIRM_ID,
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
      firmId: FIRM_ID,
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
    migration: {
      firmId: FIRM_ID,
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
    },
    evidence: {
      firmId: FIRM_ID,
      async write() {
        return unused('evidence.write')
      },
      async writeBatch() {
        return unused('evidence.writeBatch')
      },
      async listByObligation() {
        return []
      },
    },
    audit: {
      firmId: FIRM_ID,
      async write() {
        return unused('audit.write')
      },
      async writeBatch() {
        return unused('audit.writeBatch')
      },
      async listByFirm() {
        return []
      },
      async list() {
        return { rows: [], nextCursor: null }
      },
    },
  }
}

describe('backfillPenaltyFactsAndExposure', () => {
  it('backfills v3 penalty facts and projected exposure idempotently', async () => {
    const now = new Date('2026-04-01T00:00:00.000Z')
    const clients = [
      makeClient({
        id: 'client_1065',
        entityType: 'partnership',
        estimatedTaxLiabilityCents: null,
        equityOwnerCount: 2,
      }),
      makeClient({
        id: 'client_estimated_tax',
        entityType: 'c_corp',
        estimatedTaxLiabilityCents: 1_000_000,
        equityOwnerCount: null,
      }),
    ]
    const obligationsByClient = new Map([
      [
        'client_1065',
        [
          makeObligation({
            id: 'obligation_1065',
            clientId: 'client_1065',
            taxType: 'federal_1065',
            currentDueDate: new Date('2026-03-15T00:00:00.000Z'),
          }),
        ],
      ],
      [
        'client_estimated_tax',
        [
          makeObligation({
            id: 'obligation_estimated_tax',
            clientId: 'client_estimated_tax',
            taxType: 'federal_1120_estimated_tax',
            currentDueDate: new Date('2026-04-15T00:00:00.000Z'),
          }),
        ],
      ],
    ])
    const updates: Array<{ id: string; patch: ExposurePatch }> = []
    const scoped = buildScopedRepo({ clients, obligationsByClient, updates })

    await expect(backfillPenaltyFactsAndExposure(scoped, now)).resolves.toBe(2)

    expect(updates).toHaveLength(2)
    expect(updates[0]?.patch).toMatchObject({
      estimatedTaxDueCents: null,
      estimatedExposureCents: 153_000,
      exposureStatus: 'ready',
      penaltyFormulaVersion: PENALTY_FORMULA_VERSION,
      penaltyFactsVersion: PENALTY_FACTS_VERSION,
      penaltyFormulaLabel: 'Federal Form 1065 late partnership return penalty',
    })
    expect(updates[0]?.patch.penaltyFactsJson).toMatchObject({
      version: PENALTY_FACTS_VERSION,
      facts: { partnerCount: 2 },
    })
    expect(updates[1]?.patch).toMatchObject({
      estimatedTaxDueCents: 1_000_000,
      estimatedExposureCents: null,
      exposureStatus: 'needs_input',
      penaltyFormulaVersion: PENALTY_FORMULA_VERSION,
      missingPenaltyFactsJson: ['installments'],
      penaltyFactsVersion: PENALTY_FACTS_VERSION,
    })

    const firstRun = normalizeUpdates(updates)
    updates.length = 0

    await expect(backfillPenaltyFactsAndExposure(scoped, now)).resolves.toBe(2)
    expect(normalizeUpdates(updates)).toEqual(firstRun)
  })
})
