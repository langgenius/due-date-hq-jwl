import { useState, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  Loader2Icon,
  MonitorIcon,
  ShieldCheckIcon,
  ShieldIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/patterns/page-header'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@duedatehq/ui/components/ui/alert-dialog'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@duedatehq/ui/components/ui/card'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { formatDateTimeWithTimezone } from '@/lib/utils'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import {
  TwoFactorSetupPanel,
  type PendingTwoFactorSetup,
} from './account-security-two-factor-setup'

export function AccountSecurityRoute() {
  const { t } = useLingui()
  const practiceTimezone = usePracticeTimezone()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const statusQuery = useQuery(orpc.security.status.queryOptions({ input: undefined }))
  const [pendingSetup, setPendingSetup] = useState<PendingTwoFactorSetup | null>(null)
  const [code, setCode] = useState('')
  const securityKey = orpc.security.key()

  // 2026-05-24 (re-critique): the three destructive security actions
  // — Disable MFA, Sign out other sessions, Revoke session — all
  // fired on a single click with no confirm. Stage each through an
  // AlertDialog before the mutation. Per-session Revoke shows the
  // session's user-agent + IP + created-at so the admin sees which
  // device they're killing (especially important for the "revoke
  // current session" path, which signs them out).
  const [confirmDisableMfa, setConfirmDisableMfa] = useState(false)
  const [confirmSignOutOthers, setConfirmSignOutOthers] = useState(false)
  const [pendingSessionRevoke, setPendingSessionRevoke] = useState<{
    sessionId: string
    userAgent: string
    ipAddress: string
    createdAt: string
    isCurrent: boolean
  } | null>(null)

  const enableMutation = useMutation(
    orpc.security.enableTwoFactor.mutationOptions({
      onSuccess: (result) => {
        setPendingSetup(result)
        setCode('')
        toast.success(t`Authenticator setup started`)
      },
      onError: (err) => {
        toast.error(t`Couldn't start authenticator setup`, {
          description: rpcErrorMessage(err) ?? err.message,
        })
      },
    }),
  )

  const verifyMutation = useMutation(
    orpc.security.verifyTwoFactor.mutationOptions({
      onSuccess: () => {
        setPendingSetup(null)
        setCode('')
        void queryClient.invalidateQueries({ queryKey: securityKey })
        toast.success(t`Two-factor authentication enabled`)
      },
      onError: (err) => {
        toast.error(t`Couldn't verify the code`, {
          description: rpcErrorMessage(err) ?? err.message,
        })
      },
    }),
  )

  const disableMutation = useMutation(
    orpc.security.disableTwoFactor.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: securityKey })
        toast.success(t`Two-factor authentication disabled`)
        setConfirmDisableMfa(false)
      },
      onError: (err) => {
        toast.error(t`Couldn't disable two-factor authentication`, {
          description: rpcErrorMessage(err) ?? err.message,
        })
      },
    }),
  )

  const revokeSessionMutation = useMutation(
    orpc.security.revokeSession.mutationOptions({
      onSuccess: (_result, variables) => {
        const revokedCurrent = statusQuery.data?.sessions.some(
          (session) => session.id === variables.sessionId && session.isCurrent,
        )
        void queryClient.invalidateQueries({ queryKey: securityKey })
        toast.success(t`Session revoked`)
        setPendingSessionRevoke(null)
        if (revokedCurrent) void navigate('/login', { replace: true })
      },
      onError: (err) => {
        toast.error(t`Couldn't revoke session`, {
          description: rpcErrorMessage(err) ?? err.message,
        })
      },
    }),
  )

  const revokeOtherSessionsMutation = useMutation(
    orpc.security.revokeOtherSessions.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: securityKey })
        toast.success(t`Other sessions revoked`)
        setConfirmSignOutOthers(false)
      },
      onError: (err) => {
        toast.error(t`Couldn't revoke other sessions`, {
          description: rpcErrorMessage(err) ?? err.message,
        })
      },
    }),
  )

  function handleVerify(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = code.trim()
    if (trimmed.length < 6) return
    verifyMutation.mutate({ code: trimmed })
  }

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(successMessage)
    } catch {
      toast.error(t`Couldn't copy to clipboard`)
    }
  }

  function copySetupUri() {
    if (!pendingSetup) return
    void copyText(pendingSetup.totpURI, t`Setup URI copied`)
  }

  function copyBackupCodes() {
    if (!pendingSetup) return
    void copyText(pendingSetup.backupCodes.join('\n'), t`Backup codes copied`)
  }

  if (statusQuery.isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-page-medium gap-4 px-4 py-6 md:px-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (statusQuery.isError) {
    return (
      <div className="mx-auto flex w-full max-w-page-medium flex-col gap-4 px-4 py-6 md:px-6">
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Security settings couldn't load</Trans>
          </AlertTitle>
          <AlertDescription>{statusQuery.error.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const status = statusQuery.data
  if (!status) return null

  return (
    <div className="mx-auto flex w-full max-w-page-medium flex-col gap-4 px-4 py-6 md:px-6">
      {/* 2026-05-24 (design-system audit): migrated from ad-hoc
          Breadcrumb + h1 + Badge layout to the shared `<PageHeader>`
          primitive. Breadcrumb routes through the eyebrow slot; MFA
          status Badge sits in the actions slot. Same visual outcome,
          one less custom header to maintain. */}
      <PageHeader
        breadcrumbs={[{ label: t`Settings`, to: '/settings' }, { label: t`Security` }]}
        title={<Trans>Security</Trans>}
        actions={
          <Badge variant={status.twoFactorEnabled ? 'success' : 'outline'}>
            {status.twoFactorEnabled ? <Trans>MFA enabled</Trans> : <Trans>MFA not enabled</Trans>}
          </Badge>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4" aria-hidden />
            <Trans>Authenticator app</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>Owners need MFA before sensitive production actions.</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {status.twoFactorEnabled ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-default p-3">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <CheckCircle2Icon className="size-4 text-status-done" aria-hidden />
                <Trans>Authenticator is active on this account.</Trans>
              </div>
              <Button
                variant="outline"
                onClick={() => setConfirmDisableMfa(true)}
                disabled={disableMutation.isPending}
              >
                <Trans>Disable MFA</Trans>
              </Button>
            </div>
          ) : (
            <Button
              className="w-fit"
              onClick={() => enableMutation.mutate(undefined)}
              disabled={enableMutation.isPending}
            >
              {enableMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
              ) : (
                <ShieldIcon className="size-4" aria-hidden />
              )}
              <Trans>Set up authenticator</Trans>
            </Button>
          )}

          {pendingSetup ? (
            <TwoFactorSetupPanel
              code={code}
              pendingSetup={pendingSetup}
              verifyPending={verifyMutation.isPending}
              onCodeChange={setCode}
              onCopyBackupCodes={copyBackupCodes}
              onCopySetupUri={copySetupUri}
              onVerify={handleVerify}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorIcon className="size-4" aria-hidden />
            <Trans>Active sessions</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>Review signed-in browsers and revoke stale access.</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmSignOutOthers(true)}
              disabled={revokeOtherSessionsMutation.isPending || status.sessions.length <= 1}
            >
              <Trans>Sign out other sessions</Trans>
            </Button>
          </div>
          <div className="grid gap-2">
            {status.sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-default p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {session.userAgent || <Trans>Unknown browser</Trans>}
                    </p>
                    {session.isCurrent ? (
                      <Badge variant="outline">
                        <Trans>Current</Trans>
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 font-mono text-xs text-text-muted">
                    {session.ipAddress || '-'} ·{' '}
                    {formatDateTimeWithTimezone(session.createdAt, practiceTimezone)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={revokeSessionMutation.isPending}
                  onClick={() =>
                    setPendingSessionRevoke({
                      sessionId: session.id,
                      userAgent: session.userAgent ?? '',
                      ipAddress: session.ipAddress ?? '',
                      createdAt: session.createdAt,
                      isCurrent: session.isCurrent,
                    })
                  }
                >
                  <Trans>Revoke</Trans>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2026-05-24 (re-critique): three security-side confirms. MFA
          disable + sign-out-others are both account-wide and hard to
          recover from quickly; per-session revoke shows the device
          details so the user knows which session they're killing
          (especially important for "revoke current session" — that
          path navigates them to /login). */}
      <AlertDialog
        open={confirmDisableMfa}
        onOpenChange={(open) => {
          if (!open) setConfirmDisableMfa(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Disable two-factor authentication?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                Sign-in will only require the link we email you until you re-enable MFA. Owners need
                MFA before sensitive production actions — disabling now blocks those flows.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Keep enabled</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              disabled={disableMutation.isPending}
              onClick={() => disableMutation.mutate(undefined)}
            >
              {disableMutation.isPending ? <Trans>Disabling…</Trans> : <Trans>Disable MFA</Trans>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmSignOutOthers}
        onOpenChange={(open) => {
          if (!open) setConfirmSignOutOthers(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Sign out other sessions?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                Every signed-in browser and device EXCEPT this one will lose access immediately.
                Each one will need to re-authenticate next time it's used.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              disabled={revokeOtherSessionsMutation.isPending}
              onClick={() => revokeOtherSessionsMutation.mutate(undefined)}
            >
              {revokeOtherSessionsMutation.isPending ? (
                <Trans>Signing out…</Trans>
              ) : (
                <Trans>Sign out other sessions</Trans>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingSessionRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSessionRevoke(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingSessionRevoke?.isCurrent ? (
                <Trans>Revoke this session and sign out?</Trans>
              ) : (
                <Trans>Revoke this session?</Trans>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSessionRevoke?.isCurrent ? (
                <Trans>
                  This is your current session — revoking it will sign you out and send you to the
                  login screen.
                </Trans>
              ) : (
                <Trans>
                  Whoever is signed in on this browser will lose access immediately. They'll need to
                  re-authenticate next time.
                </Trans>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingSessionRevoke ? (
            <div className="grid gap-1 rounded-lg border border-divider-regular bg-background-subtle p-3 text-sm">
              <p className="font-medium text-text-primary">
                {pendingSessionRevoke.userAgent || <Trans>Unknown browser</Trans>}
              </p>
              <p className="font-mono text-xs text-text-muted">
                {pendingSessionRevoke.ipAddress || '-'} ·{' '}
                {formatDateTimeWithTimezone(pendingSessionRevoke.createdAt, practiceTimezone)}
              </p>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              disabled={revokeSessionMutation.isPending || !pendingSessionRevoke}
              onClick={() => {
                if (pendingSessionRevoke) {
                  revokeSessionMutation.mutate({ sessionId: pendingSessionRevoke.sessionId })
                }
              }}
            >
              {revokeSessionMutation.isPending ? (
                <Trans>Revoking…</Trans>
              ) : (
                <Trans>Revoke session</Trans>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
