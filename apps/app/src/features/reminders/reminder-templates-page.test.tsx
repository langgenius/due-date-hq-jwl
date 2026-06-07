import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReminderTemplatePublic } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

const rpcMocks = vi.hoisted(() => ({
  listTemplatesFn: vi.fn(),
}))

vi.mock('@/lib/rpc', () => ({
  orpc: {
    reminders: {
      key: () => ['reminders'],
      listTemplates: {
        queryOptions: () => ({
          queryKey: ['reminders', 'listTemplates'],
          queryFn: async () => rpcMocks.listTemplatesFn(),
        }),
      },
    },
  },
}))

import { ReminderTemplatesPage } from './reminder-templates-page'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const TEMPLATE: ReminderTemplatePublic = {
  id: 'tpl_1',
  firmId: 'firm_1',
  templateKey: 'client-deadline-30-day-reminder',
  kind: 'client_deadline_reminder',
  name: '1040 prep · round 1',
  subject: 'Quick nudge — your 1040 docs',
  bodyText: 'Hi {{client_name}}, friendly reminder…',
  active: true,
  isSystem: false,
  usageCount: 84,
  lastSentAt: null,
  createdAt: null,
  updatedAt: null,
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  bootstrapI18n()
  activateLocale('en')
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  rpcMocks.listTemplatesFn.mockReset()
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
            <ReminderTemplatesPage />
          </MemoryRouter>
        </QueryClientProvider>
      </AppI18nProvider>,
    )
  })
  // flush the async query until the loading skeleton clears
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!container.querySelector('[aria-busy="true"]')) break
    // eslint-disable-next-line no-await-in-loop -- sequential render flush is intentional
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
}

describe('ReminderTemplatesPage', () => {
  it('renders a card per template with an edit link', async () => {
    rpcMocks.listTemplatesFn.mockResolvedValue([TEMPLATE])
    await render()

    expect(container.textContent).toContain('1040 prep · round 1')
    expect(container.textContent).toContain('used 84 times')

    const editLink = container.querySelector('a[href*="/settings/reminders/templates/edit"]')
    expect(editLink).not.toBeNull()
    expect(editLink?.getAttribute('href')).toContain(
      encodeURIComponent('client-deadline-30-day-reminder'),
    )
  })

  it('renders an empty state when there are no templates', async () => {
    rpcMocks.listTemplatesFn.mockResolvedValue([])
    await render()
    expect(container.textContent).toContain('No reminder templates yet.')
  })
})
