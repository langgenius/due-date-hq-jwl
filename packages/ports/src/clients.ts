import type { ClientEntityType, ClientLegalEntity, ClientTaxClassification } from './shared'

export interface ClientRow {
  id: string
  firmId: string
  name: string
  ein: string | null
  state: string | null
  county: string | null
  entityType: ClientEntityType
  legalEntity: ClientLegalEntity | null
  taxClassification: ClientTaxClassification | null
  taxYearType: 'calendar' | 'fiscal'
  fiscalYearEndMonth: number | null
  fiscalYearEndDay: number | null
  externalClientId: string | null
  addressLine1: string | null
  city: string | null
  postalCode: string | null
  primaryPhone: string | null
  sourceStatus: string | null
  email: string | null
  notes: string | null
  assigneeId: string | null
  assigneeName: string | null
  ownerCount: number | null
  hasForeignAccounts: boolean
  hasPayroll: boolean
  hasSalesTax: boolean
  has1099Vendors: boolean
  hasK1Activity: boolean
  primaryContactName: string | null
  primaryContactEmail: string | null
  importanceWeight: number
  lateFilingCountLast12mo: number
  estimatedTaxLiabilityCents: number | null
  estimatedTaxLiabilitySource: 'manual' | 'imported' | 'demo_seed' | null
  equityOwnerCount: number | null
  migrationBatchId: string | null
  isSample?: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

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

export interface ClientsRepo {
  readonly firmId: string
  create(input: ClientCreateInput): Promise<{ id: string }>
  createBatch(inputs: ClientCreateInput[]): Promise<{ ids: string[] }>
  findById(id: string): Promise<ClientRow | undefined>
  findManyByIds(ids: string[]): Promise<ClientRow[]>
  listByFirm(opts?: { includeDeleted?: boolean; limit?: number }): Promise<ClientRow[]>
  /** Active (non-deleted, non-sample) client count — backs the plan clientLimit gate + usage meter. */
  countActiveClients(): Promise<number>
  /** Onboarding sample clients (isSample=true) for this firm. */
  listSampleClients(): Promise<ClientRow[]>
  /** Hard-delete this firm's sample clients (cascades to children). Returns count removed. */
  deleteSampleClients(): Promise<number>
  listByBatch(batchId: string): Promise<ClientRow[]>
  updatePenaltyInputs(
    id: string,
    input: {
      estimatedTaxLiabilityCents?: number | null
      estimatedTaxLiabilitySource?: 'manual' | 'imported' | 'demo_seed' | null
      equityOwnerCount?: number | null
    },
  ): Promise<void>
  updateJurisdiction(
    id: string,
    input: {
      state: string | null
      county: string | null
    },
  ): Promise<void>
  updateRiskProfile(
    id: string,
    input: {
      importanceWeight?: number
      lateFilingCountLast12mo?: number
    },
  ): Promise<void>
  updateSourceDetails(
    id: string,
    input: {
      externalClientId?: string | null
      addressLine1?: string | null
      city?: string | null
      postalCode?: string | null
      primaryPhone?: string | null
      sourceStatus?: string | null
    },
  ): Promise<void>
  // Tax classification write (entity type / tax classification / legal entity).
  // Used by the reclassification apply flow, which recomputes obligations in
  // the same operation.
  updateClassification(
    id: string,
    input: {
      entityType?: ClientEntityType
      legalEntity?: ClientLegalEntity | null
      taxClassification?: ClientTaxClassification | null
    },
  ): Promise<void>
  // 2026-06-01 (Yuqi /clients/[id] critique — IA): dedicated notes
  // write. Mirrors the contract-level `updateNotes` mutation that
  // powers the slide-in Notes panel.
  updateNotes(id: string, notes: string | null): Promise<void>
  // Rename — sets the client's display name. Mirrors the contract-level
  // `rename` mutation (the H1 edit affordance on the client detail page).
  updateName(id: string, name: string): Promise<void>
  updateTaxYearProfile(
    id: string,
    input: {
      taxYearType: 'calendar' | 'fiscal'
      fiscalYearEndMonth: number | null
      fiscalYearEndDay: number | null
    },
  ): Promise<void>
  updateAssigneeMany(
    ids: string[],
    input: { assigneeId: string | null; assigneeName: string | null },
  ): Promise<void>
  softDelete(id: string): Promise<void>
  deleteByBatch(batchId: string): Promise<number>
}
