import { useState, type ReactNode, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ChevronDownIcon,
  DownloadIcon,
  LaptopIcon,
  Loader2Icon,
  MonitorIcon,
  ShieldIcon,
  SmartphoneIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@duedatehq/ui/components/ui/button'
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
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'

import { PageHeader } from '@/components/patterns/page-header'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { SettingsShell } from '@/features/settings/settings-sub-nav'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { initialsFromName, useSession } from '@/lib/auth'
import { formatDateTimeWithTimezone } from '@/lib/utils'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import {
  TwoFactorSetupPanel,
  type PendingTwoFactorSetup,
} from './account-security-two-factor-setup'

export function SettingsProfileRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useSession()
  const { firm } = useFirmPermission()
  const practiceTimezone = usePracticeTimezone()

  const statusQuery = useQuery(orpc.security.status.queryOptions({ input: undefined }))
  const securityKey = orpc.security.key()

  const [pendingSetup, setPendingSetup] = useState<PendingTwoFactorSetup | null>(null)
  const [code, setCode] = useState('')
  const [confirmDisableMfa, setConfirmDisableMfa] = useState(false)
  const [confirmSignOutOthers, setConfirmSignOutOthers] = useState(false)
  const [pendingSessionRevoke, setPendingSessionRevoke] = useState<{
    sessionId: string
    userAgent: string
    ipAddress: string
    createdAt: string
    isCurrent: boolean
  } | null>(null)

  const user = session.data?.user
  const displayName = user?.name ?? ''
  const email = user?.email ?? ''
  const timezone = firm?.timezone ?? practiceTimezone

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
          (s) => s.id === variables.sessionId && s.isCurrent,
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

  const status = statusQuery.data

  return (
    <SettingsShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: t`Settings`, to: '/settings' }, { label: t`Profile` }]}
          title={<Trans>Your account</Trans>}
          description={
            <Trans>Personal details, security, and how the product looks for you.</Trans>
          }
        />

        {/* Personal info */}
        <SettingsCard
          title={t`Personal info`}
          subtitle={t`How your name and details appear across the app`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span
              aria-hidden
              className="grid size-[72px] shrink-0 place-items-center rounded-full bg-state-accent-hover text-2xl font-semibold text-text-accent"
            >
              {initialsFromName(displayName || email)}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-base font-semibold text-text-primary">
                <Trans>Profile photo</Trans>
              </p>
              <p className="text-xs text-text-secondary">
                <Trans>JPG or PNG, at least 256×256</Trans>
              </p>
            </div>
            {/* TODO(data): no profile-image upload RPC (avatars come from the
                OAuth provider via better-auth). Disabled until an upload
                endpoint exists. */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <UploadIcon data-icon="inline-start" />
                <Trans>Upload</Trans>
              </Button>
              <Button variant="ghost" size="sm" disabled>
                <Trans>Remove</Trans>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t`Full name`}>
              {/* TODO(data): no user.updateProfile RPC — name is owned by the
                  identity provider. Shown read-only. */}
              <ReadonlyValue value={displayName || t`Not set`} />
            </Field>
            <Field
              label={t`Email`}
              action={
                <span
                  className="text-xs font-medium text-text-disabled"
                  title={t`Not available yet`}
                >
                  <Trans>Change</Trans>
                </span>
              }
            >
              <ReadonlyValue value={email || t`Not set`} muted />
            </Field>
          </div>

          <Field label={t`Timezone`}>
            {/* Timezone is a practice-level setting; editing lives on the
                Practice profile. Surfaced read-only here for reference. */}
            <ReadonlyValue
              value={timezone}
              trailing={<ChevronDownIcon className="size-3.5 text-text-muted" aria-hidden />}
            />
          </Field>
        </SettingsCard>

        {/* Security */}
        <SettingsCard title={t`Security`} subtitle={t`Keep your account safe with strong sign-in`}>
          {statusQuery.isLoading ? (
            <Skeleton className="h-40 rounded-lg" />
          ) : statusQuery.isError ? (
            <p className="text-sm text-text-destructive">
              <Trans>Security settings couldn't load.</Trans>
            </p>
          ) : status ? (
            <>
              {/* Two-factor */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-medium text-text-primary">
                      <Trans>Two-factor authentication</Trans>
                    </span>
                    {status.twoFactorEnabled ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-state-success-hover px-2 py-0.5 text-xs font-semibold text-text-success">
                        <span aria-hidden className="size-1.5 rounded-full bg-current" />
                        <Trans>Enabled</Trans>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-background-section px-2 py-0.5 text-xs font-semibold text-text-secondary">
                        <Trans>Off</Trans>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">
                    {status.twoFactorEnabled ? (
                      <Trans>Authenticator app is active on this account.</Trans>
                    ) : (
                      <Trans>Owners need MFA before sensitive production actions.</Trans>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {status.twoFactorEnabled ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-text-destructive hover:text-text-destructive"
                      onClick={() => setConfirmDisableMfa(true)}
                      disabled={disableMutation.isPending}
                    >
                      <Trans>Disable</Trans>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => enableMutation.mutate(undefined)}
                      disabled={enableMutation.isPending}
                    >
                      {enableMutation.isPending ? (
                        <Loader2Icon data-icon="inline-start" className="animate-spin" />
                      ) : (
                        <ShieldIcon data-icon="inline-start" />
                      )}
                      <Trans>Set up authenticator</Trans>
                    </Button>
                  )}
                </div>
              </div>

              {pendingSetup ? (
                <TwoFactorSetupPanel
                  code={code}
                  pendingSetup={pendingSetup}
                  verifyPending={verifyMutation.isPending}
                  onCodeChange={setCode}
                  onCopyBackupCodes={() =>
                    pendingSetup &&
                    void copyText(pendingSetup.backupCodes.join('\n'), t`Backup codes copied`)
                  }
                  onCopySetupUri={() =>
                    pendingSetup && void copyText(pendingSetup.totpURI, t`Setup URI copied`)
                  }
                  onVerify={handleVerify}
                />
              ) : null}

              <div className="h-px w-full bg-divider-regular" />

              {/* Sessions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-base font-medium text-text-primary">
                    <Trans>Active sessions</Trans>
                  </span>
                  <span className="text-xs text-text-secondary">
                    <Trans>You're signed in on these devices</Trans>
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmSignOutOthers(true)}
                  disabled={revokeOtherSessionsMutation.isPending || status.sessions.length <= 1}
                >
                  <Trans>Sign out everywhere</Trans>
                </Button>
              </div>

              <div className="overflow-hidden rounded-xl border border-divider-regular bg-background-section">
                {status.sessions.map((s, idx) => (
                  <div
                    key={s.id}
                    className={cn(
                      'flex items-center gap-3.5 px-4 py-3',
                      idx < status.sessions.length - 1 && 'border-b border-divider-subtle',
                    )}
                  >
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-lg border border-divider-regular bg-background-default text-text-secondary"
                    >
                      <DeviceIcon userAgent={s.userAgent} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-base font-medium text-text-primary">
                          {s.userAgent || <Trans>Unknown browser</Trans>}
                        </span>
                        {s.isCurrent ? (
                          <span className="rounded-full bg-state-accent-hover px-1.5 py-px text-xs font-medium text-text-accent">
                            <Trans>This device</Trans>
                          </span>
                        ) : null}
                      </div>
                      <span className="truncate font-mono text-xs text-text-muted">
                        {s.ipAddress || '—'} · {formatDateTimeWithTimezone(s.createdAt, timezone)}
                      </span>
                    </div>
                    {s.isCurrent ? (
                      <span aria-hidden className="text-base text-text-muted">
                        —
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-text-destructive hover:text-text-destructive"
                        disabled={revokeSessionMutation.isPending}
                        onClick={() =>
                          setPendingSessionRevoke({
                            sessionId: s.id,
                            userAgent: s.userAgent ?? '',
                            ipAddress: s.ipAddress ?? '',
                            createdAt: s.createdAt,
                            isCurrent: s.isCurrent,
                          })
                        }
                      >
                        <Trans>Revoke</Trans>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </SettingsCard>

        {/* Preferences */}
        <SettingsCard title={t`Preferences`} subtitle={t`How the product feels for you`}>
          {/* TODO(data): no user-preferences store (language / date / time
              format / week-start). Controls render disabled with sensible
              static defaults until a preferences contract lands. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t`Language`}>
              <ReadonlyValue
                value={t`English (United States)`}
                trailing={<ChevronDownIcon className="size-3.5 text-text-muted" aria-hidden />}
              />
            </Field>
            <Field label={t`Date format`}>
              <ReadonlyValue
                value="MMM d, yyyy"
                trailing={<ChevronDownIcon className="size-3.5 text-text-muted" aria-hidden />}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t`Time format`}>
              <SegmentedControl options={[t`12h`, t`24h`]} value={t`12h`} />
            </Field>
            <Field label={t`Week starts on`}>
              <SegmentedControl options={[t`Sunday`, t`Monday`]} value={t`Monday`} />
            </Field>
          </div>
        </SettingsCard>

        {/* Danger zone */}
        <SettingsCard
          title={t`Danger zone`}
          subtitle={t`Permanent actions on your account data`}
          tone="danger"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-base font-medium text-text-primary">
                <Trans>Export all my data</Trans>
              </span>
              <span className="text-xs text-text-secondary">
                <Trans>Download a JSON archive of clients, deadlines, rules, and audit log</Trans>
              </span>
            </div>
            {/* TODO(data): no account.export RPC yet. */}
            <Button variant="outline" size="sm" disabled>
              <DownloadIcon data-icon="inline-start" />
              <Trans>Request export</Trans>
            </Button>
          </div>

          <div className="h-px w-full bg-state-destructive-hover-alt" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-base font-semibold text-text-destructive">
                <Trans>Delete account</Trans>
              </span>
              <span className="text-xs text-text-secondary">
                <Trans>
                  Removes your access. Firm data stays for 30 days, then is permanently destroyed.
                </Trans>
              </span>
            </div>
            {/* TODO(data): no account.delete RPC yet. */}
            <Button variant="destructive-primary" size="sm" disabled>
              <Trash2Icon data-icon="inline-start" />
              <Trans>Delete account</Trans>
            </Button>
          </div>
        </SettingsCard>
      </div>

      {/* Confirmation dialogs (reused security wiring) */}
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
              <Trans>Revoke this session?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                Whoever is signed in on this browser will lose access immediately. They'll need to
                re-authenticate next time.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingSessionRevoke ? (
            <div className="grid gap-1 rounded-lg border border-divider-regular bg-background-subtle p-3 text-sm">
              <p className="font-medium text-text-primary">
                {pendingSessionRevoke.userAgent || <Trans>Unknown browser</Trans>}
              </p>
              <p className="font-mono text-xs text-text-muted">
                {pendingSessionRevoke.ipAddress || '—'} ·{' '}
                {formatDateTimeWithTimezone(pendingSessionRevoke.createdAt, timezone)}
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
    </SettingsShell>
  )
}

function SettingsCard({
  title,
  subtitle,
  tone = 'default',
  children,
}: {
  title: string
  subtitle: string
  tone?: 'default' | 'danger'
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-background-default',
        tone === 'danger' ? 'border-state-destructive-hover-alt' : 'border-divider-regular',
      )}
    >
      <div
        className={cn(
          'flex flex-col gap-0.5 border-b px-6 py-4',
          tone === 'danger' ? 'border-state-destructive-hover-alt' : 'border-divider-regular',
        )}
      >
        <h2 className="text-[15px] font-semibold text-text-primary">{title}</h2>
        <p className="text-xs text-text-secondary">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-5 px-6 py-5">{children}</div>
    </section>
  )
}

function Field({
  label,
  action,
  children,
}: {
  label: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

function ReadonlyValue({
  value,
  muted = false,
  trailing,
}: {
  value: string
  muted?: boolean
  trailing?: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg border border-divider-regular px-3 py-2.5',
        muted ? 'bg-background-section' : 'bg-background-default',
      )}
    >
      <span
        className={cn(
          'truncate text-base font-medium',
          muted ? 'text-text-secondary' : 'text-text-primary',
        )}
      >
        {value}
      </span>
      {trailing}
    </div>
  )
}

// Static segmented control — visual-only until a preferences store exists.
function SegmentedControl({ options, value }: { options: [string, string]; value: string }) {
  return (
    <div
      role="group"
      aria-disabled
      className="inline-flex w-fit gap-0.5 rounded-lg border border-divider-regular bg-background-section p-0.5"
    >
      {options.map((opt) => (
        <span
          key={opt}
          className={cn(
            'rounded-lg px-4 py-1.5 text-xs',
            opt === value
              ? 'bg-background-default font-semibold text-text-primary shadow-sm'
              : 'font-medium text-text-secondary',
          )}
        >
          {opt}
        </span>
      ))}
    </div>
  )
}

function DeviceIcon({ userAgent }: { userAgent: string | null }) {
  const ua = (userAgent ?? '').toLowerCase()
  if (/iphone|android|mobile/.test(ua)) return <SmartphoneIcon className="size-4" aria-hidden />
  if (/macintosh|mac os|windows|linux/.test(ua))
    return <LaptopIcon className="size-4" aria-hidden />
  return <MonitorIcon className="size-4" aria-hidden />
}
