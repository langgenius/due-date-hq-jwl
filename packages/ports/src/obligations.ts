import type {
  ExposureStatus,
  ObligationEfileState,
  ObligationExtensionState,
  ObligationExtensionDecision,
  ObligationPaymentState,
  ObligationPrepStage,
  ObligationRecurrence,
  ObligationReadiness,
  ObligationReviewStage,
  ObligationRiskLevel,
  ObligationStatus,
  ObligationType,
} from './shared'

export interface PenaltyBreakdownItem {
  key: string
  label: string
  amountCents: number
  formula: string
  inputs?: Record<string, string | number | boolean | null>
  sourceRefs?: PenaltySourceRef[]
}

export interface PenaltySourceRef {
  label: string
  url: string
  sourceExcerpt: string
  effectiveDate: string
  lastReviewedDate: string
}

export interface ObligationInstanceRow {
  id: string
  firmId: string
  clientId: string
  clientFilingProfileId: string | null
  taxType: string
  taxYear: number | null
  ruleId: string | null
  ruleVersion: number | null
  rulePeriod: string | null
  generationSource: 'migration' | 'manual' | 'annual_rollover' | 'pulse' | null
  jurisdiction: string | null
  obligationType: ObligationType
  formName: string | null
  authority: string | null
  filingDueDate: Date | null
  paymentDueDate: Date | null
  sourceEvidenceJson: unknown
  recurrence: ObligationRecurrence
  riskLevel: ObligationRiskLevel
  baseDueDate: Date
  currentDueDate: Date
  status: ObligationStatus
  blockedByObligationInstanceId: string | null
  readiness: ObligationReadiness
  extensionDecision: ObligationExtensionDecision
  extensionMemo: string | null
  extensionSource: string | null
  extensionExpectedDueDate: Date | null
  extensionDecidedAt: Date | null
  extensionDecidedByUserId: string | null
  extensionState: ObligationExtensionState
  extensionFormName: string | null
  extensionFiledAt: Date | null
  extensionAcceptedAt: Date | null
  prepStage: ObligationPrepStage
  reviewStage: ObligationReviewStage
  reviewerUserId: string | null
  reviewCompletedAt: Date | null
  paymentState: ObligationPaymentState
  paymentConfirmedAt: Date | null
  efileState: ObligationEfileState
  efileAuthorizationForm: string | null
  efileSubmittedAt: Date | null
  efileAcceptedAt: Date | null
  efileRejectedAt: Date | null
  migrationBatchId: string | null
  estimatedTaxDueCents: number | null
  estimatedExposureCents: number | null
  exposureStatus: ExposureStatus
  penaltyFactsJson: unknown
  penaltyFactsVersion: string | null
  penaltyBreakdownJson: unknown
  penaltyFormulaVersion: string | null
  missingPenaltyFactsJson: unknown
  penaltySourceRefsJson: unknown
  penaltyFormulaLabel: string | null
  exposureCalculatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ObligationCreateInput {
  id?: string
  clientId: string
  clientFilingProfileId?: string | null
  taxType: string
  taxYear?: number | null
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

export interface ObligationsRepo {
  readonly firmId: string
  createBatch(inputs: ObligationCreateInput[]): Promise<{ ids: string[] }>
  findById(id: string): Promise<ObligationInstanceRow | undefined>
  findManyByIds(ids: string[]): Promise<ObligationInstanceRow[]>
  listByClient(clientId: string): Promise<ObligationInstanceRow[]>
  listByBatch(batchId: string): Promise<ObligationInstanceRow[]>
  listAnnualRolloverSeeds(input: {
    sourceFilingYear: number
    clientIds?: string[]
  }): Promise<ObligationInstanceRow[]>
  listGeneratedByClientAndTaxYears(input: { clientIds: string[]; taxYears: number[] }): Promise<
    Array<{
      id: string
      clientId: string
      jurisdiction: string | null
      ruleId: string | null
      taxYear: number | null
      rulePeriod: string | null
    }>
  >
  updateDueDate(id: string, newDate: Date): Promise<void>
  updateExposure(
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
  ): Promise<void>
  updateStatus(id: string, status: ObligationStatus): Promise<void>
  updateExtensionDecision(
    id: string,
    patch: {
      decision: Exclude<ObligationExtensionDecision, 'not_considered'>
      memo: string | null
      source: string | null
      expectedExtendedDueDate: Date | null
      decidedAt: Date
      decidedByUserId: string
      status?: ObligationStatus
    },
  ): Promise<void>
  updateStatusMany(ids: string[], status: ObligationStatus): Promise<void>
  deleteByBatch(batchId: string): Promise<number>
}
