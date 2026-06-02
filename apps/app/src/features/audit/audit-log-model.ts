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
  'opportunity',
  'export',
  'calendar',
  'reminder',
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

type AuditExportUnavailableReason = 'permission' | 'plan'

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
  'auth.denied': 'authDenied',
  'auth.login.failed': 'authLoginFailed',
  'auth.login.success': 'authLoginSuccess',
  'auth.mfa.challenge.verified': 'authMfaChallengeVerified',
  'auth.mfa.disabled': 'authMfaDisabled',
  'auth.mfa.enabled': 'authMfaEnabled',
  'auth.mfa.setup.started': 'authMfaSetupStarted',
  'auth.session.revoked': 'authSessionRevoked',
  'calendar.subscription.created': 'calendarSubscriptionCreated',
  'calendar.subscription.regenerated': 'calendarSubscriptionRegenerated',
  'calendar.subscription.disabled': 'calendarSubscriptionDisabled',
  'client.assignee.updated': 'clientAssigneeUpdated',
  'client.batch_created': 'clientBatchCreated',
  'client.created': 'clientCreated',
  'client.deleted': 'clientDeleted',
  'client.filing_profiles.replaced': 'clientFilingProfilesReplaced',
  'client.jurisdiction.updated': 'clientJurisdictionUpdated',
  'client.risk_profile.updated': 'clientRiskProfileUpdated',
  'client.source_details.updated': 'clientSourceDetailsUpdated',
  'client.tax_year_profile.updated': 'clientTaxYearProfileUpdated',
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
  'readiness.request.sent': 'readinessRequestSent',
  'readiness.request.revoked': 'readinessRequestRevoked',
  'readiness.checklist.regenerated': 'readinessChecklistRegenerated',
  'readiness.checklist_item.created': 'readinessChecklistItemCreated',
  'readiness.checklist_item.updated': 'readinessChecklistItemUpdated',
  'readiness.checklist_item.deleted': 'readinessChecklistItemDeleted',
  // η pass — F-023: emitted when a user value-edit replaced an AI-sourced
  // checklist item value. Distinct action so audit-log filters can target it.
  'readiness.checklist_item.ai_overridden': 'readinessChecklistItemAiOverridden',
  'readiness.materials_received': 'readinessMaterialsReceived',
  'readiness.portal.opened': 'readinessPortalOpened',
  'readiness.client_response': 'readinessClientResponse',
  'obligation.batch_created': 'obligationBatchCreated',
  'obligation.annual_rollover.created': 'obligationAnnualRolloverCreated',
  'obligation.status.updated': 'obligationStatusUpdated',
  'obligation.status.auto_unblocked': 'obligationStatusAutoUnblocked',
  'obligation.due_date.updated': 'obligationDueDateUpdated',
  'obligation.tax_year_profile.updated': 'obligationTaxYearProfileUpdated',
  'obligation.blocked_by.set': 'obligationBlockedBySet',
  'obligation.blocked_by.cleared': 'obligationBlockedByCleared',
  'obligation.prep_stage.updated': 'obligationPrepStageUpdated',
  'obligation.review_stage.updated': 'obligationReviewStageUpdated',
  'obligation.efile.state.updated': 'obligationEfileStateUpdated',
  'obligation.efile.rejected': 'obligationEfileRejected',
  'obligation.extension.decided': 'obligationExtensionDecided',
  'obligation.input_requested': 'obligationInputRequested',
  'obligation.readiness.updated': 'obligationReadinessUpdated',
  'obligation.signature.reminded': 'obligationSignatureReminded',
  'opportunity.dismissed': 'opportunityDismissed',
  'opportunity.restored': 'opportunityRestored',
  'opportunity.snoozed': 'opportunitySnoozed',
  'penalty.override': 'penaltyOverride',
  'pulse.apply': 'pulseApply',
  'pulse.approve': 'pulseApprove',
  'pulse.dismiss': 'pulseDismiss',
  'pulse.quarantine': 'pulseQuarantine',
  'pulse.reactivate': 'pulseReactivate',
  'pulse.reject': 'pulseReject',
  'pulse.revert': 'pulseRevert',
  'pulse.review_requested': 'pulseReviewRequested',
  'pulse.reviewed': 'pulseReviewed',
  'pulse.snooze': 'pulseSnooze',
  'pulse.source_revoked': 'pulseSourceRevoked',
  'reminder.template.updated': 'reminderTemplateUpdated',
  'rule.report_issue': 'ruleReportIssue',
  'rule.updated': 'ruleUpdated',
  'rule.verified': 'ruleVerified',
  'rules.candidate.created': 'rulesCandidateCreated',
  'rules.accepted': 'rulesAccepted',
  'rules.bulk_accepted': 'rulesBulkAccepted',
  'rules.onboarding_activated': 'rulesOnboardingActivated',
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

type AuditActionLabelKey = (typeof AUDIT_ACTION_LABEL_KEYS)[keyof typeof AUDIT_ACTION_LABEL_KEYS]
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
  calendarSubscription: string
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
  reminderTemplate: string
  rule: string
  ruleSource: string
  obligationQueueExport: string
  obligationQueueSavedView: string
  opportunity: string
}

const AUDIT_ENTITY_TYPE_LABEL_KEYS = {
  auth: 'auth',
  audit_evidence_package: 'auditEvidencePackage',
  calendar_subscription: 'calendarSubscription',
  reminder_template: 'reminderTemplate',
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
  opportunity: 'opportunity',
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

const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
const DEFAULT_AUDIT_TIMEZONE = 'UTC'

function formatStringValue(value: string, timeZone: string): string {
  return ISO_DATETIME_PATTERN.test(value) ? formatDateTimeWithTimezone(value, timeZone) : value
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return Object.fromEntries(Object.entries(value))
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

export function formatAuditJson(value: unknown, timeZone = DEFAULT_AUDIT_TIMEZONE): string {
  if (value === null || value === undefined) return 'null'
  return JSON.stringify(formatAuditJsonValue(value, timeZone), null, 2)
}
