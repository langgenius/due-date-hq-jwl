import { useState } from 'react'
import { Link, useLoaderData, useNavigate, useRevalidator, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertCircleIcon, Loader2Icon, MailIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@duedatehq/ui/components/ui/card'
import { FieldSeparator } from '@duedatehq/ui/components/ui/field'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { EmailOtpSignInForm } from '@/features/auth/email-otp-sign-in-form'
import { signInWithGoogle, signInWithMicrosoft, type AuthUser } from '@/lib/auth'
import { authCapabilities } from '@/lib/auth-capabilities'

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
  if (!response.ok) throw new Error("Invitation couldn't load.")
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

// The invitation preview carries `role` as a free string; title-case it for
// the "Joining as …" accept-row rather than pulling in the typed member
// roleLabel map (which would narrow the type and couple two features).
function formatRole(role: string): string {
  if (!role) return role
  return role.charAt(0).toUpperCase() + role.slice(1)
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
      toast.success(t`Invitation accepted`)
      await navigate('/', { replace: true })
    } catch (err) {
      toast.error(t`Couldn't accept invitation`, {
        description:
          err instanceof Error
            ? err.message
            : t`Check your network and try again. If this keeps happening, contact support.`,
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
            : t`Check your network and try again. If this keeps happening, contact support.`,
      })
      setSubmitting(null)
    }
  }

  if (!id) {
    // 2026-05-26 (Step 6 UX #9 + Step 7 onboarding F2-01): the
    // missing-invite alert was a dead end. Surface both Sign-in
    // and Go-to-Today escapes so the page never dead-ends.
    return (
      <div className="flex w-full max-w-[420px] flex-col gap-3">
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Invite link is missing</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>Ask the practice owner to send a new invitation.</Trans>
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link to="/login" />}>
            <Trans>Sign in</Trans>
          </Button>
          <Button variant="outline" render={<Link to="/" />}>
            <Trans>Go to Today</Trans>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-[420px] flex-col">
      <Card>
        {/* 2026-06-07 (Cluster 6 auth canvas, node e3FyUB): the canvas
            leads with a "Firm invitation" pill and promotes the
            inviter→firm line to the headline so the recipient sees
            *who* invited them and *where* before anything else. The
            route previously buried that line in the muted card
            description. Restructured the header to match. Per the
            product decision the canvas's name input is intentionally
            dropped — the display name comes from the SSO provider /
            email, so there is no name field or user.update here. */}
        <CardHeader className="gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-state-accent-hover-alt px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide text-text-accent">
            <MailIcon className="size-3" aria-hidden />
            <Trans>Firm invitation</Trans>
          </span>
          {inviteQuery.isLoading ? (
            // 2026-05-26 (Step 7 onboarding audit F2-05): the
            // invite-preview skeleton had no role/label, so a
            // blind user saw no progress event while the
            // preview loaded. Wrapped with role="status" +
            // sr-only label so AT announces "Loading
            // invitation" while the skeleton is on-screen.
            <span role="status" aria-live="polite">
              <span className="sr-only">{t`Loading invitation`}</span>
              <Skeleton className="h-6 w-64" />
            </span>
          ) : inviteQuery.data ? (
            <CardTitle className="text-[22px] leading-snug tracking-tight">
              <Trans>
                {inviteQuery.data.inviterEmail} invited you to {inviteQuery.data.organizationName}.
              </Trans>
            </CardTitle>
          ) : (
            <CardTitle className="text-[22px] leading-snug tracking-tight">
              <Trans>You&apos;ve been invited to a firm</Trans>
            </CardTitle>
          )}
          <CardDescription>
            {signedIn ? (
              <Trans>
                Accept to join the firm&apos;s deadline workbench. No password to remember —
                we&apos;ll email a sign-in link whenever you need to come back.
              </Trans>
            ) : (
              <Trans>Sign in to accept this invitation.</Trans>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {signedIn && inviteQuery.isError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>
                <Trans>Invitation couldn't load</Trans>
              </AlertTitle>
              <AlertDescription>{inviteQuery.error.message}</AlertDescription>
            </Alert>
          ) : null}

          {!signedIn ? (
            <div className="grid gap-3">
              {emailOtpEnabled ? (
                <>
                  <EmailOtpSignInForm
                    disabled={submitting !== null}
                    onPendingChange={setEmailBusy}
                    onSignedIn={async () => {
                      await revalidator.revalidate()
                      setEmailSignedIn(true)
                      await inviteQuery.refetch()
                    }}
                  />
                  <FieldSeparator>
                    <Trans>or continue with SSO</Trans>
                  </FieldSeparator>
                </>
              ) : null}
              <Button
                variant="outline"
                onClick={() => void handleProvider('google')}
                disabled={providerDisabled}
              >
                {submitting === 'google' ? (
                  <Loader2Icon className="size-4 animate-spin" aria-hidden />
                ) : null}
                <Trans>Continue with Google</Trans>
              </Button>
              {microsoftEnabled ? (
                <Button
                  variant="outline"
                  onClick={() => void handleProvider('microsoft')}
                  disabled={providerDisabled}
                >
                  {submitting === 'microsoft' ? (
                    <Loader2Icon className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  <Trans>Continue with Microsoft</Trans>
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              {/* 2026-06-07 (Cluster 6 auth canvas, node e3FyUB): the
                  canvas shows an "accept row" — the inviter avatar +
                  the role you'll join as — so the recipient confirms
                  the access level before committing. Role comes from
                  the existing invitation preview; the canvas's
                  per-client portfolio line has no field in the
                  invitation contract, so it is omitted.
                  TODO(data): expose the assigned client portfolio on
                  the invitation preview to render the canvas's
                  "Hudson Wells · Brightline LLC · …" sub-line. */}
              {inviteQuery.data ? (
                <div className="flex items-center gap-2.5 rounded-[10px] border border-divider-subtle bg-background-section px-3.5 py-3">
                  <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-default font-mono text-[11px] font-semibold text-white"
                  >
                    {inviteQuery.data.inviterEmail.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    <Trans>Joining as {formatRole(inviteQuery.data.role)}</Trans>
                  </span>
                </div>
              ) : null}
              <Button
                onClick={handleAccept}
                disabled={submitting !== null || inviteQuery.isLoading || inviteQuery.isError}
              >
                {submitting === 'accept' ? (
                  <Loader2Icon className="size-4 animate-spin" aria-hidden />
                ) : null}
                <Trans>Accept invite &amp; continue</Trans>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
