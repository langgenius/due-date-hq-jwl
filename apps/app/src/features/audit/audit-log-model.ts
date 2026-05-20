import type {
  AuditActionCategory,
  AuditEventPublic,
  AuditRange,
  FirmPublic,
} from '@duedatehq/contracts'
import { planHasFeature } from '@duedatehq/core/plan-entitlements'
import { hasFirmPermission } from '@duedatehq/core/permissions'
import { formatDateTimeWithTimezone } from '@/lib/utils'

export const AUDIT_CATEGORY_OPTIONS = [
  'all',
  'client',
  'obligation',
  'migration',
  'rules',
  'auth',
  'team',
  'pulse',
  'export',
  'ai',
  'system',
] as const
export type AuditCategoryOption = (typeof AUDIT_CATEGORY_OPTIONS)[number]

export const AUDIT_RANGE_OPTIONS = ['24h', '7d', '30d', 'all'] as const satisfies readonly [
  AuditRange,
  AuditRange,
  AuditRange,
  AuditRange,
]

export function isAuditCategoryOption(value: string): value is AuditCategoryOption {
  return AUDIT_CATEGORY_OPTIONS.some((option) => option === value)
}

export function isAuditRange(value: string): value is AuditRange {
  return AUDIT_RANGE_OPTIONS.some((option) => option === value)
}

export function categoryToInput(category: AuditCategoryOption): AuditActionCategory | undefined {
  return category === 'all' ? undefined : category
}

type AuditExportFirm = Pick<FirmPublic, 'coordinatorCanSeeDollars' | 'plan' | 'role'>

export type AuditExportUnavailableReason = 'permission' | 'plan'

export function getAuditExportUnavailableReason(
  firm: AuditExportFirm | null | undefined,
): AuditExportUnavailableReason | null {
  const hasExportPermission = hasFirmPermission({
    role: firm?.role,
    permission: 'audit.export',
    coordinatorCanSeeDollars: firm?.coordinatorCanSeeDollars,
  })

  if (!hasExportPermission) return 'permission'
  if (!firm || !planHasFeature(firm.plan, 'auditExport')) return 'plan'

  return null
}

export function shortenAuditId(id: string): string {
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}...${id.slice(-4)}`
}

export const AUDIT_ACTION_LABEL_KEYS = {
  'ai.guard_failed': 'aiGuardFailed',
  'ai.refusal': 'aiRefusal',
  'ask.query_run': 'askQueryRun',
  'auth.denied': 'authDenied',
  'auth.login.failed': 'authLoginFailed',
  'auth.login.success': 'authLoginSuccess',
  'auth.mfa.disabled': 'authMfaDisabled',
  'auth.mfa.enabled': 'authMfaEnabled',
  'auth.mfa.setup.started': 'authMfaSetupStarted',
  'auth.session.revoked': 'authSessionRevoked',
  'client.assignee.updated': 'clientAssigneeUpdated',
  'client.batch_created': 'clientBatchCreated',
  'client.created': 'clientCreated',
  'client.deleted': 'clientDeleted',
  'export.audit_package.downloaded': 'exportAuditPackageDownloaded',
  'export.audit_package.failed': 'exportAuditPackageFailed',
  'export.audit_package.ready': 'exportAuditPackageReady',
  'export.audit_package.requested': 'exportAuditPackageRequested',
  'firm.created': 'firmCreated',
  'firm.deleted': 'firmDeleted',
  'firm.switched': 'firmSwitched',
  'firm.updated': 'firmUpdated',
  'member.accepted': 'memberAccepted',
  'member.invitation.canceled': 'memberInvitationCanceled',
  'member.invitation.resent': 'memberInvitationResent',
  'member.invited': 'memberInvited',
  'member.reactivated': 'memberReactivated',
  'member.removed': 'memberRemoved',
  'member.role.updated': 'memberRoleUpdated',
  'member.suspended': 'memberSuspended',
  'migration.batch.created': 'migrationBatchCreated',
  'migration.imported': 'migrationImported',
  'migration.mapper.confirmed': 'migrationMapperConfirmed',
  'migration.matrix.applied': 'migrationMatrixApplied',
  'migration.normalizer.confirmed': 'migrationNormalizerConfirmed',
  'migration.raw_uploaded': 'migrationRawUploaded',
  'migration.reverted': 'migrationReverted',
  'migration.single_undo': 'migrationSingleUndo',
  'obligation.batch_created': 'obligationBatchCreated',
  'obligation.annual_rollover.created': 'obligationAnnualRolloverCreated',
  'obligation.due_date.updated': 'obligationDueDateUpdated',
  'obligation.readiness.updated': 'obligationReadinessUpdated',
  'obligation.status.updated': 'obligationStatusUpdated',
  'obligation.tax_year_profile.updated': 'obligationTaxYearProfileUpdated',
  'onboarding.agent.dry_run.previewed': 'onboardingAgentDryRunPreviewed',
  'onboarding.agent.fallback.triggered': 'onboardingAgentFallbackTriggered',
  'onboarding.agent.handoff.chosen': 'onboardingAgentHandoffChosen',
  'onboarding.agent.handoff.offered': 'onboardingAgentHandoffOffered',
  'onboarding.agent.import.committed': 'onboardingAgentImportCommitted',
  'onboarding.agent.intake.submitted': 'onboardingAgentIntakeSubmitted',
  'onboarding.agent.matrix.preloaded': 'onboardingAgentMatrixPreloaded',
  'onboarding.agent.normalize.confirmed': 'onboardingAgentNormalizeConfirmed',
  'onboarding.agent.preview_card.clicked': 'onboardingAgentPreviewCardClicked',
  'onboarding.agent.state.advanced': 'onboardingAgentStateAdvanced',
  'onboarding.agent.turn.opened': 'onboardingAgentTurnOpened',
  'penalty.override': 'penaltyOverride',
  'pulse.apply': 'pulseApply',
  'pulse.approve': 'pulseApprove',
  'pulse.dismiss': 'pulseDismiss',
  'pulse.extract': 'pulseExtract',
  'pulse.ingest': 'pulseIngest',
  'pulse.quarantine': 'pulseQuarantine',
  'pulse.reactivate': 'pulseReactivate',
  'pulse.reject': 'pulseReject',
  'pulse.revert': 'pulseRevert',
  'pulse.review_requested': 'pulseReviewRequested',
  'pulse.snooze': 'pulseSnooze',
  'pulse.source_revoked': 'pulseSourceRevoked',
  'role.check': 'roleCheck',
  'rule.report_issue': 'ruleReportIssue',
  'rule.updated': 'ruleUpdated',
  'rule.verified': 'ruleVerified',
  'rules.candidate.created': 'rulesCandidateCreated',
  'rules.accepted': 'rulesAccepted',
  'rules.bulk_accepted': 'rulesBulkAccepted',
  'rules.rejected': 'rulesRejected',
  'rules.created': 'rulesCreated',
  'rules.updated': 'rulesUpdated',
  'rules.archived': 'rulesArchived',
  'rules.published': 'rulesPublished',
  'rules.review.rejected': 'rulesReviewRejected',
  'rules.review.required': 'rulesReviewRequired',
  'rules.source.changed': 'rulesSourceChanged',
  'obligations.exported': 'obligationQueueExported',
  'obligations.saved_view.created': 'obligationQueueSavedViewCreated',
  'obligations.saved_view.deleted': 'obligationQueueSavedViewDeleted',
  'obligations.saved_view.updated': 'obligationQueueSavedViewUpdated',
} as const

export type AuditActionLabelKey =
  (typeof AUDIT_ACTION_LABEL_KEYS)[keyof typeof AUDIT_ACTION_LABEL_KEYS]
export type AuditActionLabels = Record<AuditActionLabelKey, string>

type KnownAuditAction = keyof typeof AUDIT_ACTION_LABEL_KEYS

function isKnownAuditAction(action: string): action is KnownAuditAction {
  return action in AUDIT_ACTION_LABEL_KEYS
}

const AUDIT_LABEL_ACRONYMS = new Set(['ai', 'api', 'd1', 'id', 'ip', 'ua', 'url', 'utc'])

function humanizeAuditIdentifier(value: string): string {
  const normalized = value.replace(/[._-]+/g, ' ').trim()
  if (!normalized) return value

  return normalized
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (AUDIT_LABEL_ACRONYMS.has(lower)) return lower.toUpperCase()
      return index === 0 ? `${lower.charAt(0).toUpperCase()}${lower.slice(1)}` : lower
    })
    .join(' ')
}

export function humanizeAuditAction(action: string): string {
  return humanizeAuditIdentifier(action)
}

export function formatAuditActionLabel(action: string, labels: AuditActionLabels): string {
  if (!isKnownAuditAction(action)) return humanizeAuditAction(action)
  return labels[AUDIT_ACTION_LABEL_KEYS[action]]
}

export type AuditEntityTypeLabels = {
  auth: string
  auditEvidencePackage: string
  client: string
  clientBatch: string
  firm: string
  member: string
  memberInvitation: string
  migrationBatch: string
  obligationBatch: string
  obligationInstance: string
  pulseApplication: string
  pulseAlert: string
  rule: string
  ruleSource: string
  obligationQueueExport: string
  obligationQueueSavedView: string
}

const AUDIT_ENTITY_TYPE_LABEL_KEYS = {
  auth: 'auth',
  audit_evidence_package: 'auditEvidencePackage',
  client: 'client',
  client_batch: 'clientBatch',
  firm: 'firm',
  member: 'member',
  member_invitation: 'memberInvitation',
  migration_batch: 'migrationBatch',
  obligation: 'obligationInstance',
  obligation_batch: 'obligationBatch',
  obligation_instance: 'obligationInstance',
  obligation_rule: 'rule',
  pulse_alert: 'pulseAlert',
  pulse_application: 'pulseApplication',
  pulse_firm_alert: 'pulseAlert',
  rule_source: 'ruleSource',
  obligations_export: 'obligationQueueExport',
  obligation_saved_view: 'obligationQueueSavedView',
} as const satisfies Record<string, keyof AuditEntityTypeLabels>

type KnownAuditEntityType = keyof typeof AUDIT_ENTITY_TYPE_LABEL_KEYS

function isKnownAuditEntityType(entityType: string): entityType is KnownAuditEntityType {
  return entityType in AUDIT_ENTITY_TYPE_LABEL_KEYS
}

export function humanizeAuditEntityType(entityType: string): string {
  return humanizeAuditIdentifier(entityType)
}

export function formatAuditEntityTypeLabel(
  entityType: string,
  labels: AuditEntityTypeLabels,
): string {
  if (!isKnownAuditEntityType(entityType)) return humanizeAuditEntityType(entityType)
  return labels[AUDIT_ENTITY_TYPE_LABEL_KEYS[entityType]]
}

const AUDIT_ENTITY_NAME_KEYS = [
  'name',
  'title',
  'label',
  'displayName',
  'clientName',
  'firmName',
  'memberName',
  'email',
  'pulseId',
  'obligationId',
  'migrationBatchId',
] as const

function readStringField(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readEntityName(record: Record<string, unknown> | null): string | null {
  for (const key of AUDIT_ENTITY_NAME_KEYS) {
    const value = readStringField(record, key)
    if (value) return value
  }
  return null
}

export function getAuditEntityDisplay(
  event: Pick<AuditEventPublic, 'entityId' | 'beforeJson' | 'afterJson'>,
  entityTypeLabel: string,
): { primary: string; secondary: string } {
  const before = readRecord(event.beforeJson)
  const after = readRecord(event.afterJson)
  const entityName = readEntityName(after) ?? readEntityName(before)

  if (entityName) {
    return {
      primary: entityName,
      secondary: `${entityTypeLabel} · ${shortenAuditId(event.entityId)}`,
    }
  }

  return {
    primary: entityTypeLabel,
    secondary: shortenAuditId(event.entityId),
  }
}

export type AuditSummaryLabels = {
  empty: string
  object: string
  noPayload: string
  created: string
  beforeOnly: string
  noChange: string
}

const DEFAULT_AUDIT_SUMMARY_LABELS: AuditSummaryLabels = {
  empty: 'empty',
  object: 'object',
  noPayload: 'No before/after payload',
  created: 'Created snapshot',
  beforeOnly: 'Before snapshot only',
  noChange: 'No field-level change detected',
}

const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
const DEFAULT_AUDIT_TIMEZONE = 'UTC'

function formatStringValue(value: string, timeZone: string): string {
  return ISO_DATETIME_PATTERN.test(value) ? formatDateTimeWithTimezone(value, timeZone) : value
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return Object.fromEntries(Object.entries(value))
}

function stringifyScalar(value: unknown, labels: AuditSummaryLabels, timeZone: string): string {
  if (value === null) return 'null'
  if (value === undefined) return labels.empty
  if (typeof value === 'string') return formatStringValue(value, timeZone)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return labels.object
}

function formatAuditJsonValue(value: unknown, timeZone: string): unknown {
  if (typeof value === 'string') return formatStringValue(value, timeZone)
  if (Array.isArray(value)) return value.map((entry) => formatAuditJsonValue(entry, timeZone))
  const record = readRecord(value)
  if (record) {
    return Object.fromEntries(
      Object.entries(record).map(([key, entry]) => [key, formatAuditJsonValue(entry, timeZone)]),
    )
  }
  return value
}

export function summarizeAuditChange(
  event: Pick<AuditEventPublic, 'beforeJson' | 'afterJson'>,
  labels: AuditSummaryLabels = DEFAULT_AUDIT_SUMMARY_LABELS,
  timeZone = DEFAULT_AUDIT_TIMEZONE,
) {
  const before = readRecord(event.beforeJson)
  const after = readRecord(event.afterJson)
  if (!before && !after) return labels.noPayload

  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
  const changes = [...keys]
    .filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]))
    .slice(0, 3)
    .map((key) => {
      const beforeValue = stringifyScalar(before?.[key], labels, timeZone)
      const afterValue = stringifyScalar(after?.[key], labels, timeZone)
      return `${key}: ${beforeValue} -> ${afterValue}`
    })

  if (changes.length > 0) return changes.join('; ')
  if (!before && after) return labels.created
  if (before && !after) return labels.beforeOnly
  return labels.noChange
}

export function formatAuditJson(value: unknown, timeZone = DEFAULT_AUDIT_TIMEZONE): string {
  if (value === null || value === undefined) return 'null'
  return JSON.stringify(formatAuditJsonValue(value, timeZone), null, 2)
}
