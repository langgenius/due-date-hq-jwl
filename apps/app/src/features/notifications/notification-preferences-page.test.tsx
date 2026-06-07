import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NotificationPreferencePublic } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

const rpcMocks = vi.hoisted(() => ({
  getPreferencesFn: vi.fn(),
  listRunsFn: vi.fn(),
  updatePreferencesFn: vi.fn(),
  previewFn: vi.fn(),
}))

vi.mock('@/lib/rpc', () => ({
  orpc: {
    notifications: {
      key: () => ['notifications'],
      getPreferences: {
        queryOptions: () => ({
          queryKey: ['notifications', 'getPreferences'],
          queryFn: async () => rpcMocks.getPreferencesFn(),
        }),
      },
      listMorningDigestRuns: {
        queryOptions: () => ({
          queryKey: ['notifications', 'listMorningDigestRuns'],
          queryFn: async () => rpcMocks.listRunsFn(),
        }),
      },
      updatePreferences: {
        mutationOptions: (opts: { onSuccess?: () => void }) => ({
          mutationFn: async (input: unknown) => {
            rpcMocks.updatePreferencesFn(input)
            return input
          },
          onSuccess: opts.onSuccess,
        }),
      },
      previewMorningDigest: {
        mutationOptions: (opts: { onSuccess?: () => void }) => ({
          mutationFn: async () => rpcMocks.previewFn(),
          onSuccess: opts.onSuccess,
        }),
      },
    },
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { NotificationPreferencesPage } from './notification-preferences-page'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const PREFERENCES: NotificationPreferencePublic = {
  emailEnabled: true,
  inAppEnabled: true,
  remindersEnabled: true,
  pulseEnabled: true,
  unassignedRemindersEnabled: true,
  morningDigestEnabled: true,
  morningDigestHour: 8,
  morningDigestDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  bootstrapI18n()
  activateLocale('en')
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  rpcMocks.getPreferencesFn.mockReset()
  rpcMocks.listRunsFn.mockReset()
  rpcMocks.updatePreferencesFn.mockReset()
  rpcMocks.listRunsFn.mockResolvedValue({ runs: [] })
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function render() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => {
    root.render(
      <AppI18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <NotificationPreferencesPage />
          </MemoryRouter>
        </QueryClientProvider>
      </AppI18nProvider>,
    )
  })
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!container.querySelector('[aria-busy="true"]')) break
    // eslint-disable-next-line no-await-in-loop -- sequential render flush is intentional
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
}

describe('NotificationPreferencesPage', () => {
  it('renders the channels, matrix, and quiet-hours surfaces', async () => {
    rpcMocks.getPreferencesFn.mockResolvedValue(PREFERENCES)
    await render()
    expect(container.textContent).toContain('Channels')
    expect(container.textContent).toContain('Notification types')
    expect(container.textContent).toContain('Quiet hours')
    expect(container.textContent).toContain('Morning digest')
  })

  it('toggles the email channel through updatePreferences', async () => {
    rpcMocks.getPreferencesFn.mockResolvedValue(PREFERENCES)
    await render()

    const emailSwitch = container.querySelector('[role="switch"][aria-label="Email"]')
    expect(emailSwitch).toBeInstanceOf(HTMLElement)

    await act(async () => {
      if (emailSwitch instanceof HTMLElement) emailSwitch.click()
    })
    expect(rpcMocks.updatePreferencesFn).toHaveBeenCalledWith({ emailEnabled: false })
  })
})
