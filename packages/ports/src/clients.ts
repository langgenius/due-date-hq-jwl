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
}

export interface ClientsRepo {
  readonly firmId: string
  create(input: ClientCreateInput): Promise<{ id: string }>
  createBatch(inputs: ClientCreateInput[]): Promise<{ ids: string[] }>
  findById(id: string): Promise<ClientRow | undefined>
  findManyByIds(ids: string[]): Promise<ClientRow[]>
  listByFirm(opts?: { includeDeleted?: boolean; limit?: number }): Promise<ClientRow[]>
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
