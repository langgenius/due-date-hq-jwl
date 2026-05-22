import type {
  ClientEntityType,
  MigrationBatchStatus,
  MigrationSource,
  ObligationStatus,
  TaxPeriodKind,
  TaxPeriodSource,
} from './shared'

export type MigrationIntegrationProvider =
  | 'taxdome'
  | 'karbon'
  | 'soraban'
  | 'safesend'
  | 'proconnect'

export type MigrationExternalEntityType =
  | 'account'
  | 'contact'
  | 'organization'
  | 'work_item'
  | 'client'
  | 'return'
  | 'organizer'
  | 'delivery'
  | 'signature'
  | 'payment'
  | 'unknown'

export interface MigrationBatchRow {
  id: string
  firmId: string
  userId: string
  source: MigrationSource
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
  status: MigrationBatchStatus
  appliedAt: Date | null
  revertExpiresAt: Date | null
  revertedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface MigrationMappingRow {
  id: string
  batchId: string
  sourceHeader: string
  targetField: string
  confidence: number | null
  reasoning: string | null
  userOverridden: boolean
  model: string | null
  promptVersion: string | null
  createdAt: Date
}

export interface MigrationNormalizationRow {
  id: string
  batchId: string
  field: string
  rawValue: string
  normalizedValue: string | null
  confidence: number | null
  model: string | null
  promptVersion: string | null
  reasoning: string | null
  userOverridden: boolean
  createdAt: Date
}

export interface MigrationErrorRow {
  id: string
  batchId: string
  rowIndex: number
  rawRowJson: unknown
  errorCode: string
  errorMessage: string
  createdAt: Date
}

export interface MigrationStagingRow {
  id: string
  firmId: string
  batchId: string
  provider: MigrationIntegrationProvider
  externalEntityType: MigrationExternalEntityType
  externalId: string
  externalUrl: string | null
  rowIndex: number
  rowHash: string
  rawRowJson: unknown
  createdAt: Date
}

export interface MigrationExternalReferenceRow {
  id: string
  firmId: string
  provider: MigrationIntegrationProvider
  migrationBatchId: string | null
  internalEntityType: 'client' | 'obligation' | 'return_project'
  internalEntityId: string
  externalEntityType: MigrationExternalEntityType
  externalId: string
  externalUrl: string | null
  metadataJson: unknown
  lastSyncedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

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

export interface MigrationMappingInput {
  sourceHeader: string
  targetField: string
  confidence?: number | null
  reasoning?: string | null
  userOverridden?: boolean
  model?: string | null
  promptVersion?: string | null
}

export interface MigrationNormalizationInput {
  field: string
  rawValue: string
  normalizedValue?: string | null
  confidence?: number | null
  model?: string | null
  promptVersion?: string | null
  reasoning?: string | null
  userOverridden?: boolean
}

export interface MigrationErrorInput {
  rowIndex: number
  rawRowJson?: unknown
  errorCode: string
  errorMessage: string
}

export interface MigrationStagingRowInput {
  id?: string
  provider: MigrationIntegrationProvider
  externalEntityType: MigrationExternalEntityType
  externalId: string
  externalUrl?: string | null
  rowIndex: number
  rowHash: string
  rawRowJson: unknown
}

export interface MigrationExternalReferenceInput {
  id?: string
  provider: MigrationIntegrationProvider
  migrationBatchId?: string | null
  internalEntityType: 'client' | 'obligation' | 'return_project'
  internalEntityId: string
  externalEntityType: MigrationExternalEntityType
  externalId: string
  externalUrl?: string | null
  metadataJson?: unknown
  lastSyncedAt?: Date | null
}

export interface CommitClientInput {
  id: string
  firmId: string
  name: string
  ein?: string | null
  state?: string | null
  county?: string | null
  entityType: ClientEntityType
  taxYearType?: 'calendar' | 'fiscal'
  fiscalYearEndMonth?: number | null
  fiscalYearEndDay?: number | null
  externalClientId?: string | null
  addressLine1?: string | null
  city?: string | null
  postalCode?: string | null
  primaryPhone?: string | null
  sourceStatus?: string | null
  email?: string | null
  primaryContactName?: string | null
  primaryContactEmail?: string | null
  notes?: string | null
  assigneeName?: string | null
  estimatedTaxLiabilityCents?: number | null
  estimatedTaxLiabilitySource?: 'manual' | 'imported' | 'demo_seed' | null
  equityOwnerCount?: number | null
  migrationBatchId?: string | null
}

export interface CommitObligationInput {
  id: string
  firmId: string
  clientId: string
  clientFilingProfileId?: string | null
  taxType: string
  taxYear?: number | null
  taxYearType?: 'calendar' | 'fiscal'
  fiscalYearEndMonth?: number | null
  fiscalYearEndDay?: number | null
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
  baseDueDate: Date
  currentDueDate: Date
  status: ObligationStatus
  migrationBatchId?: string | null
  estimatedTaxDueCents?: number | null
  estimatedExposureCents?: number | null
  exposureStatus?: 'ready' | 'needs_input' | 'unsupported'
  penaltyFactsJson?: unknown
  penaltyFactsVersion?: string | null
  penaltyBreakdownJson?: unknown
  penaltyFormulaVersion?: string | null
  missingPenaltyFactsJson?: unknown
  penaltySourceRefsJson?: unknown
  penaltyFormulaLabel?: string | null
  exposureCalculatedAt?: Date | null
}

export interface CommitClientFilingProfileInput {
  id: string
  firmId: string
  clientId: string
  state: string
  countiesJson: string[]
  taxTypesJson: string[]
  isPrimary: boolean
  source: 'manual' | 'imported' | 'demo_seed' | 'backfill'
  migrationBatchId?: string | null
}

export interface CommitEvidenceInput {
  id: string
  firmId: string
  obligationInstanceId?: string | null
  aiOutputId?: string | null
  sourceType: string
  sourceId?: string | null
  sourceUrl?: string | null
  verbatimQuote?: string | null
  rawValue?: string | null
  normalizedValue?: string | null
  confidence?: number | null
  model?: string | null
  matrixVersion?: string | null
  verifiedAt?: Date | null
  verifiedBy?: string | null
  appliedAt: Date
  appliedBy?: string | null
}

export interface CommitAuditInput {
  id: string
  firmId: string
  actorId: string | null
  entityType: string
  entityId: string
  action: string
  beforeJson?: unknown
  afterJson?: unknown
  reason?: string | null
  ipHash?: string | null
  userAgentHash?: string | null
}

export interface CommitImportInput {
  batchId: string
  clients: CommitClientInput[]
  filingProfiles: CommitClientFilingProfileInput[]
  obligations: CommitObligationInput[]
  evidence: CommitEvidenceInput[]
  audits: CommitAuditInput[]
  externalReferences?: Array<MigrationExternalReferenceInput & { id: string; firmId: string }>
  successCount: number
  skippedCount: number
  appliedAt: Date
  revertExpiresAt: Date
}

export interface RevertImportInput {
  batchId: string
  userId: string
  revertedAt: Date
}

export interface SingleUndoImportInput extends RevertImportInput {
  clientId: string
}

export interface MigrationRepo {
  readonly firmId: string
  createBatch(input: CreateBatchInput): Promise<{ id: string }>
  updateBatch(id: string, patch: UpdateBatchPatch): Promise<void>
  getBatch(id: string): Promise<MigrationBatchRow | undefined>
  getActiveDraftBatch(): Promise<MigrationBatchRow | undefined>
  listByFirm(opts?: { limit?: number }): Promise<MigrationBatchRow[]>
  listMappings(batchId: string): Promise<MigrationMappingRow[]>
  listNormalizations(batchId: string): Promise<MigrationNormalizationRow[]>
  listErrors(batchId: string): Promise<MigrationErrorRow[]>
  listStagingRows(batchId: string): Promise<MigrationStagingRow[]>
  createMappings(batchId: string, mappings: MigrationMappingInput[]): Promise<number>
  createNormalizations(
    batchId: string,
    normalizations: MigrationNormalizationInput[],
  ): Promise<number>
  createErrors(batchId: string, errors: MigrationErrorInput[]): Promise<number>
  createStagingRows(batchId: string, rows: MigrationStagingRowInput[]): Promise<number>
  createExternalReferences(refs: MigrationExternalReferenceInput[]): Promise<number>
  findExternalReferences(input: {
    provider: MigrationIntegrationProvider
    externalIds: string[]
    internalEntityType?: 'client' | 'obligation' | 'return_project'
  }): Promise<MigrationExternalReferenceRow[]>
  commitImport(input: CommitImportInput): Promise<void>
  revertImport(input: RevertImportInput): Promise<{ clientCount: number; obligationCount: number }>
  singleUndoImport(
    input: SingleUndoImportInput,
  ): Promise<{ clientCount: number; obligationCount: number }>
}
