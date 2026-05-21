import {
  test as base,
  expect,
  type APIRequestContext,
  type APIResponse,
  type Cookie,
  type Page,
} from '@playwright/test'

import { AppShellPage } from '../pages/app-shell-page'
import { AuditPage } from '../pages/audit-page'
import { BillingPage } from '../pages/billing-page'
import { ClientsPage } from '../pages/clients-page'
import { LoginPage } from '../pages/login-page'
import { MembersPage } from '../pages/members-page'
import { MigrationWizardPage } from '../pages/migration-wizard-page'
import { RulesConsolePage } from '../pages/rules-console-page'
import { ObligationQueuePage } from '../pages/obligations-page'
import { OpportunitiesPage } from '../pages/opportunities-page'
import { WorkloadPage } from '../pages/workload-page'

type AuthSeedMode = 'empty' | 'obligations' | 'pulse' | 'mfa'
type AuthRole = 'owner' | 'manager' | 'preparer' | 'coordinator'

type E2EAuthSession = {
  user: {
    id: string
    name: string
    email: string
  }
  firmId: string
  role: AuthRole
  cookie: Cookie
  seeded: {
    obligationQueueRows: Array<{
      clientName: string
      status: string
    }>
    pulseAlerts: Array<{
      alertId: string
      pulseId: string
    }>
  }
}

type DueDateFixtures = {
  loginPage: LoginPage
  authSeed: AuthSeedMode
  authRole: AuthRole
  authSession: E2EAuthSession
  authenticatedPage: Page
  appShellPage: AppShellPage
  auditPage: AuditPage
  billingPage: BillingPage
  clientsPage: ClientsPage
  membersPage: MembersPage
  migrationWizardPage: MigrationWizardPage
  rulesConsolePage: RulesConsolePage
  obligationQueuePage: ObligationQueuePage
  opportunitiesPage: OpportunitiesPage
  workloadPage: WorkloadPage
}

export const test = base.extend<DueDateFixtures>({
  authSeed: ['empty', { option: true }],
  authRole: ['owner', { option: true }],

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page))
  },

  appShellPage: async ({ authenticatedPage }, use) => {
    await use(new AppShellPage(authenticatedPage))
  },

  auditPage: async ({ authenticatedPage }, use) => {
    await use(new AuditPage(authenticatedPage))
  },

  billingPage: async ({ authenticatedPage }, use) => {
    await use(new BillingPage(authenticatedPage))
  },

  clientsPage: async ({ authenticatedPage }, use) => {
    await use(new ClientsPage(authenticatedPage))
  },

  membersPage: async ({ authenticatedPage }, use) => {
    await use(new MembersPage(authenticatedPage))
  },

  migrationWizardPage: async ({ authenticatedPage }, use) => {
    await use(new MigrationWizardPage(authenticatedPage))
  },

  rulesConsolePage: async ({ authenticatedPage }, use) => {
    await use(new RulesConsolePage(authenticatedPage))
  },

  obligationQueuePage: async ({ authenticatedPage }, use) => {
    await use(new ObligationQueuePage(authenticatedPage))
  },

  opportunitiesPage: async ({ authenticatedPage }, use) => {
    await use(new OpportunitiesPage(authenticatedPage))
  },

  workloadPage: async ({ authenticatedPage }, use) => {
    await use(new WorkloadPage(authenticatedPage))
  },

  authSession: async ({ request, authSeed, authRole }, use, testInfo) => {
    if (process.env.E2E_BASE_URL && !process.env.E2E_SEED_TOKEN) {
      throw new Error('Remote authenticated E2E requires E2E_SEED_TOKEN.')
    }

    await use(
      await createAuthSession(request, {
        seed: authSeed,
        role: authRole,
        testId: testInfo.titlePath.join(' '),
      }),
    )
  },

  authenticatedPage: async ({ page, authSession }, use) => {
    await page.context().addCookies([authSession.cookie])
    await use(page)
  },
})

export { expect }

function parseAuthSession(value: unknown): E2EAuthSession {
  if (!isRecord(value)) throw new Error('Invalid e2e auth session response.')
  const user = value.user
  const cookie = value.cookie
  const seeded = value.seeded
  if (!isRecord(user) || !isRecord(cookie) || !isRecord(seeded)) {
    throw new Error('Invalid e2e auth session response.')
  }
  if (
    typeof user.id !== 'string' ||
    typeof user.name !== 'string' ||
    typeof user.email !== 'string' ||
    typeof value.firmId !== 'string' ||
    !isAuthRole(value.role) ||
    typeof cookie.name !== 'string' ||
    typeof cookie.value !== 'string' ||
    typeof cookie.domain !== 'string' ||
    typeof cookie.path !== 'string' ||
    typeof cookie.httpOnly !== 'boolean' ||
    typeof cookie.secure !== 'boolean' ||
    cookie.sameSite !== 'Lax' ||
    typeof cookie.expires !== 'number' ||
    !Array.isArray(seeded.obligationQueueRows)
  ) {
    throw new Error('Invalid e2e auth session response.')
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    firmId: value.firmId,
    role: value.role,
    cookie: {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      expires: cookie.expires,
    },
    seeded: {
      obligationQueueRows: seeded.obligationQueueRows.filter(isObligationQueueSeedRow),
      pulseAlerts: Array.isArray(seeded.pulseAlerts)
        ? seeded.pulseAlerts.filter(isPulseSeedAlert)
        : [],
    },
  }
}

async function createAuthSession(
  request: APIRequestContext,
  data: { seed: AuthSeedMode; role: AuthRole; testId: string },
): Promise<E2EAuthSession> {
  return tryCreateAuthSession(request, data, 0)
}

const AUTH_SESSION_MAX_ATTEMPTS = 5

async function tryCreateAuthSession(
  request: APIRequestContext,
  data: { seed: AuthSeedMode; role: AuthRole; testId: string },
  attempt: number,
): Promise<E2EAuthSession> {
  let response: APIResponse
  try {
    response = await request.post('/api/e2e/session', {
      data,
      headers: e2eSeedHeaders(),
    })
  } catch (error) {
    if (attempt >= AUTH_SESSION_MAX_ATTEMPTS || !isRetryableAuthSessionError(error)) {
      throw error
    }

    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
    return tryCreateAuthSession(request, data, attempt + 1)
  }

  if (response.ok()) {
    const body: unknown = await response.json()
    return parseAuthSession(body)
  }

  const lastStatus = response.status()
  const lastBody = await response.text()
  if (attempt >= AUTH_SESSION_MAX_ATTEMPTS) {
    throw new Error(`Could not create e2e auth session: ${lastStatus} ${lastBody}`)
  }

  await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
  return tryCreateAuthSession(request, data, attempt + 1)
}

function isRetryableAuthSessionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('EADDRNOTAVAIL') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ECONNRESET') ||
    message.includes('ETIMEDOUT') ||
    message.includes('socket hang up')
  )
}

function e2eSeedHeaders(): Record<string, string> {
  return process.env.E2E_SEED_TOKEN ? { Authorization: `Bearer ${process.env.E2E_SEED_TOKEN}` } : {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isObligationQueueSeedRow(value: unknown): value is { clientName: string; status: string } {
  return isRecord(value) && typeof value.clientName === 'string' && typeof value.status === 'string'
}

function isPulseSeedAlert(value: unknown): value is { alertId: string; pulseId: string } {
  return isRecord(value) && typeof value.alertId === 'string' && typeof value.pulseId === 'string'
}

function isAuthRole(value: unknown): value is AuthRole {
  return value === 'owner' || value === 'manager' || value === 'preparer' || value === 'coordinator'
}
