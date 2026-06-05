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
  TaxPeriodKind,
  TaxPeriodSource,
  TaxYearType,
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
  taxYearType: TaxYearType
  fiscalYearEndMonth: number | null
  fiscalYearEndDay: number | null
  taxPeriodStart: Date | null
  taxPeriodEnd: Date | null
  taxPeriodKind: TaxPeriodKind
  taxPeriodSource: TaxPeriodSource
  taxPeriodReviewReason: string | null
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
  confirmed: boolean
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
  taxYearType?: TaxYearType
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
  /** Annual-rollover lifecycle gate; defaults to true (confirmed) when omitted. */
  confirmed?: boolean
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
  /** Filed (`done`) rows still at `efileState='not_applicable'` — signature-loop backfill candidates. */
  listSignatureLoopBackfillCandidates(): Promise<ObligationInstanceRow[]>
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
  /** Soft-archive rule-backed obligations during a reclassification recompute. */
  supersedeByIds(
    ids: string[],
    meta: { reason: string; auditId?: string | null },
  ): Promise<{ supersededIds: string[] }>
  updateDueDate(id: string, newDate: Date): Promise<void>
  updateTaxYearProfile(
    id: string,
    patch: {
      taxYearType: TaxYearType
      fiscalYearEndMonth: number | null
      fiscalYearEndDay: number | null
      taxPeriodStart: Date | null
      taxPeriodEnd: Date | null
      taxPeriodKind: TaxPeriodKind
      taxPeriodSource: TaxPeriodSource
      taxPeriodReviewReason: string | null
      baseDueDate?: Date
      currentDueDate?: Date
      filingDueDate?: Date | null
      paymentDueDate?: Date | null
    },
  ): Promise<void>
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
      internalTargetDate: Date | null
      decidedAt: Date
      decidedByUserId: string
      status?: ObligationStatus
      // Applying an extension moves the deadline (filing → statutory extended
      // date, current follows, payment pinned to the original date). Optional
      // so non-extension callers of this write path are unaffected.
      filingDueDate?: Date
      currentDueDate?: Date
      paymentDueDate?: Date | null
    },
  ): Promise<void>
  updateStatusMany(ids: string[], status: ObligationStatus): Promise<void>
  /**
   * Flip projected (annual-rollover / auto-generated) obligations to confirmed,
   * scoped to the current firm. Already-confirmed ids are no-ops. Returns the ids
   * actually transitioned so the caller can audit + report a count.
   */
  confirmByIds(ids: string[]): Promise<{ confirmedIds: string[] }>
  /** Rule-backed, still-open obligations whose statutory date may have drifted. */
  listReprojectionCandidates(input: {
    taxYears?: number[]
    obligationIds?: string[]
  }): Promise<ObligationInstanceRow[]>
  /** Distinct clients with an OPEN obligation backed by each rule — the "who is affected" set for a rule-change/drift alert. */
  listAffectedClientsByRules(
    ruleIds: string[],
  ): Promise<Map<string, Array<{ clientId: string; clientName: string }>>>
  /** Unconfirmed, still-open deadlines awaiting CPA confirmation (the review queue). */
  listProjected(input: { taxYears?: number[] }): Promise<ObligationInstanceRow[]>
  /** Apply re-projected dates to still-projected obligations (confirmed rows are skipped). */
  updateProjectedDueDates(
    updates: ReadonlyArray<{ id: string; baseDueDate: Date; currentDueDate: Date }>,
  ): Promise<void>
  /**
   * Filed → e-file rejected unwind (PDF anti-pattern #3: Filed ≠ Done).
   * Stamps `efile_rejected_at`, clears any acceptance timestamp, and
   * transitions status (typically `done → review`).
   */
  setEfileRejected(
    id: string,
    patch: { rejectedAt: Date; nextStatus: ObligationStatus },
  ): Promise<void>
  /**
   * K-1 dependency wiring (PDF anti-pattern #4 + §6.4). Set or clear
   * the upstream-blocker pointer. The caller decides the next status
   * based on whether `blockedBy` is non-null.
   */
  setBlockedBy(
    id: string,
    patch: { blockedBy: string | null; nextStatus: ObligationStatus },
  ): Promise<void>
  /**
   * In Review sub-status mutations — set `prep_stage` /
   * `review_stage` directly. The pipeline strip in the obligation
   * drawer treats these as a slider: any value→any value is legal,
   * forward or backward, no transition guards at the port layer.
   * Service-layer caller adds firm scope + audit write.
   */
  setPrepStage(id: string, prepStage: ObligationPrepStage): Promise<void>
  setReviewStage(id: string, reviewStage: ObligationReviewStage): Promise<void>
  /**
   * E-file pipeline advance (the P0 "signature loop" + later e-file
   * sub-states). Sets `efile_state` only — never touches `status`. Like
   * the prep/review setters, transition legality is enforced in the
   * service layer (isLegalEfileTransition), not here.
   */
  setEfileState(id: string, efileState: ObligationEfileState): Promise<void>
  /**
   * Lifecycle v2: when the obligation identified by
   * `parentObligationInstanceId` reaches `completed`, every child row
   * that was `blocked_by` it AND in `blocked` state flips back to
   * `pending` with `blockedBy` cleared. Returns the list of child IDs
   * so the caller can audit the cascade.
   */
  unblockChildrenOf(parentObligationInstanceId: string): Promise<string[]>
  deleteByBatch(batchId: string): Promise<number>
}
