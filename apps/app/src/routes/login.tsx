import { useState, useTransition } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trans, useLingui } from '@lingui/react/macro'
import { Loader2Icon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import { EmailOtpSignInForm } from '@/features/auth/email-otp-sign-in-form'
import { authCapabilities } from '@/lib/auth-capabilities'
import { signInWithGoogle, signInWithMicrosoft, startGoogleOneTap } from '@/lib/auth'
import { cn } from '@duedatehq/ui/lib/utils'

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 48 48"
    aria-hidden="true"
    className={cn('size-4', className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6.1 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5Z"
    />
    <path
      fill="#FF3D00"
      d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6.1 29 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c4.9 0 9.4-1.9 12.8-5l-5.9-5c-2 1.4-4.5 2.2-7 2.2-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.1 44 24 44Z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l5.9 5c-.4.4 6.4-4.7 6.4-14.5 0-1.3-.1-2.4-.4-3.5Z"
    />
  </svg>
)

const MicrosoftIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 23 23"
    aria-hidden="true"
    className={cn('size-4', className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path fill="#f25022" d="M1 1h10v10H1z" />
    <path fill="#7fba00" d="M12 1h10v10H12z" />
    <path fill="#00a4ef" d="M1 12h10v10H1z" />
    <path fill="#ffb900" d="M12 12h10v10H12z" />
  </svg>
)

const USER_CANCELED = /cancel|popup|closed/i

type AuthCapabilities = {
  providers: {
    google: boolean
    microsoft: boolean
    emailOtp: boolean
  }
  publicClientIds?: {
    google?: string
  }
}

function isInAppPath(value: string | null): value is string {
  return !!value && value.startsWith('/') && !value.startsWith('//')
}

export function LoginRoute() {
  // Authed users never reach this component — the /login loader redirects them
  // to the post-login target before render.
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const redirectToParam = search.get('redirectTo')
  const redirectTo = isInAppPath(redirectToParam) ? redirectToParam : '/'
  const { t } = useLingui()
  const capabilitiesQuery = useQuery({
    queryKey: ['auth-capabilities'],
    queryFn: authCapabilities as () => Promise<AuthCapabilities>,
    staleTime: 60_000,
  })
  const microsoftEnabled = capabilitiesQuery.data?.providers.microsoft ?? false
  const emailOtpEnabled = capabilitiesQuery.data?.providers.emailOtp ?? true
  const googleClientId = capabilitiesQuery.data?.publicClientIds?.google

  const [submittingProvider, setSubmittingProvider] = useState<'google' | 'microsoft' | null>(null)
  const [emailFlowActive, setEmailFlowActive] = useState(false)
  const [emailBusy, setEmailBusy] = useState(false)
  const [, startTransition] = useTransition()
  const socialDisabled = submittingProvider !== null || emailBusy

  useQuery({
    queryKey: ['auth-one-tap', googleClientId, redirectTo],
    queryFn: async () => {
      if (!googleClientId) return null
      await startGoogleOneTap({
        clientId: googleClientId,
        callbackURL: redirectTo,
      })
      return null
    },
    enabled:
      Boolean(googleClientId) && submittingProvider === null && !emailFlowActive && !emailBusy,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  })

  async function handleGoogleSignIn() {
    setSubmittingProvider('google')
    try {
      // better-auth performs the browser redirect itself; this promise typically does not resolve.
      await signInWithGoogle(redirectTo)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t`Check your network and try again. If this keeps happening, contact support.`
      if (!USER_CANCELED.test(message)) {
        toast.error(t`Unable to start Google sign-in`, { description: message })
      }
      startTransition(() => setSubmittingProvider(null))
    }
  }

  async function handleMicrosoftSignIn() {
    setSubmittingProvider('microsoft')
    try {
      await signInWithMicrosoft(redirectTo)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t`Check your network and try again. If this keeps happening, contact support.`
      if (!USER_CANCELED.test(message)) {
        toast.error(t`Unable to start Microsoft sign-in`, { description: message })
      }
      startTransition(() => setSubmittingProvider(null))
    }
  }

  return (
    <div className="flex w-full max-w-[400px] flex-col">
      <h1 className="whitespace-pre-line text-[26px] font-semibold leading-[1.15] tracking-tight text-text-primary">
        <Trans>Welcome to the workbench.</Trans>
      </h1>

      <p className="mt-2 text-[13px] leading-6 text-text-secondary">
        <Trans>
          Sign in with SSO or your work email to access your practice&apos;s deadline list and
          evidence-backed recommendations.
        </Trans>
      </p>

      <Button
        variant="outline"
        className="mt-6 w-full justify-center gap-2.5"
        onClick={handleGoogleSignIn}
        disabled={socialDisabled}
        aria-busy={submittingProvider === 'google'}
      >
        {submittingProvider === 'google' ? (
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
        ) : (
          <GoogleIcon />
        )}
        <span>
          {submittingProvider === 'google' ? (
            <Trans>Redirecting to Google…</Trans>
          ) : (
            <Trans>Continue with Google</Trans>
          )}
        </span>
      </Button>

      {microsoftEnabled ? (
        <Button
          variant="outline"
          className="mt-2 w-full justify-center gap-2.5"
          onClick={handleMicrosoftSignIn}
          disabled={socialDisabled}
          aria-busy={submittingProvider === 'microsoft'}
        >
          {submittingProvider === 'microsoft' ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
          ) : (
            <MicrosoftIcon />
          )}
          <span>
            {submittingProvider === 'microsoft' ? (
              <Trans>Redirecting to Microsoft…</Trans>
            ) : (
              <Trans>Continue with Microsoft</Trans>
            )}
          </span>
        </Button>
      ) : null}

      {emailOtpEnabled ? (
        <>
          <div className="my-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
            <span className="h-px bg-divider-subtle" aria-hidden />
            <span className="font-mono text-caption-xs leading-none text-text-muted uppercase">
              <Trans>or</Trans>
            </span>
            <span className="h-px bg-divider-subtle" aria-hidden />
          </div>
          <EmailOtpSignInForm
            disabled={submittingProvider !== null}
            onInteraction={() => setEmailFlowActive(true)}
            onPendingChange={setEmailBusy}
            onSignedIn={() => navigate(redirectTo, { replace: true })}
          />
        </>
      ) : null}

      <p className="mt-3 inline-flex items-center gap-2 font-mono text-caption text-text-muted">
        <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-status-done" />
        <Trans>Encrypted · 7-day session · SSO-ready</Trans>
      </p>

      <p className="mt-5 text-[12px] leading-relaxed text-text-muted">
        <Trans>
          By signing in you agree to the{' '}
          <a
            data-t="termsLink"
            className="text-text-secondary underline underline-offset-4 transition-colors hover:text-text-primary"
            href="/terms"
          >
            Terms
          </a>{' '}
          and{' '}
          <a
            data-t="privacyLink"
            className="text-text-secondary underline underline-offset-4 transition-colors hover:text-text-primary"
            href="/privacy"
          >
            Privacy Policy
          </a>
          . Trouble signing in? Email{' '}
          <a
            data-t="supportLink"
            className="font-mono text-text-secondary underline underline-offset-4 transition-colors hover:text-text-primary"
            href="mailto:support@duedatehq.com"
          >
            support@duedatehq.com
          </a>
          .
        </Trans>
      </p>
    </div>
  )
}
