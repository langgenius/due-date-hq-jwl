import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { AI } from '@duedatehq/ai'
import { PulseExtractOutputSchema } from '@duedatehq/ai'
import type { MappingTarget } from '@duedatehq/contracts'
import { listObligationRules } from '@duedatehq/core/rules'
import { sanitizeMapperOutput, validateNormalizedRows } from './_deterministic'
import { PRESET_FALLBACK_CONFIDENCE, PRESET_VERSION } from './_preset-mappings'
import { MigrationService, type MigrationDeps } from './_service'
import { toContractRule } from '../rules/runtime'

/**
 * MigrationService tests — exercise the orchestration (Step 1 → Step 3 →
 * dryRun) against an in-memory scoped repo + injectable AI fake.
 *
 * The point is to lock in the contract behavior: tenant isolation, fallback
 * channels, deterministic checks, and the bad-rows-do-not-block-good-rows
 * invariant from PRD §0.3.
 */

const FIRM = 'firm-1'
const OTHER_FIRM = 'firm-2'
const USER = 'user-1'
const RULE_REVIEWED_AT = new Date('2026-05-05T00:00:00.000Z')

function activePracticeRuleRows(
  firmId: string,
  predicate: (rule: ReturnType<typeof listObligationRules>[number]) => boolean = (rule) =>
    rule.status === 'verified',
) {
  return listObligationRules({ includeCandidates: true })
    .filter(predicate)
    .map((rule) => ({
      id: `practice_${rule.id}`,
      firmId,
      ruleId: rule.id,
      templateId: rule.id,
      templateVersion: rule.version,
      status: 'active' as const,
      ruleJson: { ...toContractRule(rule), status: 'active' as const },
      reviewNote: null,
      reviewedBy: USER,
      reviewedAt: RULE_REVIEWED_AT,
      createdAt: RULE_REVIEWED_AT,
      updatedAt: RULE_REVIEWED_AT,
    }))
}

type CoreRuleForTest = ReturnType<typeof listObligationRules>[number]
type ActivePracticeRuleRowForTest = ReturnType<typeof activePracticeRuleRows>[number]

function activePracticeRuleRowFromRule(
  firmId: string,
  rule: CoreRuleForTest,
): ActivePracticeRuleRowForTest {
  return {
    id: `practice_${rule.id}`,
    firmId,
    ruleId: rule.id,
    templateId: rule.id,
    templateVersion: rule.version,
    status: 'active',
    ruleJson: { ...toContractRule(rule), status: 'active' },
    reviewNote: null,
    reviewedBy: USER,
    reviewedAt: RULE_REVIEWED_AT,
    createdAt: RULE_REVIEWED_AT,
    updatedAt: RULE_REVIEWED_AT,
  }
}

function concreteStatePracticeRuleRow(input: {
  firmId: string
  ruleId: string
  taxType: string
  dueDate: string
}): ActivePracticeRuleRowForTest {
  const rule = listObligationRules({ includeCandidates: true }).find(
    (item) => item.id === input.ruleId,
  )
  if (!rule) throw new Error(`Rule ${input.ruleId} was not found in the test catalog.`)
  const concreteRule: CoreRuleForTest = {
    ...rule,
    taxType: input.taxType,
    status: 'verified',
    ruleTier: 'basic',
    coverageStatus: 'full',
    requiresApplicabilityReview: false,
    dueDateLogic: {
      kind: 'fixed_date',
      date: input.dueDate,
      holidayRollover: 'next_business_day',
    },
  }
  return activePracticeRuleRowFromRule(input.firmId, concreteRule)
}

interface MigrationBatchRow {
  id: string
  firmId: string
  userId: string
  source:
    | 'paste'
    | 'csv'
    | 'xlsx'
    | 'preset_taxdome'
    | 'preset_drake'
    | 'preset_karbon'
    | 'preset_quickbooks'
    | 'preset_file_in_time'
    | 'preset_cch_axcess'
    | 'preset_cch_prosystem_fx'
    | 'preset_lacerte'
    | 'preset_proseries'
    | 'preset_ultratax_cs'
    | 'preset_proconnect_tax'
  rawInputR2Key: string | null
  rawInputFileName: string | null
  rawInputContentType: string | null
  rawInputSizeBytes: number | null
  mappingJson: unknown
  presetUsed: string | null
  rowCount: number
  successCount: number
  skippedCount: number
  aiGlobalConfidence: number | null
  status: 'draft' | 'mapping' | 'reviewing' | 'applied' | 'reverted' | 'failed'
  appliedAt: Date | null
  revertExpiresAt: Date | null
  revertedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

type ScopedRepo = MigrationDeps['scoped']
type MigrationRepo = ScopedRepo['migration']

function unexpectedRepoCall(name: string): never {
  throw new Error(`Unexpected test repo call: ${name}`)
}

function unusedFilingProfilesRepo(firmId: string): ScopedRepo['filingProfiles'] {
  return {
    firmId,
    async createBatch() {
      return unexpectedRepoCall('filingProfiles.createBatch')
    },
    async listByClient() {
      return unexpectedRepoCall('filingProfiles.listByClient')
    },
    async listByClients() {
      return unexpectedRepoCall('filingProfiles.listByClients')
    },
    async replaceForClient() {
      return unexpectedRepoCall('filingProfiles.replaceForClient')
    },
    async deleteByBatch() {
      return unexpectedRepoCall('filingProfiles.deleteByBatch')
    },
  }
}

function buildScopedRepo(
  firmId: string,
  options: { activeRuleRows?: ReturnType<typeof activePracticeRuleRows> } = {},
) {
  const batches = new Map<string, MigrationBatchRow>()
  const audits: Array<{ action: string; firmId: string; entityId: string }> = []
  const evidences: Array<{ sourceType: string; firmId: string; aiOutputId?: string | null }> = []
  const aiRuns: Array<{ kind: string; aiOutputId: string }> = []
  const importedClients: Array<{
    id: string
    name?: string
    primaryContactName: string | null | undefined
    primaryContactEmail: string | null | undefined
    externalClientId: string | null | undefined
    addressLine1: string | null | undefined
    city: string | null | undefined
    postalCode: string | null | undefined
    primaryPhone: string | null | undefined
    sourceStatus: string | null | undefined
    taxYearType: 'calendar' | 'fiscal' | undefined
    fiscalYearEndMonth: number | null | undefined
    fiscalYearEndDay: number | null | undefined
    migrationBatchId: string | null | undefined
  }> = []
  const importedObligations: Array<{
    id: string
    clientId: string
    clientFilingProfileId: string | null | undefined
    jurisdiction: string | null | undefined
    taxType: string | undefined
    taxYear: number | null | undefined
    baseDueDate: Date | undefined
    taxPeriodStart: Date | null | undefined
    taxPeriodEnd: Date | null | undefined
    status: string | undefined
    migrationBatchId: string | null | undefined
  }> = []
  const importedFilingProfiles: Array<{
    id: string
    clientId: string
    state: string
    taxTypesJson: string[] | undefined
    migrationBatchId: string | null | undefined
  }> = []
  const mappings: Array<{ batchId: string; sourceHeader: string; targetField: string }> = []
  const normalizations: Array<{ batchId: string; field: string; rawValue: string }> = []
  const errors: Array<{
    batchId: string
    rowIndex: number
    errorCode: string
    errorMessage?: string
    rawRowJson?: unknown
  }> = []

  const clients: ScopedRepo['clients'] = {
    firmId,
    async create() {
      return unexpectedRepoCall('clients.create')
    },
    async createBatch() {
      return unexpectedRepoCall('clients.createBatch')
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
    async updateNotes() {},
    async updateTaxYearProfile() {},
    async updateAssigneeMany() {},
    async softDelete() {},
    async deleteByBatch() {
      return 0
    },
  }

  const obligations: ScopedRepo['obligations'] = {
    firmId,
    async confirmByIds() {
      return { confirmedIds: [] }
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
      return unexpectedRepoCall('obligations.createBatch')
    },
    async findById() {
      return undefined
    },
    async findManyByIds() {
      return []
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
      return []
    },
    async listGeneratedByClientAndTaxYears() {
      return []
    },
    async updateDueDate() {},
    async updateTaxYearProfile() {},
    async updateExposure() {},
    async updateStatus() {},
    async updateExtensionDecision() {},
    async updateStatusMany() {},
    async setEfileRejected() {},
    async setBlockedBy() {},
    async setPrepStage() {},
    async setReviewStage() {},
    async setEfileState() {},
    async unblockChildrenOf() {
      return []
    },
    async deleteByBatch() {
      return 0
    },
  }

  const migration: ScopedRepo['migration'] = {
    firmId,
    async createBatch(input) {
      const id = input.id ?? crypto.randomUUID()
      const now = new Date()
      const row: MigrationBatchRow = {
        id,
        firmId,
        userId: input.userId,
        source: input.source,
        rawInputR2Key: input.rawInputR2Key ?? null,
        rawInputFileName: input.rawInputFileName ?? null,
        rawInputContentType: input.rawInputContentType ?? null,
        rawInputSizeBytes: input.rawInputSizeBytes ?? null,
        mappingJson: null,
        presetUsed: input.presetUsed ?? null,
        rowCount: input.rowCount ?? 0,
        successCount: 0,
        skippedCount: 0,
        aiGlobalConfidence: null,
        status: 'draft',
        appliedAt: null,
        revertExpiresAt: null,
        revertedAt: null,
        createdAt: now,
        updatedAt: now,
      }
      batches.set(id, row)
      return { id }
    },
    async getActiveDraftBatch() {
      for (const b of batches.values()) {
        if (b.firmId === firmId && b.status === 'draft') return b
      }
      return undefined
    },
    async getBatch(id: string) {
      const b = batches.get(id)
      return b && b.firmId === firmId ? b : undefined
    },
    async updateBatch(id: string, patch: Partial<MigrationBatchRow>) {
      const b = batches.get(id)
      if (!b || b.firmId !== firmId) {
        throw new Error(`batch ${id} not in firm`)
      }
      batches.set(id, { ...b, ...patch, updatedAt: new Date() })
    },
    async createMappings(batchId: string, rows: Parameters<MigrationRepo['createMappings']>[1]) {
      const b = batches.get(batchId)
      if (!b || b.firmId !== firmId) {
        throw new Error(`Migration batch ${batchId} not found for current firm`)
      }
      for (const row of rows) {
        mappings.push({ batchId, sourceHeader: row.sourceHeader, targetField: row.targetField })
      }
      return rows.length
    },
    async createNormalizations(
      batchId: string,
      rows: Parameters<MigrationRepo['createNormalizations']>[1],
    ) {
      const b = batches.get(batchId)
      if (!b || b.firmId !== firmId) throw new Error('cross firm')
      for (const row of rows)
        normalizations.push({ batchId, field: row.field, rawValue: row.rawValue })
      return rows.length
    },
    async createErrors(batchId: string, rows: Parameters<MigrationRepo['createErrors']>[1]) {
      const b = batches.get(batchId)
      if (!b || b.firmId !== firmId) throw new Error('cross firm')
      for (const row of rows)
        errors.push({
          batchId,
          rowIndex: row.rowIndex,
          errorCode: row.errorCode,
          errorMessage: row.errorMessage,
          rawRowJson: row.rawRowJson ?? null,
        })
      return rows.length
    },
    async listMappings() {
      return []
    },
    async listNormalizations() {
      return []
    },
    async listErrors(batchId: string) {
      const b = batches.get(batchId)
      if (!b || b.firmId !== firmId) return []
      const now = new Date()
      return errors
        .filter((e) => e.batchId === batchId)
        .map((e) => ({
          id: 'err-' + e.rowIndex,
          batchId: e.batchId,
          rowIndex: e.rowIndex,
          rawRowJson: (e as { rawRowJson?: unknown }).rawRowJson ?? null,
          errorCode: e.errorCode,
          errorMessage:
            (e as { errorMessage?: string }).errorMessage ?? `${e.errorCode} on row ${e.rowIndex}`,
          createdAt: now,
        }))
    },
    async listByFirm() {
      return Array.from(batches.values()).filter((b) => b.firmId === firmId)
    },
    async commitImport(input) {
      const b = batches.get(input.batchId)
      if (!b || b.firmId !== firmId) throw new Error('cross firm')
      importedClients.push(
        ...input.clients.map((item) => ({
          id: item.id,
          name: item.name,
          primaryContactName: item.primaryContactName,
          primaryContactEmail: item.primaryContactEmail,
          externalClientId: item.externalClientId,
          addressLine1: item.addressLine1,
          city: item.city,
          postalCode: item.postalCode,
          primaryPhone: item.primaryPhone,
          sourceStatus: item.sourceStatus,
          taxYearType: item.taxYearType,
          fiscalYearEndMonth: item.fiscalYearEndMonth,
          fiscalYearEndDay: item.fiscalYearEndDay,
          migrationBatchId: item.migrationBatchId,
        })),
      )
      importedObligations.push(
        ...input.obligations.map((item) => ({
          id: item.id,
          clientId: item.clientId,
          clientFilingProfileId: item.clientFilingProfileId,
          jurisdiction: item.jurisdiction,
          taxType: item.taxType,
          taxYear: item.taxYear,
          baseDueDate: item.baseDueDate,
          taxPeriodStart: item.taxPeriodStart,
          taxPeriodEnd: item.taxPeriodEnd,
          status: item.status,
          migrationBatchId: item.migrationBatchId,
        })),
      )
      importedFilingProfiles.push(
        ...input.filingProfiles.map((item) => ({
          id: item.id,
          clientId: item.clientId,
          state: item.state,
          taxTypesJson: item.taxTypesJson,
          migrationBatchId: item.migrationBatchId,
        })),
      )
      for (const item of input.evidence) {
        evidences.push({
          sourceType: item.sourceType,
          firmId,
          ...(item.aiOutputId !== undefined ? { aiOutputId: item.aiOutputId } : {}),
        })
      }
      for (const item of input.audits) {
        audits.push({ action: item.action, firmId, entityId: item.entityId })
      }
      batches.set(input.batchId, {
        ...b,
        status: 'applied',
        successCount: input.successCount,
        skippedCount: input.skippedCount,
        appliedAt: input.appliedAt,
        revertExpiresAt: input.revertExpiresAt,
        updatedAt: new Date(),
      })
    },
    async revertImport(input) {
      const b = batches.get(input.batchId)
      if (!b || b.firmId !== firmId) throw new Error('cross firm')
      const clientCount = importedClients.filter(
        (item) => item.migrationBatchId === input.batchId,
      ).length
      const obligationCount = importedObligations.filter(
        (item) => item.migrationBatchId === input.batchId,
      ).length
      removeWhere(importedObligations, (item) => item.migrationBatchId === input.batchId)
      removeWhere(importedFilingProfiles, (item) => item.migrationBatchId === input.batchId)
      removeWhere(importedClients, (item) => item.migrationBatchId === input.batchId)
      evidences.push({ sourceType: 'migration_revert', firmId })
      audits.push({ action: 'migration.reverted', firmId, entityId: input.batchId })
      batches.set(input.batchId, {
        ...b,
        status: 'reverted',
        revertedAt: input.revertedAt,
        updatedAt: new Date(),
      })
      return { clientCount, obligationCount }
    },
    async singleUndoImport(input) {
      const b = batches.get(input.batchId)
      if (!b || b.firmId !== firmId) throw new Error('cross firm')
      const clientExists = importedClients.some(
        (item) => item.id === input.clientId && item.migrationBatchId === input.batchId,
      )
      if (!clientExists) {
        throw new Error(`Client ${input.clientId} not found in migration batch ${input.batchId}`)
      }
      const obligationCount = importedObligations.filter(
        (item) => item.clientId === input.clientId && item.migrationBatchId === input.batchId,
      ).length
      removeWhere(
        importedObligations,
        (item) => item.clientId === input.clientId && item.migrationBatchId === input.batchId,
      )
      removeWhere(
        importedFilingProfiles,
        (item) => item.clientId === input.clientId && item.migrationBatchId === input.batchId,
      )
      removeWhere(
        importedClients,
        (item) => item.id === input.clientId && item.migrationBatchId === input.batchId,
      )
      evidences.push({ sourceType: 'migration_revert', firmId })
      audits.push({ action: 'migration.single_undo', firmId, entityId: input.batchId })
      return { clientCount: 1, obligationCount }
    },
  }

  const evidence: ScopedRepo['evidence'] = {
    firmId,
    async write(input) {
      evidences.push({
        sourceType: input.sourceType,
        firmId,
        ...(input.aiOutputId !== undefined ? { aiOutputId: input.aiOutputId } : {}),
      })
      return { id: 'evidence-' + evidences.length }
    },
    async writeBatch(inputs) {
      const ids: string[] = []
      for (const i of inputs) {
        evidences.push({
          sourceType: i.sourceType,
          firmId,
          ...(i.aiOutputId !== undefined ? { aiOutputId: i.aiOutputId } : {}),
        })
        ids.push('evidence-' + evidences.length)
      }
      return { ids }
    },
    async listByObligation() {
      return []
    },
  }

  const audit: ScopedRepo['audit'] = {
    firmId,
    async write(event) {
      audits.push({ action: event.action, firmId, entityId: event.entityId })
      return { id: 'audit-' + audits.length }
    },
    async writeBatch(events) {
      const ids: string[] = []
      for (const e of events) {
        audits.push({ action: e.action, firmId, entityId: e.entityId })
        ids.push('audit-' + audits.length)
      }
      return { ids }
    },
    async listByFirm() {
      return []
    },
    async list() {
      return { rows: [], nextCursor: null }
    },
    async latestByEntityIds() {
      return new Map()
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
      return unexpectedRepoCall('obligations.createSavedView')
    },
    async updateSavedView() {
      return unexpectedRepoCall('obligations.updateSavedView')
    },
    async deleteSavedView() {},
  }

  const workload: ScopedRepo['workload'] = {
    firmId,
    async load() {
      return unexpectedRepoCall('workload.load')
    },
  }

  const pulse: ScopedRepo['pulse'] = {
    firmId,
    async createSeedAlert() {
      return unexpectedRepoCall('pulse.createSeedAlert')
    },
    async listAlerts() {
      return unexpectedRepoCall('pulse.listAlerts')
    },
    async countActiveAlerts() {
      return unexpectedRepoCall('pulse.countActiveAlerts')
    },
    async refreshMatchedCountsForObligations() {
      return unexpectedRepoCall('pulse.refreshMatchedCountsForObligations')
    },
    async listAlertsForRule() {
      return unexpectedRepoCall('pulse.listAlertsForRule')
    },
    async listHistory() {
      return unexpectedRepoCall('pulse.listHistory')
    },
    async listSourceStates() {
      return unexpectedRepoCall('pulse.listSourceStates')
    },
    async getLatestSourceSnapshotBySourceId() {
      return unexpectedRepoCall('pulse.getLatestSourceSnapshotBySourceId')
    },
    async getDetail() {
      return unexpectedRepoCall('pulse.getDetail')
    },
    async listPriorityQueue() {
      return unexpectedRepoCall('pulse.listPriorityQueue')
    },
    async requestPriorityReview() {
      return unexpectedRepoCall('pulse.requestPriorityReview')
    },
    async reviewPriorityMatches() {
      return unexpectedRepoCall('pulse.reviewPriorityMatches')
    },
    async reviewDueDateOverlayDetails() {
      return unexpectedRepoCall('pulse.reviewDueDateOverlayDetails')
    },
    async applyReviewed() {
      return unexpectedRepoCall('pulse.applyReviewed')
    },
    async apply() {
      return unexpectedRepoCall('pulse.apply')
    },
    async dismiss() {
      return unexpectedRepoCall('pulse.dismiss')
    },
    async snooze() {
      return unexpectedRepoCall('pulse.snooze')
    },
    async markReviewed() {
      return unexpectedRepoCall('pulse.markReviewed')
    },
    async revert() {
      return unexpectedRepoCall('pulse.revert')
    },
    async reactivate() {
      return unexpectedRepoCall('pulse.reactivate')
    },
  }

  const repo: ScopedRepo = {
    firmId,
    filingProfiles: unusedFilingProfilesRepo(firmId),
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
      async recordRun(input) {
        const aiOutputId = `ai-output-${aiRuns.length + 1}`
        aiRuns.push({ kind: input.kind, aiOutputId })
        return { aiOutputId, llmLogId: `llm-log-${aiRuns.length}` }
      },
      async recordGlobalRun(input) {
        const aiOutputId = `ai-output-${aiRuns.length + 1}`
        aiRuns.push({ kind: input.kind, aiOutputId })
        return { aiOutputId, llmLogId: `llm-log-${aiRuns.length}` }
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
        return unexpectedRepoCall('aiInsights.createPending')
      },
      async markReady() {
        return unexpectedRepoCall('aiInsights.markReady')
      },
      async markFailed() {
        return unexpectedRepoCall('aiInsights.markFailed')
      },
    },
    calendar: {
      firmId,
      async listForUser() {
        return unexpectedRepoCall('calendar.listForUser')
      },
      async upsert() {
        return unexpectedRepoCall('calendar.upsert')
      },
      async find() {
        return unexpectedRepoCall('calendar.find')
      },
      async regenerate() {
        return unexpectedRepoCall('calendar.regenerate')
      },
      async disable() {
        return unexpectedRepoCall('calendar.disable')
      },
    },
    clients,
    dashboard: {
      firmId,
      async load() {
        return unexpectedRepoCall('dashboard.load')
      },
      async findLatestBrief() {
        return unexpectedRepoCall('dashboard.findLatestBrief')
      },
      async findBriefByHash() {
        return unexpectedRepoCall('dashboard.findBriefByHash')
      },
      async createBriefPending() {
        return unexpectedRepoCall('dashboard.createBriefPending')
      },
      async markBriefReady() {
        return unexpectedRepoCall('dashboard.markBriefReady')
      },
      async markBriefFailed() {
        return unexpectedRepoCall('dashboard.markBriefFailed')
      },
    },
    obligations,
    obligationQueue,
    workload,
    pulse,
    readiness: {
      firmId,
      async listDocumentChecklistByObligation() {
        return unexpectedRepoCall('readiness.listDocumentChecklistByObligation')
      },
      async createDocumentChecklistItems() {
        return unexpectedRepoCall('readiness.createDocumentChecklistItems')
      },
      async reconcileDocumentChecklistItems() {
        return unexpectedRepoCall('readiness.reconcileDocumentChecklistItems')
      },
      async updateDocumentChecklistItem() {
        return unexpectedRepoCall('readiness.updateDocumentChecklistItem')
      },
      async deleteDocumentChecklistItem() {
        return unexpectedRepoCall('readiness.deleteDocumentChecklistItem')
      },
      async listByObligation() {
        return unexpectedRepoCall('readiness.listByObligation')
      },
      async createRequest() {
        return unexpectedRepoCall('readiness.createRequest')
      },
      async getRequest() {
        return unexpectedRepoCall('readiness.getRequest')
      },
      async markOpened() {},
      async revokeRequest() {},
      async submitResponses() {
        return unexpectedRepoCall('readiness.submitResponses')
      },
      async syncDocumentChecklistFromResponses() {},
    },
    rules: {
      firmId,
      async upsertGlobalTemplates() {},
      async listPracticeRules() {
        return options.activeRuleRows ?? activePracticeRuleRows(firmId)
      },
      async listActivePracticeRules() {
        return options.activeRuleRows ?? activePracticeRuleRows(firmId)
      },
      async getPracticeRule() {
        return null
      },
      async upsertPracticeRule() {
        return unexpectedRepoCall('rules.upsertPracticeRule')
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
        return unexpectedRepoCall('rules.decideReviewTask')
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
        return unexpectedRepoCall('rules.upsertDecision')
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

  return {
    state: {
      batches,
      audits,
      evidences,
      mappings,
      normalizations,
      errors,
      importedClients,
      importedFilingProfiles,
      importedObligations,
      aiRuns,
    },
    repo,
  }
}

function removeWhere<T>(items: T[], predicate: (item: T) => boolean): void {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (predicate(items[i]!)) items.splice(i, 1)
  }
}

function withRequiredReasoning(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value
  if ('mappings' in value && Array.isArray(value.mappings)) {
    return {
      ...value,
      mappings: value.mappings.map((item) =>
        typeof item === 'object' && item !== null && !('reasoning' in item)
          ? { ...item, reasoning: 'test reasoning' }
          : item,
      ),
    }
  }
  return value
}

function buildAi(rawResult?: unknown): AI {
  const runPrompt: AI['runPrompt'] = async (name, _input, schema) => {
    if (rawResult === undefined) {
      return {
        result: null,
        refusal: { code: 'AI_UNAVAILABLE', message: 'no key' },
        trace: {
          promptVersion: name,
          model: 'unknown',
          latencyMs: 0,
          guardResult: 'ai_unavailable',
          inputHash: 'test-hash',
          refusalCode: 'AI_UNAVAILABLE',
        },
        model: null,
        confidence: null,
        cost: null,
      }
    }

    return {
      result: schema.parse(withRequiredReasoning(rawResult)),
      refusal: null,
      trace: {
        promptVersion: name,
        model: 'fast-json-test-model',
        latencyMs: 5,
        guardResult: 'ok',
        inputHash: 'test-hash',
      },
      model: 'fast-json-test-model',
      confidence: 0.97,
      cost: 0.0001,
    }
  }

  const extractPulse: AI['extractPulse'] = async (input) =>
    runPrompt('pulse-extract@v2', input, PulseExtractOutputSchema)

  return { extractPulse, runPrompt, runStreaming: runPrompt }
}

const taxTypeMissRunPrompt: AI['runPrompt'] = async (name, _input, schema) => {
  if (name === 'normalizer-tax-types@v1') {
    return {
      result: schema.parse({
        normalizations: [
          {
            raw: 'Form 990',
            normalized: [],
            confidence: 0.72,
            reasoning: 'Model returned no tax-type match.',
          },
        ],
      }),
      refusal: null,
      trace: {
        promptVersion: name,
        model: 'fast-json-test-model',
        latencyMs: 5,
        guardResult: 'ok',
        inputHash: 'test-hash',
      },
      model: 'fast-json-test-model',
      confidence: 0.72,
      cost: 0.0001,
    }
  }

  return {
    result: null,
    refusal: { code: 'AI_UNAVAILABLE', message: 'no key' },
    trace: {
      promptVersion: name,
      model: 'unknown',
      latencyMs: 0,
      guardResult: 'ai_unavailable',
      inputHash: 'test-hash',
      refusalCode: 'AI_UNAVAILABLE',
    },
    model: null,
    confidence: null,
    cost: null,
  }
}

function buildTaxTypeMissAi(): AI {
  const extractPulse: AI['extractPulse'] = async (input) =>
    taxTypeMissRunPrompt('pulse-extract@v2', input, PulseExtractOutputSchema)

  return { extractPulse, runPrompt: taxTypeMissRunPrompt, runStreaming: taxTypeMissRunPrompt }
}

function buildCountingMigrationAi(): {
  ai: AI
  calls: string[]
  routings: Array<Parameters<AI['runPrompt']>[3]>
} {
  const calls: string[] = []
  const routings: Array<Parameters<AI['runPrompt']>[3]> = []
  const runPrompt: AI['runPrompt'] = async (name, _input, schema, routing) => {
    calls.push(name)
    routings.push(routing)
    const result =
      name === 'mapper@v2'
        ? {
            mappings: [
              {
                source: 'Client Name',
                target: 'client.name',
                confidence: 0.96,
                reasoning: 'Header matches client name.',
              },
              {
                source: 'Tax ID',
                target: 'client.ein',
                confidence: 0.93,
                reasoning: 'Tax ID is the EIN column.',
              },
              {
                source: 'State',
                target: 'client.state',
                confidence: 0.94,
                reasoning: 'State contains jurisdiction codes.',
              },
              {
                source: 'Entity Type',
                target: 'client.entity_type',
                confidence: 0.92,
                reasoning: 'Entity Type contains tax entity labels.',
              },
              {
                source: 'Email',
                target: 'client.email',
                confidence: 0.91,
                reasoning: 'Email contains contact addresses.',
              },
            ],
          }
        : name === 'normalizer-entity@v1'
          ? {
              normalizations: [
                {
                  raw: 'LLC',
                  normalized: 'llc',
                  confidence: 0.95,
                  reasoning: 'LLC maps to limited liability company.',
                },
                {
                  raw: 'S-Corp',
                  normalized: 's_corp',
                  confidence: 0.94,
                  reasoning: 'S-Corp maps to S corporation.',
                },
                {
                  raw: 'Partnership',
                  normalized: 'partnership',
                  confidence: 0.94,
                  reasoning: 'Partnership is already canonical.',
                },
              ],
            }
          : { normalizations: [] }

    return {
      result: schema.parse(result),
      refusal: null,
      trace: {
        promptVersion: name,
        model: 'fast-json-test-model',
        latencyMs: 5,
        guardResult: 'ok',
        inputHash: 'test-hash',
      },
      model: 'fast-json-test-model',
      confidence: 0.97,
      cost: 0.0001,
    }
  }

  const extractPulse: AI['extractPulse'] = async (input) =>
    runPrompt('pulse-extract@v2', input, PulseExtractOutputSchema)

  return { ai: { extractPulse, runPrompt, runStreaming: runPrompt }, calls, routings }
}

const SAMPLE_CSV = `Client Name,Tax ID,State,Entity Type,Email
Acme LLC,12-3456789,CA,LLC,acme@example.com
Bright Studio,98-7654321,NY,S-Corp,bright@example.com
Lake Holdings,11-2233445,CA,Partnership,lake@example.com`

const SAMPLE_CONFIRMED_MAPPINGS: Record<string, MappingTarget> = {
  'Client Name': 'client.name',
  'Tax ID': 'client.ein',
  State: 'client.state',
  'Entity Type': 'client.entity_type',
  Email: 'client.email',
}

const FIXTURE_DIR = new URL(
  '../../../../../docs/product-design/migration-copilot/06-fixtures/',
  import.meta.url,
)

function readFixture(name: string): string {
  return readFileSync(new URL(name, FIXTURE_DIR), 'utf8')
}

type SourcePreset =
  | 'preset_taxdome'
  | 'preset_drake'
  | 'preset_karbon'
  | 'preset_quickbooks'
  | 'preset_file_in_time'
  | 'preset_cch_axcess'
  | 'preset_cch_prosystem_fx'
  | 'preset_lacerte'
  | 'preset_proseries'
  | 'preset_ultratax_cs'
  | 'preset_proconnect_tax'

interface FixtureGoldenCase {
  preset:
    | 'taxdome'
    | 'drake'
    | 'karbon'
    | 'quickbooks'
    | 'file_in_time'
    | 'cch_axcess'
    | 'cch_prosystem_fx'
    | 'lacerte'
    | 'proseries'
    | 'ultratax_cs'
    | 'proconnect_tax'
  source: SourcePreset
  file: string
  clients: number
  expectedMappings: Record<string, MappingTarget>
  importMappings?: Record<string, MappingTarget>
  expectedEinInvalid: number
}

const PRESET_GOLDENS: FixtureGoldenCase[] = [
  {
    preset: 'taxdome',
    source: 'preset_taxdome',
    file: 'taxdome-30clients.csv',
    clients: 30,
    expectedEinInvalid: 0,
    expectedMappings: {
      'Account Name': 'client.name',
      'Account Type': 'IGNORE',
      State: 'client.state',
      'Team Members': 'client.assignee_name',
      Email: 'client.email',
      'Tax ID': 'client.ein',
      'Tax Entity Type': 'client.entity_type',
      'Tax Return Type': 'client.tax_types',
      Deadline: 'IGNORE',
      Notes: 'client.notes',
    },
  },
  {
    preset: 'drake',
    source: 'preset_drake',
    file: 'drake-30clients.csv',
    clients: 30,
    expectedEinInvalid: 0,
    expectedMappings: {
      'Client ID': 'IGNORE',
      Name: 'client.name',
      EIN: 'client.ein',
      Entity: 'IGNORE',
      State: 'client.state',
      'Return Type': 'client.entity_type',
      Staff: 'IGNORE',
    },
    importMappings: {
      'Client ID': 'IGNORE',
      Name: 'client.name',
      EIN: 'client.ein',
      Entity: 'client.entity_type',
      State: 'client.state',
      'Return Type': 'client.tax_types',
      Staff: 'client.assignee_name',
    },
  },
  {
    preset: 'karbon',
    source: 'preset_karbon',
    file: 'karbon-20clients.csv',
    clients: 20,
    expectedEinInvalid: 0,
    expectedMappings: {
      'Organization Name': 'client.name',
      'Tax ID': 'client.ein',
      Country: 'IGNORE',
      'Primary Contact': 'client.primary_contact_name',
      'Contact Email': 'client.primary_contact_email',
    },
    importMappings: {
      'Organization Name': 'client.name',
      'Tax ID': 'client.ein',
      Country: 'IGNORE',
      'Primary Contact': 'client.primary_contact_name',
      'Contact Email': 'client.primary_contact_email',
    },
  },
  {
    preset: 'quickbooks',
    source: 'preset_quickbooks',
    file: 'quickbooks-20clients.csv',
    clients: 20,
    expectedEinInvalid: 0,
    expectedMappings: {
      Customer: 'client.name',
      'Tax ID': 'IGNORE',
      'Billing State': 'client.state',
      Terms: 'IGNORE',
    },
    importMappings: {
      Customer: 'client.name',
      'Tax ID': 'client.ein',
      'Billing State': 'client.state',
      Terms: 'IGNORE',
    },
  },
  {
    preset: 'file_in_time',
    source: 'preset_file_in_time',
    file: 'file-in-time-30clients.csv',
    clients: 30,
    expectedEinInvalid: 0,
    expectedMappings: {
      Client: 'client.name',
      Service: 'IGNORE',
      'Due Date': 'IGNORE',
      Status: 'IGNORE',
      Staff: 'IGNORE',
      Entity: 'IGNORE',
      State: 'client.state',
      County: 'IGNORE',
      Notes: 'IGNORE',
    },
    importMappings: {
      Client: 'client.name',
      Service: 'client.tax_types',
      'Due Date': 'IGNORE',
      Status: 'IGNORE',
      Staff: 'client.assignee_name',
      Entity: 'client.entity_type',
      State: 'client.state',
      County: 'client.county',
      Notes: 'client.notes',
    },
  },
  {
    preset: 'cch_axcess',
    source: 'preset_cch_axcess',
    file: 'cch-axcess-2clients.csv',
    clients: 2,
    expectedEinInvalid: 0,
    expectedMappings: {
      'Client ID': 'client.external_client_id',
      'Client Sub-ID': 'client.external_client_id',
      'Client GUID': 'IGNORE',
      'Name Line 1': 'client.name',
      'Name Line 2': 'IGNORE',
      'Sort Name': 'client.name',
      'Federal ID': 'client.ein',
      'Client Type': 'client.tax_types',
      FYE: 'client.fiscal_year_end',
      'Address 1': 'client.address_line_1',
      City: 'client.city',
      State: 'client.state',
      ZIP: 'client.postal_code',
      Phone: 'client.primary_phone',
      Email: 'client.email',
      Office: 'client.notes',
      'Responsible Staff': 'client.assignee_name',
    },
  },
  {
    preset: 'cch_prosystem_fx',
    source: 'preset_cch_prosystem_fx',
    file: 'cch-prosystem-fx-2clients.csv',
    clients: 2,
    expectedEinInvalid: 0,
    expectedMappings: {
      'Client ID': 'client.external_client_id',
      'Client Sub-ID': 'client.external_client_id',
      'Name Line 1': 'client.name',
      'Name Line 2': 'IGNORE',
      'Sort Name': 'client.name',
      'Federal ID': 'client.ein',
      'Client Type': 'client.tax_types',
      FYE: 'client.fiscal_year_end',
      'Address 1': 'client.address_line_1',
      City: 'client.city',
      State: 'client.state',
      ZIP: 'client.postal_code',
      Phone: 'client.primary_phone',
      Email: 'client.email',
      Partner: 'client.assignee_name',
      Manager: 'client.assignee_name',
      Preparer: 'client.assignee_name',
    },
  },
  {
    preset: 'lacerte',
    source: 'preset_lacerte',
    file: 'lacerte-2clients.csv',
    clients: 2,
    expectedEinInvalid: 0,
    expectedMappings: {
      'Client Number': 'client.external_client_id',
      'Taxpayer First Name': 'client.primary_contact_name',
      'Taxpayer Last Name': 'client.primary_contact_name',
      'Client Name': 'client.name',
      'Return Type': 'client.tax_types',
      'SSN/EIN': 'IGNORE',
      'Street Address': 'client.address_line_1',
      City: 'client.city',
      State: 'client.state',
      ZIP: 'client.postal_code',
      'Taxpayer Phone': 'client.primary_phone',
      'Taxpayer E-mail Address': 'client.email',
      Preparer: 'client.assignee_name',
    },
  },
  {
    preset: 'proseries',
    source: 'preset_proseries',
    file: 'proseries-2clients.csv',
    clients: 2,
    expectedEinInvalid: 0,
    expectedMappings: {
      'First Name': 'client.primary_contact_name',
      'Last Name': 'client.primary_contact_name',
      'Client Name': 'client.name',
      'Client Status': 'client.source_status',
      'Return Type': 'client.tax_types',
      'SSN/EIN': 'IGNORE',
      'Client Street and Apt Address': 'client.address_line_1',
      'Client City': 'client.city',
      'Client State': 'client.state',
      'Client Zip': 'client.postal_code',
      'Home Phone': 'client.primary_phone',
      'Mobile Phone': 'client.primary_phone',
      Email: 'client.email',
      Preparer: 'client.assignee_name',
    },
  },
  {
    preset: 'ultratax_cs',
    source: 'preset_ultratax_cs',
    file: 'ultratax-cs-2clients.csv',
    clients: 2,
    expectedEinInvalid: 0,
    expectedMappings: {
      'Client ID': 'client.external_client_id',
      'Client Name': 'client.name',
      Entity: 'client.tax_types',
      'SSN/EIN': 'IGNORE',
      Preparer: 'client.assignee_name',
      'Street Address': 'client.address_line_1',
      City: 'client.city',
      State: 'client.state',
      ZIP: 'client.postal_code',
      Phone: 'client.primary_phone',
      Email: 'client.email',
      Status: 'client.source_status',
    },
  },
  {
    preset: 'proconnect_tax',
    source: 'preset_proconnect_tax',
    file: 'proconnect-tax-2clients.csv',
    clients: 2,
    expectedEinInvalid: 0,
    expectedMappings: {
      'Taxpayer name': 'client.name',
      'Taxpayer email address': 'client.email',
      'Taxpayer phone number': 'client.primary_phone',
      'Street address': 'client.address_line_1',
      City: 'client.city',
      State: 'client.state',
      'Zip code': 'client.postal_code',
      'Return type': 'client.tax_types',
      'Tax year': 'IGNORE',
      Refund: 'IGNORE',
      'Taxes owed': 'client.estimated_tax_liability',
      Preparer: 'client.assignee_name',
    },
  },
]

describe('Migration deterministic validation copy', () => {
  it('corrects return/form columns that AI mapped as entity type into tax types', () => {
    const { sanitizedMappings } = sanitizeMapperOutput(
      [
        {
          id: '550e8400-e29b-41d4-a716-446655449001',
          batchId: '550e8400-e29b-41d4-a716-446655449000',
          sourceHeader: 'Tax Return Type',
          targetField: 'client.entity_type',
          confidence: 0.9,
          reasoning: 'Model treated return type as entity type.',
          userOverridden: false,
          model: 'test-model',
          promptVersion: 'mapper@v2',
          createdAt: '2026-05-25T00:00:00.000Z',
        },
      ],
      ['Tax Return Type'],
      [['Form 990']],
      { batchId: '550e8400-e29b-41d4-a716-446655449000' },
    )

    expect(sanitizedMappings[0]?.targetField).toBe('client.tax_types')
  })

  it('does not expose internal enum wording for unrecognized entity types', () => {
    const errors = validateNormalizedRows([
      {
        rowIndex: 13,
        rawRow: { 'Entity Type': 'sole-prop' },
        state: 'CA',
        entityType: 'sole-prop',
      },
    ])

    expect(errors).toHaveLength(1)
    expect(errors[0]?.errorCode).toBe('ENTITY_ENUM')
    expect(errors[0]?.errorMessage).toBe(
      'We could not recognize the entity type. Review the mapped entity type before import.',
    )
    expect(errors[0]?.errorMessage).not.toContain('enum')
    expect(errors[0]?.errorMessage).not.toContain('sole-prop')
  })
})

const MESSY_EXPECTED_MAPPINGS: Record<string, MappingTarget> = {
  Client: 'client.name',
  'Federal ID': 'client.ein',
  'Org Type': 'client.entity_type',
  'State/Juris': 'client.state',
  'County/Region': 'client.county',
  'Tax Forms': 'client.tax_types',
  Contact: 'client.assignee_name',
  Email: 'client.email',
  Industry: 'IGNORE',
  'Year Revenue': 'IGNORE',
  Notes: 'client.notes',
}

function expectFixtureMappings(
  mappings: Awaited<ReturnType<MigrationService['runMapper']>>['mappings'],
  expected: Record<string, MappingTarget>,
): void {
  const byHeader = new Map(mappings.map((mapping) => [mapping.sourceHeader, mapping]))
  for (const [header, target] of Object.entries(expected)) {
    const mapping = byHeader.get(header)
    expect(mapping, `missing mapping for ${header}`).toBeDefined()
    expect(mapping?.targetField).toBe(target)
    if (target === 'IGNORE') {
      expect(mapping?.confidence).toBeNull()
    } else {
      expect(mapping?.confidence ?? 0).toBeGreaterThanOrEqual(PRESET_FALLBACK_CONFIDENCE)
    }
  }
}

function overrideFixtureMappings(
  mappings: Awaited<ReturnType<MigrationService['runMapper']>>['mappings'],
  expected: Record<string, MappingTarget>,
) {
  return mappings.map((mapping) => {
    const targetField = expected[mapping.sourceHeader] ?? 'IGNORE'
    return {
      ...mapping,
      targetField,
      confidence: targetField === 'IGNORE' ? null : PRESET_FALLBACK_CONFIDENCE,
      reasoning: 'Fixture golden mapping override.',
      userOverridden: true,
      model: null,
      promptVersion: PRESET_VERSION,
    }
  })
}

function matrixAppliedForTest(value: unknown): Array<{
  entityType: string
  state: string
  applicationMode: string
  taxTypes: string[]
}> {
  if (typeof value !== 'object' || value === null || !('matrixApplied' in value)) return []
  const matrixApplied = value.matrixApplied
  if (!Array.isArray(matrixApplied)) return []
  return matrixApplied.filter(isMatrixApplicationTestEntry)
}

function isMatrixApplicationTestEntry(value: unknown): value is {
  entityType: string
  state: string
  applicationMode: string
  taxTypes: string[]
} {
  if (typeof value !== 'object' || value === null) return false
  if (!('entityType' in value) || typeof value.entityType !== 'string') return false
  if (!('state' in value) || typeof value.state !== 'string') return false
  if (!('applicationMode' in value) || typeof value.applicationMode !== 'string') return false
  return 'taxTypes' in value && Array.isArray(value.taxTypes)
}

describe('MigrationService.createBatch', () => {
  it('writes a draft batch + audit row', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'paste' })
    expect(batch.firmId).toBe(FIRM)
    expect(batch.status).toBe('draft')
    expect(state.audits.some((a) => a.action === 'migration.batch.created')).toBe(true)
  })

  it('rejects a second draft for the same firm with CONFLICT', async () => {
    const { repo } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    await service.createBatch({ source: 'paste' })
    await expect(service.createBatch({ source: 'csv' })).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })

  it('discards a draft batch so a new import can start', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const first = await service.createBatch({ source: 'paste' })
    const discarded = await service.discardDraft(first.id)
    const second = await service.createBatch({ source: 'csv' })

    expect(discarded.discardedAt).toEqual(expect.any(String))
    expect(state.batches.get(first.id)?.status).toBe('failed')
    expect(second.status).toBe('draft')
    expect(state.audits.some((a) => a.action === 'migration.discarded')).toBe(true)
  })
})

describe('MigrationService.uploadRaw + runMapper happy path', () => {
  it('parses CSV, persists raw, then runs mapper preset fallback when AI is missing', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_taxdome', presetUsed: 'taxdome' })
    await service.uploadRaw({
      batchId: batch.id,
      kind: 'csv',
      text: SAMPLE_CSV,
      sourceManifest: {
        product: 'taxdome',
        confidence: 0.95,
        reason: 'TaxDome account export headers detected.',
        originalFileName: 'accounts.csv',
        originalKind: 'csv',
        selectedFileName: 'accounts.csv',
        selectedRole: 'account_list',
        files: [
          {
            fileName: 'accounts.csv',
            originalKind: 'csv',
            role: 'account_list',
            product: 'taxdome',
            rowCount: 3,
            selected: true,
          },
        ],
        warnings: [],
      },
    })

    const result = await service.runMapper(batch.id)

    expect(state.batches.get(batch.id)?.mappingJson).toMatchObject({
      sourceManifest: {
        product: 'taxdome',
        selectedFileName: 'accounts.csv',
      },
    })
    expect(result.meta?.fallback).toBe('preset')
    expect(result.mappings.length).toBeGreaterThan(0)
    // TaxDome's public export docs use Account Name, not this fixture's
    // "Client Name", so the preset fallback leaves it for user review.
    const nameMap = result.mappings.find((m) => m.sourceHeader === 'Client Name')
    expect(nameMap?.targetField).toBe('IGNORE')
    expect(state.evidences.some((e) => e.sourceType === 'ai_mapper')).toBe(true)
    expect(state.aiRuns.some((run) => run.kind === 'migration_map')).toBe(true)
    expect(
      state.evidences
        .filter((e) => e.sourceType === 'ai_mapper')
        .every((e) => e.aiOutputId?.startsWith('ai-output-')),
    ).toBe(true)
  })

  it('falls back to all_ignore when AI is unavailable and no preset is selected', async () => {
    const { repo } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'paste' })
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: SAMPLE_CSV })

    const result = await service.runMapper(batch.id)
    expect(result.meta?.fallback).toBe('all_ignore')
    expect(result.mappings.every((m) => m.targetField === 'IGNORE')).toBe(true)
  })

  it('routes Solo mapper through basic migration AI instead of deterministic-only fallback', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const { ai, calls, routings } = buildCountingMigrationAi()
    const firmCreatedAt = new Date('2026-05-01T00:00:00.000Z')
    const service = new MigrationService({
      scoped: repo,
      ai,
      userId: USER,
      plan: 'solo',
      firmCreatedAt,
    })

    const batch = await service.createBatch({ source: 'preset_taxdome', presetUsed: 'taxdome' })
    await service.uploadRaw({ batchId: batch.id, kind: 'csv', text: SAMPLE_CSV })

    const result = await service.runMapper(batch.id)

    expect(calls).toContain('mapper@v2')
    expect(result.meta?.fallback).toBeNull()
    expect(result.mappings.some((mapping) => mapping.targetField === 'client.name')).toBe(true)
    expect(state.aiRuns.some((run) => run.kind === 'migration_map')).toBe(true)
    expect(result.mappings.every((mapping) => mapping.model === 'fast-json-test-model')).toBe(true)
    expect(routings[0]).toMatchObject({
      plan: 'solo',
      firmCreatedAt,
      migrationOnboardingCompleted: false,
      taskKind: 'migration',
    })
  })

  it('routes Solo normalizer through basic migration AI', async () => {
    const { repo } = buildScopedRepo(FIRM)
    const { ai, calls } = buildCountingMigrationAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER, plan: 'solo' })

    const batch = await service.createBatch({ source: 'preset_taxdome', presetUsed: 'taxdome' })
    await service.uploadRaw({ batchId: batch.id, kind: 'csv', text: SAMPLE_CSV })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, SAMPLE_CONFIRMED_MAPPINGS),
    )

    const result = await service.runNormalizer(batch.id)

    expect(calls).toContain('normalizer-entity@v1')
    expect(
      result.normalizations.some(
        (row) =>
          row.field === 'entity_type' &&
          row.rawValue === 'LLC' &&
          row.normalizedValue === 'llc' &&
          row.model === 'fast-json-test-model',
      ),
    ).toBe(true)
  })

  it('normalizes entity aliases and defaults unknown entity values to reviewable Other', async () => {
    const { repo } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'paste' })
    const csv = `Client Name,Tax ID,State,Entity Type\nAlias Co,99-0000001,CA,sole-prop\nUnknown Co,99-0000002,NY,strange entity`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, SAMPLE_CONFIRMED_MAPPINGS),
    )

    const result = await service.runNormalizer(batch.id)
    const entityRows = result.normalizations.filter((row) => row.field === 'entity_type')

    expect(entityRows.find((row) => row.rawValue === 'sole-prop')?.normalizedValue).toBe(
      'sole_prop',
    )
    expect(entityRows.find((row) => row.rawValue === 'strange entity')).toMatchObject({
      normalizedValue: 'other',
      confidence: 0.25,
    })
  })

  it('marks Solo migration onboarding complete after any successful import attempt', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const { ai, routings } = buildCountingMigrationAi()
    const service = new MigrationService({
      scoped: repo,
      ai,
      userId: USER,
      plan: 'solo',
      firmCreatedAt: new Date('2026-05-01T00:00:00.000Z'),
    })

    const prior = await service.createBatch({ source: 'preset_taxdome', presetUsed: 'taxdome' })
    state.batches.set(prior.id, {
      ...state.batches.get(prior.id)!,
      status: 'reverted',
      appliedAt: new Date('2026-05-02T00:00:00.000Z'),
      revertedAt: new Date('2026-05-02T01:00:00.000Z'),
    })
    const batch = await service.createBatch({ source: 'preset_taxdome', presetUsed: 'taxdome' })
    await service.uploadRaw({ batchId: batch.id, kind: 'csv', text: SAMPLE_CSV })

    await service.runMapper(batch.id)

    expect(routings[0]).toMatchObject({ migrationOnboardingCompleted: true })
  })

  it('forces SSN-flagged columns to IGNORE even on the AI happy path', async () => {
    const { repo } = buildScopedRepo(FIRM)
    const ai = buildAi({
      mappings: [{ source: 'Client Name', target: 'client.name', confidence: 0.99 }],
    })
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'paste' })
    const csv = `Client Name,SSN,ITIN\nAcme LLC,123-45-6789,999-88-7777\nBright Studio,987-65-4321,`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })

    const result = await service.runMapper(batch.id)
    const ssnMapping = result.mappings.find((m) => m.sourceHeader === 'SSN')
    const itinMapping = result.mappings.find((m) => m.sourceHeader === 'ITIN')
    expect(ssnMapping?.targetField).toBe('IGNORE')
    expect(itinMapping?.targetField).toBe('IGNORE')
    expect(ssnMapping?.promptVersion).toBe('pii_guard@v1')
    expect(itinMapping?.promptVersion).toBe('pii_guard@v1')

    const updated = await service.getBatch(batch.id)
    expect(updated?.mappingJson).toEqual(expect.objectContaining({ ssnBlockedColumns: [1, 2] }))
  })

  it('allows a user-confirmed EIN mapping for an SSN/EIN column', async () => {
    const { repo } = buildScopedRepo(FIRM)
    const ai = buildAi({
      mappings: [{ source: 'Client Name', target: 'client.name', confidence: 0.99 }],
    })
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'paste' })
    const csv = `Client Name,SSN/EIN,SSN\nAcme LLC,12-3456789,123-45-6789`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })

    const mapper = await service.runMapper(batch.id)
    const userMappings = [...mapper.mappings]
    const ssnEinIndex = userMappings.findIndex((mapping) => mapping.sourceHeader === 'SSN/EIN')
    const ssnIndex = userMappings.findIndex((mapping) => mapping.sourceHeader === 'SSN')
    if (ssnEinIndex >= 0) {
      userMappings[ssnEinIndex] = {
        ...userMappings[ssnEinIndex]!,
        targetField: 'client.ein',
        userOverridden: true,
      }
    }
    if (ssnIndex >= 0) {
      userMappings[ssnIndex] = {
        ...userMappings[ssnIndex]!,
        targetField: 'client.notes',
        userOverridden: true,
      }
    }
    const confirmed = await service.confirmMapping(batch.id, userMappings)

    expect(confirmed.mappings.find((m) => m.sourceHeader === 'SSN/EIN')?.targetField).toBe(
      'client.ein',
    )
    expect(confirmed.mappings.find((m) => m.sourceHeader === 'SSN')?.targetField).toBe('IGNORE')
  })
})

describe('MigrationService fixture golden tests', () => {
  it.each(PRESET_GOLDENS)(
    'keeps $preset preset fallback stable for mapping, EIN checks, and dry-run counts',
    async (golden) => {
      const { repo, state } = buildScopedRepo(FIRM)
      const ai = buildAi()
      const service = new MigrationService({ scoped: repo, ai, userId: USER })

      const batch = await service.createBatch({
        source: golden.source,
        presetUsed: golden.preset,
      })
      await service.uploadRaw({
        batchId: batch.id,
        kind: 'csv',
        text: readFixture(golden.file),
      })

      const mapper = await service.runMapper(batch.id)
      expect(mapper.meta?.fallback).toBe('preset')
      expectFixtureMappings(mapper.mappings, golden.expectedMappings)

      await service.confirmMapping(
        batch.id,
        overrideFixtureMappings(mapper.mappings, golden.importMappings ?? golden.expectedMappings),
      )
      const dryRun = await service.dryRun(batch.id)

      expect(dryRun.clientsToCreate).toBe(golden.clients)
      expect(dryRun.obligationsToCreate).toBeGreaterThan(0)
      expect(state.errors.filter((error) => error.errorCode === 'EIN_INVALID')).toHaveLength(
        golden.expectedEinInvalid,
      )
    },
  )

  it('commits tax software source fields onto imported clients', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })
    const golden = PRESET_GOLDENS.find((item) => item.preset === 'cch_axcess')
    if (!golden) throw new Error('Missing CCH Axcess fixture golden case')

    const batch = await service.createBatch({
      source: golden.source,
      presetUsed: golden.preset,
    })
    await service.uploadRaw({
      batchId: batch.id,
      kind: 'csv',
      text: readFixture(golden.file),
    })

    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, golden.importMappings ?? golden.expectedMappings),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)
    await service.applyDefaultMatrix(batch.id)
    await service.apply(batch.id)

    expect(state.importedClients[0]).toMatchObject({
      externalClientId: 'AX100',
      addressLine1: '100 Main St',
      city: 'Los Angeles',
      postalCode: '90012',
      primaryPhone: '213-555-0100',
    })
  })

  it('keeps the messy fixture bad-row count stable when mapped without AI', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'paste' })
    await service.uploadRaw({
      batchId: batch.id,
      kind: 'csv',
      text: readFixture('messy-excel-agent-demo.csv'),
    })
    const mapper = await service.runMapper(batch.id)
    expect(mapper.meta?.fallback).toBe('all_ignore')

    const manualMappings = overrideFixtureMappings(mapper.mappings, MESSY_EXPECTED_MAPPINGS)
    await service.confirmMapping(batch.id, manualMappings)

    expect(state.errors.filter((error) => error.errorCode === 'EIN_INVALID')).toHaveLength(8)
  })

  it('imports obligations from explicit tax-due fixture inputs', async () => {
    const { repo } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({
      source: 'preset_taxdome',
      presetUsed: 'taxdome',
    })
    await service.uploadRaw({
      batchId: batch.id,
      kind: 'csv',
      text: readFixture('taxdome-exposure-3clients.csv'),
    })

    const mapper = await service.runMapper(batch.id)
    expectFixtureMappings(mapper.mappings, {
      'Client Name': 'IGNORE',
      'Tax ID': 'client.ein',
      'Entity Type': 'IGNORE',
      State: 'client.state',
      'Estimated Tax Due': 'IGNORE',
      'Owner Count': 'IGNORE',
    })
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        'Tax ID': 'client.ein',
        'Entity Type': 'client.entity_type',
        State: 'client.state',
        'Estimated Tax Due': 'client.estimated_tax_liability',
        'Owner Count': 'client.equity_owner_count',
      }),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)

    const dryRun = await service.applyDefaultMatrix(batch.id)
    expect(dryRun.obligationsToCreate).toBeGreaterThan(0)

    const applied = await service.apply(batch.id)
    expect(applied.obligationCount).toBeGreaterThanOrEqual(dryRun.obligationsToCreate)
  })
})

describe('MigrationService.confirmMapping deterministic checks', () => {
  it('records EIN_INVALID errors but keeps good rows', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi({
      mappings: [
        { source: 'Client Name', target: 'client.name', confidence: 0.99 },
        { source: 'Tax ID', target: 'client.ein', confidence: 0.96 },
      ],
    })
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'paste' })
    const csv = `Client Name,Tax ID\nAcme LLC,12-3456789\nBad Row,not-an-ein\nGood Co,99-1234567`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, SAMPLE_CONFIRMED_MAPPINGS),
    )

    const einErrors = state.errors.filter((e) => e.errorCode === 'EIN_INVALID')
    expect(einErrors).toHaveLength(1)
    expect(einErrors[0]!.rowIndex).toBe(1)
  })

  it('returns schema-valid dryRun errors with the batch id', async () => {
    const { repo } = buildScopedRepo(FIRM)
    const ai = buildAi({
      mappings: [
        { source: 'Client Name', target: 'client.name', confidence: 0.99 },
        { source: 'Tax ID', target: 'client.ein', confidence: 0.96 },
      ],
    })
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'paste' })
    const csv = `Client Name,Tax ID\nAcme LLC,12-3456789\nBad Row,not-an-ein`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, SAMPLE_CONFIRMED_MAPPINGS),
    )

    const summary = await service.dryRun(batch.id)
    expect(
      summary.errors.some((e) => e.batchId === batch.id && e.errorCode === 'EIN_INVALID'),
    ).toBe(true)
  })
})

describe('MigrationService cross-firm isolation', () => {
  it('rejects access to a batch owned by another firm', async () => {
    // Owner-A creates a batch.
    const a = buildScopedRepo(FIRM)
    const aiA = buildAi()
    const serviceA = new MigrationService({ scoped: a.repo, ai: aiA, userId: USER })
    const batch = await serviceA.createBatch({ source: 'paste' })

    // Owner-B is a different firm; their scoped repo cannot see batch.id even
    // when called with the right id (the in-memory mirror is per-firm).
    const b = buildScopedRepo(OTHER_FIRM)
    const aiB = buildAi()
    const serviceB = new MigrationService({ scoped: b.repo, ai: aiB, userId: 'user-2' })

    // Day-3 acceptance from docs/dev-file/10 line 176: "cross firm data is
    // not visible". Pulling Firm A's batch from Firm B's service must throw
    // a NOT_FOUND.
    await expect(serviceB.getBatch(batch.id)).resolves.toBeNull()
  })
})

describe('MigrationService.dryRun with Default Matrix', () => {
  it('produces non-zero clientsToCreate even before applyDefaultMatrix', async () => {
    const { repo } = buildScopedRepo(FIRM)
    const ai = buildAi({
      mappings: [
        { source: 'Client Name', target: 'client.name', confidence: 0.99 },
        { source: 'Tax ID', target: 'client.ein', confidence: 0.96 },
        { source: 'State', target: 'client.state', confidence: 0.97 },
        { source: 'Entity Type', target: 'client.entity_type', confidence: 0.94 },
      ],
    })
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'paste' })
    const csv = `Client Name,Tax ID,State,Entity Type\nAcme LLC,12-3456789,CA,LLC\nBright Studio,98-7654321,NY,S-Corp`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, SAMPLE_CONFIRMED_MAPPINGS),
    )

    const summary = await service.dryRun(batch.id)
    expect(summary.clientsToCreate).toBe(2)
    expect(summary.obligationsToCreate).toBeGreaterThan(0)
  })

  it('applies matrix suggestions when imported tax types are only federal return types', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_drake', presetUsed: 'drake' })
    const csv = `Client Name,State,Entity Type,Return Type
Texas Corp,TX,C-Corp,Form 1120`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        State: 'client.state',
        'Entity Type': 'client.entity_type',
        'Return Type': 'client.tax_types',
      }),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)

    const summary = await service.applyDefaultMatrix(batch.id)
    const matrixApplied = matrixAppliedForTest(state.batches.get(batch.id)?.mappingJson)
    const txCell = matrixApplied.find((cell) => cell.entityType === 'c_corp' && cell.state === 'TX')

    expect(txCell).toMatchObject({ applicationMode: 'federal_return_type_plus_state' })
    expect(txCell?.taxTypes).toContain('federal_1120')
    expect(txCell?.taxTypes).toContain('tx_state_franchise_or_entity_tax')
    expect(summary.ruleReviewWarnings.some((warning) => warning.state === 'TX')).toBe(true)
  })

  it('repairs obvious state and tax-type normalizer misses before confirmation', async () => {
    const { repo } = buildScopedRepo(FIRM)
    const ai = buildTaxTypeMissAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'paste' })
    const csv = `Client Name,State,Return Type
Nonprofit Client,C.A.,Form 990`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        State: 'client.state',
        'Return Type': 'client.tax_types',
      }),
    )

    const normalizer = await service.runNormalizer(batch.id)
    expect(normalizer.normalizations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'state',
          rawValue: 'C.A.',
          normalizedValue: 'CA',
        }),
        expect.objectContaining({
          field: 'tax_types',
          rawValue: 'Form 990',
          normalizedValue: JSON.stringify(['federal_990']),
        }),
      ]),
    )
  })

  it('does not apply matrix suggestions when explicit tax types already include that state', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_drake', presetUsed: 'drake' })
    const csv = `Client Name,State,Entity Type,Return Type
California LLC,CA,LLC,Form 1065 + CA LLC`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        State: 'client.state',
        'Entity Type': 'client.entity_type',
        'Return Type': 'client.tax_types',
      }),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)

    await service.applyDefaultMatrix(batch.id)
    const matrixApplied = matrixAppliedForTest(state.batches.get(batch.id)?.mappingJson)

    expect(matrixApplied).toEqual([])
  })

  it('warns when state matrix suggestions do not have active practice rules', async () => {
    const federalOnlyRules = activePracticeRuleRows(
      FIRM,
      (rule) => rule.status === 'verified' && rule.jurisdiction === 'FED',
    )
    const { repo, state } = buildScopedRepo(FIRM, { activeRuleRows: federalOnlyRules })
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_drake', presetUsed: 'drake' })
    const csv = `Client Name,State,Entity Type,Return Type
California LLC,CA,LLC,Form 1065`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        State: 'client.state',
        'Entity Type': 'client.entity_type',
        'Return Type': 'client.tax_types',
      }),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)

    const summary = await service.applyDefaultMatrix(batch.id)
    const result = await service.apply(batch.id)

    expect(summary.ruleReviewWarnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          state: 'CA',
          entityType: 'llc',
          affectedClientCount: 1,
          reason: 'rules_pending_review',
        }),
      ]),
    )
    expect(result.clientCount).toBe(1)
    expect(state.importedObligations.some((item) => item.jurisdiction === 'FED')).toBe(true)
    expect(state.importedObligations.some((item) => item.jurisdiction === 'CA')).toBe(false)
  })

  it('keeps the federal deadline when the state return counterpart is pending review', async () => {
    const federalOnlyRules = activePracticeRuleRows(
      FIRM,
      (rule) => rule.status === 'verified' && rule.jurisdiction === 'FED',
    )
    const { repo, state } = buildScopedRepo(FIRM, { activeRuleRows: federalOnlyRules })
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_drake', presetUsed: 'drake' })
    const csv = `Client Name,State,Entity Type,Return Type
California S Corp,CA,S-Corp,Form 1120-S`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        State: 'client.state',
        'Entity Type': 'client.entity_type',
        'Return Type': 'client.tax_types',
      }),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)

    const summary = await service.applyDefaultMatrix(batch.id)
    const result = await service.apply(batch.id)

    expect(summary.obligationsToCreate).toBe(1)
    expect(summary.ruleReviewWarnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          state: 'CA',
          entityType: 's_corp',
          taxTypes: expect.arrayContaining(['ca_100s_franchise']),
          reason: 'rules_pending_review',
        }),
      ]),
    )
    expect(result.clientCount).toBe(1)
    expect(result.obligationCount).toBe(1)
    expect(state.importedClients).toHaveLength(1)
    expect(state.importedObligations).toHaveLength(1)
    expect(
      state.importedObligations.some(
        (item) => item.jurisdiction === 'FED' && item.taxType === 'federal_1120s',
      ),
    ).toBe(true)
    expect(
      state.importedObligations.some(
        (item) => item.jurisdiction === 'CA' && item.taxType === 'ca_100s',
      ),
    ).toBe(false)
  })

  it('warns about state rule review even when the firm has no active rules yet', async () => {
    const { repo } = buildScopedRepo(FIRM, { activeRuleRows: [] })
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_drake', presetUsed: 'drake' })
    const csv = `Client Name,State,Entity Type,Return Type
California LLC,CA,LLC,Form 1065`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        State: 'client.state',
        'Entity Type': 'client.entity_type',
        'Return Type': 'client.tax_types',
      }),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)

    const summary = await service.applyDefaultMatrix(batch.id)

    expect(summary.obligationsToCreate).toBe(0)
    expect(summary.ruleReviewWarnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          state: 'CA',
          entityType: 'llc',
          reason: 'rules_pending_review',
        }),
      ]),
    )
  })

  it('creates state deadlines from matrix suggestions when matching practice rules are active', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_drake', presetUsed: 'drake' })
    const csv = `Client Name,State,Entity Type,Return Type
California LLC,CA,LLC,Form 1065`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        State: 'client.state',
        'Entity Type': 'client.entity_type',
        'Return Type': 'client.tax_types',
      }),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)
    const summary = await service.applyDefaultMatrix(batch.id)

    await service.apply(batch.id)

    expect(summary.ruleReviewWarnings).toEqual([])
    expect(
      state.importedObligations.some(
        (item) => item.jurisdiction === 'CA' && item.clientFilingProfileId !== null,
      ),
    ).toBe(true)
    expect(
      state.importedFilingProfiles.some(
        (profile) =>
          profile.state === 'CA' && profile.taxTypesJson?.includes('ca_llc_franchise_min_800'),
      ),
    ).toBe(true)
    expect(
      state.importedObligations.some(
        (item) => item.jurisdiction === 'FED' && item.taxType === 'federal_1065',
      ),
    ).toBe(true)
  })

  it('creates active NY individual state and federal counterparts without duplicating federal', async () => {
    const activeRuleRows = [
      ...activePracticeRuleRows(FIRM),
      concreteStatePracticeRuleRow({
        firmId: FIRM,
        ruleId: 'ny.individual_income_return.candidate.2026',
        taxType: 'ny_it201',
        dueDate: '2026-04-15',
      }),
    ]
    const { repo, state } = buildScopedRepo(FIRM, { activeRuleRows })
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_drake', presetUsed: 'drake' })
    const csv = `Client Name,State,Entity Type,Return Type
NY Individual,NY,Individual,Form 1040`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        State: 'client.state',
        'Entity Type': 'client.entity_type',
        'Return Type': 'client.tax_types',
      }),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)

    const summary = await service.applyDefaultMatrix(batch.id)
    const result = await service.apply(batch.id)

    const client = state.importedClients.find((item) => item.name === 'NY Individual')
    const clientObligations = state.importedObligations.filter(
      (item) => item.clientId === client?.id,
    )
    const federal1040Obligations = clientObligations.filter(
      (item) => item.jurisdiction === 'FED' && item.taxType === 'federal_1040',
    )
    expect(result.obligationCount).toBe(summary.obligationsToCreate)
    expect(
      clientObligations.some((item) => item.jurisdiction === 'NY' && item.taxType === 'ny_it201'),
    ).toBe(true)
    expect(federal1040Obligations).toHaveLength(1)
  })

  it('creates active CA S corporation state and federal return deadlines', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_drake', presetUsed: 'drake' })
    const csv = `Client Name,State,Entity Type,Return Type
California S Corp,CA,S-Corp,Form 1120-S`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        State: 'client.state',
        'Entity Type': 'client.entity_type',
        'Return Type': 'client.tax_types',
      }),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)

    const summary = await service.applyDefaultMatrix(batch.id)
    const result = await service.apply(batch.id)

    const client = state.importedClients.find((item) => item.name === 'California S Corp')
    expect(
      summary.ruleReviewWarnings.some((warning) => warning.taxTypes.includes('ca_100s_franchise')),
    ).toBe(false)
    expect(result.obligationCount).toBe(2)
    expect(
      state.importedObligations.some(
        (item) =>
          item.clientId === client?.id && item.jurisdiction === 'CA' && item.taxType === 'ca_100s',
      ),
    ).toBe(true)
    expect(
      state.importedObligations.some(
        (item) =>
          item.clientId === client?.id &&
          item.jurisdiction === 'FED' &&
          item.taxType === 'federal_1120s',
      ),
    ).toBe(true)
  })

  it('generates one federal deadline across multiple filing states', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_drake', presetUsed: 'drake' })
    const csv = `Client Name,State,Filing States,Entity Type,Return Type
Multi State S Corp,CA,CA; NY,S-Corp,Form 1120-S`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        State: 'client.state',
        'Filing States': 'client.filing_states',
        'Entity Type': 'client.entity_type',
        'Return Type': 'client.tax_types',
      }),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)

    const summary = await service.applyDefaultMatrix(batch.id)
    const result = await service.apply(batch.id)

    const client = state.importedClients.find((item) => item.name === 'Multi State S Corp')
    const clientObligations = state.importedObligations.filter(
      (item) => item.clientId === client?.id,
    )
    const federalReturnObligations = clientObligations.filter(
      (item) => item.jurisdiction === 'FED' && item.taxType === 'federal_1120s',
    )

    expect(result.obligationCount).toBe(summary.obligationsToCreate)
    expect(federalReturnObligations).toHaveLength(1)
    expect(
      clientObligations.some((item) => item.jurisdiction === 'CA' && item.taxType === 'ca_100s'),
    ).toBe(true)
    expect(
      clientObligations.some((item) => item.jurisdiction === 'NY' && item.taxType === 'ny_ct3s'),
    ).toBe(true)
  })

  it('honors disabled matrix selections in dryRun and apply', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_taxdome', presetUsed: 'taxdome' })
    const csv = `Client Name,Tax ID,State,Entity Type,Email\nAcme LLC,12-3456789,CA,LLC,acme@example.com`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, SAMPLE_CONFIRMED_MAPPINGS),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)

    const summary = await service.applyDefaultMatrix(batch.id, [
      { entityType: 'llc', state: 'CA', enabled: false },
    ])
    expect(summary.clientsToCreate).toBe(1)
    expect(summary.obligationsToCreate).toBe(0)

    const result = await service.apply(batch.id)
    expect(result.clientCount).toBe(1)
    expect(result.obligationCount).toBe(0)
    expect(state.importedClients).toHaveLength(1)
    expect(state.importedObligations).toHaveLength(0)
    expect(state.aiRuns.some((run) => run.kind === 'migration_normalize')).toBe(true)
    expect(
      state.evidences
        .filter((e) => e.sourceType === 'ai_normalizer')
        .some((e) => e.aiOutputId?.startsWith('ai-output-')),
    ).toBe(true)
  })

  it('keeps explicit federal deadlines when the matching state matrix cell is disabled', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_drake', presetUsed: 'drake' })
    const csv = `Client Name,State,Entity Type,Tax Types
California S Corp,CA,S-Corp,federal_1120s`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        State: 'client.state',
        'Entity Type': 'client.entity_type',
        'Tax Types': 'client.tax_types',
      }),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)

    const summary = await service.applyDefaultMatrix(batch.id, [
      { entityType: 's_corp', state: 'CA', enabled: false },
    ])
    const result = await service.apply(batch.id)

    expect(summary.obligationsToCreate).toBe(1)
    expect(result.obligationCount).toBe(1)
    expect(
      state.importedObligations.some(
        (item) => item.jurisdiction === 'FED' && item.taxType === 'federal_1120s',
      ),
    ).toBe(true)
    expect(
      state.importedObligations.some(
        (item) => item.jurisdiction === 'CA' && item.taxType === 'ca_100s',
      ),
    ).toBe(false)
  })
})

describe('MigrationService.apply', () => {
  it('commits clients, obligations, verified rule evidence, audits, and batch status', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_taxdome', presetUsed: 'taxdome' })
    await service.uploadRaw({
      batchId: batch.id,
      kind: 'paste',
      text: SAMPLE_CSV,
    })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, SAMPLE_CONFIRMED_MAPPINGS),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)
    await service.applyDefaultMatrix(batch.id)

    const result = await service.apply(batch.id)
    const appliedBatch = state.batches.get(batch.id)

    expect(result.clientCount).toBe(3)
    expect(result.obligationCount).toBeGreaterThan(0)
    expect(state.importedClients).toHaveLength(3)
    expect(state.importedObligations.length).toBeGreaterThan(0)
    expect(state.evidences.some((item) => item.sourceType === 'verified_rule')).toBe(true)
    expect(state.audits.some((item) => item.action === 'migration.imported')).toBe(true)
    expect(appliedBatch?.status).toBe('applied')
    expect(appliedBatch?.successCount).toBe(3)
  })

  it('uses calendar fallback unless imported client facts explicitly mark a fiscal year', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'paste' })
    await service.uploadRaw({
      batchId: batch.id,
      kind: 'paste',
      text: `Client Name,State,Entity Type,Tax Types,Tax Year Type,Fiscal Year End
Calendar S Corp,CA,S-Corp,federal_1120s,,
Fiscal S Corp,CA,S-Corp,federal_1120s,Fiscal,6/30`,
    })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        State: 'client.state',
        'Entity Type': 'client.entity_type',
        'Tax Types': 'client.tax_types',
        'Tax Year Type': 'client.tax_year_type',
        'Fiscal Year End': 'client.fiscal_year_end',
      }),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)

    await service.apply(batch.id)

    const calendarClient = state.importedClients.find((client) => client.name === 'Calendar S Corp')
    const fiscalClient = state.importedClients.find((client) => client.name === 'Fiscal S Corp')
    expect(calendarClient).toMatchObject({
      taxYearType: 'calendar',
      fiscalYearEndMonth: null,
      fiscalYearEndDay: null,
    })
    expect(fiscalClient).toMatchObject({
      taxYearType: 'fiscal',
      fiscalYearEndMonth: 6,
      fiscalYearEndDay: 30,
    })

    const calendarObligation = state.importedObligations.find(
      (obligation) =>
        obligation.clientId === calendarClient?.id && obligation.taxType === 'ca_100s',
    )
    const fiscalObligation = state.importedObligations.find(
      (obligation) => obligation.clientId === fiscalClient?.id && obligation.taxType === 'ca_100s',
    )
    expect(calendarObligation).toMatchObject({
      jurisdiction: 'CA',
      baseDueDate: new Date('2026-03-16T00:00:00.000Z'),
      taxPeriodStart: new Date('2025-01-01T00:00:00.000Z'),
      taxPeriodEnd: new Date('2025-12-31T00:00:00.000Z'),
      status: 'pending',
    })
    expect(fiscalObligation).toMatchObject({
      jurisdiction: 'CA',
      baseDueDate: new Date('2026-09-15T00:00:00.000Z'),
      taxPeriodStart: new Date('2025-07-01T00:00:00.000Z'),
      taxPeriodEnd: new Date('2026-06-30T00:00:00.000Z'),
      status: 'pending',
    })
  })

  it('rolls imported annual deadlines before monitoring start into the next tax year', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({
      scoped: repo,
      ai,
      userId: USER,
      monitoringStartDate: '2026-05-29',
    })

    const batch = await service.createBatch({ source: 'paste' })
    await service.uploadRaw({
      batchId: batch.id,
      kind: 'paste',
      text: `Client Name,State,Entity Type,Tax Types,Tax Year Type,Fiscal Year End
Calendar S Corp,CA,S-Corp,federal_1120s,,
Fiscal S Corp,CA,S-Corp,federal_1120s,Fiscal,6/30`,
    })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        State: 'client.state',
        'Entity Type': 'client.entity_type',
        'Tax Types': 'client.tax_types',
        'Tax Year Type': 'client.tax_year_type',
        'Fiscal Year End': 'client.fiscal_year_end',
      }),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)

    const summary = await service.applyDefaultMatrix(batch.id)
    const result = await service.apply(batch.id)

    const calendarClient = state.importedClients.find((client) => client.name === 'Calendar S Corp')
    const fiscalClient = state.importedClients.find((client) => client.name === 'Fiscal S Corp')
    const calendarObligations = state.importedObligations.filter(
      (obligation) => obligation.clientId === calendarClient?.id,
    )
    const fiscalObligations = state.importedObligations.filter(
      (obligation) => obligation.clientId === fiscalClient?.id,
    )

    expect(summary.historicalDeadlinesSkipped).toBe(0)
    expect(summary.rolledForwardDeadlines).toBe(2)
    expect(summary.obligationsToCreate).toBe(4)
    expect(result.obligationCount).toBe(4)
    expect(calendarObligations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taxType: 'federal_1120s',
          taxYear: 2026,
          baseDueDate: new Date('2027-03-15T00:00:00.000Z'),
        }),
        expect.objectContaining({
          taxType: 'ca_100s',
          taxYear: 2026,
          baseDueDate: new Date('2027-03-15T00:00:00.000Z'),
        }),
      ]),
    )
    expect(fiscalObligations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taxType: 'federal_1120s',
          baseDueDate: new Date('2026-09-15T00:00:00.000Z'),
        }),
        expect.objectContaining({
          taxType: 'ca_100s',
          baseDueDate: new Date('2026-09-15T00:00:00.000Z'),
        }),
      ]),
    )
  })

  it('rolls imported fixed-date individual deadlines to the next monitoring year', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({
      scoped: repo,
      ai,
      userId: USER,
      monitoringStartDate: '2026-06-01',
    })

    const batch = await service.createBatch({ source: 'paste' })
    await service.uploadRaw({
      batchId: batch.id,
      kind: 'paste',
      text: `Client Name,State,Entity Type,Tax Types
Fixed Individual,CA,Individual,federal_1040`,
    })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        State: 'client.state',
        'Entity Type': 'client.entity_type',
        'Tax Types': 'client.tax_types',
      }),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)
    await service.applyDefaultMatrix(batch.id, [
      { entityType: 'individual', state: 'CA', enabled: false },
    ])

    const summary = await service.dryRun(batch.id)
    await service.apply(batch.id)

    expect(summary.historicalDeadlinesSkipped).toBe(0)
    expect(summary.rolledForwardDeadlines).toBe(1)
    expect(summary.obligationsToCreate).toBe(1)
    expect(state.importedObligations).toEqual([
      expect.objectContaining({
        taxType: 'federal_1040',
        taxYear: 2026,
        baseDueDate: new Date('2027-04-15T00:00:00.000Z'),
      }),
    ])
  })

  it('keeps future period-table deadlines and skips only past periods during import', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({
      scoped: repo,
      ai,
      userId: USER,
      monitoringStartDate: '2026-09-15',
    })

    const batch = await service.createBatch({ source: 'paste' })
    await service.uploadRaw({
      batchId: batch.id,
      kind: 'paste',
      text: `Client Name,State,Entity Type,Tax Types
Estimated Tax Client,CA,Individual,federal_1040_estimated_tax`,
    })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        State: 'client.state',
        'Entity Type': 'client.entity_type',
        'Tax Types': 'client.tax_types',
      }),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)
    await service.applyDefaultMatrix(batch.id, [
      { entityType: 'individual', state: 'CA', enabled: false },
    ])

    const summary = await service.dryRun(batch.id)
    await service.apply(batch.id)

    expect(summary.historicalDeadlinesSkipped).toBe(2)
    expect(summary.rolledForwardDeadlines).toBe(0)
    expect(summary.obligationsToCreate).toBe(2)
    expect(state.importedObligations).toEqual([
      expect.objectContaining({
        taxType: 'federal_1040_estimated_tax',
        baseDueDate: new Date('2026-09-15T00:00:00.000Z'),
      }),
      expect.objectContaining({
        taxType: 'federal_1040_estimated_tax',
        baseDueDate: new Date('2027-01-15T00:00:00.000Z'),
      }),
    ])
  })

  it('creates the fiscal client but skips deadline creation when fiscal year end is missing', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'paste' })
    await service.uploadRaw({
      batchId: batch.id,
      kind: 'paste',
      text: `Client Name,State,Entity Type,Tax Types,Tax Year Type
Fiscal Missing End,CA,S-Corp,federal_1120s,Fiscal`,
    })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, {
        'Client Name': 'client.name',
        State: 'client.state',
        'Entity Type': 'client.entity_type',
        'Tax Types': 'client.tax_types',
        'Tax Year Type': 'client.tax_year_type',
      }),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)

    const result = await service.apply(batch.id)

    expect(result.clientCount).toBe(1)
    expect(result.obligationCount).toBe(0)
    expect(state.importedClients[0]).toMatchObject({
      name: 'Fiscal Missing End',
      taxYearType: 'fiscal',
      fiscalYearEndMonth: null,
      fiscalYearEndDay: null,
    })
    expect(state.importedObligations).toHaveLength(0)
  })

  it('skips empty-name rows without blocking valid rows', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_taxdome', presetUsed: 'taxdome' })
    await service.uploadRaw({
      batchId: batch.id,
      kind: 'paste',
      text: `Client Name,Tax ID,State,Entity Type,Email
Acme LLC,12-3456789,CA,LLC,acme@example.com
,98-7654321,NY,S-Corp,blank@example.com`,
    })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, SAMPLE_CONFIRMED_MAPPINGS),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)
    await service.applyDefaultMatrix(batch.id)

    const result = await service.apply(batch.id)

    expect(result.clientCount).toBe(1)
    expect(result.skippedCount).toBe(1)
    expect(state.importedClients).toHaveLength(1)
  })

  it('rejects re-applying an already applied batch', async () => {
    const { repo } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_taxdome', presetUsed: 'taxdome' })
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: SAMPLE_CSV })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, SAMPLE_CONFIRMED_MAPPINGS),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)
    await service.applyDefaultMatrix(batch.id)
    await service.apply(batch.id)

    await expect(service.apply(batch.id)).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})

describe('MigrationService.revert', () => {
  it('removes imported clients and obligations, writes audit/evidence, and marks the batch reverted', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_taxdome', presetUsed: 'taxdome' })
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: SAMPLE_CSV })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, SAMPLE_CONFIRMED_MAPPINGS),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)
    await service.applyDefaultMatrix(batch.id)
    await service.apply(batch.id)

    const result = await service.revert(batch.id)

    expect(result.revertedAt).toEqual(expect.any(String))
    expect(state.importedClients).toHaveLength(0)
    expect(state.importedObligations).toHaveLength(0)
    expect(state.audits.some((item) => item.action === 'migration.reverted')).toBe(true)
    expect(state.evidences.some((item) => item.sourceType === 'migration_revert')).toBe(true)
    expect(state.batches.get(batch.id)?.status).toBe('reverted')
  })

  it('rejects a revert after the 24-hour window expires', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_taxdome', presetUsed: 'taxdome' })
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: SAMPLE_CSV })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, SAMPLE_CONFIRMED_MAPPINGS),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)
    await service.applyDefaultMatrix(batch.id)
    await service.apply(batch.id)
    const applied = state.batches.get(batch.id)!
    state.batches.set(batch.id, {
      ...applied,
      revertExpiresAt: new Date(Date.now() - 1_000),
    })

    await expect(service.revert(batch.id)).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('rejects reverting a draft batch', async () => {
    const { repo } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'paste' })

    await expect(service.revert(batch.id)).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })
})

describe('MigrationService.singleUndo', () => {
  it('removes one imported client without reverting the whole batch', async () => {
    const { repo, state } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_taxdome', presetUsed: 'taxdome' })
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: SAMPLE_CSV })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, SAMPLE_CONFIRMED_MAPPINGS),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)
    await service.applyDefaultMatrix(batch.id)
    await service.apply(batch.id)
    const targetClient = state.importedClients[0]!

    const result = await service.singleUndo(batch.id, targetClient.id)

    expect(result.revertedAt).toEqual(expect.any(String))
    expect(state.importedClients.some((item) => item.id === targetClient.id)).toBe(false)
    expect(state.importedClients).toHaveLength(2)
    expect(state.batches.get(batch.id)?.status).toBe('applied')
    expect(state.audits.some((item) => item.action === 'migration.single_undo')).toBe(true)
  })

  it('rejects single undo for a client outside the batch', async () => {
    const { repo } = buildScopedRepo(FIRM)
    const ai = buildAi()
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'preset_taxdome', presetUsed: 'taxdome' })
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: SAMPLE_CSV })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(
      batch.id,
      overrideFixtureMappings(mapper.mappings, SAMPLE_CONFIRMED_MAPPINGS),
    )
    const normalizer = await service.runNormalizer(batch.id)
    await service.confirmNormalization(batch.id, normalizer.normalizations)
    await service.applyDefaultMatrix(batch.id)
    await service.apply(batch.id)

    await expect(service.singleUndo(batch.id, 'client-not-in-batch')).rejects.toThrow(
      'not found in migration batch',
    )
  })
})

describe('MigrationService.listErrors', () => {
  it('returns mapping-stage errors when EIN/EMPTY_NAME rows are persisted', async () => {
    const { repo } = buildScopedRepo(FIRM)
    const ai = buildAi({
      mappings: [
        { source: 'Client Name', target: 'client.name', confidence: 0.99 },
        { source: 'Tax ID', target: 'client.ein', confidence: 0.96 },
      ],
    })
    const service = new MigrationService({ scoped: repo, ai, userId: USER })

    const batch = await service.createBatch({ source: 'paste' })
    // Two rows: one bad EIN, one empty name. Mapper persists deterministic errors.
    const csv = `Client Name,Tax ID\nAcme LLC,not-an-ein\n,99-9999999`
    await service.uploadRaw({ batchId: batch.id, kind: 'paste', text: csv })
    const mapper = await service.runMapper(batch.id)
    await service.confirmMapping(batch.id, mapper.mappings)

    const all = await service.listErrors(batch.id, 'all')
    expect(all.length).toBeGreaterThanOrEqual(2)

    const mapping = await service.listErrors(batch.id, 'mapping')
    expect(
      mapping.every((e) => e.errorCode === 'EIN_INVALID' || e.errorCode === 'EMPTY_NAME'),
    ).toBe(true)

    const normalize = await service.listErrors(batch.id, 'normalize')
    expect(normalize.every((e) => !['EIN_INVALID', 'EMPTY_NAME'].includes(e.errorCode))).toBe(true)
  })

  it('refuses cross-firm batch access with NOT_FOUND', async () => {
    const a = buildScopedRepo(FIRM)
    const aiA = buildAi()
    const serviceA = new MigrationService({ scoped: a.repo, ai: aiA, userId: USER })
    const batch = await serviceA.createBatch({ source: 'paste' })

    const b = buildScopedRepo(OTHER_FIRM)
    const aiB = buildAi()
    const serviceB = new MigrationService({ scoped: b.repo, ai: aiB, userId: 'user-2' })

    await expect(serviceB.listErrors(batch.id, 'all')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
