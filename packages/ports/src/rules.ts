export type RuleReviewDecisionStatus = 'verified' | 'rejected'
export type PracticeRuleStatus = 'pending_review' | 'active' | 'rejected' | 'archived'
export type PracticeRuleReviewTaskStatus = 'open' | 'accepted' | 'rejected' | 'superseded'
export type PracticeRuleReviewTaskReason =
  | 'new_template'
  | 'source_changed'
  | 'pulse_signal'
  | 'custom_edit'
  | 'annual_review'

export interface RuleReviewDecisionRow {
  id: string
  firmId: string
  ruleId: string
  baseVersion: number
  status: RuleReviewDecisionStatus
  ruleJson: unknown
  reviewNote: string | null
  reviewedBy: string
  reviewedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface RuleReviewDecisionInput {
  ruleId: string
  baseVersion: number
  status: RuleReviewDecisionStatus
  ruleJson: unknown
  reviewNote: string | null
  reviewedBy: string
  reviewedAt?: Date
}

export interface RuleSourceTemplateInput {
  id: string
  jurisdiction: string
  title: string
  url: string
  sourceType: string
  acquisitionMethod: string
  cadence: string
  priority: string
  healthStatus: string
  isEarlyWarning: boolean
  notificationChannels: string[]
  lastReviewedOn: string
  status: 'available' | 'deprecated'
}

export interface RuleTemplateInput {
  id: string
  jurisdiction: string
  title: string
  version: number
  status: 'available' | 'deprecated'
  ruleJson: unknown
  sourceIds: string[]
}

export interface PracticeRuleRow {
  id: string
  firmId: string
  ruleId: string
  templateId: string | null
  templateVersion: number
  status: PracticeRuleStatus
  ruleJson: unknown
  reviewNote: string | null
  reviewedBy: string | null
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PracticeRuleInput {
  ruleId: string
  templateId?: string | null
  templateVersion: number
  status: PracticeRuleStatus
  ruleJson: unknown
  reviewNote: string | null
  reviewedBy?: string | null
  reviewedAt?: Date | null
}

export interface PracticeRuleReviewTaskRow {
  id: string
  firmId: string
  ruleId: string
  templateVersion: number
  status: PracticeRuleReviewTaskStatus
  reason: PracticeRuleReviewTaskReason
  reviewNote: string | null
  reviewedBy: string | null
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PracticeRuleReviewTaskInput {
  ruleId: string
  templateVersion: number
  reason: PracticeRuleReviewTaskReason
}

export interface PracticeRuleReviewTaskDecisionInput {
  ruleId: string
  templateVersion: number
  status: Exclude<PracticeRuleReviewTaskStatus, 'open'>
  reviewNote: string | null
  reviewedBy: string
  reviewedAt?: Date
}

export type TemporaryRuleRowStatus = 'active' | 'reverted' | 'retracted' | 'expired'

export interface TemporaryRuleRow {
  id: string
  alertId: string | null
  sourcePulseId: string | null
  title: string
  sourceUrl: string | null
  sourceExcerpt: string | null
  jurisdiction: string
  counties: string[]
  affectedForms: string[]
  affectedEntityTypes: string[]
  overrideType: 'extend_due_date' | 'waive_penalty'
  overrideDueDate: Date | null
  effectiveFrom: Date | null
  effectiveUntil: Date | null
  status: TemporaryRuleRowStatus
  appliedObligationCount: number
  activeObligationCount: number
  revertedObligationCount: number
  firstAppliedAt: Date | null
  lastActivityAt: Date
}

export interface RulesRepo {
  readonly firmId: string
  upsertGlobalTemplates(input: {
    sources: RuleSourceTemplateInput[]
    rules: RuleTemplateInput[]
  }): Promise<void>
  // Read global rule templates by id, INCLUDING deprecated rows. A year-stamped
  // rule's prior-year predecessor is retained here (deprecated) after the cohort
  // rolls forward, so this is the diff "before" source. Global, not firm-scoped.
  getGlobalRuleTemplatesByIds(
    ruleIds: readonly string[],
  ): Promise<Array<{ id: string; version: number; status: string; ruleJson: unknown }>>
  listPracticeRules(status?: PracticeRuleStatus): Promise<PracticeRuleRow[]>
  listActivePracticeRules(): Promise<PracticeRuleRow[]>
  getPracticeRule(ruleId: string): Promise<PracticeRuleRow | null>
  upsertPracticeRule(input: PracticeRuleInput): Promise<PracticeRuleRow>
  ensureReviewTasks(inputs: PracticeRuleReviewTaskInput[]): Promise<PracticeRuleReviewTaskRow[]>
  listReviewTasks(input?: {
    status?: PracticeRuleReviewTaskStatus
    reason?: PracticeRuleReviewTaskReason
  }): Promise<PracticeRuleReviewTaskRow[]>
  getReviewTask(ruleId: string, templateVersion: number): Promise<PracticeRuleReviewTaskRow | null>
  decideReviewTask(input: PracticeRuleReviewTaskDecisionInput): Promise<PracticeRuleReviewTaskRow>
  listDecisions(status?: RuleReviewDecisionStatus): Promise<RuleReviewDecisionRow[]>
  listVerified(): Promise<RuleReviewDecisionRow[]>
  listTemporaryRules(now?: Date): Promise<TemporaryRuleRow[]>
  getDecision(ruleId: string): Promise<RuleReviewDecisionRow | null>
  upsertDecision(input: RuleReviewDecisionInput): Promise<RuleReviewDecisionRow>
  // Rules (from the given set) that carry an uncleared source-drift signal —
  // the accept/verify gate blocks these until re-verified. Global, not
  // firm-scoped: the drift is a property of the (rule, source) pair.
  listUnclearedDriftRuleIds(ruleIds: string[]): Promise<string[]>
  // Clear every uncleared drift row for a rule when a human re-verifies it.
  clearRuleSourceDrift(input: { ruleId: string; clearedBy?: string | null }): Promise<void>
  // Most recently shipped catalog cohort (highest filing year), or null — drives
  // the in-app release banner. Reads the global release log (not firm-scoped).
  getLatestCatalogRelease(): Promise<RuleCatalogReleaseRow | null>
}

export interface RuleCatalogReleaseRow {
  filingYear: number
  newRuleCount: number
  changedRuleCount: number
  releasedAt: Date
}

export interface RulesOpsRepo {
  listGlobalRuleTemplates(): Promise<
    Array<{ id: string; version: number; status: string; ruleJson: unknown; sourceIds: string[] }>
  >
  deprecateGlobalRuleTemplates(ids: readonly string[]): Promise<number>
  fanoutReviewTasks(input: {
    newRules: Array<{ ruleId: string; templateVersion: number }>
    changedRules: Array<{ ruleId: string; templateVersion: number }>
    // Rule ids belonging to a brand-new annual cohort — tagged `annual_review`
    // instead of `new_template` so the cohort review view can isolate them.
    cohortRuleIds?: readonly string[]
  }): Promise<{ newTaskTargets: number; changedTaskTargets: number; supersededTasks: number }>
  // Filing years that already have a rule_catalog_release row — the
  // "already announced" set for new-cohort detection.
  listReleasedCohortFilingYears(): Promise<number[]>
  // Insert a release row for a filing year. Idempotent on filing_year: returns
  // true only when THIS call created the row (so the caller notifies once).
  insertCatalogRelease(input: {
    filingYear: number
    newRuleCount: number
    changedRuleCount: number
    // Override the release timestamp (defaults to now). First-run baselines for
    // cohorts that shipped before this feature existed pass a past date so the
    // banner's recency filter hides them.
    releasedAt?: Date
  }): Promise<boolean>
  // One in-app notification per active member of every active firm, deduped by
  // (firm, user, filing year). Returns the number of notifications written.
  fanoutCatalogReleaseNotifications(input: {
    filingYear: number
    newRuleCount: number
    changedRuleCount: number
  }): Promise<number>
}
