import { useState } from 'react'
import { Link, useLoaderData, useNavigate, useRevalidator, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { CircleAlertIcon, ArrowRightIcon, Loader2Icon, MailIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { AuthCard, AuthHeading, CenteredAuthScreen } from '@/features/auth/auth-chrome'
import {
  GoogleGlyph as GoogleIcon,
  MicrosoftGlyph as MicrosoftIcon,
} from '@/components/primitives/provider-glyphs'
import { EmailOtpSignInForm } from '@/features/auth/email-otp-sign-in-form'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { signInWithGoogle, signInWithMicrosoft, signOut, type AuthUser } from '@/lib/auth'
import { authCapabilities } from '@/lib/auth-capabilities'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'

// /accept-invite uses the full-bleed CenteredAuthScreen; the signed-in view
// leads with a "Firm invitation" pill + inviter→firm headline + context row.
// Standalone route in router.tsx. The name input stays dropped (the display
// name comes from the SSO provider / email), and the portfolio sub-line has no
// field in the invitation contract so the inviter email fills that slot.

type AcceptInviteLoaderData = {
  user: AuthUser | null
}

type InvitationPreview = {
  id: string
  email: string
  role: string
  organizationName: string
  inviterEmail: string
}

async function fetchInvitation(id: string): Promise<InvitationPreview> {
  const response = await fetch(
    `/api/auth/organization/get-invitation?id=${encodeURIComponent(id)}`,
    {
      credentials: 'include',
    },
  )
  if (!response.ok) throw new Error("We couldn't load this invitation.")
  return response.json()
}

async function acceptInvitation(id: string): Promise<void> {
  const response = await fetch('/api/auth/organization/accept-invitation', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ invitationId: id }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || body?.error || "Invitation couldn't be accepted.")
  }
}

// The invitation preview carries `role` as a free string; title-case it rather
// than pulling in the typed member roleLabel map (which would couple features).
function formatRole(role: string): string {
  if (!role) return role
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function InvitePill() {
  return (
    <Badge
      variant="info"
      className="gap-1.5 px-2.5 py-1 text-caption font-semibold tracking-[0.2px]"
    >
      <MailIcon className="size-3" aria-hidden />
      <Trans>Firm invitation</Trans>
    </Badge>
  )
}

export function AcceptInviteRoute() {
  const { user } = useLoaderData<AcceptInviteLoaderData>()
  const { t } = useLingui()
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const [search] = useSearchParams()
  const id = search.get('id') || ''
  const [emailSignedIn, setEmailSignedIn] = useState(false)
  const signedIn = Boolean(user) || emailSignedIn
  const [submitting, setSubmitting] = useState<'accept' | 'google' | 'microsoft' | null>(null)
  const [emailBusy, setEmailBusy] = useState(false)
  const inviteQuery = useQuery({
    queryKey: ['invitation', id],
    queryFn: () => fetchInvitation(id),
    enabled: id.length > 0 && signedIn,
    retry: false,
  })
  const capabilitiesQuery = useQuery({
    queryKey: ['auth-capabilities'],
    queryFn: authCapabilities,
    staleTime: 60_000,
  })

  const currentPath = `/accept-invite?id=${encodeURIComponent(id)}`
  const microsoftEnabled = capabilitiesQuery.data?.providers.microsoft ?? false
  const emailOtpEnabled = capabilitiesQuery.data?.providers.emailOtp ?? true
  const providerDisabled = submitting !== null || emailBusy

  async function handleAccept() {
    setSubmitting('accept')
    try {
      await acceptInvitation(id)
      track(ANALYTICS_EVENTS.inviteAccepted, { role: inviteQuery.data?.role })
      toast.success(t`Invitation accepted`)
      await navigate('/', { replace: true })
    } catch (err) {
      toast.error(t`Couldn't accept invitation`, {
        description:
          err instanceof Error
            ? err.message
            : t`Try again in a moment. If it keeps failing, contact support.`,
      })
      setSubmitting(null)
    }
  }

  async function handleProvider(provider: 'google' | 'microsoft') {
    setSubmitting(provider)
    try {
      if (provider === 'google') {
        await signInWithGoogle(currentPath)
      } else {
        await signInWithMicrosoft(currentPath)
      }
    } catch (err) {
      toast.error(t`Couldn't start sign-in`, {
        description:
          err instanceof Error
            ? err.message
            : t`Try again in a moment. If it keeps failing, contact support.`,
      })
      setSubmitting(null)
    }
  }

  // Missing invite token — never dead-end; offer Sign-in and Today escapes.
  if (!id) {
    return (
      <CenteredAuthScreen>
        <AuthCard className="gap-5">
          <InvitePill />
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>
              <Trans>Invite link is missing</Trans>
            </AlertTitle>
            <AlertDescription>
              <Trans>Ask whoever invited you to send a new link.</Trans>
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-2.5">
            <Button
              nativeButton={false}
              size="lg"
              className="flex-1 rounded-lg"
              render={<Link to="/login" />}
            >
              <Trans>Sign in</Trans>
            </Button>
            <Button
              nativeButton={false}
              variant="secondary"
              size="lg"
              className="flex-1 rounded-lg"
              render={<Link to="/" />}
            >
              <Trans>Go to Today</Trans>
            </Button>
          </div>
        </AuthCard>
      </CenteredAuthScreen>
    )
  }

  return (
    <CenteredAuthScreen>
      <AuthCard>
        <InvitePill />

        {/* Title block */}
        <div className="flex flex-col gap-2.5">
          {inviteQuery.isLoading ? (
            <span role="status" aria-live="polite">
              <span className="sr-only">{t`Loading invitation`}</span>
              <Skeleton className="h-9 w-72" />
            </span>
          ) : inviteQuery.data ? (
            <AuthHeading>
              <Trans>
                {inviteQuery.data.inviterEmail} invited you to {inviteQuery.data.organizationName}
              </Trans>
            </AuthHeading>
          ) : (
            <AuthHeading>
              <Trans>You&apos;ve been invited to a firm</Trans>
            </AuthHeading>
          )}
          <p className="text-sm font-medium leading-normal text-text-tertiary">
            {signedIn ? (
              <Trans>
                You opened this from the invite email — accept and you&apos;re in. We&apos;ll send a
                sign-in link whenever you come back, so there&apos;s no password to remember.
              </Trans>
            ) : (
              <Trans>Sign in to accept this invitation — no password to remember.</Trans>
            )}
          </p>
        </div>

        {signedIn && inviteQuery.isError ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>
              <Trans>Invitation couldn't load</Trans>
            </AlertTitle>
            <AlertDescription>{inviteQuery.error.message}</AlertDescription>
          </Alert>
        ) : null}

        {!signedIn ? (
          <div className="flex flex-col gap-4">
            <Button
              variant="secondary"
              size="lg"
              className="w-full justify-center gap-2.5 rounded-lg"
              onClick={() => void handleProvider('google')}
              disabled={providerDisabled}
              aria-busy={submitting === 'google'}
            >
              {submitting === 'google' ? (
                <Loader2Icon className="size-[18px] animate-spin" aria-hidden />
              ) : (
                <GoogleIcon />
              )}
              <Trans>Continue with Google</Trans>
            </Button>
            {microsoftEnabled ? (
              <Button
                variant="secondary"
                size="lg"
                className="w-full justify-center gap-2.5 rounded-lg"
                onClick={() => void handleProvider('microsoft')}
                disabled={providerDisabled}
                aria-busy={submitting === 'microsoft'}
              >
                {submitting === 'microsoft' ? (
                  <Loader2Icon className="size-[18px] animate-spin" aria-hidden />
                ) : (
                  <MicrosoftIcon />
                )}
                <Trans>Continue with Microsoft</Trans>
              </Button>
            ) : null}
            {emailOtpEnabled ? (
              <>
                <div className="flex items-center gap-3.5">
                  <span aria-hidden className="h-px flex-1 bg-divider-subtle" />
                  <span className="text-caption font-medium tracking-[0.2px] text-text-tertiary">
                    <Trans>or continue with email</Trans>
                  </span>
                  <span aria-hidden className="h-px flex-1 bg-divider-subtle" />
                </div>
                <EmailOtpSignInForm
                  disabled={submitting !== null}
                  onPendingChange={setEmailBusy}
                  onSignedIn={async () => {
                    await revalidator.revalidate()
                    setEmailSignedIn(true)
                    await inviteQuery.refetch()
                  }}
                />
              </>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-7">
            {/* Context row — inviter avatar + the role you'll join as. A
                shape-matched skeleton holds its space while the invite loads so
                the card doesn't jump when the row lands. */}
            {inviteQuery.isLoading ? (
              <div
                aria-hidden
                className="flex items-center gap-3 rounded-xl border border-divider-subtle bg-bg-subtle px-4 py-3.5"
              >
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ) : inviteQuery.data ? (
              <div className="flex items-center gap-3 rounded-xl border border-divider-subtle bg-bg-subtle px-4 py-3.5">
                <AssigneeAvatar
                  name={inviteQuery.data.inviterEmail}
                  title={inviteQuery.data.inviterEmail}
                  size="md"
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-base font-medium text-text-primary">
                    {inviteQuery.data.organizationName} · {formatRole(inviteQuery.data.role)}
                  </p>
                  <p className="truncate text-xs font-medium text-text-tertiary">
                    <Trans>Invited by {inviteQuery.data.inviterEmail}</Trans>
                  </p>
                </div>
              </div>
            ) : null}

            <Button
              size="lg"
              className="w-full justify-center gap-2 rounded-lg"
              onClick={handleAccept}
              disabled={submitting !== null || inviteQuery.isLoading || inviteQuery.isError}
              aria-busy={submitting === 'accept'}
            >
              {submitting === 'accept' ? (
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
              ) : null}
              <Trans>Accept invite &amp; continue</Trans>
              {submitting === 'accept' ? null : <ArrowRightIcon className="size-4" aria-hidden />}
            </Button>

            {/* "Use a different email" signs out so the recipient can switch
                accounts. There is no decline endpoint, so no decline action. */}
            <p className="text-center">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  void signOut().finally(() => navigate('/login', { replace: true }))
                }}
                className="text-text-secondary hover:text-text-primary"
              >
                <Trans>Use a different email</Trans>
              </Button>
            </p>
          </div>
        )}

        <p className="text-center text-caption font-medium text-text-tertiary">
          <Trans>By accepting you agree to the Terms and Privacy Policy.</Trans>
        </p>
      </AuthCard>
    </CenteredAuthScreen>
  )
}
