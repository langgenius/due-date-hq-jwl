import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { AppI18nProvider } from '@/i18n/provider'

const rpcMocks = vi.hoisted(() => ({ resolve: vi.fn() }))

vi.mock('@/lib/rpc', () => ({
  orpc: {
    pulse: {
      resolveSocialAlert: {
        queryOptions: ({ input }: { input: { ref: string } }) => ({
          queryKey: ['pulse', 'resolveSocialAlert', input],
          queryFn: () => rpcMocks.resolve(input),
        }),
      },
    },
  },
}))

import { SocialAlertIntentResolver } from './SocialAlertIntentResolver'

const REF = 'social_ref_1234567890abcdef'
let root: Root | null = null
let container: HTMLDivElement | null = null

function LocationProbe() {
  const location = useLocation()
  return <output>{`${location.pathname}${location.search}`}</output>
}

async function render(children: ReactNode, initialEntry: string) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  await act(async () => {
    root?.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <QueryClientProvider client={client}>
          <AppI18nProvider>{children}</AppI18nProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
  })
}

async function waitForText(text: string, attempts = 100): Promise<void> {
  if (document.body.textContent?.includes(text)) return
  if (attempts === 0) throw new Error(`Expected text not found: ${text}`)
  await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))
  return waitForText(text, attempts - 1)
}

beforeEach(() => {
  bootstrapI18n()
  rpcMocks.resolve.mockReset()
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  document.body.replaceChildren()
})

describe('SocialAlertIntentResolver', () => {
  it('replaces the global ref with the current firm alert id', async () => {
    rpcMocks.resolve.mockResolvedValue({ alertId: '11111111-1111-4111-8111-111111111111' })

    await render(
      <Routes>
        <Route
          path="/alerts"
          element={
            <>
              <SocialAlertIntentResolver />
              <LocationProbe />
            </>
          }
        />
      </Routes>,
      `/alerts?ref=${REF}`,
    )

    await waitForText('/alerts?alert=11111111-1111-4111-8111-111111111111')
    expect(rpcMocks.resolve).toHaveBeenCalledWith({ ref: REF })
  })

  it('does not call the resolver for a malformed ref', async () => {
    await render(<SocialAlertIntentResolver />, '/alerts?ref=short')

    expect(rpcMocks.resolve).not.toHaveBeenCalled()
    expect(document.body.textContent).toBe('')
  })

  it('keeps the Alerts page usable when a published ref no longer resolves', async () => {
    rpcMocks.resolve.mockRejectedValue(new Error('not found'))

    await render(<SocialAlertIntentResolver />, `/alerts?ref=${REF}`)

    await waitForText('This alert link is no longer available')
    expect(document.querySelector('[role="alert"]')).not.toBeNull()
  })
})
