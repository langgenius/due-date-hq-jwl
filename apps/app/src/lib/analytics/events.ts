/**
 * Analytics taxonomy — the single source of truth for Amplitude event names.
 *
 * Mirrors the DueDateHQ tracking plan in Amplitude Govern (project 827681).
 * Event names follow Amplitude's `Object Action` Title Case convention;
 * property keys are snake_case. The full 105-event plan lives in Govern; this
 * file holds the constants for events the app actually emits today. Add a
 * constant here the moment a new call site is wired so names never drift.
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
  onboardingSkipped: 'Onboarding Skipped',
  firstClientCreated: 'First Client Created',
  activationReached: 'Activation Reached',
  inviteAccepted: 'Invite Accepted',

  // ── Client Import ──
  importStarted: 'Import Started',
  importConfirmed: 'Import Confirmed',

  // ── Team & Members ──
  memberInvited: 'Member Invited',
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
