import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowRightIcon,
  GlobeIcon,
  Loader2Icon,
  LockIcon,
  MailCheckIcon,
  MailIcon,
  MapPinIcon,
  ShieldIcon,
} from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'
import {
  displayNameFromEmail,
  sendEmailSignInCode,
  signInWithEmailCode,
  signInWithGoogle,
  signInWithMicrosoft,
  startGoogleOneTap,
} from '@/lib/auth'
import { authCapabilities } from '@/lib/auth-capabilities'
import { ANALYTICS_EVENTS, markSignInPending, track } from '@/lib/analytics'
import { AuthBrandAnchor } from '@/features/auth/auth-chrome'

// /login is a full-bleed two-column split — a product-story column (left)
// beside the sign-in card (right), with a dedicated footer. The page owns its
// own chrome and is wired as a standalone route (no EntryShell parent) in
// router.tsx, so the other entry surfaces (/onboarding, /two-factor,
// /accept-invite) keep the shared shell.
//
// Colors/spacing map to the app's semantic tokens (text-text-*, bg-bg-*,
// border-divider-*, the primary Button) rather than raw hex. The left column is a STATIC
// marketing proof — illustrative sample deadlines, not the visitor's live data
// (they are logged out), so it does not violate the no-fiction-on-canvas rule.

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 48 48"
    aria-hidden="true"
    className={cn('size-[18px]', className)}
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
    className={cn('size-[18px]', className)}
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
  // Email deep link (`/login?email=&code=&continue=`): hand the email + code to
  // the OTP form so it auto-fills and submits the verify step. Their presence also
  // suppresses Google One Tap so the auto-verify isn't interrupted by a competing
  // prompt. `continue` is the post-sign-in target from the link; prefer it (when
  // in-app) over the page's own `redirectTo`, falling back to `/`.
  const linkEmail = search.get('email')
  const linkCode = search.get('code')
  const continueParam = search.get('continue')
  const hasEmailLink = Boolean(linkEmail && linkCode)
  const postSignInTarget = isInAppPath(continueParam) ? continueParam : redirectTo
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
  const [emailFlowActive, setEmailFlowActive] = useState(hasEmailLink)
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

  useEffect(() => {
    track(ANALYTICS_EVENTS.signInPageViewed)
  }, [])

  async function handleGoogleSignIn() {
    setSubmittingProvider('google')
    track(ANALYTICS_EVENTS.signInStarted, { method: 'google' })
    // Drop a redirect-safe marker: OAuth navigates away before we can fire the
    // post-auth "Signed In/Up" event; the landing page consumes it.
    markSignInPending('google')
    try {
      // better-auth performs the browser redirect itself; this promise typically does not resolve.
      await signInWithGoogle(redirectTo)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t`Try again in a moment. If it keeps failing, contact support.`
      if (!USER_CANCELED.test(message)) {
        toast.error(t`Unable to start Google sign-in`, { description: message })
        track(ANALYTICS_EVENTS.signInFailed, { method: 'google', reason: 'provider_error' })
      }
      startTransition(() => setSubmittingProvider(null))
    }
  }

  async function handleMicrosoftSignIn() {
    setSubmittingProvider('microsoft')
    track(ANALYTICS_EVENTS.signInStarted, { method: 'microsoft' })
    markSignInPending('microsoft')
    try {
      await signInWithMicrosoft(redirectTo)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t`Try again in a moment. If it keeps failing, contact support.`
      if (!USER_CANCELED.test(message)) {
        toast.error(t`Unable to start Microsoft sign-in`, { description: message })
        track(ANALYTICS_EVENTS.signInFailed, { method: 'microsoft', reason: 'provider_error' })
      }
      startTransition(() => setSubmittingProvider(null))
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background-subtle text-text-primary dark:bg-bg-canvas">
      <a
        href="#sign-in"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-divider-regular focus:bg-background-default focus:px-3 focus:py-1.5 focus:text-sm focus:text-text-primary focus:shadow-overlay"
      >
        <Trans>Skip to sign-in</Trans>
      </a>

      <div className="flex min-h-0 flex-1 gap-8 overflow-hidden px-4 py-6 lg:px-[72px] lg:py-10">
        <ProductStory />

        <main
          id="sign-in"
          className="mx-auto flex max-h-full w-full max-w-[584px] flex-col self-center overflow-y-auto rounded-xl border border-divider-subtle bg-background-default px-6 py-10 shadow-[0_4px_16px_-4px_rgba(16,24,40,0.08)] lg:mx-0 lg:px-[72px] lg:py-16"
        >
          <div className="mx-auto flex w-full max-w-[440px] flex-col gap-7">
            {/* Frame 21 — brand, heading, form, reassurance, and foot share the
                24px rhythm (canvas dGFth gap 24); residency sits 28px below. */}
            <div className="flex flex-col gap-6">
              {/* Brand lockup — compact (no tagline) */}
              <AuthBrandAnchor tagline={false} />

              {/* Heading */}
              <div className="flex flex-col gap-2">
                <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.6px] text-text-primary">
                  <Trans>Welcome back</Trans>
                </h1>
              </div>

              {/* Form card — Google + divider + email at 16px */}
              <div className="flex flex-col gap-4">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleGoogleSignIn}
                  disabled={socialDisabled}
                  aria-busy={submittingProvider === 'google'}
                  className="w-full gap-3 rounded-lg"
                >
                  {submittingProvider === 'google' ? (
                    <Loader2Icon className="size-[18px] animate-spin" aria-hidden />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span>
                    {submittingProvider === 'google' ? (
                      <Trans>Signing in with Google…</Trans>
                    ) : (
                      <Trans>Continue with Google</Trans>
                    )}
                  </span>
                </Button>

                {microsoftEnabled ? (
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleMicrosoftSignIn}
                    disabled={socialDisabled}
                    aria-busy={submittingProvider === 'microsoft'}
                    className="w-full gap-3 rounded-lg"
                  >
                    {submittingProvider === 'microsoft' ? (
                      <Loader2Icon className="size-[18px] animate-spin" aria-hidden />
                    ) : (
                      <MicrosoftIcon />
                    )}
                    <span>
                      {submittingProvider === 'microsoft' ? (
                        <Trans>Signing in with Microsoft…</Trans>
                      ) : (
                        <Trans>Continue with Microsoft</Trans>
                      )}
                    </span>
                  </Button>
                ) : null}

                {emailOtpEnabled ? (
                  <>
                    <div className="flex items-center gap-3.5">
                      <span aria-hidden className="h-px flex-1 bg-divider-subtle" />
                      <span className="text-xs font-medium tracking-[0.2px] text-text-muted">
                        <Trans>or continue with email</Trans>
                      </span>
                      <span aria-hidden className="h-px flex-1 bg-divider-subtle" />
                    </div>

                    <LoginEmailForm
                      disabled={submittingProvider !== null}
                      initialEmail={linkEmail ?? undefined}
                      initialCode={linkCode ?? undefined}
                      onInteraction={() => setEmailFlowActive(true)}
                      onPendingChange={setEmailBusy}
                      onSignedIn={() => navigate(postSignInTarget, { replace: true })}
                    />
                  </>
                ) : null}
              </div>

              {/* Reassurance */}
              <div className="flex items-center gap-2.5 rounded-xl bg-bg-subtle px-3.5 py-3">
                <LockIcon className="size-3.5 shrink-0 text-text-tertiary" aria-hidden />
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-semibold text-text-secondary">
                    <Trans>Secured by one-time link</Trans>
                  </p>
                  <p className="text-xs font-medium leading-[1.45] text-text-muted">
                    <Trans>Links expire in 10 minutes. We never store passwords.</Trans>
                  </p>
                </div>
              </div>

              {/* "Open it now" focuses the email field to begin sign-in —
                  there is no separate paste-link surface; a real magic link is
                  a URL the user opens straight from their inbox. */}
              <p className="flex items-center justify-center gap-1.5 text-center">
                <span className="text-xs font-medium text-text-tertiary">
                  <Trans>Already have a sign-in link?</Trans>
                </span>
                <TextLink
                  variant="accent"
                  onClick={() => document.getElementById('login-email')?.focus()}
                  className="font-semibold"
                >
                  <Trans>Open it now →</Trans>
                </TextLink>
              </p>
            </div>

            {/* Residency */}
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="flex items-center gap-1 text-xs font-medium text-text-muted">
                <MapPinIcon className="size-3 shrink-0" aria-hidden />
                <Trans>Hosted in US-East · your data never leaves your jurisdiction</Trans>
              </p>
              <p className="text-xs font-medium text-text-muted">
                <Trans>ISO 27001 in progress</Trans>
              </p>
            </div>
          </div>
        </main>
      </div>

      <LoginFooter />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Left column — static product story. Hidden below `lg` so the sign-in card
// takes the full width on laptops/phones. All copy is marketing, not live data.
// ---------------------------------------------------------------------------

type CapabilityTone = 'warning' | 'accent' | 'success'

const TONE_TICK: Record<CapabilityTone, string> = {
  warning: 'bg-state-warning-solid',
  accent: 'bg-state-accent-solid',
  success: 'bg-state-success-solid',
}

const CAPABILITIES: {
  index: string
  tone: CapabilityTone
  eyebrow: string
  title: string
  body: string
}[] = [
  {
    index: '01',
    tone: 'warning',
    eyebrow: 'STATUS CONTROL',
    title: 'Status updates itself.',
    body: 'Stages move forward when the work does. Uploads, e-file acks, client replies — the deadline knows.',
  },
  {
    index: '02',
    tone: 'accent',
    eyebrow: 'MONITORING STATE ALERTS',
    title: 'Constant monitoring',
    body: 'If a deadline stalls or a rule changes, the partner who owns it gets a heads-up.',
  },
  {
    index: '03',
    tone: 'success',
    eyebrow: 'EVERY CHANGE SOURCED',
    title: 'Every change is logged.',
    body: 'Who, when, what triggered it, what changed — captured automatically. Export in one click.',
  },
]

const TRUST_ITEMS: { Icon: ComponentType<{ className?: string }>; label: string }[] = [
  { Icon: LockIcon, label: 'No password, no token to lose' },
  { Icon: MailCheckIcon, label: 'One-time sign-in links expire in 10 minutes' },
  { Icon: ShieldIcon, label: 'Your client data never leaves your jurisdiction' },
]

function ProductStory() {
  return (
    <section className="hidden min-w-0 flex-1 flex-col gap-5 pr-[72px] pt-2 lg:flex">
      {/* Brand anchor */}
      <AuthBrandAnchor />

      <h2 className="text-[44px] font-semibold leading-[1.1] tracking-[-1px] text-text-primary">
        <Trans>
          Every CPA deadline.
          <br />
          One source of truth.
        </Trans>
      </h2>
      <p className="text-sm font-medium leading-[1.55] text-text-tertiary">
        <Trans>
          DueDateHQ replaces the spreadsheet that runs every busy season. Track every 1040, 1120,
          payroll, and BOI filing across the firm — with auto-rollover, blocking-item triggers, and
          audit-grade history.
        </Trans>
      </p>

      <div className="mt-2 flex flex-col gap-3.5">
        <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-divider-subtle bg-background-default sm:grid-cols-3">
          {CAPABILITIES.map((cap, i) => (
            <div
              key={cap.index}
              className={cn(
                'flex flex-col gap-3 p-6',
                i > 0 && 'border-t border-divider-subtle sm:border-l sm:border-t-0',
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-caption-xs tracking-[0.4px] text-text-muted">
                  {cap.index}
                </span>
                <span aria-hidden className={cn('h-px w-3.5', TONE_TICK[cap.tone])} />
                <span className="text-[9px] font-semibold tracking-[1.6px] text-text-tertiary">
                  {cap.eyebrow}
                </span>
              </div>
              <p className="text-base font-medium leading-[1.3] tracking-[-0.3px] text-text-primary">
                {cap.title}
              </p>
              <p className="text-xs leading-[1.6] text-text-tertiary">{cap.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs italic text-text-muted">
            All three ship in v1. See them live in
          </span>
          {['/today', '/deadlines', '/alerts'].map((path) => (
            <span
              key={path}
              className="rounded-lg bg-bg-subtle px-1.5 py-0.5 font-mono text-caption-xs font-semibold tracking-[0.2px] text-text-secondary"
            >
              {path}
            </span>
          ))}
          <span className="flex-1" />
          <span className="text-caption-xs font-medium italic text-text-muted">
            no waitlist, no asterisks
          </span>
        </div>
      </div>

      {/* Trust strip */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 pt-2">
        {TRUST_ITEMS.map((item, i) => (
          <Fragment key={item.label}>
            {i > 0 ? <span aria-hidden className="h-2.5 w-px bg-divider-subtle" /> : null}
            <span className="flex items-center gap-1.5 text-xs font-medium italic text-text-tertiary">
              <item.Icon className="size-[11px] shrink-0 text-text-muted" />
              {item.label}
            </span>
          </Fragment>
        ))}
      </div>
    </section>
  )
}

function LoginFooter() {
  return (
    <footer className="flex flex-col gap-3 border-t border-divider-subtle px-6 py-3.5 text-xs font-medium text-text-tertiary sm:flex-row sm:items-center lg:px-10">
      <div className="flex flex-wrap items-center gap-2.5">
        <span>© {new Date().getFullYear()} DueDateHQ</span>
        {[
          { label: 'Terms', href: '/terms' },
          { label: 'Privacy', href: '/privacy' },
          { label: 'Security', href: '/security' },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-2.5">
            <span aria-hidden className="text-text-muted">
              ·
            </span>
            <a
              href={item.href}
              className="transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              {item.label}
            </a>
          </span>
        ))}
      </div>
      <span className="hidden flex-1 sm:block" />
      <div className="flex items-center gap-3.5">
        <span className="font-mono text-caption-xs text-text-muted">v2.18.4</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-divider-subtle bg-background-default px-2.5 py-1">
          <GlobeIcon className="size-3 text-text-tertiary" aria-hidden />
          <span className="text-text-secondary">US East</span>
        </span>
      </div>
    </footer>
  )
}

// ---------------------------------------------------------------------------
// Inline email-OTP form — login-specific styling that matches pW6pK (label
// row + hint, inner mail icon, Return hint, blue "Send sign-in link" CTA).
// Kept separate from the shared <EmailOtpSignInForm> (used by /accept-invite)
// so this visual treatment does not leak into that surface. Wired to the same
// `@/lib/auth` helpers, with the same deep-link auto-submit + resend behavior.
// ---------------------------------------------------------------------------

type PendingAction = 'send' | 'resend' | 'verify'

interface LoginEmailFormProps {
  disabled?: boolean
  initialEmail?: string | undefined
  initialCode?: string | undefined
  onInteraction?: () => void
  onPendingChange?: (pending: boolean) => void
  onSignedIn: () => void | Promise<void>
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizeCode(value: string): string {
  return value.replace(/\s+/g, '')
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object' || !('message' in error)) return fallback
  const message = Reflect.get(error, 'message')
  return typeof message === 'string' && message ? message : fallback
}

function LoginEmailForm({
  disabled = false,
  initialEmail,
  initialCode,
  onInteraction,
  onPendingChange,
  onSignedIn,
}: LoginEmailFormProps) {
  const { t } = useLingui()
  const seededEmail = (initialEmail ?? '').trim().toLowerCase()
  const hasSeededEmail = isValidEmail(seededEmail)
  const [email, setEmail] = useState(hasSeededEmail ? seededEmail : '')
  const [sentEmail, setSentEmail] = useState<string | null>(hasSeededEmail ? seededEmail : null)
  const [code, setCode] = useState(normalizeCode(initialCode ?? '').slice(0, 6))
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const autoSubmittedRef = useRef(false)

  const codeSent = sentEmail !== null
  const busy = pendingAction !== null
  const formDisabled = disabled || busy

  function setPending(action: PendingAction | null) {
    setPendingAction(action)
    onPendingChange?.(action !== null)
  }

  function noteInteraction() {
    onInteraction?.()
  }

  function verifyCode(targetEmail: string, otp: string) {
    setError(null)
    if (!/^\d{6}$/.test(otp)) {
      setError(t`Enter the 6-digit code.`)
      return
    }
    setPending('verify')
    // Marker for the post-auth landing page (email OTP doesn't redirect, but
    // a brand-new user is bounced to /onboarding, so this keeps the new-vs-
    // returning split consistent with the OAuth path).
    markSignInPending('email_otp')
    void signInWithEmailCode({
      email: targetEmail,
      otp,
      name: displayNameFromEmail(targetEmail),
    })
      .then(() => {
        track(ANALYTICS_EVENTS.emailCodeSubmitted, { success: true })
        return onSignedIn()
      })
      .catch((err: unknown) => {
        track(ANALYTICS_EVENTS.emailCodeSubmitted, { success: false })
        setError(readErrorMessage(err, t`Couldn't verify the code`))
      })
      .finally(() => setPending(null))
  }

  useEffect(() => {
    if (autoSubmittedRef.current) return
    const otp = normalizeCode(initialCode ?? '')
    if (!hasSeededEmail || !/^\d{6}$/.test(otp)) return
    autoSubmittedRef.current = true
    noteInteraction()
    verifyCode(seededEmail, otp)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  async function sendCode(action: Extract<PendingAction, 'send' | 'resend'>) {
    noteInteraction()
    const target = (sentEmail ?? email).trim().toLowerCase()
    setError(null)

    if (!isValidEmail(target)) {
      setError(t`Enter a valid email address`)
      return
    }

    setPending(action)
    try {
      await sendEmailSignInCode(target)
      track(ANALYTICS_EVENTS.emailCodeRequested, { is_resend: action === 'resend' })
      setEmail(target)
      setSentEmail(target)
      setCode('')
    } catch (err) {
      setError(readErrorMessage(err, t`Couldn't send the code`))
    } finally {
      setPending(null)
    }
  }

  function handleSendSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!busy) void sendCode('send')
  }

  function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !sentEmail) return
    noteInteraction()
    verifyCode(sentEmail, normalizeCode(code))
  }

  if (codeSent) {
    return (
      <form onSubmit={handleVerifySubmit} noValidate className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-bg-subtle px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-muted">
              <Trans>Code sent to</Trans>
            </p>
            <p className="min-w-0 truncate font-mono text-sm text-text-primary">{sentEmail}</p>
          </div>
          <Button
            variant="ghost"
            size="xs"
            disabled={formDisabled}
            onClick={() => {
              noteInteraction()
              setSentEmail(null)
              setError(null)
            }}
            className="shrink-0 text-text-secondary hover:text-text-primary disabled:opacity-60"
          >
            <Trans>Change</Trans>
          </Button>
        </div>

        <FieldShell error={error}>
          <label htmlFor="login-otp-code" className="sr-only">
            <Trans>Verification code</Trans>
          </label>
          <input
            id="login-otp-code"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            disabled={formDisabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-otp-error' : undefined}
            placeholder={t`6-digit code`}
            onFocus={noteInteraction}
            onChange={(event) => {
              noteInteraction()
              setCode(normalizeCode(event.target.value).slice(0, 6))
              setError(null)
            }}
            className="h-full flex-1 bg-transparent font-mono text-sm tracking-[0.3em] text-text-primary outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-text-muted"
          />
        </FieldShell>
        {error ? (
          <p
            id="login-otp-error"
            role="alert"
            className="text-xs font-medium text-text-destructive"
          >
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-[1fr_auto] gap-2.5">
          <Button
            type="submit"
            size="lg"
            className="justify-center gap-2 rounded-lg font-semibold"
            disabled={formDisabled || normalizeCode(code).length !== 6}
            aria-busy={pendingAction === 'verify'}
          >
            {pendingAction === 'verify' ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
            ) : null}
            <Trans>Verify &amp; sign in</Trans>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="rounded-lg px-4"
            disabled={formDisabled}
            onClick={() => void sendCode('resend')}
            aria-busy={pendingAction === 'resend'}
          >
            {pendingAction === 'resend' ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trans>Resend</Trans>
            )}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSendSubmit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="login-email" className="text-xs font-semibold text-text-secondary">
            <Trans>Work email</Trans>
          </label>
          <span className="flex-1" />
          <span className="text-xs font-medium text-text-muted">
            <Trans>we look up your firm automatically</Trans>
          </span>
        </div>

        <FieldShell error={error}>
          <MailIcon className="size-4 shrink-0 text-text-tertiary" aria-hidden />
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t`you@firm.com`}
            value={email}
            disabled={formDisabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-email-error' : undefined}
            onFocus={noteInteraction}
            onChange={(event) => {
              noteInteraction()
              setEmail(event.target.value)
              setError(null)
            }}
            className="h-full flex-1 bg-transparent text-sm font-medium text-text-primary outline-none placeholder:text-text-muted"
          />
          <span className="shrink-0 rounded bg-bg-subtle px-1.5 py-0.5 font-mono text-caption-xs font-semibold text-text-tertiary">
            Return ↵
          </span>
        </FieldShell>
        {error ? (
          <p
            id="login-email-error"
            role="alert"
            className="text-xs font-medium text-text-destructive"
          >
            {error}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full justify-center gap-2 rounded-lg font-semibold"
        disabled={formDisabled}
        aria-busy={pendingAction === 'send'}
      >
        {pendingAction === 'send' ? (
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
        ) : null}
        <Trans>Send sign-in link</Trans>
        {pendingAction === 'send' ? null : <ArrowRightIcon className="size-4" aria-hidden />}
      </Button>
    </form>
  )
}

// Shared 48px field shell — white surface, rounded-lg, inner-aligned
// content, focus-within ring, destructive recolor on error.
function FieldShell({ children, error }: { children: ReactNode; error: string | null }) {
  return (
    <div
      className={cn(
        'flex h-11 items-center gap-2.5 rounded-lg border bg-background-default px-3.5 transition-colors focus-within:ring-1 focus-within:ring-inset focus-within:ring-state-accent-active-alt',
        error
          ? 'border-state-destructive-border focus-within:ring-state-destructive-active'
          : 'border-divider-regular focus-within:border-state-accent-solid',
      )}
    >
      {children}
    </div>
  )
}
