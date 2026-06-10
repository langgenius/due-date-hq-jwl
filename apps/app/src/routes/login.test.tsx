import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'
import { LoginRoute } from './login'

const authMocks = vi.hoisted(() => ({
  sendEmailSignInCode: vi.fn(),
  signInWithEmailCode: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithMicrosoft: vi.fn(),
  startGoogleOneTap: vi.fn(),
}))

const capabilityMocks = vi.hoisted(() => ({
  authCapabilities: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  displayNameFromEmail: (_email: string) => 'Test User',
  sendEmailSignInCode: authMocks.sendEmailSignInCode,
  signInWithEmailCode: authMocks.signInWithEmailCode,
  signInWithGoogle: authMocks.signInWithGoogle,
  signInWithMicrosoft: authMocks.signInWithMicrosoft,
  startGoogleOneTap: authMocks.startGoogleOneTap,
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

async function render(children: ReactNode, initialEntry = '/login') {
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

async function renderLogin(initialEntry = '/login') {
  await render(
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/deadlines" element={<div>Deadlines target</div>} />
    </Routes>,
    initialEntry,
  )
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
    publicClientIds: {},
  })
  authMocks.sendEmailSignInCode.mockResolvedValue({ data: { success: true }, error: null })
  authMocks.signInWithEmailCode.mockResolvedValue({ data: { user: { id: 'user_1' } }, error: null })
  authMocks.signInWithGoogle.mockResolvedValue(undefined)
  authMocks.signInWithMicrosoft.mockResolvedValue(undefined)
  authMocks.startGoogleOneTap.mockResolvedValue(null)
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
  vi.clearAllMocks()
})

// 2026-06-10 (login redesign): the email flow's visible copy changed —
// the send button reads "Send sign-in link" and the code step submits
// via "Verify & sign in". The underlying contract (sendEmailSignInCode,
// signInWithEmailCode, input[name="otp"]) is unchanged.
describe('LoginRoute email OTP', () => {
  it('renders email OTP with Google fallback and hides disabled Microsoft', async () => {
    await renderLogin()

    await waitForText('Send sign-in link')
    expect(document.body.textContent).toContain('Continue with Google')
    expect(document.body.textContent).not.toContain('Continue with Microsoft')
  })

  it('validates email before sending a code', async () => {
    await renderLogin()
    await waitForText('Send sign-in link')

    clickButton('Send sign-in link')

    await waitForText('Enter a valid email address')
    expect(authMocks.sendEmailSignInCode).not.toHaveBeenCalled()
  })

  it('sends a code and renders the verification step', async () => {
    await renderLogin()
    await waitForText('Send sign-in link')

    const emailInput = requireInput(document.querySelector<HTMLInputElement>('input[type="email"]'))
    changeInput(emailInput, 'alex@example.com')
    clickButton('Send sign-in link')

    await waitForText('Verify & sign in')
    expect(authMocks.sendEmailSignInCode).toHaveBeenCalledWith('alex@example.com')
    expect(document.body.textContent).toContain('Code sent to')
  })

  it('verifies the code and navigates to redirectTo', async () => {
    await renderLogin('/login?redirectTo=/deadlines')
    await waitForText('Send sign-in link')

    const emailInput = requireInput(document.querySelector<HTMLInputElement>('input[type="email"]'))
    changeInput(emailInput, 'alex@example.com')
    clickButton('Send sign-in link')
    await waitForText('Verify & sign in')

    const codeInput = requireInput(document.querySelector<HTMLInputElement>('input[name="otp"]'))
    changeInput(codeInput, '123456')
    clickButton('Verify & sign in')

    await waitForText('Deadlines target')
    expect(authMocks.signInWithEmailCode).toHaveBeenCalledWith({
      email: 'alex@example.com',
      otp: '123456',
      name: 'Test User',
    })
  })
})
