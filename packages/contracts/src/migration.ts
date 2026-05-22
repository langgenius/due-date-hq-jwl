import { oc } from '@orpc/contract'
import * as z from 'zod'
import { ClientPublicSchema } from './clients'
import { EntityIdSchema, TenantIdSchema } from './shared/ids'

export const MigrationSourceSchema = z.enum([
  'paste',
  'csv',
  'xlsx',
  'preset_taxdome',
  'preset_drake',
  'preset_karbon',
  'preset_quickbooks',
  'preset_file_in_time',
  'preset_cch_axcess',
  'preset_cch_prosystem_fx',
  'preset_lacerte',
  'preset_proseries',
  'preset_ultratax_cs',
  'preset_proconnect_tax',
  'integration_taxdome_zapier',
  'integration_karbon_api',
  'integration_soraban_api',
  'integration_safesend_api',
  'integration_proconnect_export',
])

export const MigrationIntegrationProviderSchema = z.enum([
  'taxdome',
  'karbon',
  'soraban',
  'safesend',
  'proconnect',
])

export const MigrationExternalEntityTypeSchema = z.enum([
  'account',
  'contact',
  'organization',
  'work_item',
  'client',
  'return',
  'organizer',
  'delivery',
  'signature',
  'payment',
  'unknown',
])

export const MigrationDetectedSourceProductSchema = z.enum([
  'generic',
  'file_in_time',
  'quickbooks_online',
  'quickbooks_desktop',
  'taxdome',
  'karbon',
  'cch_axcess',
  'cch_prosystem_fx',
  'lacerte',
  'proseries',
  'ultratax_cs',
  'proconnect_tax',
])
export type MigrationDetectedSourceProduct = z.infer<typeof MigrationDetectedSourceProductSchema>

export const MigrationOriginalFileKindSchema = z.enum([
  'csv',
  'tsv',
  'txt',
  'xlsx',
  'xls',
  'zip',
  'iif',
  'json',
  'unknown',
])
export type MigrationOriginalFileKind = z.infer<typeof MigrationOriginalFileKindSchema>

export const MigrationSourceFileRoleSchema = z.enum([
  'client_list',
  'contact_list',
  'account_list',
  'task_view',
  'customer_list',
  'quickbooks_iif_customers',
  'return_data',
  'client_listing_report',
  'questionnaire_responses',
  'integration_records',
  'ignored',
  'unknown',
])
export type MigrationSourceFileRole = z.infer<typeof MigrationSourceFileRoleSchema>

export const MigrationSourceManifestWarningSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  fileName: z.string().min(1).nullable().optional(),
})
export type MigrationSourceManifestWarning = z.infer<typeof MigrationSourceManifestWarningSchema>

export const MigrationSourceManifestFileSchema = z.object({
  fileName: z.string().min(1),
  originalKind: MigrationOriginalFileKindSchema,
  role: MigrationSourceFileRoleSchema,
  product: MigrationDetectedSourceProductSchema,
  rowCount: z.number().int().min(0),
  selected: z.boolean(),
})
export type MigrationSourceManifestFile = z.infer<typeof MigrationSourceManifestFileSchema>

export const MigrationSourceManifestSchema = z.object({
  product: MigrationDetectedSourceProductSchema,
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
  originalFileName: z.string().min(1),
  originalKind: MigrationOriginalFileKindSchema,
  selectedFileName: z.string().min(1),
  selectedRole: MigrationSourceFileRoleSchema,
  files: z.array(MigrationSourceManifestFileSchema),
  warnings: z.array(MigrationSourceManifestWarningSchema),
})
export type MigrationSourceManifest = z.infer<typeof MigrationSourceManifestSchema>

export const MigrationBatchStatusSchema = z.enum([
  'draft',
  'mapping',
  'reviewing',
  'applied',
  'reverted',
  'failed',
])

export const MigrationBatchSchema = z.object({
  id: EntityIdSchema,
  firmId: TenantIdSchema,
  userId: TenantIdSchema,
  source: MigrationSourceSchema,
  rawInputR2Key: z.string().nullable(),
  rawInputFileName: z.string().nullable(),
  rawInputContentType: z.string().nullable(),
  rawInputSizeBytes: z.number().int().min(0).nullable(),
  mappingJson: z.unknown().nullable(),
  presetUsed: z.string().nullable(),
  rowCount: z.number().int().min(0),
  successCount: z.number().int().min(0),
  skippedCount: z.number().int().min(0),
  aiGlobalConfidence: z.number().min(0).max(1).nullable(),
  status: MigrationBatchStatusSchema,
  appliedAt: z.iso.datetime().nullable(),
  revertExpiresAt: z.iso.datetime().nullable(),
  revertedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export const MappingTargetSchema = z.enum([
  'client.name',
  'client.ein',
  'client.external_client_id',
  'client.state',
  'client.filing_states',
  'client.county',
  'client.address_line_1',
  'client.city',
  'client.postal_code',
  'client.entity_type',
  'client.tax_types',
  'client.tax_year_type',
  'client.fiscal_year_end',
  'client.assignee_name',
  'client.primary_contact_name',
  'client.primary_contact_email',
  'client.email',
  'client.primary_phone',
  'client.source_status',
  'client.notes',
  'client.estimated_tax_liability',
  'client.equity_owner_count',
  'penalty.tax_due',
  'penalty.payments_and_credits',
  'penalty.filing_frequency',
  'penalty.period_start',
  'penalty.period_end',
  'penalty.installments',
  'penalty.member_count',
  'penalty.partner_count',
  'penalty.shareholder_count',
  'penalty.gross_receipts',
  'penalty.receipts_band',
  'penalty.annual_report_no_tax_due',
  'penalty.wa_subtotal_minus_credits',
  'penalty.tx_prior_year_franchise_tax',
  'penalty.tx_current_year_franchise_tax',
  'penalty.fl_tentative_tax',
  'penalty.ny_ptet_election_made',
  'penalty.ny_ptet_payments',
  'penalty.withholding_report_count',
  'penalty.ui_wage_report_count',
  'IGNORE',
])
export type MappingTarget = z.infer<typeof MappingTargetSchema>

export const MappingRowSchema = z.object({
  id: EntityIdSchema,
  batchId: EntityIdSchema,
  sourceHeader: z.string().min(1),
  targetField: MappingTargetSchema,
  confidence: z.number().min(0).max(1).nullable(),
  reasoning: z.string().nullable(),
  userOverridden: z.boolean(),
  model: z.string().nullable(),
  promptVersion: z.string().nullable(),
  createdAt: z.iso.datetime(),
})

export const NormalizationRowSchema = z.object({
  id: EntityIdSchema,
  batchId: EntityIdSchema,
  field: z.string().min(1),
  rawValue: z.string(),
  normalizedValue: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  model: z.string().nullable(),
  promptVersion: z.string().nullable(),
  reasoning: z.string().nullable(),
  userOverridden: z.boolean(),
  createdAt: z.iso.datetime(),
})

export const MigrationErrorSchema = z.object({
  id: EntityIdSchema,
  batchId: EntityIdSchema,
  rowIndex: z.number().int().min(0),
  rawRowJson: z.unknown().nullable(),
  errorCode: z.string().min(1),
  errorMessage: z.string().min(1),
  createdAt: z.iso.datetime(),
})

export const DryRunSummarySchema = z.object({
  batchId: EntityIdSchema,
  clientsToCreate: z.number().int().min(0),
  obligationsToCreate: z.number().int().min(0),
  skippedRows: z.number().int().min(0),
  errors: z.array(MigrationErrorSchema),
})

export const MatrixSelectionSchema = z.object({
  entityType: z.string().min(1),
  state: z.string().min(1),
  enabled: z.boolean(),
})
export type MatrixSelection = z.infer<typeof MatrixSelectionSchema>

export const MigrationErrorStageSchema = z.enum(['mapping', 'normalize', 'matrix', 'all'])
export type MigrationErrorStage = z.infer<typeof MigrationErrorStageSchema>

export const MigrationListErrorsInputSchema = z.object({
  batchId: EntityIdSchema,
  stage: MigrationErrorStageSchema.default('all').optional(),
})
export type MigrationListErrorsInput = z.infer<typeof MigrationListErrorsInputSchema>

export const MigrationExternalStagingRowInputSchema = z.object({
  externalId: z.string().min(1).max(256).optional(),
  externalUrl: z.url().nullable().optional(),
  externalEntityType: MigrationExternalEntityTypeSchema.default('unknown').optional(),
  rawJson: z.record(z.string(), z.unknown()),
})
export type MigrationExternalStagingRowInput = z.infer<
  typeof MigrationExternalStagingRowInputSchema
>

export const MigrationStagingRowSchema = z.object({
  id: EntityIdSchema,
  firmId: TenantIdSchema,
  batchId: EntityIdSchema,
  provider: MigrationIntegrationProviderSchema,
  externalEntityType: MigrationExternalEntityTypeSchema,
  externalId: z.string().min(1),
  externalUrl: z.url().nullable(),
  rowIndex: z.number().int().min(0),
  rowHash: z.string().min(1),
  rawRowJson: z.unknown(),
  createdAt: z.iso.datetime(),
})
export type MigrationStagingRow = z.infer<typeof MigrationStagingRowSchema>

export const MigrationExternalReferenceSchema = z.object({
  id: EntityIdSchema,
  firmId: TenantIdSchema,
  provider: MigrationIntegrationProviderSchema,
  migrationBatchId: EntityIdSchema.nullable(),
  internalEntityType: z.enum(['client', 'obligation', 'return_project']),
  internalEntityId: EntityIdSchema,
  externalEntityType: MigrationExternalEntityTypeSchema,
  externalId: z.string().min(1),
  externalUrl: z.url().nullable(),
  metadataJson: z.unknown().nullable(),
  lastSyncedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type MigrationExternalReference = z.infer<typeof MigrationExternalReferenceSchema>

/**
 * Mapper fallback channel marker.
 * - `null` → AI returned a structured response, mappings reflect AI output.
 * - `'preset'` → AI was unavailable but the user picked a Preset Profile;
 *   mappings come from the preset template (no AI cost incurred).
 * - `'all_ignore'` → AI was unavailable and no Preset was picked;
 *   every column defaults to IGNORE, the user must override manually
 *   before Step 2 will accept Continue.
 *
 * Surfaced on `runMapper` / `confirmMapping` outputs so the UI fallback
 * banner ([02-ux §5.4]) and PostHog cost dashboards can react without
 * inspecting trace data.
 */
export const MapperFallbackSchema = z.enum(['preset', 'all_ignore']).nullable().optional()
export type MapperFallback = z.infer<typeof MapperFallbackSchema>

export const MapperRunOutputSchema = z.object({
  mappings: z.array(MappingRowSchema),
  meta: z
    .object({
      fallback: MapperFallbackSchema,
    })
    .optional(),
})
export type MapperRunOutput = z.infer<typeof MapperRunOutputSchema>

export const ApplyResultSchema = z.object({
  batchId: EntityIdSchema,
  clientCount: z.number().int().min(0),
  obligationCount: z.number().int().min(0),
  skippedCount: z.number().int().min(0),
  revertibleUntil: z.iso.datetime(),
})

const BatchIdInput = z.object({ batchId: EntityIdSchema })
const ApplyDefaultMatrixInput = BatchIdInput.extend({
  matrixSelections: z.array(MatrixSelectionSchema).optional(),
})

export const MigrationStageExternalRowsInputSchema = BatchIdInput.extend({
  provider: MigrationIntegrationProviderSchema,
  rows: z.array(MigrationExternalStagingRowInputSchema).min(1).max(1000),
})
export type MigrationStageExternalRowsInput = z.infer<typeof MigrationStageExternalRowsInputSchema>

export const MigrationStageExternalRowsOutputSchema = z.object({
  batch: MigrationBatchSchema,
  rowCount: z.number().int().min(0),
  headers: z.array(z.string()),
})
export type MigrationStageExternalRowsOutput = z.infer<
  typeof MigrationStageExternalRowsOutputSchema
>

export const MigrationCloneStagingRowsInputSchema = z.object({
  sourceBatchId: EntityIdSchema,
})
export type MigrationCloneStagingRowsInput = z.infer<typeof MigrationCloneStagingRowsInputSchema>

export const migrationContract = oc.router({
  createBatch: oc
    .input(
      z.object({
        source: MigrationSourceSchema,
        rawInputR2Key: z.string().nullable().optional(),
        presetUsed: z.string().nullable().optional(),
        rowCount: z.number().int().min(0).optional(),
      }),
    )
    .output(MigrationBatchSchema),
  uploadRaw: oc
    .input(
      z.object({
        batchId: EntityIdSchema,
        fileName: z.string().min(1),
        contentType: z.string().min(1),
        sizeBytes: z.number().int().min(0),
        /**
         * Optional inline payload — Demo Sprint takes the paste / file body
         * directly through RPC (text or base64) and stashes it in
         * `migration_batch.mapping_json.rawInput`. Phase 0 swaps to a real
         * R2 signed PUT URL; the contract surface stays compatible because
         * `inline.kind` is the only required addition.
         *
         * When `inline` is omitted the server is expected to return a
         * pre-signed URL the client uploads to directly (not implemented in
         * Demo Sprint — see docs/dev-file/10 §H).
         */
        inline: z
          .object({
            kind: z.enum(['csv', 'tsv', 'paste', 'xlsx']),
            text: z.string().optional(),
            base64: z.string().optional(),
            rawBase64: z.string().optional(),
            sourceManifest: MigrationSourceManifestSchema.optional(),
          })
          .optional(),
      }),
    )
    .output(z.object({ rawInputR2Key: z.string() })),
  stageExternalRows: oc
    .input(MigrationStageExternalRowsInputSchema)
    .output(MigrationStageExternalRowsOutputSchema),
  cloneStagingRows: oc
    .input(MigrationCloneStagingRowsInputSchema)
    .output(MigrationStageExternalRowsOutputSchema),
  listStagingRows: oc
    .input(BatchIdInput)
    .output(z.object({ rows: z.array(MigrationStagingRowSchema) })),
  runMapper: oc.input(BatchIdInput).output(MapperRunOutputSchema),
  confirmMapping: oc
    .input(z.object({ batchId: EntityIdSchema, mappings: z.array(MappingRowSchema) }))
    .output(MapperRunOutputSchema),
  runNormalizer: oc
    .input(BatchIdInput)
    .output(z.object({ normalizations: z.array(NormalizationRowSchema) })),
  confirmNormalization: oc
    .input(z.object({ batchId: EntityIdSchema, normalizations: z.array(NormalizationRowSchema) }))
    .output(z.object({ normalizations: z.array(NormalizationRowSchema) })),
  applyDefaultMatrix: oc.input(ApplyDefaultMatrixInput).output(DryRunSummarySchema),
  dryRun: oc.input(BatchIdInput).output(DryRunSummarySchema),
  apply: oc.input(BatchIdInput).output(ApplyResultSchema),
  discardDraft: oc.input(BatchIdInput).output(z.object({ discardedAt: z.iso.datetime() })),
  revert: oc.input(BatchIdInput).output(z.object({ revertedAt: z.iso.datetime() })),
  singleUndo: oc
    .input(z.object({ batchId: EntityIdSchema, clientId: EntityIdSchema }))
    .output(z.object({ revertedAt: z.iso.datetime() })),
  getBatch: oc.input(BatchIdInput).output(MigrationBatchSchema.nullable()),
  /**
   * Read-only list of `migration_error` rows for a batch.
   * `stage` lets the wizard surface only the errors relevant to the
   * current step (Step 2 mapping vs Step 4 dry-run summary). Stage
   * mapping is by errorCode prefix until per-stage tagging is added.
   */
  listErrors: oc
    .input(MigrationListErrorsInputSchema)
    .output(z.object({ errors: z.array(MigrationErrorSchema) })),
  listBatches: oc
    .input(
      z
        .object({
          status: MigrationBatchStatusSchema.optional(),
          limit: z.number().int().min(1).max(100).default(50).optional(),
        })
        .optional(),
    )
    .output(z.object({ batches: z.array(MigrationBatchSchema) })),
  listBatchClients: oc
    .input(BatchIdInput)
    .output(z.object({ clients: z.array(ClientPublicSchema) })),
})

export type MigrationBatch = z.infer<typeof MigrationBatchSchema>
export type MigrationSource = z.infer<typeof MigrationSourceSchema>
export type MigrationBatchStatus = z.infer<typeof MigrationBatchStatusSchema>
export type MigrationIntegrationProvider = z.infer<typeof MigrationIntegrationProviderSchema>
export type MigrationExternalEntityType = z.infer<typeof MigrationExternalEntityTypeSchema>
export type MappingRow = z.infer<typeof MappingRowSchema>
export type NormalizationRow = z.infer<typeof NormalizationRowSchema>
export type MigrationError = z.infer<typeof MigrationErrorSchema>
export type DryRunSummary = z.infer<typeof DryRunSummarySchema>
export type ApplyResult = z.infer<typeof ApplyResultSchema>
export type MigrationContract = typeof migrationContract
