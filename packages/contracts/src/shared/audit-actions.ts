import * as z from 'zod'

export const MigrationAuditActions = [
  'migration.batch.created',
  'migration.raw_uploaded',
  'migration.discarded',
  'migration.imported',
  'migration.reverted',
  'migration.single_undo',
  'migration.mapper.confirmed',
  'migration.normalizer.confirmed',
  'migration.matrix.applied',
] as const

export const PulseAuditActions = [
  // NOTE: `pulse.ingest` / `pulse.extract` intentionally removed — raw signal
  // arrival and AI classification are operational telemetry (see
  // jobs/pulse/metrics.ts → Workers Logs), not firm-facing compliance audit.
  // What a CPA needs (which alert was applied/reverted/dismissed, by whom) is
  // covered by the lifecycle actions below.
  'pulse.approve',
  'pulse.reject',
  'pulse.dismiss',
  'pulse.quarantine',
  'pulse.source_revoked',
  'pulse.snooze',
  'pulse.apply',
  'pulse.revert',
  'pulse.reactivate',
  'pulse.review_requested',
  'pulse.reviewed',
] as const

export const PenaltyAuditActions = ['penalty.override'] as const

export const RulesAuditActions = [
  'rules.accepted',
  'rules.bulk_accepted',
  'rules.onboarding_activated',
  'rules.rejected',
  'rules.created',
  'rules.updated',
  'rules.archived',
  'rules.published',
  'rules.review.rejected',
] as const

// Obligation lifecycle — every one of these is written today (procedures/
// obligations + obligation-queue) but used to live outside any typed action
// group. `obligations.*` (plural) covers the saved-view / export surface.
export const ObligationAuditActions = [
  'obligation.batch_created',
  'obligation.annual_rollover.created',
  'obligation.status.updated',
  'obligation.status.auto_unblocked',
  'obligation.due_date.updated',
  'obligation.tax_year_profile.updated',
  'obligation.blocked_by.set',
  'obligation.blocked_by.cleared',
  'obligation.prep_stage.updated',
  'obligation.review_stage.updated',
  'obligation.efile.state.updated',
  'obligation.efile.rejected',
  'obligation.extension.decided',
  'obligation.input_requested',
  'obligation.signature.reminded',
  'obligations.saved_view.created',
  'obligations.saved_view.updated',
  'obligations.saved_view.deleted',
  'obligations.exported',
] as const

// Readiness (client-materials) lifecycle — obligation-scoped. Includes the
// client-portal touch points written from the anonymous-token routes.
export const ReadinessAuditActions = [
  'readiness.request.sent',
  'readiness.request.revoked',
  'readiness.checklist.regenerated',
  'readiness.checklist_item.created',
  'readiness.checklist_item.updated',
  'readiness.checklist_item.deleted',
  'readiness.checklist_item.ai_overridden',
  'readiness.materials_received',
  'readiness.portal.opened',
  'readiness.client_response',
] as const

export const ClientAuditActions = [
  'client.assignee.updated',
  'client.batch_created',
  'client.classification.updated',
  'client.created',
  'client.deleted',
  'client.filing_profiles.replaced',
  'client.jurisdiction.updated',
  'client.obligations.reclassified',
  'client.risk_profile.updated',
  'client.source_details.updated',
  'client.tax_year_profile.updated',
] as const

// Team — member.* and firm.* are both surfaced under the "team" category.
export const MemberAuditActions = [
  'member.invited',
  'member.invitation.canceled',
  'member.invitation.resent',
  'member.accepted',
  'member.role.updated',
  'member.suspended',
  'member.reactivated',
  'member.removed',
] as const

export const FirmAuditActions = [
  'firm.created',
  'firm.updated',
  'firm.switched',
  'firm.deleted',
] as const

export const OpportunityAuditActions = [
  'opportunity.dismissed',
  'opportunity.snoozed',
  'opportunity.restored',
] as const

// Calendar feed (ICS) subscriptions — token mint / rotate / revoke controls
// who can pull firm deadline data out via an unauthenticated URL.
export const CalendarAuditActions = [
  'calendar.subscription.created',
  'calendar.subscription.regenerated',
  'calendar.subscription.disabled',
] as const

// Client-facing reminder configuration + send lifecycle. `sent`/`failed` are
// written when the email is actually dispatched; `bounced`/`opened` come from
// the Resend delivery webhook (opened is first-open-only); `unsubscribed` from
// the public unsubscribe link.
export const ReminderAuditActions = [
  'reminder.template.updated',
  'reminder.sent',
  'reminder.failed',
  'reminder.bounced',
  'reminder.opened',
  'reminder.unsubscribed',
] as const

export const AuthAuditActions = [
  'auth.denied',
  'auth.login.success',
  'auth.login.failed',
  'auth.mfa.setup.started',
  'auth.mfa.enabled',
  'auth.mfa.challenge.verified',
  'auth.mfa.disabled',
  'auth.session.revoked',
] as const
export const ExportAuditActions = [
  'export.audit_package.requested',
  'export.audit_package.ready',
  'export.audit_package.failed',
  'export.audit_package.downloaded',
] as const

export const AuditActions = [
  ...MigrationAuditActions,
  ...PulseAuditActions,
  ...PenaltyAuditActions,
  ...RulesAuditActions,
  ...ObligationAuditActions,
  ...ReadinessAuditActions,
  ...ClientAuditActions,
  ...MemberAuditActions,
  ...FirmAuditActions,
  ...OpportunityAuditActions,
  ...CalendarAuditActions,
  ...ReminderAuditActions,
  ...AuthAuditActions,
  ...ExportAuditActions,
] as const

export const MigrationAuditActionSchema = z.enum(MigrationAuditActions)
export type MigrationAuditAction = z.infer<typeof MigrationAuditActionSchema>

export const PulseAuditActionSchema = z.enum(PulseAuditActions)
export type PulseAuditAction = z.infer<typeof PulseAuditActionSchema>

export const PenaltyAuditActionSchema = z.enum(PenaltyAuditActions)
export type PenaltyAuditAction = z.infer<typeof PenaltyAuditActionSchema>

export const RulesAuditActionSchema = z.enum(RulesAuditActions)
export type RulesAuditAction = z.infer<typeof RulesAuditActionSchema>

export const ObligationAuditActionSchema = z.enum(ObligationAuditActions)
export type ObligationAuditAction = z.infer<typeof ObligationAuditActionSchema>

export const ReadinessAuditActionSchema = z.enum(ReadinessAuditActions)
export type ReadinessAuditAction = z.infer<typeof ReadinessAuditActionSchema>

export const ClientAuditActionSchema = z.enum(ClientAuditActions)
export type ClientAuditAction = z.infer<typeof ClientAuditActionSchema>

export const MemberAuditActionSchema = z.enum(MemberAuditActions)
export type MemberAuditAction = z.infer<typeof MemberAuditActionSchema>

export const FirmAuditActionSchema = z.enum(FirmAuditActions)
export type FirmAuditAction = z.infer<typeof FirmAuditActionSchema>

export const OpportunityAuditActionSchema = z.enum(OpportunityAuditActions)
export type OpportunityAuditAction = z.infer<typeof OpportunityAuditActionSchema>

export const CalendarAuditActionSchema = z.enum(CalendarAuditActions)
export type CalendarAuditAction = z.infer<typeof CalendarAuditActionSchema>

export const ReminderAuditActionSchema = z.enum(ReminderAuditActions)
export type ReminderAuditAction = z.infer<typeof ReminderAuditActionSchema>

export const AuthAuditActionSchema = z.enum(AuthAuditActions)
export type AuthAuditAction = z.infer<typeof AuthAuditActionSchema>

export const ExportAuditActionSchema = z.enum(ExportAuditActions)
export type ExportAuditAction = z.infer<typeof ExportAuditActionSchema>

export const AuditActionSchema = z.enum(AuditActions)
export type AuditAction = z.infer<typeof AuditActionSchema>
