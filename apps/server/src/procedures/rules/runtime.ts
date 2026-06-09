import type { ObligationRule as ContractObligationRule } from '@duedatehq/contracts'
import type {
  DueDateLogic,
  ExtensionPolicy,
  ObligationRule as CoreObligationRule,
  RuleEvidence,
  RuleEvidenceLocator,
} from '@duedatehq/core/rules'

export function toContractDueDateLogic(
  logic: DueDateLogic,
): ContractObligationRule['dueDateLogic'] {
  if (logic.kind === 'period_table') {
    return {
      ...logic,
      periods: logic.periods.map((period) => ({ ...period })),
    }
  }

  return { ...logic }
}

export function toContractRule(rule: CoreObligationRule): ContractObligationRule {
  const { localFactRequirements, predecessorRuleId, ...ruleRest } = rule
  return {
    ...ruleRest,
    ...(predecessorRuleId !== undefined ? { predecessorRuleId } : {}),
    ...(localFactRequirements !== undefined
      ? { localFactRequirements: [...localFactRequirements] }
      : {}),
    entityApplicability: [...rule.entityApplicability],
    dueDateLogic: toContractDueDateLogic(rule.dueDateLogic),
    sourceIds: [...rule.sourceIds],
    evidence: rule.evidence.map((item) => ({ ...item })),
    quality: { ...rule.quality },
    extensionPolicy: { ...rule.extensionPolicy },
  }
}

export function toPracticeContractRule(
  rule: CoreObligationRule,
  status: ContractObligationRule['status'],
  input: {
    verifiedBy?: string
    verifiedAt?: string
    reviewedByName?: string
    reviewedAt?: string
    nextReviewOn?: string
    version?: number
  } = {},
): ContractObligationRule {
  return {
    ...toContractRule(rule),
    status,
    verifiedBy: input.verifiedBy ?? rule.verifiedBy,
    verifiedAt: input.verifiedAt ?? rule.verifiedAt,
    ...(input.reviewedByName !== undefined ? { reviewedByName: input.reviewedByName } : {}),
    ...(input.reviewedAt !== undefined ? { reviewedAt: input.reviewedAt } : {}),
    nextReviewOn: input.nextReviewOn ?? rule.nextReviewOn,
    version: input.version ?? rule.version,
  }
}

function toCoreExtensionPolicy(policy: ContractObligationRule['extensionPolicy']): ExtensionPolicy {
  return {
    available: policy.available,
    ...(policy.formName !== undefined ? { formName: policy.formName } : {}),
    ...(policy.durationMonths !== undefined ? { durationMonths: policy.durationMonths } : {}),
    paymentExtended: policy.paymentExtended,
    notes: policy.notes,
  }
}

function toCoreLocator(
  locator: ContractObligationRule['evidence'][number]['locator'],
): RuleEvidenceLocator {
  return {
    kind: locator.kind,
    ...(locator.heading !== undefined ? { heading: locator.heading } : {}),
    ...(locator.selector !== undefined ? { selector: locator.selector } : {}),
    ...(locator.pdfPage !== undefined ? { pdfPage: locator.pdfPage } : {}),
    ...(locator.tableLabel !== undefined ? { tableLabel: locator.tableLabel } : {}),
    ...(locator.rowLabel !== undefined ? { rowLabel: locator.rowLabel } : {}),
  }
}

function toCoreEvidence(evidence: ContractObligationRule['evidence'][number]): RuleEvidence {
  return {
    sourceId: evidence.sourceId,
    ...(evidence.aiOutputId !== undefined ? { aiOutputId: evidence.aiOutputId } : {}),
    authorityRole: evidence.authorityRole,
    locator: toCoreLocator(evidence.locator),
    summary: evidence.summary,
    sourceExcerpt: evidence.sourceExcerpt,
    retrievedAt: evidence.retrievedAt,
    ...(evidence.sourceUpdatedOn !== undefined
      ? { sourceUpdatedOn: evidence.sourceUpdatedOn }
      : {}),
  }
}

export function toCoreRule(rule: ContractObligationRule): CoreObligationRule {
  const status: CoreObligationRule['status'] =
    rule.status === 'active' || rule.status === 'verified'
      ? 'verified'
      : rule.status === 'deprecated' || rule.status === 'archived'
        ? 'deprecated'
        : 'candidate'
  const {
    obligationType,
    localJurisdiction,
    localFactRequirements,
    reviewedByName,
    reviewedAt,
    predecessorRuleId,
    ...ruleRest
  } = rule
  return {
    ...ruleRest,
    status,
    ...(predecessorRuleId !== undefined ? { predecessorRuleId } : {}),
    ...(localJurisdiction !== undefined ? { localJurisdiction } : {}),
    ...(localFactRequirements !== undefined
      ? { localFactRequirements: [...localFactRequirements] }
      : {}),
    ...(reviewedByName !== undefined ? { reviewedByName } : {}),
    ...(reviewedAt !== undefined ? { reviewedAt } : {}),
    entityApplicability: [...rule.entityApplicability],
    dueDateLogic: rule.dueDateLogic,
    extensionPolicy: toCoreExtensionPolicy(rule.extensionPolicy),
    sourceIds: [...rule.sourceIds],
    evidence: rule.evidence.map(toCoreEvidence),
    quality: { ...rule.quality },
    ...(obligationType !== undefined ? { obligationType } : {}),
  }
}
