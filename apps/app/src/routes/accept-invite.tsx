import { useState } from 'react'
import { useLoaderData, useNavigate, useRevalidator, useSearchParams } from 'react-router'
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
    return (
      <div className="flex w-full max-w-[420px] flex-col">
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Invite link is missing</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>Ask the practice owner to send a new invitation.</Trans>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-[420px] flex-col">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailIcon className="size-4" aria-hidden />
            <Trans>Practice invitation</Trans>
          </CardTitle>
          <CardDescription>
            {!signedIn ? (
              <Trans>Sign in to accept this invitation.</Trans>
            ) : inviteQuery.isLoading ? (
              <Skeleton className="h-5 w-56" />
            ) : inviteQuery.data ? (
              <Trans>
                {inviteQuery.data.inviterEmail} invited you to {inviteQuery.data.organizationName}.
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
            <Button
              onClick={handleAccept}
              disabled={submitting !== null || inviteQuery.isLoading || inviteQuery.isError}
            >
              {submitting === 'accept' ? (
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
              ) : null}
              <Trans>Accept invitation</Trans>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
