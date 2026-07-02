import { and, count, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import type { Db } from '../client'
import {
  client,
  type Client,
  type ClientEntityType,
  type ClientLegalEntity,
  type ClientTaxClassification,
} from '../schema/clients'

/**
 * ClientsRepo — tenant-scoped CRUD for `client` rows.
 * HARD INVARIANT: every query below carries `WHERE firm_id = :firmId`.
 * Procedures never call this constructor directly; they call
 * `scoped(db, firmId).clients` (packages/db/src/scoped.ts).
 *
 * D1 100-param budget: `client` inserts 37 cols -> 2 rows per batch INSERT.
 */

const COLS_PER_CLIENT_ROW = 37
const CLIENT_BATCH_SIZE = Math.floor(100 / COLS_PER_CLIENT_ROW) // = 2
const CLIENT_LOOKUP_IDS_PER_BATCH = 99
const CLIENT_UPDATE_IDS_PER_BATCH = 90

export interface ClientCreateInput {
  id?: string
  name: string
  ein?: string | null
  state?: string | null
  county?: string | null
  entityType: ClientEntityType
  legalEntity?: ClientLegalEntity | null
  taxClassification?: ClientTaxClassification | null
  taxYearType?: 'calendar' | 'fiscal'
  fiscalYearEndMonth?: number | null
  fiscalYearEndDay?: number | null
  externalClientId?: string | null
  addressLine1?: string | null
  city?: string | null
  postalCode?: string | null
  primaryPhone?: string | null
  sourceStatus?: string | null
  ownerCount?: number | null
  hasForeignAccounts?: boolean
  hasPayroll?: boolean
  hasSalesTax?: boolean
  has1099Vendors?: boolean
  hasK1Activity?: boolean
  primaryContactName?: string | null
  primaryContactEmail?: string | null
  email?: string | null
  notes?: string | null
  assigneeId?: string | null
  assigneeName?: string | null
  importanceWeight?: number
  lateFilingCountLast12mo?: number
  estimatedTaxLiabilityCents?: number | null
  estimatedTaxLiabilitySource?: 'manual' | 'imported' | 'demo_seed' | null
  equityOwnerCount?: number | null
  migrationBatchId?: string | null
  isSample?: boolean
}

export function makeClientsRepo(db: Db, firmId: string) {
  return {
    firmId,

    async create(input: ClientCreateInput): Promise<{ id: string }> {
      const id = input.id ?? crypto.randomUUID()
      await db.insert(client).values({
        id,
        firmId,
        name: input.name,
        ein: input.ein ?? null,
        state: input.state ?? null,
        county: input.county ?? null,
        entityType: input.entityType,
        legalEntity: input.legalEntity ?? null,
        taxClassification: input.taxClassification ?? 'unknown',
        taxYearType: input.taxYearType ?? 'calendar',
        fiscalYearEndMonth: input.fiscalYearEndMonth ?? null,
        fiscalYearEndDay: input.fiscalYearEndDay ?? null,
        externalClientId: input.externalClientId ?? null,
        addressLine1: input.addressLine1 ?? null,
        city: input.city ?? null,
        postalCode: input.postalCode ?? null,
        primaryPhone: input.primaryPhone ?? null,
        sourceStatus: input.sourceStatus ?? null,
        ownerCount: input.ownerCount ?? null,
        hasForeignAccounts: input.hasForeignAccounts ?? false,
        hasPayroll: input.hasPayroll ?? false,
        hasSalesTax: input.hasSalesTax ?? false,
        has1099Vendors: input.has1099Vendors ?? false,
        hasK1Activity: input.hasK1Activity ?? false,
        primaryContactName: input.primaryContactName ?? null,
        primaryContactEmail: input.primaryContactEmail ?? null,
        email: input.email ?? null,
        notes: input.notes ?? null,
        assigneeId: input.assigneeId ?? null,
        assigneeName: input.assigneeName ?? null,
        importanceWeight: input.importanceWeight ?? 2,
        lateFilingCountLast12mo: input.lateFilingCountLast12mo ?? 0,
        estimatedTaxLiabilityCents: input.estimatedTaxLiabilityCents ?? null,
        estimatedTaxLiabilitySource: input.estimatedTaxLiabilitySource ?? null,
        equityOwnerCount: input.equityOwnerCount ?? null,
        migrationBatchId: input.migrationBatchId ?? null,
        isSample: input.isSample ?? false,
      })
      return { id }
    },

    async createBatch(inputs: ClientCreateInput[]): Promise<{ ids: string[] }> {
      if (inputs.length === 0) return { ids: [] }
      const rows = inputs.map((i) => ({
        id: i.id ?? crypto.randomUUID(),
        firmId,
        name: i.name,
        ein: i.ein ?? null,
        state: i.state ?? null,
        county: i.county ?? null,
        entityType: i.entityType,
        legalEntity: i.legalEntity ?? null,
        taxClassification: i.taxClassification ?? 'unknown',
        taxYearType: i.taxYearType ?? 'calendar',
        fiscalYearEndMonth: i.fiscalYearEndMonth ?? null,
        fiscalYearEndDay: i.fiscalYearEndDay ?? null,
        externalClientId: i.externalClientId ?? null,
        addressLine1: i.addressLine1 ?? null,
        city: i.city ?? null,
        postalCode: i.postalCode ?? null,
        primaryPhone: i.primaryPhone ?? null,
        sourceStatus: i.sourceStatus ?? null,
        ownerCount: i.ownerCount ?? null,
        hasForeignAccounts: i.hasForeignAccounts ?? false,
        hasPayroll: i.hasPayroll ?? false,
        hasSalesTax: i.hasSalesTax ?? false,
        has1099Vendors: i.has1099Vendors ?? false,
        hasK1Activity: i.hasK1Activity ?? false,
        primaryContactName: i.primaryContactName ?? null,
        primaryContactEmail: i.primaryContactEmail ?? null,
        email: i.email ?? null,
        notes: i.notes ?? null,
        assigneeId: i.assigneeId ?? null,
        assigneeName: i.assigneeName ?? null,
        importanceWeight: i.importanceWeight ?? 2,
        lateFilingCountLast12mo: i.lateFilingCountLast12mo ?? 0,
        estimatedTaxLiabilityCents: i.estimatedTaxLiabilityCents ?? null,
        estimatedTaxLiabilitySource: i.estimatedTaxLiabilitySource ?? null,
        equityOwnerCount: i.equityOwnerCount ?? null,
        migrationBatchId: i.migrationBatchId ?? null,
        isSample: i.isSample ?? false,
      }))
      const writes = []
      for (let i = 0; i < rows.length; i += CLIENT_BATCH_SIZE) {
        writes.push(db.insert(client).values(rows.slice(i, i + CLIENT_BATCH_SIZE)))
      }
      await Promise.all(writes)
      return { ids: rows.map((r) => r.id) }
    },

    async findById(id: string): Promise<Client | undefined> {
      const rows = await db
        .select()
        .from(client)
        .where(and(eq(client.firmId, firmId), eq(client.id, id), isNull(client.deletedAt)))
        .limit(1)
      return rows[0]
    },

    async findManyByIds(ids: string[]): Promise<Client[]> {
      if (ids.length === 0) return []

      const chunks: string[][] = []
      for (let i = 0; i < ids.length; i += CLIENT_LOOKUP_IDS_PER_BATCH) {
        chunks.push(ids.slice(i, i + CLIENT_LOOKUP_IDS_PER_BATCH))
      }
      const rows = (
        await Promise.all(
          chunks.map((batchIds) =>
            db
              .select()
              .from(client)
              .where(
                and(
                  eq(client.firmId, firmId),
                  inArray(client.id, batchIds),
                  isNull(client.deletedAt),
                ),
              ),
          ),
        )
      ).flat()

      const byId = new Map(rows.map((row) => [row.id, row]))
      return ids.flatMap((id) => {
        const row = byId.get(id)
        return row ? [row] : []
      })
    },

    async listByFirm(
      opts: {
        includeDeleted?: boolean
        // Archive visibility: 'exclude' (default — active clients only),
        // 'only' (the /clients Archived view), 'all' (active + archived).
        archived?: 'exclude' | 'only' | 'all'
        limit?: number
      } = {},
    ): Promise<Client[]> {
      const archived = opts.archived ?? 'exclude'
      const filters = [eq(client.firmId, firmId)]
      if (!opts.includeDeleted) filters.push(isNull(client.deletedAt))
      if (archived === 'exclude') filters.push(isNull(client.archivedAt))
      if (archived === 'only') filters.push(isNotNull(client.archivedAt))
      const q = db
        .select()
        .from(client)
        .where(and(...filters))
        .orderBy(desc(client.createdAt))
      return opts.limit ? await q.limit(opts.limit) : await q
    },

    // Active (non-deleted, non-archived) client count for the firm. Backs the
    // plan clientLimit gate (forward-only at create) and the usage meter.
    // Archived clients don't count — the archive dialog promises this.
    async countActiveClients(): Promise<number> {
      const [row] = await db
        .select({ value: count() })
        .from(client)
        .where(
          and(
            eq(client.firmId, firmId),
            isNull(client.deletedAt),
            isNull(client.archivedAt),
            eq(client.isSample, false),
          ),
        )
      return row?.value ?? 0
    },

    // Onboarding sample clients (isSample=true), newest first. Backs the
    // "Load sample data" idempotency check + the returned rows.
    async listSampleClients(): Promise<Client[]> {
      return db
        .select()
        .from(client)
        .where(and(eq(client.firmId, firmId), eq(client.isSample, true)))
        .orderBy(desc(client.createdAt))
    },

    // Hard-delete this firm's sample clients (cascades to obligations / filing
    // profiles / readiness / reminders). Backs one-click "Remove sample data".
    async deleteSampleClients(): Promise<number> {
      const rows = await db
        .select({ id: client.id })
        .from(client)
        .where(and(eq(client.firmId, firmId), eq(client.isSample, true)))
      if (rows.length === 0) return 0
      const ids = rows.map((r) => r.id)
      await db.delete(client).where(and(eq(client.firmId, firmId), inArray(client.id, ids)))
      return ids.length
    },

    async listByBatch(batchId: string): Promise<Client[]> {
      return db
        .select()
        .from(client)
        .where(and(eq(client.firmId, firmId), eq(client.migrationBatchId, batchId)))
    },

    async updatePenaltyInputs(
      id: string,
      input: {
        estimatedTaxLiabilityCents?: number | null
        estimatedTaxLiabilitySource?: 'manual' | 'imported' | 'demo_seed' | null
        equityOwnerCount?: number | null
      },
    ): Promise<void> {
      const patch: Partial<typeof client.$inferInsert> = {}
      if (input.estimatedTaxLiabilityCents !== undefined) {
        patch.estimatedTaxLiabilityCents = input.estimatedTaxLiabilityCents
        patch.estimatedTaxLiabilitySource = input.estimatedTaxLiabilitySource ?? 'manual'
      }
      if (input.estimatedTaxLiabilitySource !== undefined) {
        patch.estimatedTaxLiabilitySource = input.estimatedTaxLiabilitySource
      }
      if (input.equityOwnerCount !== undefined) {
        patch.equityOwnerCount = input.equityOwnerCount
      }
      if (Object.keys(patch).length === 0) return
      await db
        .update(client)
        .set(patch)
        .where(and(eq(client.firmId, firmId), eq(client.id, id), isNull(client.deletedAt)))
    },

    async updateJurisdiction(
      id: string,
      input: { state: string | null; county: string | null },
    ): Promise<void> {
      await db
        .update(client)
        .set({
          state: input.state,
          county: input.county,
        })
        .where(and(eq(client.firmId, firmId), eq(client.id, id), isNull(client.deletedAt)))
    },

    async updateRiskProfile(
      id: string,
      input: { importanceWeight?: number; lateFilingCountLast12mo?: number },
    ): Promise<void> {
      const patch: Partial<typeof client.$inferInsert> = {}
      if (input.importanceWeight !== undefined) {
        patch.importanceWeight = Math.min(3, Math.max(1, Math.round(input.importanceWeight)))
      }
      if (input.lateFilingCountLast12mo !== undefined) {
        patch.lateFilingCountLast12mo = Math.max(0, Math.floor(input.lateFilingCountLast12mo))
      }
      if (Object.keys(patch).length === 0) return
      await db
        .update(client)
        .set(patch)
        .where(and(eq(client.firmId, firmId), eq(client.id, id), isNull(client.deletedAt)))
    },

    async updateSourceDetails(
      id: string,
      input: {
        externalClientId?: string | null
        addressLine1?: string | null
        city?: string | null
        postalCode?: string | null
        primaryPhone?: string | null
        sourceStatus?: string | null
      },
    ): Promise<void> {
      const patch: Partial<typeof client.$inferInsert> = {}
      if (input.externalClientId !== undefined) patch.externalClientId = input.externalClientId
      if (input.addressLine1 !== undefined) patch.addressLine1 = input.addressLine1
      if (input.city !== undefined) patch.city = input.city
      if (input.postalCode !== undefined) patch.postalCode = input.postalCode
      if (input.primaryPhone !== undefined) patch.primaryPhone = input.primaryPhone
      if (input.sourceStatus !== undefined) patch.sourceStatus = input.sourceStatus
      if (Object.keys(patch).length === 0) return
      await db
        .update(client)
        .set(patch)
        .where(and(eq(client.firmId, firmId), eq(client.id, id), isNull(client.deletedAt)))
    },

    // Tax classification write (entity type / tax classification / legal entity).
    // Used by the reclassification apply flow, which writes this then recomputes
    // the client's rule-backed obligations in the same operation.
    async updateClassification(
      id: string,
      input: {
        entityType?: (typeof client.$inferInsert)['entityType']
        legalEntity?: (typeof client.$inferInsert)['legalEntity']
        taxClassification?: (typeof client.$inferInsert)['taxClassification']
      },
    ): Promise<void> {
      const patch: Partial<typeof client.$inferInsert> = {}
      if (input.entityType !== undefined) patch.entityType = input.entityType
      if (input.legalEntity !== undefined) patch.legalEntity = input.legalEntity
      if (input.taxClassification !== undefined) patch.taxClassification = input.taxClassification
      if (Object.keys(patch).length === 0) return
      await db
        .update(client)
        .set(patch)
        .where(and(eq(client.firmId, firmId), eq(client.id, id), isNull(client.deletedAt)))
    },

    // 2026-06-01 (Yuqi /clients/[id] critique — IA): dedicated notes
    // write. Keeps the audit log honest (one action per real change)
    // and lets the UI mutation be single-purpose (the slide-in
    // notes panel doesn't need to plumb every SourceDetails field).
    async updateNotes(id: string, notes: string | null): Promise<void> {
      await db
        .update(client)
        .set({ notes })
        .where(and(eq(client.firmId, firmId), eq(client.id, id), isNull(client.deletedAt)))
    },

    async updateName(id: string, name: string): Promise<void> {
      await db
        .update(client)
        .set({ name })
        .where(and(eq(client.firmId, firmId), eq(client.id, id), isNull(client.deletedAt)))
    },

    async updateTaxYearProfile(
      id: string,
      input: {
        taxYearType: 'calendar' | 'fiscal'
        fiscalYearEndMonth: number | null
        fiscalYearEndDay: number | null
      },
    ): Promise<void> {
      await db
        .update(client)
        .set({
          taxYearType: input.taxYearType,
          fiscalYearEndMonth: input.taxYearType === 'fiscal' ? input.fiscalYearEndMonth : null,
          fiscalYearEndDay: input.taxYearType === 'fiscal' ? input.fiscalYearEndDay : null,
        })
        .where(and(eq(client.firmId, firmId), eq(client.id, id), isNull(client.deletedAt)))
    },

    async updateAssigneeMany(
      ids: string[],
      input: { assigneeId: string | null; assigneeName: string | null },
    ): Promise<void> {
      if (ids.length === 0) return
      const uniqueIds = [...new Set(ids)]
      const writes = []
      for (let i = 0; i < uniqueIds.length; i += CLIENT_UPDATE_IDS_PER_BATCH) {
        const chunk = uniqueIds.slice(i, i + CLIENT_UPDATE_IDS_PER_BATCH)
        writes.push(
          db
            .update(client)
            .set({
              assigneeId: input.assigneeId,
              assigneeName: input.assigneeName,
            })
            .where(
              and(eq(client.firmId, firmId), inArray(client.id, chunk), isNull(client.deletedAt)),
            ),
        )
      }
      await Promise.all(writes)
    },

    async softDelete(id: string): Promise<void> {
      await db
        .update(client)
        .set({ deletedAt: new Date() })
        .where(and(eq(client.firmId, firmId), eq(client.id, id)))
    },

    // Archive — reversible removal from active lists/counts/queues. Guarded
    // on deletedAt so a deleted client can't be resurfaced via archive, and
    // on archivedAt so the write is idempotent (first archive timestamp wins).
    async archive(id: string): Promise<void> {
      await db
        .update(client)
        .set({ archivedAt: new Date() })
        .where(
          and(
            eq(client.firmId, firmId),
            eq(client.id, id),
            isNull(client.deletedAt),
            isNull(client.archivedAt),
          ),
        )
    },

    // Restore — clears archivedAt, returning the client to active lists.
    async restore(id: string): Promise<void> {
      await db
        .update(client)
        .set({ archivedAt: null })
        .where(and(eq(client.firmId, firmId), eq(client.id, id), isNull(client.deletedAt)))
    },

    /**
     * 24h full-batch revert helper (Owner/Manager; caller enforces the RBAC
     * gate + writes `migration.reverted` audit + `migration_revert`
     * evidence_link before calling).
     *
     * Returns the count of client rows removed; `ON DELETE CASCADE` from
     * obligation_instance takes care of the children.
     */
    async deleteByBatch(batchId: string): Promise<number> {
      const toDelete = await db
        .select({ id: client.id })
        .from(client)
        .where(and(eq(client.firmId, firmId), eq(client.migrationBatchId, batchId)))
      if (toDelete.length === 0) return 0
      const ids = toDelete.map((r) => r.id)
      await db.delete(client).where(and(eq(client.firmId, firmId), inArray(client.id, ids)))
      return ids.length
    },
  }
}

export type ClientsRepo = ReturnType<typeof makeClientsRepo>
