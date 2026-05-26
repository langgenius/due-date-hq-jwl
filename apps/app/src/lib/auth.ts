import { createAuthClient } from 'better-auth/react'
import {
  emailOTPClient,
  genericOAuthClient,
  oneTapClient,
  organizationClient,
  twoFactorClient,
} from 'better-auth/client/plugins'
import { stripeClient } from '@better-auth/stripe/client'

import { attachLocaleHeader } from '@/i18n/i18n'

// Single better-auth client for the SPA. Google OAuth is the primary sign-in path.
// All network calls are cookie-scoped to the Worker at /api/auth (see apps/server/src/routes/auth.ts).
// The x-locale header is forwarded so the Worker can localize invitation emails etc.
//
// `organizationClient()` mirrors the server-side `organization()` plugin so
// the typed shape of `session.activeOrganizationId` stays available. Practice
// lifecycle writes go through the app-owned `firms` RPC gateway.
export const authClient = createAuthClient({
  baseURL: `${window.location.origin}/api/auth`,
  plugins: [
    organizationClient(),
    twoFactorClient({ twoFactorPage: '/two-factor' }),
    emailOTPClient(),
    genericOAuthClient(),
    stripeClient({ subscription: true }),
  ],
  fetchOptions: {
    onRequest: (context) => {
      attachLocaleHeader(context.headers)
    },
  },
})

export const { useSession, signOut } = authClient

type AuthSessionData = ReturnType<typeof useSession>['data']
export type AuthUser = NonNullable<AuthSessionData>['user']

export function signInWithGoogle(callbackURL = '/') {
  // Resolve against the CURRENT browser origin so the post-OAuth 302 lands the
  // user back where they started (e.g. Vite :5173 in dev) instead of defaulting
  // to AUTH_URL (the Worker origin, :8787). Cookies are hostname-scoped, so the
  // session resolves on either port once it is set.
  const absolute = new URL(callbackURL, window.location.origin).toString()
  return authClient.signIn.social({
    provider: 'google',
    callbackURL: absolute,
  })
}

export function startGoogleOneTap(input: {
  clientId: string
  callbackURL?: string
  onPromptNotification?: (notification?: unknown) => void
}) {
  const absolute = new URL(input.callbackURL ?? '/', window.location.origin).toString()
  const oneTapAuthClient = createAuthClient({
    baseURL: `${window.location.origin}/api/auth`,
    plugins: [
      oneTapClient({
        clientId: input.clientId,
        context: 'signin',
        promptOptions: {
          maxAttempts: 1,
        },
      }),
    ],
    fetchOptions: {
      onRequest: (context) => {
        attachLocaleHeader(context.headers)
      },
    },
  })

  return oneTapAuthClient.oneTap({
    callbackURL: absolute,
    context: 'signin',
    onPromptNotification: input.onPromptNotification,
  })
}

export function signInWithMicrosoft(callbackURL = '/') {
  const absolute = new URL(callbackURL, window.location.origin).toString()
  return authClient.signIn.oauth2({
    providerId: 'microsoft-entra-id',
    callbackURL: absolute,
  })
}

type AuthClientError = {
  message?: string
  statusText?: string
  code?: string
}

function isAuthClientError(value: unknown): value is AuthClientError {
  return typeof value === 'object' && value !== null
}

function assertNoAuthClientError(result: unknown, fallback: string) {
  if (!result || typeof result !== 'object' || !('error' in result)) return
  const error = Reflect.get(result, 'error')
  if (!isAuthClientError(error)) return
  throw new Error(error.message || error.statusText || error.code || fallback)
}

export function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim() ?? ''
  const words = local
    .replace(/[+._-]+/g, ' ')
    .replace(/\d+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return email.trim().toLowerCase()
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
}

export async function sendEmailSignInCode(email: string) {
  const result = await authClient.emailOtp.sendVerificationOtp({
    email,
    type: 'sign-in',
  })
  assertNoAuthClientError(result, "Couldn't send the sign-in code")
  return result
}

export async function signInWithEmailCode(input: { email: string; otp: string; name?: string }) {
  const result = await authClient.signIn.emailOtp({
    email: input.email,
    otp: input.otp,
    name: input.name ?? displayNameFromEmail(input.email),
  })
  assertNoAuthClientError(result, "Couldn't verify the sign-in code")
  return result
}

export function initialsFromName(value: string | null | undefined): string {
  if (!value) return '?'
  const parts = value.trim().split(/\s+/).slice(0, 2)
  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .padEnd(1, '?')
}
