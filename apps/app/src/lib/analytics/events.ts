/**
 * Analytics taxonomy — the single source of truth for Amplitude event names.
 *
 * Mirrors the DueDateHQ tracking plan in Amplitude Govern (project 827681).
 * Event names follow Amplitude's `Object Action` Title Case convention;
 * property keys are snake_case. This is the full 105-event plan (matches
 * Govern). Keep this in lockstep with Govern — names must match exactly.
 */
export const ANALYTICS_EVENTS = {
  // ── Auth & Signup ──
  appOpened: 'App Opened',
  signInPageViewed: 'Sign In Page Viewed',
  signInStarted: 'Sign In Started',
  emailCodeRequested: 'Email Code Requested',
  emailCodeSubmitted: 'Email Code Submitted',
  signedUp: 'Signed Up',
  signedIn: 'Signed In',
  signInFailed: 'Sign In Failed',

  // ── Onboarding & Activation ──
  onboardingViewed: 'Onboarding Viewed',
  practiceCreated: 'Practice Created',
  rulesActivated: 'Rules Activated',
  ruleReviewPromptShown: 'Rule Review Prompt Shown',
  ruleReviewPromptClicked: 'Rule Review Prompt Clicked',
  onboardingSkipped: 'Onboarding Skipped',
  firstClientCreated: 'First Client Created',
  activationReached: 'Activation Reached',
  inviteAccepted: 'Invite Accepted',

  // ── Client Import ──
  importStarted: 'Import Started',
  importFileUploaded: 'Import File Uploaded',
  importColumnsMapped: 'Import Columns Mapped',
  importPreviewed: 'Import Previewed',
  importConfirmed: 'Import Confirmed',
  importAbandoned: 'Import Abandoned',
  importRetried: 'Import Retried',
  ssnDetectedInUpload: 'SSN Detected In Upload',
  importParseError: 'Import Parse Error',

  // ── Dashboard / Today ──
  dashboardViewed: 'Dashboard Viewed',
  dashboardScopeToggled: 'Dashboard Scope Toggled',
  dashboardBucketSelected: 'Dashboard Bucket Selected',
  quickSearchUsed: 'Quick Search Used',

  // ── Deadlines ──
  deadlinesViewed: 'Deadlines Viewed',
  deadlineOpened: 'Deadline Opened',
  deadlineCreated: 'Deadline Created',
  deadlineStatusChanged: 'Deadline Status Changed',
  deadlineCompleted: 'Deadline Completed',
  deadlineAssigned: 'Deadline Assigned',
  deadlineExtended: 'Deadline Extended',
  deadlinesFiltered: 'Deadlines Filtered',
  deadlinesExported: 'Deadlines Exported',
  deadlinesBulkAction: 'Deadlines Bulk Action',
  materialsRequested: 'Materials Requested',
  signatureRequested: 'Signature Requested',
  penaltyRecorded: 'Penalty Recorded',
  evidenceUploaded: 'Evidence Uploaded',
  deadlineNoteAdded: 'Deadline Note Added',
  deadlineDetailTabViewed: 'Deadline Detail Tab Viewed',

  // ── Alerts (Pulse) ──
  alertsViewed: 'Alerts Viewed',
  alertOpened: 'Alert Opened',
  alertApplied: 'Alert Applied',
  alertDismissed: 'Alert Dismissed',
  alertsFiltered: 'Alerts Filtered',
  alertHistoryViewed: 'Alert History Viewed',
  sourcesHealthChipClicked: 'Sources Health Chip Clicked',

  // ── Clients ──
  clientsViewed: 'Clients Viewed',
  clientCreated: 'Client Created',
  clientOpened: 'Client Opened',
  clientClassificationChanged: 'Client Classification Changed',
  clientClassificationImpactPreviewed: 'Client Classification Impact Previewed',
  clientArchived: 'Client Archived',
  clientRestored: 'Client Restored',

  // ── Rules & Sources ──
  rulesLibraryViewed: 'Rules Library Viewed',
  ruleOpened: 'Rule Opened',
  ruleAccepted: 'Rule Accepted',
  ruleRejected: 'Rule Rejected',
  rulesBulkReviewed: 'Rules Bulk Reviewed',
  customRuleCreated: 'Custom Rule Created',
  annualRolloverPreviewed: 'Annual Rollover Previewed',
  sourceToggled: 'Source Toggled',
  sourceLinkOpened: 'Source Link Opened',

  // ── Team & Members ──
  membersViewed: 'Members Viewed',
  memberInvited: 'Member Invited',
  memberInviteResent: 'Member Invite Resent',
  memberRoleChanged: 'Member Role Changed',
  memberRevoked: 'Member Revoked',
  permissionsViewed: 'Permissions Viewed',

  // ── Reminders & Readiness ──
  reminderTemplateCreated: 'Reminder Template Created',
  reminderTemplateEdited: 'Reminder Template Edited',
  reminderTestSent: 'Reminder Test Sent',
  readinessPortalViewed: 'Readiness Portal Viewed',
  readinessDocumentUploaded: 'Readiness Document Uploaded',
  readinessPortalSubmitted: 'Readiness Portal Submitted',

  // ── Notifications ──
  notificationsViewed: 'Notifications Viewed',
  notificationOpened: 'Notification Opened',
  notificationPreferencesChanged: 'Notification Preferences Changed',

  // ── Settings & Practice ──
  practiceSettingsUpdated: 'Practice Settings Updated',
  smartPriorityAdjusted: 'Smart Priority Adjusted',
  smartPriorityPreviewed: 'Smart Priority Previewed',
  smartPriorityReset: 'Smart Priority Reset',
  profileUpdated: 'Profile Updated',
  twoFactorEnabled: '2FA Enabled',
  twoFactorDisabled: '2FA Disabled',
  passwordChanged: 'Password Changed',
  sessionRevoked: 'Session Revoked',
  calendarFeedSubscribed: 'Calendar Feed Subscribed',

  // ── Billing ──
  billingViewed: 'Billing Viewed',
  plansCompared: 'Plans Compared',
  planUpgradeClicked: 'Plan Upgrade Clicked',
  checkoutStarted: 'Checkout Started',
  checkoutCompleted: 'Checkout Completed',
  checkoutCanceled: 'Checkout Canceled',
  planDowngraded: 'Plan Downgraded',
  billingPortalOpened: 'Billing Portal Opened',

  // ── Audit ──
  auditLogViewed: 'Audit Log Viewed',
  auditLogFiltered: 'Audit Log Filtered',
  auditLogExported: 'Audit Log Exported',
} as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

/** A scalar that is safe to send to Amplitude (after PII guarding). */
export type AnalyticsScalar = string | number | boolean | string[] | number[]

/**
 * Event/user/group property bag. `null`/`undefined` values are dropped by the
 * PII guard before send, so call sites can pass optionals without branching.
 */
export type AnalyticsProperties = Record<string, AnalyticsScalar | null | undefined>

/** Sign-in method, shared by markers and the auth events. */
export type SignInMethod = 'google' | 'microsoft' | 'email_otp'
