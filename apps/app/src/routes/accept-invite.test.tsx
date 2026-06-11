import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'
import { AcceptInviteRoute } from './accept-invite'

const authMocks = vi.hoisted(() => ({
  sendEmailSignInCode: vi.fn(),
  signInWithEmailCode: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithMicrosoft: vi.fn(),
}))

const capabilityMocks = vi.hoisted(() => ({
  authCapabilities: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authClient: {
    useSession: () => ({ data: null }),
  },
  displayNameFromEmail: (email: string) => email,
  sendEmailSignInCode: authMocks.sendEmailSignInCode,
  signInWithEmailCode: authMocks.signInWithEmailCode,
  signInWithGoogle: authMocks.signInWithGoogle,
  signInWithMicrosoft: authMocks.signInWithMicrosoft,
}))

vi.mock('@/lib/auth-capabilities', () => ({
  authCapabilities: capabilityMocks.authCapabilities,
}))

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

async function renderInvite() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      {
        path: '/accept-invite',
        element: <AcceptInviteRoute />,
        loader: () => ({ user: null }),
      },
    ],
    { initialEntries: ['/accept-invite?id=invite_1'] },
  )

  await act(async () => {
    root?.render(
      <QueryClientProvider client={client}>
        <AppI18nProvider>
          <RouterProvider router={router} />
        </AppI18nProvider>
      </QueryClientProvider>,
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
  throw new Error(`Expected text not found: ${text}; body=${document.body.textContent ?? ''}`)
}

function changeInput(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
  act(() => {
    descriptor?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function requireInput(input: HTMLInputElement | null): HTMLInputElement {
  expect(input).toBeInstanceOf(HTMLInputElement)
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected input element')
  return input
}

function clickButton(label: string) {
  const button = Array.from(document.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(label),
  )
  expect(button).toBeInstanceOf(HTMLButtonElement)
  act(() => {
    button?.click()
  })
}

beforeEach(() => {
  bootstrapI18n()
  capabilityMocks.authCapabilities.mockResolvedValue({
    providers: {
      google: true,
      microsoft: false,
      emailOtp: true,
    },
  })
  authMocks.sendEmailSignInCode.mockResolvedValue({ data: { success: true }, error: null })
  authMocks.signInWithEmailCode.mockResolvedValue({ data: { user: { id: 'user_1' } }, error: null })
  authMocks.signInWithGoogle.mockResolvedValue(undefined)
  authMocks.signInWithMicrosoft.mockResolvedValue(undefined)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/api/auth/organization/get-invitation')) {
        return new Response(
          JSON.stringify({
            id: 'invite_1',
            email: 'alex@example.com',
            role: 'owner',
            organizationName: 'Bright CPA',
            inviterEmail: 'owner@example.com',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }
      return new Response('{}', { status: 404 })
    }),
  )
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
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('AcceptInviteRoute email OTP', () => {
  it('lets an unauthenticated invitee sign in with email OTP and then loads the invitation', async () => {
    await renderInvite()
    await waitForText('Email me a code')

    const emailInput = requireInput(document.querySelector<HTMLInputElement>('input[type="email"]'))
    changeInput(emailInput, 'alex@example.com')
    clickButton('Email me a code')
    await waitForText('Verify code')

    const codeInput = requireInput(document.querySelector<HTMLInputElement>('input[name="otp"]'))
    changeInput(codeInput, '123456')
    clickButton('Verify code')

    await waitForText('owner@example.com invited you to Bright CPA')
    expect(authMocks.signInWithEmailCode).toHaveBeenCalledWith({
      email: 'alex@example.com',
      otp: '123456',
      name: 'alex@example.com',
    })
  })
})
