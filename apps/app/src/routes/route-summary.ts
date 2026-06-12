import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'

const APP_DOCUMENT_TITLE = 'DueDateHQ'

type RouteSummaryMessages = {
  eyebrow: MessageDescriptor
  title: MessageDescriptor
}

type RouteHandle = {
  routeSummary?: RouteSummaryMessages
}

export const routeSummaries = {
  login: { eyebrow: msg`Entry`, title: msg`Sign in` },
  twoFactor: { eyebrow: msg`Entry`, title: msg`Two-factor verification` },
  acceptInvite: { eyebrow: msg`Entry`, title: msg`Accept invitation` },
  onboarding: { eyebrow: msg`Entry`, title: msg`Create practice` },
  dashboard: { eyebrow: msg`Operations`, title: msg`Today` },
  splash: { eyebrow: msg`Operations`, title: msg`Welcome back` },
  migrationNew: { eyebrow: msg`Setup`, title: msg`Import clients` },
  deadlines: { eyebrow: msg`Operations`, title: msg`Deadlines` },
  calendarSync: { eyebrow: msg`Deadlines`, title: msg`Calendar` },
  workload: { eyebrow: msg`Practice`, title: msg`Team workload` },
  notifications: { eyebrow: msg`Operations`, title: msg`Notifications` },
  notificationPreferences: { eyebrow: msg`Settings`, title: msg`Notification preferences` },
  reminders: { eyebrow: msg`Settings`, title: msg`Email Template` },
  clients: { eyebrow: msg`Clients`, title: msg`Clients` },
  clientDetail: { eyebrow: msg`Clients`, title: msg`Client detail` },
  audit: { eyebrow: msg`Practice`, title: msg`Audit log` },
  practice: { eyebrow: msg`Practice`, title: msg`Practice profile` },
  members: { eyebrow: msg`Practice`, title: msg`Members` },
  rulesCoverage: { eyebrow: msg`Rules`, title: msg`Coverage` },
  rulesSources: { eyebrow: msg`Rules`, title: msg`Sources` },
  rulesLibrary: { eyebrow: msg`Rules`, title: msg`Rule library` },
  alerts: { eyebrow: msg`Operations`, title: msg`Alerts` },
  alertsHistory: { eyebrow: msg`Operations`, title: msg`Alerts archive` },
  rulesTemporary: { eyebrow: msg`Rules`, title: msg`Temporary rules` },
  rulesPreview: { eyebrow: msg`Rules`, title: msg`Deadline preview` },
  billing: { eyebrow: msg`Practice`, title: msg`Billing` },
  billingCheckout: { eyebrow: msg`Billing`, title: msg`Checkout` },
  settings: { eyebrow: msg`Settings`, title: msg`Practice settings` },
  settingsProfile: { eyebrow: msg`Settings`, title: msg`Your account` },
  settingsPermissions: { eyebrow: msg`Settings`, title: msg`Permissions` },
} satisfies Record<string, RouteSummaryMessages>

export function routeHandle(routeSummary: RouteSummaryMessages): RouteHandle {
  return { routeSummary }
}

export function getRouteSummaryMessages(
  matches: readonly { handle?: unknown }[],
): RouteSummaryMessages {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const handle = matches[index]?.handle
    if (isRouteHandle(handle) && handle.routeSummary) return handle.routeSummary
  }

  return routeSummaries.dashboard
}

export function formatDocumentTitle(routeTitle: string): string {
  return routeTitle === APP_DOCUMENT_TITLE
    ? APP_DOCUMENT_TITLE
    : `${routeTitle} | ${APP_DOCUMENT_TITLE}`
}

function isRouteHandle(handle: unknown): handle is RouteHandle {
  return !!handle && typeof handle === 'object' && 'routeSummary' in handle
}
