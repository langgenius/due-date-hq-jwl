import { and, asc, eq, gte, inArray, isNotNull, isNull, lt } from 'drizzle-orm'
import type { ObligationReadiness, ObligationStatus } from '@duedatehq/core/obligation-workflow'
import type { Db } from '../client'
import { client, clientFilingProfile } from '../schema/clients'
import {
  obligationInstance,
  type ExposureStatus,
  type ObligationInstance,
  type ObligationEfileState,
  type ObligationExtensionState,
  type ObligationPaymentState,
  type ObligationPrepStage,
  type ObligationRecurrence,
  type ObligationReviewStage,
  type ObligationRiskLevel,
  type TaxPeriodKind,
  type TaxPeriodSource,
  type ObligationType,
} from '../schema/obligations'
import { listActiveOverlayInternalDeadlines } from './overlay'
import { loadDerivedReadinessByObligation } from './readiness-derived'

const COLS_PER_OI_ROW = 50
const OI_BATCH_SIZE = Math.floor(100 / COLS_PER_OI_ROW) // = 2
const CLIENT_ASSERT_BATCH_SIZE = 90
const OI_LOOKUP_IDS_PER_BATCH = 90
const OI_UPDATE_IDS_PER_BATCH = 90

export interface ObligationCreateInput {
  id?: string
  clientId: string
  clientFilingProfileId?: string | null
  taxType: string
  taxYear?: number | null
  taxPeriodStart?: Date | null
  taxPeriodEnd?: Date | null
  taxPeriodKind?: TaxPeriodKind
  taxPeriodSource?: TaxPeriodSource
  taxPeriodReviewReason?: string | null
  ruleId?: string | null
  ruleVersion?: number | null
  rulePeriod?: string | null
  generationSource?: 'migration' | 'manual' | 'annual_rollover' | 'pulse' | null
  jurisdiction?: string | null
  obligationType?: ObligationType
  formName?: string | null
  authority?: string | null
  filingDueDate?: Date | null
  paymentDueDate?: Date | null
  sourceEvidenceJson?: unknown
  recurrence?: ObligationRecurrence
  riskLevel?: ObligationRiskLevel
  baseDueDate: Date
  currentDueDate?: Date
  status?: ObligationStatus
  prepStage?: ObligationPrepStage
  reviewStage?: ObligationReviewStage
  extensionState?: ObligationExtensionState
  extensionFormName?: string | null
  paymentState?: ObligationPaymentState
  efileState?: ObligationEfileState
  efileAuthorizationForm?: string | null
  migrationBatchId?: string | null
  estimatedTaxDueCents?: number | null
  estimatedExposureCents?: number | null
  exposureStatus?: ExposureStatus
  penaltyFactsJson?: unknown
  penaltyFactsVersion?: string | null
  penaltyBreakdownJson?: unknown
  penaltyFormulaVersion?: string | null
  missingPenaltyFactsJson?: unknown
  penaltySourceRefsJson?: unknown
  penaltyFormulaLabel?: string | null
  exposureCalculatedAt?: Date | null
}

function normalizeJurisdiction(value: string | null | undefined): string | null {
  const jurisdiction = value?.trim().toUpperCase() ?? ''
  if (jurisdiction === 'FED') return jurisdiction
  return /^[A-Z]{2}$/.test(jurisdiction) ? jurisdiction : null
}

function isFederalTaxType(taxType: string): boolean {
  return taxType.trim().toLowerCase().startsWith('federal')
}

export function makeObligationsRepo(db: Db, firmId: string) {
  async function hydrateObligationRows<T extends ObligationInstance>(
    rows: T[],
  ): Promise<Array<T & { readiness: ObligationReadiness }>> {
    const statuses = new Map(rows.map((row) => [row.id, row.status]))
    const readinessById = await loadDerivedReadinessByObligation(db, firmId, statuses)
    return rows.map((row) => ({
      ...row,
      readiness: readinessById.get(row.id) ?? 'ready',
    }))
  }

  async function applyOverlayDueDates<T extends { id: string; currentDueDate: Date }>(
    rows: T[],
  ): Promise<T[]> {
    const overlayDueDates = await listActiveOverlayInternalDeadlines(
      db,
      firmId,
      rows.map((row) => row.id),
    )
    return rows.map((row) => ({
      ...row,
      currentDueDate: overlayDueDates.get(row.id) ?? row.currentDueDate,
    }))
  }

  async function loadClientsInFirm(
    clientIds: string[],
  ): Promise<Map<string, { id: string; state: string | null }>> {
    const uniqueIds = Array.from(new Set(clientIds))
    if (uniqueIds.length === 0) return new Map()

    const checks = []
    for (let i = 0; i < uniqueIds.length; i += CLIENT_ASSERT_BATCH_SIZE) {
      const chunk = uniqueIds.slice(i, i + CLIENT_ASSERT_BATCH_SIZE)
      checks.push(
        db
          .select({ id: client.id, state: client.state })
          .from(client)
          .where(and(eq(client.firmId, firmId), inArray(client.id, chunk))),
      )
    }

    const resultSets = await Promise.all(checks)
    const found = new Map<string, { id: string; state: string | null }>()
    for (const rows of resultSets) {
      for (const row of rows) found.set(row.id, row)
    }

    const missing = uniqueIds.filter((id) => !found.has(id))
    if (missing.length > 0) {
      throw new Error(
        `Cannot create obligations for clients outside the current firm: ${missing.join(', ')}`,
      )
    }
    return found
  }

  async function loadProfilesInFirm(
    inputs: readonly ObligationCreateInput[],
  ): Promise<Map<string, { id: string; clientId: string; state: string }>> {
    const expectedClientByProfile = new Map<string, string>()
    for (const input of inputs) {
      if (!input.clientFilingProfileId) continue
      const current = expectedClientByProfile.get(input.clientFilingProfileId)
      if (current && current !== input.clientId) {
        throw new Error('Cannot attach one filing profile to obligations for multiple clients.')
      }
      expectedClientByProfile.set(input.clientFilingProfileId, input.clientId)
    }

    const profileIds = [...expectedClientByProfile.keys()]
    if (profileIds.length === 0) return new Map()

    const reads = []
    for (let i = 0; i < profileIds.length; i += OI_LOOKUP_IDS_PER_BATCH) {
      const chunk = profileIds.slice(i, i + OI_LOOKUP_IDS_PER_BATCH)
      reads.push(
        db
          .select({
            id: clientFilingProfile.id,
            clientId: clientFilingProfile.clientId,
            state: clientFilingProfile.state,
          })
          .from(clientFilingProfile)
          .where(
            and(
              eq(clientFilingProfile.firmId, firmId),
              inArray(clientFilingProfile.id, chunk),
              isNull(clientFilingProfile.archivedAt),
            ),
          ),
      )
    }

    const found = new Map((await Promise.all(reads)).flat().map((row) => [row.id, row]))
    const invalid = profileIds.filter((id) => {
      const row = found.get(id)
      return !row || row.clientId !== expectedClientByProfile.get(id)
    })
    if (invalid.length > 0) {
      throw new Error(
        `Cannot create obligations for filing profiles outside the current firm/client: ${invalid.join(', ')}`,
      )
    }
    return found
  }

  function resolveJurisdiction(
    input: ObligationCreateInput,
    opts: {
      clientsById: Map<string, { id: string; state: string | null }>
      profilesById: Map<string, { id: string; clientId: string; state: string }>
    },
  ): string | null {
    return (
      normalizeJurisdiction(input.jurisdiction) ??
      (input.clientFilingProfileId
        ? opts.profilesById.get(input.clientFilingProfileId)?.state
        : null) ??
      (isFederalTaxType(input.taxType) ? 'FED' : null) ??
      normalizeJurisdiction(opts.clientsById.get(input.clientId)?.state)
    )
  }

  return {
    firmId,

    async createBatch(inputs: ObligationCreateInput[]): Promise<{ ids: string[] }> {
      if (inputs.length === 0) return { ids: [] }
      const [clientsById, profilesById] = await Promise.all([
        loadClientsInFirm(inputs.map((input) => input.clientId)),
        loadProfilesInFirm(inputs),
      ])
      const rows = inputs.map((i) => {
        const taxAuthorityFilingDueDate = i.filingDueDate ?? i.baseDueDate
        const taxAuthorityPaymentDueDate = i.paymentDueDate ?? i.baseDueDate
        return {
          id: i.id ?? crypto.randomUUID(),
          firmId,
          clientId: i.clientId,
          clientFilingProfileId: i.clientFilingProfileId ?? null,
          taxType: i.taxType,
          taxYear: i.taxYear ?? null,
          taxPeriodStart: i.taxPeriodStart ?? null,
          taxPeriodEnd: i.taxPeriodEnd ?? null,
          taxPeriodKind: i.taxPeriodKind ?? 'unknown',
          taxPeriodSource: i.taxPeriodSource ?? 'unknown',
          taxPeriodReviewReason: i.taxPeriodReviewReason ?? null,
          ruleId: i.ruleId ?? null,
          ruleVersion: i.ruleVersion ?? null,
          rulePeriod: i.rulePeriod ?? null,
          generationSource: i.generationSource ?? null,
          jurisdiction: resolveJurisdiction(i, { clientsById, profilesById }),
          obligationType: i.obligationType ?? 'filing',
          formName: i.formName ?? null,
          authority: i.authority ?? null,
          filingDueDate: taxAuthorityFilingDueDate,
          paymentDueDate: taxAuthorityPaymentDueDate,
          sourceEvidenceJson: i.sourceEvidenceJson ?? null,
          recurrence: i.recurrence ?? 'once',
          riskLevel: i.riskLevel ?? 'low',
          baseDueDate: i.baseDueDate,
          currentDueDate: i.currentDueDate ?? i.baseDueDate,
          status: i.status ?? ('pending' as const),
          prepStage: i.prepStage ?? 'not_started',
          reviewStage: i.reviewStage ?? 'not_required',
          extensionState: i.extensionState ?? 'not_started',
          extensionFormName: i.extensionFormName ?? null,
          paymentState: i.paymentState ?? 'not_applicable',
          efileState: i.efileState ?? 'not_applicable',
          efileAuthorizationForm: i.efileAuthorizationForm ?? null,
          migrationBatchId: i.migrationBatchId ?? null,
          estimatedTaxDueCents: i.estimatedTaxDueCents ?? null,
          estimatedExposureCents: i.estimatedExposureCents ?? null,
          exposureStatus: i.exposureStatus ?? ('needs_input' as const),
          penaltyFactsJson: i.penaltyFactsJson ?? null,
          penaltyFactsVersion: i.penaltyFactsVersion ?? null,
          penaltyBreakdownJson: i.penaltyBreakdownJson ?? null,
          penaltyFormulaVersion: i.penaltyFormulaVersion ?? null,
          missingPenaltyFactsJson: i.missingPenaltyFactsJson ?? null,
          penaltySourceRefsJson: i.penaltySourceRefsJson ?? null,
          penaltyFormulaLabel: i.penaltyFormulaLabel ?? null,
          exposureCalculatedAt: i.exposureCalculatedAt ?? null,
        }
      })
      const writes = []
      for (let i = 0; i < rows.length; i += OI_BATCH_SIZE) {
        writes.push(db.insert(obligationInstance).values(rows.slice(i, i + OI_BATCH_SIZE)))
      }
      await Promise.all(writes)
      return { ids: rows.map((r) => r.id) }
    },

    async findById(
      id: string,
    ): Promise<(ObligationInstance & { readiness: ObligationReadiness }) | undefined> {
      const rows = await db
        .select()
        .from(obligationInstance)
        .where(and(eq(obligationInstance.firmId, firmId), eq(obligationInstance.id, id)))
        .limit(1)
      const [row] = await hydrateObligationRows(await applyOverlayDueDates(rows))
      return row
    },

    async findManyByIds(
      ids: string[],
    ): Promise<Array<ObligationInstance & { readiness: ObligationReadiness }>> {
      if (ids.length === 0) return []
      const uniqueIds = [...new Set(ids)]
      const reads = []
      for (let i = 0; i < uniqueIds.length; i += OI_LOOKUP_IDS_PER_BATCH) {
        const chunk = uniqueIds.slice(i, i + OI_LOOKUP_IDS_PER_BATCH)
        reads.push(
          db
            .select()
            .from(obligationInstance)
            .where(
              and(eq(obligationInstance.firmId, firmId), inArray(obligationInstance.id, chunk)),
            ),
        )
      }
      const rows = await hydrateObligationRows(
        await applyOverlayDueDates((await Promise.all(reads)).flat()),
      )
      const byId = new Map(rows.map((row) => [row.id, row]))
      return uniqueIds.flatMap((id) => {
        const row = byId.get(id)
        return row ? [row] : []
      })
    },

    async listByClient(
      clientId: string,
    ): Promise<Array<ObligationInstance & { readiness: ObligationReadiness }>> {
      const rows = await db
        .select()
        .from(obligationInstance)
        .where(
          and(eq(obligationInstance.firmId, firmId), eq(obligationInstance.clientId, clientId)),
        )
        .orderBy(asc(obligationInstance.currentDueDate))
      return (await hydrateObligationRows(await applyOverlayDueDates(rows))).toSorted(
        (a, b) => a.currentDueDate.getTime() - b.currentDueDate.getTime(),
      )
    },

    async listByBatch(
      batchId: string,
    ): Promise<Array<ObligationInstance & { readiness: ObligationReadiness }>> {
      const rows = await db
        .select()
        .from(obligationInstance)
        .where(
          and(
            eq(obligationInstance.firmId, firmId),
            eq(obligationInstance.migrationBatchId, batchId),
          ),
        )
      return hydrateObligationRows(await applyOverlayDueDates(rows))
    },

    async listAnnualRolloverSeeds(input: {
      sourceFilingYear: number
      clientIds?: string[]
    }): Promise<Array<ObligationInstance & { readiness: ObligationReadiness }>> {
      const yearStart = new Date(Date.UTC(input.sourceFilingYear, 0, 1))
      const nextYearStart = new Date(Date.UTC(input.sourceFilingYear + 1, 0, 1))
      const filters = [
        eq(obligationInstance.firmId, firmId),
        inArray(obligationInstance.status, ['done', 'paid', 'extended']),
        gte(obligationInstance.baseDueDate, yearStart),
        lt(obligationInstance.baseDueDate, nextYearStart),
      ]
      const clientIds = [...new Set(input.clientIds ?? [])]
      if (clientIds.length > 0) filters.push(inArray(obligationInstance.clientId, clientIds))

      const rows = await db
        .select()
        .from(obligationInstance)
        .where(and(...filters))
        .orderBy(asc(obligationInstance.clientId), asc(obligationInstance.taxType))
      return hydrateObligationRows(rows)
    },

    async listGeneratedByClientAndTaxYears(input: {
      clientIds: string[]
      taxYears: number[]
    }): Promise<
      Array<{
        id: string
        clientId: string
        jurisdiction: string | null
        ruleId: string | null
        taxYear: number | null
        rulePeriod: string | null
      }>
    > {
      const clientIds = [...new Set(input.clientIds)]
      const taxYears = [...new Set(input.taxYears)]
      if (clientIds.length === 0 || taxYears.length === 0) return []

      const reads = []
      for (let i = 0; i < clientIds.length; i += CLIENT_ASSERT_BATCH_SIZE) {
        const chunk = clientIds.slice(i, i + CLIENT_ASSERT_BATCH_SIZE)
        reads.push(
          db
            .select({
              id: obligationInstance.id,
              clientId: obligationInstance.clientId,
              jurisdiction: obligationInstance.jurisdiction,
              ruleId: obligationInstance.ruleId,
              taxYear: obligationInstance.taxYear,
              rulePeriod: obligationInstance.rulePeriod,
            })
            .from(obligationInstance)
            .where(
              and(
                eq(obligationInstance.firmId, firmId),
                inArray(obligationInstance.clientId, chunk),
                inArray(obligationInstance.taxYear, taxYears),
                isNotNull(obligationInstance.ruleId),
              ),
            ),
        )
      }
      return (await Promise.all(reads)).flat()
    },

    /**
     * Update current_due_date. Caller is responsible for writing the
     * `obligation.due_date.updated` audit event + evidence_link in the
     * same outer transaction (Pulse apply path does this in one D1 batch).
     */
    async updateDueDate(id: string, newDate: Date): Promise<void> {
      await db
        .update(obligationInstance)
        .set({ currentDueDate: newDate })
        .where(and(eq(obligationInstance.firmId, firmId), eq(obligationInstance.id, id)))
    },

    async updateExposure(
      id: string,
      patch: {
        estimatedTaxDueCents: number | null
        estimatedExposureCents: number | null
        exposureStatus: ExposureStatus
        penaltyBreakdownJson: unknown
        penaltyFormulaVersion: string | null
        missingPenaltyFactsJson: unknown
        penaltySourceRefsJson: unknown
        penaltyFormulaLabel: string | null
        exposureCalculatedAt: Date | null
        penaltyFactsJson?: unknown
        penaltyFactsVersion?: string | null
      },
    ): Promise<void> {
      const set: typeof patch = { ...patch }
      if (patch.penaltyFactsJson === undefined) delete set.penaltyFactsJson
      if (patch.penaltyFactsVersion === undefined) delete set.penaltyFactsVersion
      await db
        .update(obligationInstance)
        .set(set)
        .where(and(eq(obligationInstance.firmId, firmId), eq(obligationInstance.id, id)))
    },

    async updateStatus(id: string, status: ObligationStatus): Promise<void> {
      await db
        .update(obligationInstance)
        .set({ status })
        .where(and(eq(obligationInstance.firmId, firmId), eq(obligationInstance.id, id)))
    },

    async updateExtensionDecision(
      id: string,
      patch: {
        decision: 'applied' | 'rejected'
        memo: string | null
        source: string | null
        internalTargetDate: Date | null
        decidedAt: Date
        decidedByUserId: string
        status?: ObligationStatus
      },
    ): Promise<void> {
      await db
        .update(obligationInstance)
        .set({
          extensionDecision: patch.decision,
          extensionMemo: patch.memo,
          extensionSource: patch.source,
          extensionExpectedDueDate: patch.internalTargetDate,
          extensionDecidedAt: patch.decidedAt,
          extensionDecidedByUserId: patch.decidedByUserId,
          extensionState: patch.decision === 'applied' ? 'filed' : 'rejected',
          ...(patch.status !== undefined ? { status: patch.status } : {}),
        })
        .where(and(eq(obligationInstance.firmId, firmId), eq(obligationInstance.id, id)))
    },

    /**
     * Lifecycle v2 (slice 2d.4) — parent→children unblock cascade.
     *
     * When `parentObligationInstanceId` transitions to `completed`,
     * find every row where `blocked_by_obligation_instance_id` points
     * at it AND status is `blocked`, and flip them:
     *   - status: 'blocked' → 'pending'  (start-of-queue, requires re-pickup)
     *   - blocked_by: → NULL              (clear the pointer)
     *
     * Returns the list of unblocked child IDs so the caller can write
     * audit entries ("Unblocked by parent #X on YYYY-MM-DD").
     *
     * Single-statement update; PDF anti-pattern #4 (K-1 dependency
     * graph). See docs/Design/obligation-lifecycle-design-brief.md.
     */
    async unblockChildrenOf(parentObligationInstanceId: string): Promise<string[]> {
      const children = await db
        .select({ id: obligationInstance.id })
        .from(obligationInstance)
        .where(
          and(
            eq(obligationInstance.firmId, firmId),
            eq(obligationInstance.blockedByObligationInstanceId, parentObligationInstanceId),
            eq(obligationInstance.status, 'blocked'),
          ),
        )
      const childIds = children.map((row) => row.id)
      if (childIds.length === 0) return []
      await db
        .update(obligationInstance)
        .set({ status: 'pending', blockedByObligationInstanceId: null })
        .where(and(eq(obligationInstance.firmId, firmId), inArray(obligationInstance.id, childIds)))
      return childIds
    },

    async updateStatusMany(ids: string[], status: ObligationStatus): Promise<void> {
      if (ids.length === 0) return
      const uniqueIds = [...new Set(ids)]
      const writes = []
      for (let i = 0; i < uniqueIds.length; i += OI_UPDATE_IDS_PER_BATCH) {
        const chunk = uniqueIds.slice(i, i + OI_UPDATE_IDS_PER_BATCH)
        writes.push(
          db
            .update(obligationInstance)
            .set({ status })
            .where(
              and(eq(obligationInstance.firmId, firmId), inArray(obligationInstance.id, chunk)),
            ),
        )
      }
      await Promise.all(writes)
    },

    /**
     * 24h revert helper — deletes every obligation row owned by this batch.
     * ON DELETE CASCADE at the client FK takes care of child obligations
     * when the client itself is deleted, but migration revert wants to
     * delete obligations explicitly so clients are left in place if they
     * were manually created before the batch (edge case — batch clients
     * are created exclusively by Migration, so this is defensive).
     */
    async deleteByBatch(batchId: string): Promise<number> {
      const toDelete = await db
        .select({ id: obligationInstance.id })
        .from(obligationInstance)
        .where(
          and(
            eq(obligationInstance.firmId, firmId),
            eq(obligationInstance.migrationBatchId, batchId),
          ),
        )
      if (toDelete.length === 0) return 0
      const ids = toDelete.map((r) => r.id)
      await db
        .delete(obligationInstance)
        .where(and(eq(obligationInstance.firmId, firmId), inArray(obligationInstance.id, ids)))
      return ids.length
    },
  }
}

export type ObligationsRepo = ReturnType<typeof makeObligationsRepo>
