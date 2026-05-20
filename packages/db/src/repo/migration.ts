import { and, desc, eq, inArray } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { Db } from '../client'
import { auditEvent, evidenceLink, type NewAuditEvent, type NewEvidenceLink } from '../schema/audit'
import {
  client,
  clientFilingProfile,
  type NewClient,
  type NewClientFilingProfile,
} from '../schema/clients'
import {
  externalReference,
  migrationBatch,
  migrationError,
  migrationMapping,
  migrationNormalization,
  migrationStagingRow,
  type ExternalReference,
  type MigrationBatch,
  type MigrationBatchStatus,
  type MigrationError,
  type MigrationExternalEntityType,
  type MigrationIntegrationProvider,
  type MigrationMapping,
  type MigrationNormalization,
  type MigrationSource,
  type MigrationStagingRow,
  type NewExternalReference,
  type NewMigrationError,
  type NewMigrationMapping,
  type NewMigrationNormalization,
} from '../schema/migration'
import { obligationInstance, type NewObligationInstance } from '../schema/obligations'

// migration_batch has 17 columns → 5/batch.
const BATCH_COLS = 17
const BATCH_WRITE_SIZE = Math.floor(100 / BATCH_COLS) // = 5
// migration_mapping has 9 columns → 11/batch.
const MAPPING_COLS = 9
const MAPPING_BATCH_SIZE = Math.floor(100 / MAPPING_COLS) // = 11
// migration_normalization binds 10 values; created_at is SQL default expression → 10/batch.
const NORM_BATCH_SIZE = Math.floor(100 / 10)
// migration_error has 7 columns → 14/batch.
const ERROR_BATCH_SIZE = Math.floor(100 / 7) // = 14
// migration_staging_row has 10 columns → 10/batch.
const STAGING_ROW_BATCH_SIZE = Math.floor(100 / 10)
// external_reference has 14 columns → 7/batch.
const EXTERNAL_REF_BATCH_SIZE = Math.floor(100 / 14)
// client has 17 columns -> 5/batch.
const CLIENT_BATCH_SIZE = Math.floor(100 / 17)
// client_filing_profile has 12 columns -> 8/batch.
const FILING_PROFILE_BATCH_SIZE = Math.floor(100 / 12)
// obligation_instance commit rows bind 34 columns -> 2/batch.
const OBLIGATION_BATCH_SIZE = Math.floor(100 / 34)
// evidence_link has 17 columns → 5/batch.
const EVIDENCE_BATCH_SIZE = Math.floor(100 / 17)
// audit_event has 12 columns → 8/batch.
const AUDIT_BATCH_SIZE = Math.floor(100 / 12)

export interface CreateBatchInput {
  id?: string
  userId: string
  source: MigrationSource
  rawInputR2Key?: string | null
  rawInputFileName?: string | null
  rawInputContentType?: string | null
  rawInputSizeBytes?: number | null
  presetUsed?: string | null
  rowCount?: number
}

export interface UpdateBatchPatch {
  status?: MigrationBatchStatus
  mappingJson?: unknown
  rawInputR2Key?: string | null
  rawInputFileName?: string | null
  rawInputContentType?: string | null
  rawInputSizeBytes?: number | null
  presetUsed?: string | null
  rowCount?: number
  successCount?: number
  skippedCount?: number
  aiGlobalConfidence?: number | null
  appliedAt?: Date
  revertExpiresAt?: Date
  revertedAt?: Date
}

export interface CommitImportInput {
  batchId: string
  clients: NewClient[]
  filingProfiles: NewClientFilingProfile[]
  obligations: NewObligationInstance[]
  evidence: NewEvidenceLink[]
  audits: NewAuditEvent[]
  externalReferences?: NewExternalReference[]
  successCount: number
  skippedCount: number
  appliedAt: Date
  revertExpiresAt: Date
}

export interface CreateStagingRowInput {
  id?: string
  provider: MigrationIntegrationProvider
  externalEntityType: MigrationExternalEntityType
  externalId: string
  externalUrl?: string | null
  rowIndex: number
  rowHash: string
  rawRowJson: unknown
}

export interface FindExternalReferencesInput {
  provider: MigrationIntegrationProvider
  externalIds: string[]
  internalEntityType?: 'client' | 'obligation' | 'return_project'
}

export interface RevertImportInput {
  batchId: string
  userId: string
  revertedAt: Date
}

export interface SingleUndoImportInput extends RevertImportInput {
  clientId: string
}

export function makeMigrationRepo(db: Db, firmId: string) {
  async function assertBatchInFirm(batchId: string): Promise<void> {
    const rows = await db
      .select({ id: migrationBatch.id })
      .from(migrationBatch)
      .where(and(eq(migrationBatch.firmId, firmId), eq(migrationBatch.id, batchId)))
      .limit(1)

    if (!rows[0]) {
      throw new Error(`Migration batch ${batchId} not found for current firm`)
    }
  }

  return {
    firmId,

    async createBatch(input: CreateBatchInput): Promise<{ id: string }> {
      const id = input.id ?? crypto.randomUUID()
      await db.insert(migrationBatch).values({
        id,
        firmId,
        userId: input.userId,
        source: input.source,
        rawInputR2Key: input.rawInputR2Key ?? null,
        rawInputFileName: input.rawInputFileName ?? null,
        rawInputContentType: input.rawInputContentType ?? null,
        rawInputSizeBytes: input.rawInputSizeBytes ?? null,
        presetUsed: input.presetUsed ?? null,
        rowCount: input.rowCount ?? 0,
      })
      return { id }
    },

    async updateBatch(id: string, patch: UpdateBatchPatch): Promise<void> {
      await db
        .update(migrationBatch)
        .set(patch)
        .where(and(eq(migrationBatch.firmId, firmId), eq(migrationBatch.id, id)))
    },

    async getBatch(id: string): Promise<MigrationBatch | undefined> {
      const rows = await db
        .select()
        .from(migrationBatch)
        .where(and(eq(migrationBatch.firmId, firmId), eq(migrationBatch.id, id)))
        .limit(1)
      return rows[0]
    },

    /**
     * Return the single active draft batch for this firm (0 or 1 due to
     * the partial unique index uq_mb_firm_draft). Used by the wizard to
     * resume or by the concurrency guard to refuse a second opener
     * (PRD §3.6.6).
     */
    async getActiveDraftBatch(): Promise<MigrationBatch | undefined> {
      const rows = await db
        .select()
        .from(migrationBatch)
        .where(and(eq(migrationBatch.firmId, firmId), eq(migrationBatch.status, 'draft')))
        .orderBy(desc(migrationBatch.createdAt))
        .limit(1)
      return rows[0]
    },

    async listByFirm(opts: { limit?: number } = {}): Promise<MigrationBatch[]> {
      const q = db
        .select()
        .from(migrationBatch)
        .where(eq(migrationBatch.firmId, firmId))
        .orderBy(desc(migrationBatch.createdAt))
      return opts.limit ? await q.limit(opts.limit) : await q
    },

    async listMappings(batchId: string): Promise<MigrationMapping[]> {
      const rows = await db
        .select()
        .from(migrationMapping)
        .innerJoin(migrationBatch, eq(migrationMapping.batchId, migrationBatch.id))
        .where(and(eq(migrationBatch.firmId, firmId), eq(migrationMapping.batchId, batchId)))

      return rows.map((row) => row.migration_mapping)
    },

    async listNormalizations(batchId: string): Promise<MigrationNormalization[]> {
      const rows = await db
        .select()
        .from(migrationNormalization)
        .innerJoin(migrationBatch, eq(migrationNormalization.batchId, migrationBatch.id))
        .where(and(eq(migrationBatch.firmId, firmId), eq(migrationNormalization.batchId, batchId)))

      return rows.map((row) => row.migration_normalization)
    },

    async listErrors(batchId: string): Promise<MigrationError[]> {
      const rows = await db
        .select()
        .from(migrationError)
        .innerJoin(migrationBatch, eq(migrationError.batchId, migrationBatch.id))
        .where(and(eq(migrationBatch.firmId, firmId), eq(migrationError.batchId, batchId)))

      return rows.map((row) => row.migration_error)
    },

    async createMappings(
      batchId: string,
      mappings: Array<Omit<NewMigrationMapping, 'id' | 'batchId' | 'createdAt'>>,
    ): Promise<number> {
      if (mappings.length === 0) return 0
      await assertBatchInFirm(batchId)
      const rows = mappings.map((m) => ({
        id: crypto.randomUUID(),
        batchId,
        ...m,
      }))
      const writes = []
      for (let i = 0; i < rows.length; i += MAPPING_BATCH_SIZE) {
        writes.push(db.insert(migrationMapping).values(rows.slice(i, i + MAPPING_BATCH_SIZE)))
      }
      await Promise.all(writes)
      return rows.length
    },

    async createNormalizations(
      batchId: string,
      normalizations: Array<Omit<NewMigrationNormalization, 'id' | 'batchId' | 'createdAt'>>,
    ): Promise<number> {
      if (normalizations.length === 0) return 0
      await assertBatchInFirm(batchId)
      const rows = normalizations.map((n) => ({
        id: crypto.randomUUID(),
        batchId,
        ...n,
      }))
      const writes = []
      for (let i = 0; i < rows.length; i += NORM_BATCH_SIZE) {
        writes.push(db.insert(migrationNormalization).values(rows.slice(i, i + NORM_BATCH_SIZE)))
      }
      await Promise.all(writes)
      return rows.length
    },

    async createErrors(
      batchId: string,
      errors: Array<Omit<NewMigrationError, 'id' | 'batchId' | 'createdAt'>>,
    ): Promise<number> {
      if (errors.length === 0) return 0
      await assertBatchInFirm(batchId)
      const rows = errors.map((e) => ({
        id: crypto.randomUUID(),
        batchId,
        ...e,
      }))
      const writes = []
      for (let i = 0; i < rows.length; i += ERROR_BATCH_SIZE) {
        writes.push(db.insert(migrationError).values(rows.slice(i, i + ERROR_BATCH_SIZE)))
      }
      await Promise.all(writes)
      return rows.length
    },

    async createStagingRows(batchId: string, rows: CreateStagingRowInput[]): Promise<number> {
      if (rows.length === 0) return 0
      await assertBatchInFirm(batchId)
      const values = rows.map((row) => ({
        id: row.id ?? crypto.randomUUID(),
        firmId,
        batchId,
        provider: row.provider,
        externalEntityType: row.externalEntityType,
        externalId: row.externalId,
        externalUrl: row.externalUrl ?? null,
        rowIndex: row.rowIndex,
        rowHash: row.rowHash,
        rawRowJson: row.rawRowJson,
      }))
      const writes = []
      for (let i = 0; i < values.length; i += STAGING_ROW_BATCH_SIZE) {
        writes.push(
          db.insert(migrationStagingRow).values(values.slice(i, i + STAGING_ROW_BATCH_SIZE)),
        )
      }
      await Promise.all(writes)
      return values.length
    },

    async listStagingRows(batchId: string): Promise<MigrationStagingRow[]> {
      const rows = await db
        .select()
        .from(migrationStagingRow)
        .innerJoin(migrationBatch, eq(migrationStagingRow.batchId, migrationBatch.id))
        .where(and(eq(migrationBatch.firmId, firmId), eq(migrationStagingRow.batchId, batchId)))
        .orderBy(migrationStagingRow.rowIndex)

      return rows.map((row) => row.migration_staging_row)
    },

    async createExternalReferences(
      refs: Array<Omit<NewExternalReference, 'id' | 'firmId' | 'createdAt' | 'updatedAt'>>,
    ): Promise<number> {
      if (refs.length === 0) return 0
      const values = refs.map((ref) => ({
        id: crypto.randomUUID(),
        firmId,
        ...ref,
      }))
      const writes = []
      for (let i = 0; i < values.length; i += EXTERNAL_REF_BATCH_SIZE) {
        writes.push(
          db.insert(externalReference).values(values.slice(i, i + EXTERNAL_REF_BATCH_SIZE)),
        )
      }
      await Promise.all(writes)
      return values.length
    },

    async findExternalReferences(input: FindExternalReferencesInput): Promise<ExternalReference[]> {
      const externalIds = Array.from(new Set(input.externalIds.filter((id) => id.trim())))
      if (externalIds.length === 0) return []
      return db
        .select()
        .from(externalReference)
        .where(
          and(
            eq(externalReference.firmId, firmId),
            eq(externalReference.provider, input.provider),
            inArray(externalReference.externalId, externalIds),
            input.internalEntityType
              ? eq(externalReference.internalEntityType, input.internalEntityType)
              : undefined,
          ),
        )
    },

    async commitImport(input: CommitImportInput): Promise<void> {
      await assertBatchInFirm(input.batchId)
      const queries: BatchItem<'sqlite'>[] = []

      for (let i = 0; i < input.clients.length; i += CLIENT_BATCH_SIZE) {
        queries.push(db.insert(client).values(input.clients.slice(i, i + CLIENT_BATCH_SIZE)))
      }

      for (let i = 0; i < input.filingProfiles.length; i += FILING_PROFILE_BATCH_SIZE) {
        queries.push(
          db
            .insert(clientFilingProfile)
            .values(input.filingProfiles.slice(i, i + FILING_PROFILE_BATCH_SIZE)),
        )
      }

      for (let i = 0; i < input.obligations.length; i += OBLIGATION_BATCH_SIZE) {
        queries.push(
          db
            .insert(obligationInstance)
            .values(input.obligations.slice(i, i + OBLIGATION_BATCH_SIZE)),
        )
      }

      for (let i = 0; i < input.evidence.length; i += EVIDENCE_BATCH_SIZE) {
        queries.push(
          db.insert(evidenceLink).values(input.evidence.slice(i, i + EVIDENCE_BATCH_SIZE)),
        )
      }

      for (let i = 0; i < input.audits.length; i += AUDIT_BATCH_SIZE) {
        queries.push(db.insert(auditEvent).values(input.audits.slice(i, i + AUDIT_BATCH_SIZE)))
      }

      const refs = input.externalReferences ?? []
      for (let i = 0; i < refs.length; i += EXTERNAL_REF_BATCH_SIZE) {
        queries.push(
          db.insert(externalReference).values(refs.slice(i, i + EXTERNAL_REF_BATCH_SIZE)),
        )
      }

      queries.push(
        db
          .update(migrationBatch)
          .set({
            status: 'applied',
            successCount: input.successCount,
            skippedCount: input.skippedCount,
            appliedAt: input.appliedAt,
            revertExpiresAt: input.revertExpiresAt,
          })
          .where(
            and(
              eq(migrationBatch.firmId, firmId),
              eq(migrationBatch.id, input.batchId),
              eq(migrationBatch.status, 'reviewing'),
            ),
          ),
      )

      await db.batch(toNonEmptyBatch(queries))
    },

    async revertImport(input: RevertImportInput): Promise<{
      clientCount: number
      obligationCount: number
    }> {
      await assertBatchInFirm(input.batchId)

      const obligationsToDelete = await db
        .select({ id: obligationInstance.id })
        .from(obligationInstance)
        .where(
          and(
            eq(obligationInstance.firmId, firmId),
            eq(obligationInstance.migrationBatchId, input.batchId),
          ),
        )
      const clientsToDelete = await db
        .select({ id: client.id })
        .from(client)
        .where(and(eq(client.firmId, firmId), eq(client.migrationBatchId, input.batchId)))
      const profilesToDelete = await db
        .select({ id: clientFilingProfile.id })
        .from(clientFilingProfile)
        .where(
          and(
            eq(clientFilingProfile.firmId, firmId),
            eq(clientFilingProfile.migrationBatchId, input.batchId),
          ),
        )

      const queries: BatchItem<'sqlite'>[] = [
        db.insert(evidenceLink).values(migrationRevertEvidence(input, firmId, 'batch')),
        db.insert(auditEvent).values(
          migrationAudit(input, firmId, 'migration.reverted', {
            clientCount: clientsToDelete.length,
            obligationCount: obligationsToDelete.length,
            revertedAt: input.revertedAt.toISOString(),
          }),
        ),
      ]

      if (obligationsToDelete.length > 0) {
        queries.push(
          db
            .delete(obligationInstance)
            .where(
              and(
                eq(obligationInstance.firmId, firmId),
                eq(obligationInstance.migrationBatchId, input.batchId),
              ),
            ),
        )
      }

      if (profilesToDelete.length > 0) {
        queries.push(
          db
            .delete(clientFilingProfile)
            .where(
              and(
                eq(clientFilingProfile.firmId, firmId),
                eq(clientFilingProfile.migrationBatchId, input.batchId),
              ),
            ),
        )
      }

      if (clientsToDelete.length > 0) {
        queries.push(
          db
            .delete(client)
            .where(and(eq(client.firmId, firmId), eq(client.migrationBatchId, input.batchId))),
        )
      }

      queries.push(
        db
          .delete(externalReference)
          .where(
            and(
              eq(externalReference.firmId, firmId),
              eq(externalReference.migrationBatchId, input.batchId),
            ),
          ),
      )

      queries.push(
        db
          .update(migrationBatch)
          .set({
            status: 'reverted',
            revertedAt: input.revertedAt,
          })
          .where(
            and(
              eq(migrationBatch.firmId, firmId),
              eq(migrationBatch.id, input.batchId),
              eq(migrationBatch.status, 'applied'),
            ),
          ),
      )

      await db.batch(toNonEmptyBatch(queries))
      return { clientCount: clientsToDelete.length, obligationCount: obligationsToDelete.length }
    },

    async singleUndoImport(input: SingleUndoImportInput): Promise<{
      clientCount: number
      obligationCount: number
    }> {
      await assertBatchInFirm(input.batchId)

      const clientsToDelete = await db
        .select({ id: client.id })
        .from(client)
        .where(
          and(
            eq(client.firmId, firmId),
            eq(client.id, input.clientId),
            eq(client.migrationBatchId, input.batchId),
          ),
        )
      if (clientsToDelete.length === 0) {
        throw new Error(`Client ${input.clientId} not found in migration batch ${input.batchId}`)
      }

      const obligationsToDelete = await db
        .select({ id: obligationInstance.id })
        .from(obligationInstance)
        .where(
          and(
            eq(obligationInstance.firmId, firmId),
            eq(obligationInstance.clientId, input.clientId),
            eq(obligationInstance.migrationBatchId, input.batchId),
          ),
        )

      const profilesToDelete = await db
        .select({ id: clientFilingProfile.id })
        .from(clientFilingProfile)
        .where(
          and(
            eq(clientFilingProfile.firmId, firmId),
            eq(clientFilingProfile.clientId, input.clientId),
            eq(clientFilingProfile.migrationBatchId, input.batchId),
          ),
        )

      const queries: BatchItem<'sqlite'>[] = [
        db.insert(evidenceLink).values(migrationRevertEvidence(input, firmId, input.clientId)),
        db.insert(auditEvent).values(
          migrationAudit(input, firmId, 'migration.single_undo', {
            clientId: input.clientId,
            obligationCount: obligationsToDelete.length,
            revertedAt: input.revertedAt.toISOString(),
          }),
        ),
      ]

      if (obligationsToDelete.length > 0) {
        const obligationIds = obligationsToDelete.map((row) => row.id)
        queries.push(
          db
            .delete(obligationInstance)
            .where(
              and(
                eq(obligationInstance.firmId, firmId),
                eq(obligationInstance.clientId, input.clientId),
                eq(obligationInstance.migrationBatchId, input.batchId),
              ),
            ),
        )
        queries.push(
          db
            .delete(externalReference)
            .where(
              and(
                eq(externalReference.firmId, firmId),
                inArray(externalReference.internalEntityId, obligationIds),
              ),
            ),
        )
      }

      if (profilesToDelete.length > 0) {
        queries.push(
          db
            .delete(clientFilingProfile)
            .where(
              and(
                eq(clientFilingProfile.firmId, firmId),
                eq(clientFilingProfile.clientId, input.clientId),
                eq(clientFilingProfile.migrationBatchId, input.batchId),
              ),
            ),
        )
      }

      queries.push(
        db
          .delete(externalReference)
          .where(
            and(
              eq(externalReference.firmId, firmId),
              eq(externalReference.internalEntityId, input.clientId),
            ),
          ),
      )

      queries.push(
        db
          .delete(client)
          .where(
            and(
              eq(client.firmId, firmId),
              eq(client.id, input.clientId),
              eq(client.migrationBatchId, input.batchId),
            ),
          ),
      )

      await db.batch(toNonEmptyBatch(queries))
      return { clientCount: clientsToDelete.length, obligationCount: obligationsToDelete.length }
    },
  }
}

function migrationRevertEvidence(
  input: RevertImportInput,
  firmId: string,
  sourceId: string,
): NewEvidenceLink {
  return {
    id: crypto.randomUUID(),
    firmId,
    obligationInstanceId: null,
    aiOutputId: input.batchId,
    sourceType: 'migration_revert',
    sourceId,
    sourceUrl: null,
    verbatimQuote: null,
    rawValue: 'applied',
    normalizedValue: 'reverted',
    confidence: 1,
    model: null,
    matrixVersion: null,
    verifiedAt: input.revertedAt,
    verifiedBy: input.userId,
    appliedAt: input.revertedAt,
    appliedBy: input.userId,
  }
}

function migrationAudit(
  input: RevertImportInput,
  firmId: string,
  action: 'migration.reverted' | 'migration.single_undo',
  afterJson: unknown,
): NewAuditEvent {
  return {
    id: crypto.randomUUID(),
    firmId,
    actorId: input.userId,
    entityType: 'migration_batch',
    entityId: input.batchId,
    action,
    beforeJson: { status: 'applied' },
    afterJson,
    reason: null,
    ipHash: null,
    userAgentHash: null,
  }
}

function toNonEmptyBatch<T>(items: T[]): [T, ...T[]] {
  const [first, ...rest] = items
  if (first === undefined) {
    throw new Error('Expected at least one D1 batch statement')
  }
  return [first, ...rest]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _batchWriteSizeNotExported = BATCH_WRITE_SIZE

export type MigrationRepo = ReturnType<typeof makeMigrationRepo>
