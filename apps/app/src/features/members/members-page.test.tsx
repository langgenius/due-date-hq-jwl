import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SMART_PRIORITY_DEFAULT_PROFILE, type FirmPublic } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'
import { MembersPageRoute } from './members-page'

const rpcMocks = vi.hoisted(() => ({
  listMineQueryFn: vi.fn(),
  membersListQueryFn: vi.fn(),
}))

vi.mock('@/lib/rpc', () => ({
  orpc: {
    firms: {
      listMine: {
        queryOptions: () => ({
          queryKey: ['firms', 'listMine'],
          queryFn: rpcMocks.listMineQueryFn,
        }),
      },
    },
    members: {
      listCurrent: {
        queryOptions: () => ({
          queryKey: ['members', 'listCurrent'],
          queryFn: rpcMocks.membersListQueryFn,
        }),
      },
    },
  },
}))

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function firm(overrides: Partial<FirmPublic> = {}): FirmPublic {
  return {
    id: 'firm_1',
    name: 'Test Firm',
    slug: 'test-firm',
    plan: 'solo',
    seatLimit: 1,
    timezone: 'America/New_York',
    internalDeadlineOffsetDays: 14,
    status: 'active',
    role: 'owner',
    ownerUserId: 'user_1',
    coordinatorCanSeeDollars: false,
    smartPriorityProfile: SMART_PRIORITY_DEFAULT_PROFILE,
    openObligationCount: 0,
    isCurrent: true,
    createdAt: '2026-05-03T00:00:00.000Z',
    updatedAt: '2026-05-03T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  }
}

async function render(children: ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  await act(async () => {
    root?.render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <AppI18nProvider>{children}</AppI18nProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
  })
}

async function waitForText(text: string, attempts = 100): Promise<void> {
  if (document.body.textContent?.includes(text)) return
  if (attempts > 0) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
    return waitForText(text, attempts - 1)
  }
  throw new Error(
    `Expected text not found: ${text}; body=${document.body.textContent ?? ''}; listMineCalls=${
      rpcMocks.listMineQueryFn.mock.calls.length
    }`,
  )
}

beforeEach(() => {
  bootstrapI18n()
  rpcMocks.listMineQueryFn.mockReset()
  rpcMocks.membersListQueryFn.mockReset()
})

afterEach(() => {
  if (root) {
    act(() => root?.unmount())
  }
  container?.remove()
  root = null
  container = null
  document.body.replaceChildren()
  activateLocale('en')
})

describe('MembersPageRoute permissions', () => {
  it('renders the permission panel without firing the restricted members query', async () => {
    rpcMocks.listMineQueryFn.mockResolvedValue([firm({ role: 'manager' })])
    rpcMocks.membersListQueryFn.mockRejectedValue(new Error('members query should stay disabled'))

    await render(<MembersPageRoute />)

    await waitForText('Current role: Manager')
    expect(document.body.textContent).toContain('Owner permission required')
    expect(document.body.textContent).toContain('Current role: Manager')
    expect(rpcMocks.membersListQueryFn).not.toHaveBeenCalled()
  })
})
