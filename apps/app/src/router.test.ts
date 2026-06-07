/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Loader tests cast minimal Request fixtures into LoaderFunctionArgs and
 * narrow `unknown` thrown values into Response. Both casts are the
 * standard pattern for testing react-router loader signatures without
 * pulling in the real router runtime.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getSession = vi.hoisted(() => vi.fn())
const listMineCall = vi.hoisted(() => vi.fn())
const listBatchesCall = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth', () => ({
  authClient: {
    getSession,
  },
}))

vi.mock('@/lib/rpc', () => ({
  orpc: {
    firms: {
      listMine: {
        call: listMineCall,
      },
    },
    migration: {
      listBatches: {
        call: listBatchesCall,
      },
    },
  },
}))

// Import after the mock so the loaders pick up the stubbed authClient.
const {
  acceptInviteLoader,
  calendarAliasLoader,
  dashboardAliasLoader,
  guestLoader,
  importsAliasLoader,
  legacyObligationsAliasLoader,
  legacyObligationsCalendarAliasLoader,
  migrationActivationLoader,
  onboardingLoader,
  protectedLoader,
  pickSafeRedirect,
  notFoundLoader,
  twoFactorLoader,
} = await import('@/router')
const { formatDocumentTitle, getRouteSummaryMessages, routeSummaries } =
  await import('@/routes/route-summary')
const { activateLocale, currentLocale } = await import('@/i18n/i18n')

type SessionShape = {
  user: { id: string; name?: string; email?: string; twoFactorEnabled?: boolean }
  session: { activeOrganizationId: string | null; twoFactorVerified?: boolean }
}

function makeSession(
  activeOrganizationId: string | null,
  options: { twoFactorEnabled?: boolean; twoFactorVerified?: boolean } = {},
): SessionShape {
  return {
    user: {
      id: 'user_1',
      name: 'Alex Chen',
      email: 'alex@example.com',
      ...(options.twoFactorEnabled === undefined
        ? {}
        : { twoFactorEnabled: options.twoFactorEnabled }),
    },
    session: {
      activeOrganizationId,
      ...(options.twoFactorVerified === undefined
        ? {}
        : { twoFactorVerified: options.twoFactorVerified }),
    },
  }
}

function makeArgs(url: string) {
  return { request: new Request(url) } as unknown as Parameters<typeof protectedLoader>[0]
}

async function expectRedirectTo(
  promise: Promise<unknown>,
  expected: string,
  expectedStatus = 302,
): Promise<void> {
  let thrown: unknown
  try {
    await promise
  } catch (err) {
    thrown = err
  }
  expect(thrown).toBeInstanceOf(Response)
  const res = thrown as Response
  expect(res.status).toBe(expectedStatus)
  expect(res.headers.get('Location')).toBe(expected)
}

async function expectReplaceTo(promise: Promise<unknown>, expected: string): Promise<void> {
  let thrown: unknown
  try {
    await promise
  } catch (err) {
    thrown = err
  }
  expect(thrown).toBeInstanceOf(Response)
  const res = thrown as Response
  expect(res.status).toBe(302)
  expect(res.headers.get('Location')).toBe(expected)
  expect(res.headers.get('X-Remix-Replace')).toBe('true')
}

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.lang = ''
  activateLocale('en')
  listMineCall.mockReset()
  listMineCall.mockResolvedValue([])
  listBatchesCall.mockReset()
  listBatchesCall.mockResolvedValue({ batches: [] })
})

describe('pickSafeRedirect', () => {
  it('returns the fallback for empty / null / undefined input', () => {
    expect(pickSafeRedirect(null)).toBe('/')
    expect(pickSafeRedirect(undefined)).toBe('/')
    expect(pickSafeRedirect('')).toBe('/')
  })

  it('rejects external URLs to prevent open redirect', () => {
    expect(pickSafeRedirect('https://evil.com')).toBe('/')
    expect(pickSafeRedirect('//evil.com/path')).toBe('/')
    expect(pickSafeRedirect('javascript:alert(1)')).toBe('/')
  })

  it('accepts in-app paths only (must start with single /)', () => {
    expect(pickSafeRedirect('/dashboard')).toBe('/dashboard')
    expect(pickSafeRedirect('/deadlines?scope=me')).toBe('/deadlines?scope=me')
  })

  it('honours a custom fallback', () => {
    expect(pickSafeRedirect('https://evil.com', '/safe')).toBe('/safe')
  })
})

describe('notFoundLoader', () => {
  it('throws a 404 response for unmatched public routes', () => {
    let thrown: unknown
    try {
      notFoundLoader()
    } catch (err) {
      thrown = err
    }

    expect(thrown).toBeInstanceOf(Response)
    const res = thrown as Response
    expect(res.status).toBe(404)
    expect(res.statusText).toBe('Not Found')
  })
})

describe('dashboardAliasLoader', () => {
  it('redirects /dashboard to the canonical app root', async () => {
    await expectRedirectTo(
      Promise.resolve().then(() => dashboardAliasLoader()),
      '/',
    )
  })
})

describe('importsAliasLoader', () => {
  it('redirects /imports to Clients with import history open', async () => {
    await expectRedirectTo(
      Promise.resolve().then(() => importsAliasLoader()),
      '/clients?importHistory=open',
    )
  })
})

describe('calendarAliasLoader', () => {
  it('redirects /calendar to the Deadlines calendar sync page', async () => {
    await expectRedirectTo(
      Promise.resolve().then(() => calendarAliasLoader(makeArgs('http://localhost/calendar'))),
      '/deadlines/calendar',
    )
  })
})

describe('legacy obligations alias loaders', () => {
  it('permanently (301) redirects /obligations to the Deadlines page while preserving query', async () => {
    await expectRedirectTo(
      Promise.resolve().then(() =>
        legacyObligationsAliasLoader(makeArgs('http://localhost/obligations?status=review')),
      ),
      '/deadlines?status=review',
      301,
    )
  })

  it('redirects /obligations/calendar to the Deadlines calendar sync page', async () => {
    await expectRedirectTo(
      Promise.resolve().then(() =>
        legacyObligationsCalendarAliasLoader(
          makeArgs('http://localhost/obligations/calendar?scope=mine'),
        ),
      ),
      '/deadlines/calendar?scope=mine',
    )
  })
})

describe('route metadata', () => {
  it('uses the deepest matched route summary', () => {
    expect(
      getRouteSummaryMessages([
        { handle: { routeSummary: routeSummaries.dashboard } },
        { handle: { routeSummary: routeSummaries.clients } },
      ]),
    ).toBe(routeSummaries.clients)
  })

  it('falls back to dashboard when no route summary is matched', () => {
    expect(getRouteSummaryMessages([{ handle: {} }])).toBe(routeSummaries.dashboard)
  })

  it('formats browser titles with the app suffix', () => {
    expect(formatDocumentTitle('Clients')).toBe('Clients | DueDateHQ')
    expect(formatDocumentTitle('Reminders')).toBe('Reminders | DueDateHQ')
    expect(formatDocumentTitle('DueDateHQ')).toBe('DueDateHQ')
  })
})

describe('protectedLoader', () => {
  beforeEach(() => {
    getSession.mockReset()
    // The unauthenticated cases below assert the production `/login`
    // redirect. Under Vitest `import.meta.env.DEV` is true, so
    // protectedLoader would instead bootstrap a demo session via
    // `/api/e2e/demo-login` and park on a never-resolving promise — which
    // hangs the test. Force prod mode so the `/login` redirect path runs.
    vi.stubEnv('DEV', false)
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('redirects to /login with redirectTo when no session', async () => {
    getSession.mockResolvedValueOnce({ data: null })
    await expectRedirectTo(
      protectedLoader(makeArgs('http://localhost/deadlines?scope=me')),
      '/login?redirectTo=%2Fdeadlines%3Fscope%3Dme',
    )
  })

  it('consumes and drops a valid locale handoff when redirecting unauthenticated users', async () => {
    getSession.mockResolvedValueOnce({ data: null })
    await expectRedirectTo(
      protectedLoader(makeArgs('http://localhost/deadlines?scope=me&lng=zh-CN')),
      '/login?redirectTo=%2Fdeadlines%3Fscope%3Dme',
    )
    expect(window.localStorage.getItem('lng')).toBe('zh-CN')
    expect(currentLocale()).toBe('zh-CN')
  })

  it('redirects to /login (no redirectTo) when the originating path is /', async () => {
    getSession.mockResolvedValueOnce({ data: null })
    await expectRedirectTo(protectedLoader(makeArgs('http://localhost/')), '/login')
  })

  it('consumes the marketing root locale handoff before redirecting to login', async () => {
    getSession.mockResolvedValueOnce({ data: null })
    await expectRedirectTo(protectedLoader(makeArgs('http://localhost/?lng=zh-CN')), '/login')
    expect(window.localStorage.getItem('lng')).toBe('zh-CN')
    expect(currentLocale()).toBe('zh-CN')
  })

  it('redirects to /onboarding when session has no activeOrganizationId', async () => {
    getSession.mockResolvedValueOnce({ data: makeSession(null) })
    await expectRedirectTo(
      protectedLoader(makeArgs('http://localhost/dashboard')),
      '/onboarding?redirectTo=%2Fdashboard',
    )
  })

  it('returns the user when session has an active practice', async () => {
    getSession.mockResolvedValueOnce({ data: makeSession('firm_1') })
    const result = await protectedLoader(makeArgs('http://localhost/'))
    expect(result).toEqual({ user: { id: 'user_1', name: 'Alex Chen', email: 'alex@example.com' } })
  })

  it('redirects MFA-enabled sessions to two-factor verification until the session is verified', async () => {
    getSession.mockResolvedValueOnce({
      data: makeSession('firm_1', { twoFactorEnabled: true, twoFactorVerified: false }),
    })
    await expectRedirectTo(
      protectedLoader(makeArgs('http://localhost/deadlines?scope=me')),
      '/two-factor?redirectTo=%2Fdeadlines%3Fscope%3Dme',
    )
  })

  it('redirects MFA-enabled sessions to two-factor before onboarding when no active practice exists', async () => {
    getSession.mockResolvedValueOnce({
      data: makeSession(null, { twoFactorEnabled: true, twoFactorVerified: false }),
    })
    await expectRedirectTo(
      protectedLoader(makeArgs('http://localhost/dashboard')),
      '/two-factor?redirectTo=%2Fdashboard',
    )
  })

  it('allows MFA-enabled sessions after current-session two-factor verification', async () => {
    getSession.mockResolvedValueOnce({
      data: makeSession('firm_1', { twoFactorEnabled: true, twoFactorVerified: true }),
    })
    const result = await protectedLoader(makeArgs('http://localhost/'))
    expect(result).toEqual({
      user: {
        id: 'user_1',
        name: 'Alex Chen',
        email: 'alex@example.com',
        twoFactorEnabled: true,
      },
    })
  })
})

describe('onboardingLoader', () => {
  beforeEach(() => {
    getSession.mockReset()
  })

  it('redirects to /login when no session', async () => {
    getSession.mockResolvedValueOnce({ data: null })
    await expectRedirectTo(
      onboardingLoader(makeArgs('http://localhost/onboarding')),
      '/login?redirectTo=/onboarding',
    )
  })

  it('consumes and drops a valid locale handoff when bouncing onboarding to login', async () => {
    getSession.mockResolvedValueOnce({ data: null })
    await expectRedirectTo(
      onboardingLoader(makeArgs('http://localhost/onboarding?lng=zh-CN')),
      '/login?redirectTo=/onboarding',
    )
    expect(window.localStorage.getItem('lng')).toBe('zh-CN')
    expect(currentLocale()).toBe('zh-CN')
  })

  it('redirects to redirectTo (or /) when an active practice already exists', async () => {
    getSession.mockResolvedValueOnce({ data: makeSession('firm_1') })
    await expectRedirectTo(
      onboardingLoader(makeArgs('http://localhost/onboarding?redirectTo=/deadlines')),
      '/deadlines',
    )

    getSession.mockResolvedValueOnce({ data: makeSession('firm_1') })
    await expectRedirectTo(onboardingLoader(makeArgs('http://localhost/onboarding')), '/')
  })

  it('drops external redirectTo values to defend against open redirect', async () => {
    getSession.mockResolvedValueOnce({ data: makeSession('firm_1') })
    await expectRedirectTo(
      onboardingLoader(makeArgs('http://localhost/onboarding?redirectTo=https://evil.com')),
      '/',
    )
  })

  it('returns the user when session has no activeOrganizationId', async () => {
    getSession.mockResolvedValueOnce({ data: makeSession(null) })
    const result = await onboardingLoader(makeArgs('http://localhost/onboarding'))
    expect(result).toEqual({ user: { id: 'user_1', name: 'Alex Chen', email: 'alex@example.com' } })
  })

  it('redirects MFA-enabled onboarding sessions to two-factor first', async () => {
    getSession.mockResolvedValueOnce({
      data: makeSession(null, { twoFactorEnabled: true, twoFactorVerified: false }),
    })
    await expectRedirectTo(
      onboardingLoader(makeArgs('http://localhost/onboarding')),
      '/two-factor?redirectTo=%2Fonboarding',
    )
  })
})

describe('twoFactorLoader', () => {
  beforeEach(() => {
    getSession.mockReset()
  })

  it('redirects unauthenticated users to login with the two-factor redirect target', async () => {
    getSession.mockResolvedValueOnce({ data: null })
    await expectRedirectTo(
      twoFactorLoader(makeArgs('http://localhost/two-factor')),
      '/login?redirectTo=%2Ftwo-factor',
    )
  })

  it('returns the user when the current session still needs two-factor verification', async () => {
    getSession.mockResolvedValueOnce({
      data: makeSession('firm_1', { twoFactorEnabled: true, twoFactorVerified: false }),
    })
    const result = await twoFactorLoader(makeArgs('http://localhost/two-factor'))
    expect(result).toEqual({
      user: {
        id: 'user_1',
        name: 'Alex Chen',
        email: 'alex@example.com',
        twoFactorEnabled: true,
      },
    })
  })

  it('redirects verified sessions away from two-factor to the safe target', async () => {
    getSession.mockResolvedValueOnce({
      data: makeSession('firm_1', { twoFactorEnabled: true, twoFactorVerified: true }),
    })
    await expectRedirectTo(
      twoFactorLoader(makeArgs('http://localhost/two-factor?redirectTo=/deadlines')),
      '/deadlines',
    )
  })

  it('redirects sessions that do not need two-factor to onboarding when no practice exists', async () => {
    getSession.mockResolvedValueOnce({ data: makeSession(null) })
    await expectRedirectTo(twoFactorLoader(makeArgs('http://localhost/two-factor')), '/onboarding')
  })

  it('rejects unsafe or self-referential post-verification redirects', async () => {
    getSession.mockResolvedValueOnce({ data: makeSession('firm_1') })
    await expectRedirectTo(
      twoFactorLoader(makeArgs('http://localhost/two-factor?redirectTo=https://evil.com')),
      '/',
    )

    getSession.mockResolvedValueOnce({ data: makeSession('firm_1') })
    await expectRedirectTo(
      twoFactorLoader(makeArgs('http://localhost/two-factor?redirectTo=/two-factor')),
      '/',
    )
  })
})

describe('acceptInviteLoader', () => {
  beforeEach(() => {
    getSession.mockReset()
  })

  it('allows unauthenticated users to reach the invitation sign-in surface', async () => {
    getSession.mockResolvedValueOnce({ data: null })
    const result = await acceptInviteLoader(makeArgs('http://localhost/accept-invite?id=inv_1'))
    expect(result).toEqual({ user: null })
  })

  it('redirects MFA-enabled signed-in users to two-factor before invitation acceptance', async () => {
    getSession.mockResolvedValueOnce({
      data: makeSession('firm_1', { twoFactorEnabled: true, twoFactorVerified: false }),
    })
    await expectRedirectTo(
      acceptInviteLoader(makeArgs('http://localhost/accept-invite?id=inv_1')),
      '/two-factor?redirectTo=%2Faccept-invite%3Fid%3Dinv_1',
    )
  })

  it('allows verified signed-in users to reach the invitation acceptance surface', async () => {
    getSession.mockResolvedValueOnce({
      data: makeSession('firm_1', { twoFactorEnabled: true, twoFactorVerified: true }),
    })
    const result = await acceptInviteLoader(makeArgs('http://localhost/accept-invite?id=inv_1'))
    expect(result).toEqual({
      user: {
        id: 'user_1',
        name: 'Alex Chen',
        email: 'alex@example.com',
        twoFactorEnabled: true,
      },
    })
  })
})

describe('migrationActivationLoader', () => {
  beforeEach(() => {
    getSession.mockReset()
  })

  it('redirects unauthenticated users to login with the migration redirect target', async () => {
    getSession.mockResolvedValueOnce({ data: null })
    await expectRedirectTo(
      migrationActivationLoader(makeArgs('http://localhost/migration/new?source=onboarding')),
      '/login?redirectTo=%2Fmigration%2Fnew%3Fsource%3Donboarding',
    )
  })

  it('redirects sessions without an active practice back to onboarding', async () => {
    getSession.mockResolvedValueOnce({ data: makeSession(null) })
    await expectRedirectTo(
      migrationActivationLoader(makeArgs('http://localhost/migration/new?source=onboarding')),
      '/onboarding?redirectTo=%2Fmigration%2Fnew%3Fsource%3Donboarding',
    )
  })

  it('redirects MFA-enabled migration activation sessions to two-factor first', async () => {
    getSession.mockResolvedValueOnce({
      data: makeSession(null, { twoFactorEnabled: true, twoFactorVerified: false }),
    })
    await expectRedirectTo(
      migrationActivationLoader(makeArgs('http://localhost/migration/new?source=onboarding')),
      '/two-factor?redirectTo=%2Fmigration%2Fnew%3Fsource%3Donboarding',
    )
  })

  it('returns the user when the session is ready for activation import', async () => {
    getSession.mockResolvedValueOnce({ data: makeSession('firm_1') })
    const result = await migrationActivationLoader(makeArgs('http://localhost/migration/new'))
    expect(result).toEqual({
      user: { id: 'user_1', name: 'Alex Chen', email: 'alex@example.com' },
      firm: undefined,
    })
    expect(listMineCall).not.toHaveBeenCalled()
    expect(listBatchesCall).not.toHaveBeenCalled()
  })

  it('returns the user for onboarding-sourced activation when no activation data exists yet', async () => {
    getSession.mockResolvedValueOnce({ data: makeSession('firm_1') })
    listMineCall.mockResolvedValueOnce([{ isCurrent: true, openObligationCount: 0 }])
    const result = await migrationActivationLoader(
      makeArgs('http://localhost/migration/new?source=onboarding'),
    )
    expect(result).toEqual({
      user: { id: 'user_1', name: 'Alex Chen', email: 'alex@example.com' },
      firm: { isCurrent: true, openObligationCount: 0 },
    })
    expect(listMineCall).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(listBatchesCall).toHaveBeenCalledWith(
      { status: 'applied', limit: 1 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('redirects onboarding-sourced activation once the current firm has obligations', async () => {
    getSession.mockResolvedValueOnce({ data: makeSession('firm_1') })
    listMineCall.mockResolvedValueOnce([{ isCurrent: true, openObligationCount: 3 }])
    await expectRedirectTo(
      migrationActivationLoader(makeArgs('http://localhost/migration/new?source=onboarding')),
      '/',
    )
    expect(listBatchesCall).not.toHaveBeenCalled()
  })

  it('redirects onboarding-sourced activation after a migration has already applied', async () => {
    getSession.mockResolvedValueOnce({ data: makeSession('firm_1') })
    listBatchesCall.mockResolvedValueOnce({ batches: [{ id: 'batch_1' }] })
    await expectRedirectTo(
      migrationActivationLoader(makeArgs('http://localhost/migration/new?source=onboarding')),
      '/',
    )
  })

  it('keeps the route reachable when migration history lookup is forbidden', async () => {
    getSession.mockResolvedValueOnce({ data: makeSession('firm_1') })
    listBatchesCall.mockRejectedValueOnce(new Error('Forbidden'))
    const result = await migrationActivationLoader(
      makeArgs('http://localhost/migration/new?source=onboarding'),
    )
    expect(result).toEqual({
      user: { id: 'user_1', name: 'Alex Chen', email: 'alex@example.com' },
      firm: null,
    })
  })
})

describe('guestLoader', () => {
  beforeEach(() => {
    getSession.mockReset()
  })

  it('returns null when no session', async () => {
    getSession.mockResolvedValueOnce({ data: null })
    const result = await guestLoader(makeArgs('http://localhost/login'))
    expect(result).toBeNull()
  })

  it('redirects authed users to redirectTo (safe paths only)', async () => {
    getSession.mockResolvedValueOnce({ data: makeSession('firm_1') })
    await expectRedirectTo(guestLoader(makeArgs('http://localhost/login?redirectTo=/')), '/')
  })

  it('redirects MFA-enabled authed users from login to two-factor', async () => {
    getSession.mockResolvedValueOnce({
      data: makeSession('firm_1', { twoFactorEnabled: true, twoFactorVerified: false }),
    })
    await expectRedirectTo(
      guestLoader(makeArgs('http://localhost/login?redirectTo=/deadlines')),
      '/two-factor?redirectTo=%2Fdeadlines',
    )
  })

  it('consumes and drops a valid locale handoff when redirecting authed users away from login', async () => {
    getSession.mockResolvedValueOnce({ data: makeSession('firm_1') })
    await expectRedirectTo(guestLoader(makeArgs('http://localhost/login?lng=zh-CN')), '/')
    expect(window.localStorage.getItem('lng')).toBe('zh-CN')
    expect(currentLocale()).toBe('zh-CN')
  })

  it('replaces the login URL after consuming lng for unauthenticated users', async () => {
    getSession.mockResolvedValueOnce({ data: null })
    await expectReplaceTo(guestLoader(makeArgs('http://localhost/login?lng=zh-CN')), '/login')
    expect(window.localStorage.getItem('lng')).toBe('zh-CN')
    expect(currentLocale()).toBe('zh-CN')
  })

  it('falls back to / when redirectTo is external', async () => {
    getSession.mockResolvedValueOnce({ data: makeSession('firm_1') })
    await expectRedirectTo(
      guestLoader(makeArgs('http://localhost/login?redirectTo=//evil.com')),
      '/',
    )
  })
})
