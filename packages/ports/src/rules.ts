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

export type TemporaryRuleRowStatus = 'active' | 'reverted' | 'retracted'

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
  listPracticeRules(status?: PracticeRuleStatus): Promise<PracticeRuleRow[]>
  listActivePracticeRules(): Promise<PracticeRuleRow[]>
  getPracticeRule(ruleId: string): Promise<PracticeRuleRow | null>
  upsertPracticeRule(input: PracticeRuleInput): Promise<PracticeRuleRow>
  ensureReviewTasks(inputs: PracticeRuleReviewTaskInput[]): Promise<PracticeRuleReviewTaskRow[]>
  listReviewTasks(input?: {
    status?: PracticeRuleReviewTaskStatus
  }): Promise<PracticeRuleReviewTaskRow[]>
  getReviewTask(ruleId: string, templateVersion: number): Promise<PracticeRuleReviewTaskRow | null>
  decideReviewTask(input: PracticeRuleReviewTaskDecisionInput): Promise<PracticeRuleReviewTaskRow>
  listDecisions(status?: RuleReviewDecisionStatus): Promise<RuleReviewDecisionRow[]>
  listVerified(): Promise<RuleReviewDecisionRow[]>
  listTemporaryRules(): Promise<TemporaryRuleRow[]>
  getDecision(ruleId: string): Promise<RuleReviewDecisionRow | null>
  upsertDecision(input: RuleReviewDecisionInput): Promise<RuleReviewDecisionRow>
  // Rules (from the given set) that carry an uncleared source-drift signal —
  // the accept/verify gate blocks these until re-verified. Global, not
  // firm-scoped: the drift is a property of the (rule, source) pair.
  listUnclearedDriftRuleIds(ruleIds: string[]): Promise<string[]>
  // Clear every uncleared drift row for a rule when a human re-verifies it.
  clearRuleSourceDrift(input: { ruleId: string; clearedBy?: string | null }): Promise<void>
}

export interface RulesOpsRepo {
  listGlobalRuleTemplates(): Promise<
    Array<{ id: string; version: number; status: string; ruleJson: unknown; sourceIds: string[] }>
  >
  deprecateGlobalRuleTemplates(ids: readonly string[]): Promise<number>
  fanoutReviewTasks(input: {
    newRules: Array<{ ruleId: string; templateVersion: number }>
    changedRules: Array<{ ruleId: string; templateVersion: number }>
  }): Promise<{ newTaskTargets: number; changedTaskTargets: number; supersededTasks: number }>
}
