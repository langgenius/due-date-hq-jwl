import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowRightIcon,
  BellIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  CornerDownLeftIcon,
  InfoIcon,
  Loader2Icon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  SearchIcon,
  UsersIcon,
} from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@duedatehq/ui/components/ui/input-group'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'
import { AuthBrandAnchor, AuthFooter } from '@/features/auth/auth-chrome'
import {
  GoogleGlyph as GoogleIcon,
  MicrosoftGlyph as MicrosoftIcon,
} from '@/components/primitives/provider-glyphs'
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

const USER_CANCELED = /cancel|popup|closed/i

// Auth surfaces use outlined-white fields (vs the product's default filled
// inputs) so they read crisply on the plain sign-in background. We compose the
// shared InputGroup primitive — icon slots, focus ring, aria-invalid wiring —
// and skin it white. Resting + hover + focus all stay on background-default so
// the field never tints gray. Auth fields run one size taller than the in-app
// canon (h-11 vs h-9) so the sign-in form is the page's clear primary action.
const AUTH_FIELD_SKIN =
  'h-11 border-divider-regular bg-background-default hover:bg-background-default ' +
  'has-[[data-slot=input-group-control]:focus-visible]:bg-background-default'
// Auth buttons match the taller field (h-11) so field + CTA align.
const AUTH_BTN_H = 'h-11'

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
    <div className="flex h-dvh flex-col overflow-hidden bg-background-subtle text-text-primary">
      <a
        href="#sign-in"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-divider-regular focus:bg-background-default focus:px-3 focus:py-1.5 focus:text-sm focus:text-text-primary focus:shadow-overlay"
      >
        <Trans>Skip to sign-in</Trans>
      </a>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sign-in — a centered, airy column on a plain panel. Email-first, SSO
            below; brand mark + heading centered above. */}
        <main
          id="sign-in"
          className="flex w-full flex-col items-center justify-center overflow-y-auto px-6 py-12 lg:w-[46%] lg:shrink-0 lg:px-16"
        >
          <div className="flex w-full max-w-[360px] flex-col gap-6">
            {/* Centered brand lockup + heading */}
            <div className="flex flex-col items-center gap-4 text-center">
              {/* The lockup settles in on mount (calm fade + scale, not a snap).
                  Smaller move than the SuccessModal hero check. Reduced-motion
                  handled globally by the root <MotionConfig reducedMotion="user">. */}
              <AuthBrandAnchor tagline={false} animated markClassName="h-3.5" />
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-[-0.02em] text-text-primary">
                  <Trans>Sign in</Trans>
                </h1>
                <p className="text-sm leading-normal text-nowrap text-text-tertiary">
                  <Trans>One source of truth for every filing deadline.</Trans>
                </p>
              </div>
            </div>

            {/* Email first, then SSO below the divider */}
            <div className="flex flex-col gap-4">
              {emailOtpEnabled ? (
                <LoginEmailForm
                  disabled={submittingProvider !== null}
                  initialEmail={linkEmail ?? undefined}
                  initialCode={linkCode ?? undefined}
                  onInteraction={() => setEmailFlowActive(true)}
                  onPendingChange={setEmailBusy}
                  onSignedIn={() => navigate(postSignInTarget, { replace: true })}
                />
              ) : null}

              <div className="flex items-center gap-3.5">
                <span aria-hidden className="h-px flex-1 bg-divider-subtle" />
                <span className="text-xs font-normal tracking-[0.2px] text-text-quaternary">
                  <Trans>or continue with</Trans>
                </span>
                <span aria-hidden className="h-px flex-1 bg-divider-subtle" />
              </div>

              <div className={cn('grid gap-3', microsoftEnabled ? 'grid-cols-2' : 'grid-cols-1')}>
                <Button
                  variant="secondary"
                  onClick={handleGoogleSignIn}
                  disabled={socialDisabled}
                  aria-busy={submittingProvider === 'google'}
                  className={cn(AUTH_BTN_H, 'w-full gap-2.5')}
                >
                  {submittingProvider === 'google' ? (
                    <Loader2Icon className="size-[18px] animate-spin" aria-hidden />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span>
                    {microsoftEnabled ? <Trans>Google</Trans> : <Trans>Continue with Google</Trans>}
                  </span>
                </Button>

                {microsoftEnabled ? (
                  <Button
                    variant="secondary"
                    onClick={handleMicrosoftSignIn}
                    disabled={socialDisabled}
                    aria-busy={submittingProvider === 'microsoft'}
                    className={cn(AUTH_BTN_H, 'w-full gap-2.5')}
                  >
                    {submittingProvider === 'microsoft' ? (
                      <Loader2Icon className="size-[18px] animate-spin" aria-hidden />
                    ) : (
                      <MicrosoftIcon />
                    )}
                    <span>
                      <Trans>Microsoft</Trans>
                    </span>
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Reassurance + magic-link recovery — centered on the column axis,
                matching the centered hero above and the residency line below. */}
            <div className="flex flex-col items-center gap-2.5 text-center">
              <p className="flex items-center justify-center gap-1.5">
                <LockIcon className="size-3.5 shrink-0 text-text-tertiary" aria-hidden />
                <span className="text-xs font-medium text-text-tertiary">
                  <Trans>No password — one-time links expire in 10 minutes.</Trans>
                </span>
              </p>
              {/* "Open it now" focuses the email field — a magic link is a URL the
                  user opens from their inbox; there's no separate paste surface. */}
              <p className="flex items-center justify-center gap-1.5 text-sm">
                <span className="font-medium text-text-secondary">
                  <Trans>Already have a sign-in link?</Trans>
                </span>
                <TextLink
                  variant="accent"
                  onClick={() => document.getElementById('login-email')?.focus()}
                  className="text-sm font-medium"
                >
                  <Trans>Open it now →</Trans>
                </TextLink>
              </p>
            </div>

            {/* Residency */}
            <p className="flex items-center justify-center gap-1 text-center text-caption-xs font-medium text-text-muted">
              <MapPinIcon className="size-3 shrink-0" aria-hidden />
              <Trans>Hosted in US-East · ISO 27001 in progress</Trans>
            </p>
          </div>
        </main>

        <ProductStory />
      </div>

      <AuthFooter />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Left column — static product story. Hidden below `lg` so the sign-in card
// takes the full width on laptops/phones. All copy is marketing, not live data.
// ---------------------------------------------------------------------------

type PreviewTone = 'destructive' | 'warning' | 'accent' | 'success' | 'muted'

const PREVIEW_DOT: Record<PreviewTone, string> = {
  destructive: 'bg-state-destructive-solid',
  warning: 'bg-state-warning-solid',
  accent: 'bg-state-accent-solid',
  success: 'bg-state-success-solid',
  muted: 'bg-text-muted',
}

const PREVIEW_TEXT: Record<PreviewTone, string> = {
  destructive: 'text-text-destructive',
  warning: 'text-text-warning',
  accent: 'text-text-accent',
  success: 'text-text-success',
  muted: 'text-text-tertiary',
}

// Illustrative product preview — a static marketing mock of the Deadlines view,
// not the visitor's live data (they're logged out). A light app window floating
// off the right + bottom edge of the solid brand-navy panel.
const PREVIEW_ROWS: {
  form: string
  client: string
  status: string
  tone: PreviewTone
  due: string
}[] = [
  {
    form: '1040',
    client: 'Hudson Family',
    status: 'Due in 2 days',
    tone: 'destructive',
    due: 'Apr 15',
  },
  {
    form: '1120-S',
    client: 'Mercer LLC',
    status: 'Waiting on client',
    tone: 'warning',
    due: 'Apr 18',
  },
  { form: 'Q2 941', client: 'Patel Holdings', status: 'In review', tone: 'accent', due: 'Apr 30' },
  { form: 'BOI', client: 'Kim Consulting', status: 'Filed Mar 14', tone: 'success', due: '—' },
  { form: '1065', client: 'Lakeside Partners', status: 'Not started', tone: 'muted', due: 'May 1' },
]

const PREVIEW_NAV: {
  label: string
  Icon: (props: { className?: string }) => ReactNode
  count?: string
  active?: boolean
}[] = [
  { label: 'Today', Icon: CalendarDaysIcon },
  { label: 'Alerts', Icon: BellIcon, count: '7' },
  { label: 'Deadlines', Icon: ClipboardListIcon, count: '28', active: true },
  { label: 'Clients', Icon: UsersIcon, count: '10' },
]

function ProductStory() {
  return (
    <section className="relative hidden min-w-0 flex-1 overflow-hidden border-l border-divider-subtle bg-gradient-to-br from-brand-ink to-brand-ink-deep lg:block">
      {/* Promise, top-left of the panel — white on the brand navy. An eyebrow
          sets the frame; the headline carries the weight. */}
      <div className="absolute top-14 left-14 z-10 max-w-[380px]">
        <p className="text-caption-xs font-semibold tracking-[0.12em] text-text-secondary-on-surface uppercase">
          <Trans>Every deadline, one workbench</Trans>
        </p>
        <p className="mt-3 text-xl leading-snug font-medium text-pretty text-text-primary-on-surface">
          <Trans>
            Every 1040, 1120, payroll, and BOI filing, firm-wide — monitored, sourced, and on
            schedule.
          </Trans>
        </p>
      </div>

      {/* Product window — bleeds off the right + bottom edge. */}
      <div className="absolute top-48 left-14 -right-16 bottom-[-56px] overflow-hidden rounded-tl-xl border border-divider-subtle bg-background-default shadow-overlay">
        <div className="flex h-full w-[880px]">
          {/* Sidebar */}
          <aside className="flex w-[212px] shrink-0 flex-col gap-3 border-r border-divider-subtle bg-bg-subtle/50 p-3">
            <div className="flex items-center gap-2 px-1.5 pt-1">
              <span className="flex size-6 items-center justify-center rounded-md bg-text-primary text-caption-xs font-bold text-text-primary-on-surface">
                D
              </span>
              <span className="truncate text-sm font-medium text-text-primary">Whitmore CPA</span>
              <span className="rounded bg-state-accent-hover px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-text-accent">
                PRO
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-divider-subtle bg-background-default px-2.5 py-1.5 text-caption-xs text-text-muted">
              <SearchIcon className="size-3 shrink-0" aria-hidden />
              Search…
            </div>
            <nav className="flex flex-col gap-0.5">
              {PREVIEW_NAV.map((item) => (
                <span
                  key={item.label}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium',
                    item.active ? 'bg-state-accent-hover text-text-accent' : 'text-text-secondary',
                  )}
                >
                  <item.Icon className="size-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.count ? (
                    <span
                      className={cn(
                        'text-caption-xs font-medium tabular-nums',
                        item.active ? 'text-text-accent' : 'text-text-muted',
                      )}
                    >
                      {item.count}
                    </span>
                  ) : null}
                </span>
              ))}
            </nav>
            <div className="mt-auto rounded-lg bg-text-primary px-3.5 py-3 text-text-primary-on-surface">
              <p className="text-xs font-medium">Busy-season ready</p>
              <p className="mt-0.5 text-[11px] leading-snug text-text-secondary-on-surface">
                142 rules active across FED + 6 states.
              </p>
            </div>
          </aside>

          {/* Main */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Header */}
            <div className="flex shrink-0 items-center gap-2.5 px-5 py-4">
              <span className="text-base font-semibold text-text-primary">Deadlines</span>
              <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-caption-xs font-medium text-text-tertiary tabular-nums">
                28
              </span>
              <span className="flex-1" />
              <span className="rounded-lg border border-divider-subtle px-2.5 py-1 text-caption-xs font-medium text-text-tertiary">
                This week
              </span>
              <span className="rounded-lg border border-divider-subtle px-2.5 py-1 text-caption-xs font-medium text-text-tertiary">
                Filters
              </span>
            </div>
            {/* Column header */}
            <div className="flex shrink-0 items-center gap-4 border-y border-divider-subtle bg-bg-subtle px-5 py-2 text-caption-xs font-semibold tracking-wide text-text-muted uppercase">
              <span className="w-16">Form</span>
              <span className="flex-1">Client</span>
              <span className="w-32">Status</span>
              <span className="w-16 text-right">Due</span>
            </div>
            {/* Rows */}
            {PREVIEW_ROWS.map((row) => (
              <div
                key={row.client}
                className="flex items-center gap-4 border-b border-divider-subtle px-5 py-3.5"
              >
                <span className="w-16 rounded bg-bg-subtle px-2 py-1 text-center font-mono text-caption-xs font-medium text-text-secondary">
                  {row.form}
                </span>
                <span className="flex-1 text-sm font-medium text-text-primary">{row.client}</span>
                <span
                  className={cn(
                    'inline-flex w-32 items-center gap-1.5 text-xs font-medium',
                    PREVIEW_TEXT[row.tone],
                  )}
                >
                  <span
                    aria-hidden
                    className={cn('size-1.5 rounded-full', PREVIEW_DOT[row.tone])}
                  />
                  {row.status}
                </span>
                <span className="w-16 text-right text-xs font-medium tabular-nums text-text-tertiary">
                  {row.due}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
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
      // The code screen replaces the email field in place; a soft rise (not an
      // instant swap) reads as "your code is on its way" — the felt handoff of
      // the send. Reduced-motion safe.
      <form
        onSubmit={handleVerifySubmit}
        noValidate
        className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none"
      >
        <div className="flex items-center justify-between gap-3 rounded-lg bg-bg-subtle px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-tertiary">
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

        <InputGroup className={AUTH_FIELD_SKIN}>
          <label htmlFor="login-otp-code" className="sr-only">
            <Trans>Verification code</Trans>
          </label>
          <InputGroupInput
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
            className="px-3 font-mono tracking-[0.3em] placeholder:font-sans placeholder:tracking-normal"
          />
        </InputGroup>
        {error ? (
          <p
            id="login-otp-error"
            role="alert"
            className="text-xs font-medium text-text-destructive animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none"
          >
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-[1fr_auto] gap-2.5">
          <Button
            type="submit"
            className={cn(AUTH_BTN_H, 'justify-center gap-2')}
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
            className={cn(AUTH_BTN_H, 'px-4')}
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
        <div className="flex items-center justify-center gap-1.5">
          <label htmlFor="login-email" className="text-xs font-medium text-text-secondary">
            <Trans>Work email</Trans>
          </label>
          <Tooltip>
            <TooltipTrigger
              className="-m-1.5 inline-flex cursor-help items-center rounded-md p-1.5 text-text-tertiary transition-colors hover:text-text-secondary"
              aria-label={t`Why we ask for your work email`}
            >
              <InfoIcon className="size-3.5" aria-hidden />
            </TooltipTrigger>
            <TooltipContent>
              <Trans>We look up your firm automatically.</Trans>
            </TooltipContent>
          </Tooltip>
        </div>

        <InputGroup className={AUTH_FIELD_SKIN}>
          <InputGroupAddon className="pl-3.5">
            <MailIcon className="size-3.5 text-text-tertiary" aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
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
            className="font-medium"
          />
          <InputGroupAddon align="inline-end" className="pr-3.5">
            <CornerDownLeftIcon className="size-3.5 text-text-muted" aria-hidden />
          </InputGroupAddon>
        </InputGroup>
        {error ? (
          <p
            id="login-email-error"
            role="alert"
            className="text-xs font-medium text-text-destructive animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none"
          >
            {error}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        className={cn(AUTH_BTN_H, 'w-full justify-center gap-2')}
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

// Shared 44px field shell — white surface, rounded-xl, inner-aligned
// content, focus-within ring, destructive recolor on error.
