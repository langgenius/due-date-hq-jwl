import {
  createBrowserRouter,
  Outlet,
  redirect,
  replace,
  type LoaderFunctionArgs,
} from 'react-router'
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7'
import type { FirmPublic } from '@duedatehq/contracts'

import { activateLocale } from '@/i18n/i18n'
import { persistLocaleHandoffFromUrl } from '@/i18n/locales'
import { authClient } from '@/lib/auth'
import { orpc } from '@/lib/rpc'
import { removeLocaleFromPath } from '@/i18n/query'
import { EntryShell } from '@/routes/_entry-layout'
import { RootLayout, ShellSkeleton } from '@/routes/_layout'
import { RouteErrorBoundary } from '@/routes/error'
import { EntryRouteHydrateFallback, RouteHydrateFallback } from '@/routes/fallback'
import { routeHandle, routeSummaries } from '@/routes/route-summary'
import { RouteDocumentTitle } from '@/routes/route-title'

// Route id used by children to reach into the layout loader via useRouteLoaderData.
export const PROTECTED_ROUTE_ID = 'protected'

type MfaSessionShape = {
  user?: unknown
  session?: unknown
}

async function fetchSession({ request }: LoaderFunctionArgs) {
  const { data } = await authClient.getSession({
    fetchOptions: { signal: request.signal },
  })
  return data
}

function booleanField(value: unknown, key: string): boolean | undefined {
  if (!value || typeof value !== 'object' || !(key in value)) return undefined
  const field = Reflect.get(value, key)
  return typeof field === 'boolean' ? field : undefined
}

function needsTwoFactorVerification(session: MfaSessionShape): boolean {
  return (
    booleanField(session.user, 'twoFactorEnabled') === true &&
    booleanField(session.session, 'twoFactorVerified') !== true
  )
}

/**
 * Open-redirect guard reused by both /login and /onboarding loaders.
 * Only allow in-app paths (no protocol, no `//host` schemes).
 */
function pickSafeRedirect(raw: string | null | undefined, fallback = '/'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback
  return raw
}

function applyRequestLocaleHandoff(url: URL): boolean {
  const locale = persistLocaleHandoffFromUrl(url)
  if (!locale) return false

  activateLocale(locale, { persist: false })
  return true
}

function pathAndQueryWithoutLocale(url: URL): string {
  return removeLocaleFromPath(`${url.pathname}${url.search}${url.hash}`)
}

function redirectParamFromUrl(url: URL, fallback: string): string {
  return encodeURIComponent(pathAndQueryWithoutLocale(url) || fallback)
}

function twoFactorRedirect(url: URL, fallback: string): string {
  return `/two-factor?redirectTo=${redirectParamFromUrl(url, fallback)}`
}

function safePostVerificationRedirect(session: MfaSessionShape, raw: string | null): string {
  const fallback =
    session.session &&
    typeof session.session === 'object' &&
    Reflect.get(session.session, 'activeOrganizationId')
      ? '/'
      : '/onboarding'
  const target = pickSafeRedirect(raw, fallback)
  return target === '/two-factor' || target.startsWith('/two-factor?') ? fallback : target
}

function AppRoot() {
  return (
    <NuqsAdapter>
      <RouteDocumentTitle />
      <Outlet />
    </NuqsAdapter>
  )
}

function notFoundLoader() {
  throw new Response('Page not found', { status: 404, statusText: 'Not Found' })
}

function dashboardAliasLoader() {
  throw redirect('/')
}

function importsAliasLoader() {
  throw redirect('/clients?importHistory=open')
}

function calendarAliasLoader() {
  throw redirect('/obligations/calendar')
}

// Only reachable when unauthenticated. If the session resolves, bounce to the
// post-login target (honouring ?redirectTo=... but only for in-app paths).
async function guestLoader(args: LoaderFunctionArgs) {
  const session = await fetchSession(args)
  const url = new URL(args.request.url)
  const consumedLocale = applyRequestLocaleHandoff(url)
  if (session) {
    const target = pickSafeRedirect(url.searchParams.get('redirectTo'))
    if (needsTwoFactorVerification(session)) {
      throw redirect(`/two-factor?redirectTo=${encodeURIComponent(target)}`)
    }
    throw redirect(target)
  }
  if (consumedLocale) throw replace(pathAndQueryWithoutLocale(url))
  return null
}

async function twoFactorLoader(args: LoaderFunctionArgs) {
  const session = await fetchSession(args)
  const url = new URL(args.request.url)
  const consumedLocale = applyRequestLocaleHandoff(url)
  if (!session) throw redirect(`/login?redirectTo=${redirectParamFromUrl(url, '/two-factor')}`)
  if (!needsTwoFactorVerification(session)) {
    throw redirect(safePostVerificationRedirect(session, url.searchParams.get('redirectTo')))
  }
  if (consumedLocale) throw replace(pathAndQueryWithoutLocale(url))
  return { user: session.user }
}

async function acceptInviteLoader(args: LoaderFunctionArgs) {
  const session = await fetchSession(args)
  const url = new URL(args.request.url)
  const consumedLocale = applyRequestLocaleHandoff(url)
  if (session && needsTwoFactorVerification(session)) {
    throw redirect(twoFactorRedirect(url, '/accept-invite'))
  }
  if (consumedLocale) throw replace(pathAndQueryWithoutLocale(url))
  return { user: session?.user ?? null }
}

// Reachable only with a valid session that has NO active organization yet —
// this is the first-login firm onboarding gate. Sessions with an active org
// bounce straight to the post-login target.
async function onboardingLoader(args: LoaderFunctionArgs) {
  const session = await fetchSession(args)
  const url = new URL(args.request.url)
  const consumedLocale = applyRequestLocaleHandoff(url)
  if (!session) throw redirect('/login?redirectTo=/onboarding')
  if (needsTwoFactorVerification(session)) {
    throw redirect(twoFactorRedirect(url, '/onboarding'))
  }
  if (session.session.activeOrganizationId) {
    throw redirect(pickSafeRedirect(url.searchParams.get('redirectTo')))
  }
  if (consumedLocale) throw replace(pathAndQueryWithoutLocale(url))
  // Note: derivePracticeName needs an i18n-localized fallback ("My Practice" /
  // "我的事务所"). Loaders run outside the React tree so they don't have an
  // i18n context — the onboarding component computes the default itself.
  return { user: session.user }
}

async function migrationActivationLoader(args: LoaderFunctionArgs) {
  const session = await fetchSession(args)
  const url = new URL(args.request.url)
  const consumedLocale = applyRequestLocaleHandoff(url)
  const pathAndQuery = pathAndQueryWithoutLocale(url)
  if (!session) {
    throw redirect(`/login?redirectTo=${encodeURIComponent(pathAndQuery || '/migration/new')}`)
  }
  if (needsTwoFactorVerification(session)) {
    throw redirect(twoFactorRedirect(url, '/migration/new'))
  }
  if (!session.session.activeOrganizationId) {
    throw redirect(`/onboarding?redirectTo=${encodeURIComponent(pathAndQuery || '/migration/new')}`)
  }
  if (consumedLocale) throw replace(pathAndQueryWithoutLocale(url))
  let firm: FirmPublic | null | undefined
  if (url.searchParams.get('source') === 'onboarding') {
    const activation = await readMigrationActivationGate(args.request)
    firm = activation.firm
    const hasCompletedActivation = activation.hasCompletedActivation
    if (hasCompletedActivation) throw redirect('/')
  }
  return { user: session.user, firm }
}

async function readMigrationActivationGate(
  request: Request,
): Promise<{ firm: FirmPublic | null; hasCompletedActivation: boolean }> {
  const firms = await orpc.firms.listMine.call(undefined, { signal: request.signal })
  const firm = firms.find((item) => item.isCurrent) ?? firms[0] ?? null
  if ((firm?.openObligationCount ?? 0) > 0) return { firm, hasCompletedActivation: true }

  try {
    const appliedBatches = await orpc.migration.listBatches.call(
      { status: 'applied', limit: 1 },
      { signal: request.signal },
    )
    return { firm, hasCompletedActivation: appliedBatches.batches.length > 0 }
  } catch {
    return { firm, hasCompletedActivation: false }
  }
}

// Gate for every authenticated surface. Children read the user via
// useRouteLoaderData(PROTECTED_ROUTE_ID) — never via a separate useSession call,
// so session changes can't trigger a mid-render client redirect.
async function protectedLoader(args: LoaderFunctionArgs) {
  const session = await fetchSession(args)
  const url = new URL(args.request.url)
  const consumedLocale = applyRequestLocaleHandoff(url)
  if (!session) {
    const pathAndQuery = pathAndQueryWithoutLocale(url)
    const param =
      pathAndQuery && pathAndQuery !== '/' ? `?redirectTo=${encodeURIComponent(pathAndQuery)}` : ''
    throw redirect(`/login${param}`)
  }
  if (needsTwoFactorVerification(session)) {
    const pathAndQuery = pathAndQueryWithoutLocale(url)
    const param =
      pathAndQuery && pathAndQuery !== '/' ? `?redirectTo=${encodeURIComponent(pathAndQuery)}` : ''
    throw redirect(`/two-factor${param}`)
  }
  // No active firm yet → first-login onboarding. Skip the redirect when we're
  // already on /onboarding to avoid a loop (defensive — /onboarding is not a
  // child of this loader, but the check is cheap).
  if (!session.session.activeOrganizationId) {
    const pathAndQuery = pathAndQueryWithoutLocale(url)
    const param =
      pathAndQuery && pathAndQuery !== '/onboarding'
        ? `?redirectTo=${encodeURIComponent(pathAndQuery)}`
        : ''
    throw redirect(`/onboarding${param}`)
  }
  if (consumedLocale) throw replace(pathAndQueryWithoutLocale(url))
  return { user: session.user }
}

export function createAppRouter() {
  return createBrowserRouter([
    {
      Component: AppRoot,
      ErrorBoundary: RouteErrorBoundary,
      children: [
        {
          // Pathless layout route — renders the shared "entry" chrome
          // (header / footer / locale switcher) once for every page users
          // see before reaching the dashboard shell. Each child owns its
          // session-state loader independently. See `docs/dev-log/
          // 2026-04-26-entry-shell-extraction.md` for the naming rationale.
          Component: EntryShell,
          children: [
            {
              path: '/login',
              loader: guestLoader,
              handle: routeHandle(routeSummaries.login),
              HydrateFallback: EntryRouteHydrateFallback,
              lazy: async () => {
                const { LoginRoute } = await import('@/routes/login')

                return { Component: LoginRoute }
              },
            },
            {
              path: '/two-factor',
              loader: twoFactorLoader,
              handle: routeHandle(routeSummaries.twoFactor),
              HydrateFallback: EntryRouteHydrateFallback,
              lazy: async () => {
                const { TwoFactorRoute } = await import('@/routes/two-factor')

                return { Component: TwoFactorRoute }
              },
            },
            {
              path: '/accept-invite',
              loader: acceptInviteLoader,
              handle: routeHandle(routeSummaries.acceptInvite),
              HydrateFallback: EntryRouteHydrateFallback,
              lazy: async () => {
                const { AcceptInviteRoute } = await import('@/routes/accept-invite')

                return { Component: AcceptInviteRoute }
              },
            },
            {
              path: '/onboarding',
              loader: onboardingLoader,
              handle: routeHandle(routeSummaries.onboarding),
              HydrateFallback: EntryRouteHydrateFallback,
              lazy: async () => {
                const { OnboardingRoute } = await import('@/routes/onboarding')

                return { Component: OnboardingRoute }
              },
            },
            {
              path: '/migration/new',
              loader: migrationActivationLoader,
              handle: routeHandle(routeSummaries.migrationNew),
              HydrateFallback: EntryRouteHydrateFallback,
              lazy: async () => {
                const { MigrationNewRoute } = await import('@/routes/migration.new')

                return { Component: MigrationNewRoute }
              },
            },
            {
              path: '/readiness/:token',
              HydrateFallback: EntryRouteHydrateFallback,
              lazy: async () => {
                const { ReadinessPortalRoute } = await import('@/routes/readiness')

                return { Component: ReadinessPortalRoute }
              },
            },
          ],
        },
        {
          id: PROTECTED_ROUTE_ID,
          path: '/',
          loader: protectedLoader,
          // Re-fetching the session on every intra-shell navigation is wasteful — the
          // Worker auth endpoint is cookie-scoped and we already revalidate after
          // form actions via the default behaviour.
          shouldRevalidate: ({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }) => {
            if (formMethod && formMethod !== 'GET') return true
            if (currentUrl.pathname === nextUrl.pathname) return defaultShouldRevalidate
            return false
          },
          Component: RootLayout,
          HydrateFallback: ShellSkeleton,
          children: [
            {
              index: true,
              handle: routeHandle(routeSummaries.dashboard),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { DashboardRoute } = await import('@/routes/dashboard')

                return { Component: DashboardRoute }
              },
            },
            {
              path: 'dashboard',
              loader: dashboardAliasLoader,
              HydrateFallback: RouteHydrateFallback,
            },
            {
              path: 'obligations',
              handle: routeHandle(routeSummaries.obligations),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { ObligationQueueRoute } = await import('@/routes/obligations')

                return { Component: ObligationQueueRoute }
              },
            },
            {
              path: 'obligations/calendar',
              handle: routeHandle(routeSummaries.calendarSync),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { CalendarRoute } = await import('@/routes/calendar')

                return { Component: CalendarRoute }
              },
            },
            {
              path: 'calendar',
              loader: calendarAliasLoader,
              HydrateFallback: RouteHydrateFallback,
            },
            {
              path: 'workload',
              handle: routeHandle(routeSummaries.workload),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { WorkloadRoute } = await import('@/routes/workload')

                return { Component: WorkloadRoute }
              },
            },
            {
              path: 'notifications',
              handle: routeHandle(routeSummaries.notifications),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { NotificationsRoute } = await import('@/routes/notifications')

                return { Component: NotificationsRoute }
              },
            },
            {
              path: 'reminders',
              handle: routeHandle(routeSummaries.reminders),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { RemindersRoute } = await import('@/routes/reminders')

                return { Component: RemindersRoute }
              },
            },
            {
              path: 'clients',
              handle: routeHandle(routeSummaries.clients),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { ClientsRoute } = await import('@/routes/clients')

                return { Component: ClientsRoute }
              },
            },
            {
              path: 'opportunities',
              handle: routeHandle(routeSummaries.opportunities),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { OpportunitiesRoute } = await import('@/routes/opportunities')

                return { Component: OpportunitiesRoute }
              },
            },
            {
              path: 'imports',
              HydrateFallback: RouteHydrateFallback,
              loader: importsAliasLoader,
            },
            {
              path: 'audit',
              handle: routeHandle(routeSummaries.audit),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { AuditRoute } = await import('@/routes/audit')

                return { Component: AuditRoute }
              },
            },
            {
              path: 'rules',
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { rulesIndexLoader } = await import('@/routes/rules')

                return { loader: rulesIndexLoader }
              },
            },
            {
              path: 'rules/coverage',
              handle: routeHandle(routeSummaries.rulesCoverage),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { RulesCoverageRoute } = await import('@/routes/rules.coverage')

                return { Component: RulesCoverageRoute }
              },
            },
            {
              path: 'rules/sources',
              handle: routeHandle(routeSummaries.rulesSources),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { RulesSourcesRoute } = await import('@/routes/rules.sources')

                return { Component: RulesSourcesRoute }
              },
            },
            {
              path: 'rules/library',
              handle: routeHandle(routeSummaries.rulesLibrary),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { RulesLibraryRoute } = await import('@/routes/rules.library')

                return { Component: RulesLibraryRoute }
              },
            },
            {
              path: 'rules/pulse',
              handle: routeHandle(routeSummaries.rulesPulse),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { RulesPulseRoute } = await import('@/routes/rules.pulse')

                return { Component: RulesPulseRoute }
              },
            },
            {
              path: 'rules/temporary',
              handle: routeHandle(routeSummaries.rulesTemporary),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { RulesTemporaryRoute } = await import('@/routes/rules.temporary')

                return { Component: RulesTemporaryRoute }
              },
            },
            {
              path: 'rules/preview',
              handle: routeHandle(routeSummaries.rulesPreview),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { RulesPreviewRoute } = await import('@/routes/rules.preview')

                return { Component: RulesPreviewRoute }
              },
            },
            {
              path: 'practice',
              handle: routeHandle(routeSummaries.practice),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { PracticeRoute } = await import('@/routes/practice')

                return { Component: PracticeRoute }
              },
            },
            {
              path: 'members',
              handle: routeHandle(routeSummaries.members),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { MembersRoute } = await import('@/routes/members')

                return { Component: MembersRoute }
              },
            },
            {
              path: 'account/security',
              handle: routeHandle(routeSummaries.accountSecurity),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { AccountSecurityRoute } = await import('@/routes/account.security')

                return { Component: AccountSecurityRoute }
              },
            },
            {
              path: 'billing',
              handle: routeHandle(routeSummaries.billing),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { BillingRoute } = await import('@/routes/billing')

                return { Component: BillingRoute }
              },
            },
            {
              path: 'billing/checkout',
              handle: routeHandle(routeSummaries.billingCheckout),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { BillingCheckoutRoute } = await import('@/routes/billing.checkout')

                return { Component: BillingCheckoutRoute }
              },
            },
            {
              path: 'billing/success',
              handle: routeHandle(routeSummaries.billingCheckout),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { BillingSuccessRoute } = await import('@/routes/billing.success')

                return { Component: BillingSuccessRoute }
              },
            },
            {
              path: 'billing/cancel',
              handle: routeHandle(routeSummaries.billingCheckout),
              HydrateFallback: RouteHydrateFallback,
              lazy: async () => {
                const { BillingCancelRoute } = await import('@/routes/billing.cancel')

                return { Component: BillingCancelRoute }
              },
            },
          ],
        },
        {
          path: '*',
          loader: notFoundLoader,
        },
      ],
    },
  ])
}

// Exported for unit tests.
export {
  acceptInviteLoader,
  dashboardAliasLoader,
  calendarAliasLoader,
  guestLoader,
  importsAliasLoader,
  migrationActivationLoader,
  onboardingLoader,
  protectedLoader,
  pickSafeRedirect,
  notFoundLoader,
  twoFactorLoader,
}
