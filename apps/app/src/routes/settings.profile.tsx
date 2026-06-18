import {
  useCallback,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  DownloadIcon,
  LaptopIcon,
  Loader2Icon,
  LockIcon,
  MonitorIcon,
  ShieldIcon,
  SmartphoneIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@duedatehq/ui/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@duedatehq/i18n'
import { cn } from '@duedatehq/ui/lib/utils'

import { PageHeader } from '@/components/patterns/page-header'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { SettingsShell } from '@/features/settings/settings-sub-nav'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { useLocaleSwitch } from '@/i18n/provider'
import { useSession } from '@/lib/auth'
import {
  DATE_FORMAT_LABELS,
  DATE_FORMAT_OPTIONS,
  TIME_FORMAT_OPTIONS,
  formatDateTimeWithDisplayPreferences,
  getServerDisplayPreferences,
  getStoredDisplayPreferences,
  subscribeToDisplayPreferences,
  switchDateFormatPreference as persistDateFormatPreference,
  switchTimeFormatPreference as persistTimeFormatPreference,
  type DateFormatPreference,
  type DisplayPreferences,
  type TimeFormatPreference,
} from '@/lib/display-preference-store'
import { orpc } from '@/lib/rpc'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { rpcErrorMessage } from '@/lib/rpc-error'
import {
  TwoFactorSetupPanel,
  type PendingTwoFactorSetup,
} from './account-security-two-factor-setup'

function useDisplayPreferenceSwitch(): {
  displayPreferences: DisplayPreferences
  switchDateFormatPreference: (next: DateFormatPreference) => void
  switchTimeFormatPreference: (next: TimeFormatPreference) => void
} {
  const displayPreferences = useSyncExternalStore(
    subscribeToDisplayPreferences,
    getStoredDisplayPreferences,
    getServerDisplayPreferences,
  )

  const switchDateFormatPreference = useCallback((next: DateFormatPreference) => {
    persistDateFormatPreference(next)
  }, [])

  const switchTimeFormatPreference = useCallback((next: TimeFormatPreference) => {
    persistTimeFormatPreference(next)
  }, [])

  return { displayPreferences, switchDateFormatPreference, switchTimeFormatPreference }
}

export function SettingsProfileRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useSession()
  const practiceTimezone = usePracticeTimezone()
  const { locale, switchLocale } = useLocaleSwitch()
  const { displayPreferences, switchDateFormatPreference, switchTimeFormatPreference } =
    useDisplayPreferenceSwitch()

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
        track(ANALYTICS_EVENTS.twoFactorEnabled, {})
        toast.success(t`Two-factor authentication enabled`)
      },
      onError: (err) => {
        toast.error(t`Couldn't verify the code`, {
          description: verifySetupErrorDescription(err),
        })
      },
    }),
  )

  const disableMutation = useMutation(
    orpc.security.disableTwoFactor.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: securityKey })
        track(ANALYTICS_EVENTS.twoFactorDisabled, {})
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
        track(ANALYTICS_EVENTS.sessionRevoked, { all: false })
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
        track(ANALYTICS_EVENTS.sessionRevoked, { all: true })
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

  function handleCodeChange(next: string) {
    setCode(next)
    if (verifyMutation.isError) verifyMutation.reset()
  }

  function verifySetupErrorDescription(error: unknown) {
    const message = rpcErrorMessage(error)
    if (message === 'INVALID_CODE' || message?.toLowerCase().includes('invalid code')) {
      return t`That code didn't match this setup. In Microsoft Authenticator, delete older DueDateHQ entries for this email, scan the current QR code again, then enter the newest 6-digit code. Also make sure your phone's time is set automatically.`
    }

    return message ?? (error instanceof Error ? error.message : t`Try again in a moment.`)
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
          title={<Trans>Profile</Trans>}
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
            <AssigneeAvatar
              name={displayName || email}
              title={displayName || email}
              size="xl"
              isMine
              className="shrink-0"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-base font-semibold text-text-primary">
                <Trans>Account initials</Trans>
              </p>
              <p className="text-xs text-text-secondary">
                <Trans>Used to identify your account across the workspace</Trans>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Name + email are owned by the sign-in provider (no
                  user.updateProfile RPC). Rendered as locked facts, NOT as
                  input-shaped boxes a CPA would click expecting to type —
                  the re-critique flagged the old white-bordered treatment as
                  a fake field. The lock glyph + caption below say why. */}
              <Field label={t`Full name`}>
                <ReadonlyValue value={displayName || t`Not set`} locked />
              </Field>
              <Field label={t`Email`}>
                <ReadonlyValue value={email || t`Not set`} locked muted />
              </Field>
            </div>
            <p className="text-caption text-text-tertiary">
              <Trans>
                Name and email come from your sign-in provider and can't be edited here.
              </Trans>
            </p>
          </div>
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
                      <Badge variant="success" className="gap-1.5 font-semibold">
                        <span aria-hidden className="size-1.5 rounded-full bg-current" />
                        <Trans>Enabled</Trans>
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1.5 font-semibold">
                        <Trans>Off</Trans>
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">
                    {status.twoFactorEnabled ? (
                      <Trans>Authenticator app is active on this account.</Trans>
                    ) : (
                      <Trans>Owners need MFA to change rules and firm settings.</Trans>
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
                  ) : pendingSetup ? null : (
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
                  onCodeChange={handleCodeChange}
                  onCopyBackupCodes={() =>
                    pendingSetup &&
                    void copyText(pendingSetup.backupCodes.join('\n'), t`Backup codes copied`)
                  }
                  onCopySetupUri={() =>
                    pendingSetup && void copyText(pendingSetup.totpURI, t`Setup URI copied`)
                  }
                  onMissingRecoveryCodeAcknowledgement={() =>
                    toast.error(
                      t`Save the recovery codes and check the confirmation above before enabling MFA.`,
                    )
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
                          <Badge variant="info" className="px-1.5 py-px">
                            <Trans>This device</Trans>
                          </Badge>
                        ) : null}
                      </div>
                      <span className="truncate font-mono text-xs text-text-tertiary">
                        {s.ipAddress || '—'} ·{' '}
                        {formatDateTimeWithDisplayPreferences(
                          s.createdAt,
                          practiceTimezone,
                          displayPreferences,
                        )}
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
        <SettingsCard title={t`Preferences`} subtitle={t`Language, date, and time formats`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t`Language`}>
              <LanguageSelect value={locale} onValueChange={switchLocale} />
            </Field>
            <Field label={t`Date format`}>
              <DateFormatSelect
                value={displayPreferences.dateFormat}
                onValueChange={switchDateFormatPreference}
              />
            </Field>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-divider-regular bg-background-default px-3 py-2.5">
            <span className="text-xs font-medium text-text-secondary">
              <Trans>Time format</Trans>
            </span>
            <Segmented<TimeFormatPreference>
              ariaLabel={t`Time format`}
              options={TIME_FORMAT_OPTIONS.map((format) => ({ value: format, label: format }))}
              value={displayPreferences.timeFormat}
              onValueChange={switchTimeFormatPreference}
            />
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
            {/* TODO(data): no account.export RPC yet. Disabled controls
                state their reason (visible caption, not just a title). */}
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Button variant="outline" size="sm" disabled title={t`Not available yet`}>
                <DownloadIcon data-icon="inline-start" />
                <Trans>Request export</Trans>
              </Button>
              <span className="text-caption-xs text-text-tertiary">
                <Trans>Not available yet</Trans>
              </span>
            </div>
          </div>

          <div className="h-px w-full bg-state-destructive-hover-alt" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-base font-semibold text-text-destructive">
                <Trans>Delete account</Trans>
              </span>
              <span className="text-xs text-text-secondary">
                <Trans>
                  Removes your access. Your practice's data is kept for 30 days, then permanently
                  deleted. This can't be undone.
                </Trans>
              </span>
            </div>
            {/* TODO(data): no account.delete RPC yet. */}
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Button
                variant="destructive-primary"
                size="sm"
                disabled
                title={t`Not available yet — contact your practice owner`}
              >
                <Trash2Icon data-icon="inline-start" />
                <Trans>Delete account</Trans>
              </Button>
              <span className="text-caption-xs text-text-tertiary">
                <Trans>Contact your practice owner</Trans>
              </span>
            </div>
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
                MFA to change rules and firm settings — disabling now blocks those actions.
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
              <p className="font-mono text-xs text-text-tertiary">
                {pendingSessionRevoke.ipAddress || '—'} ·{' '}
                {formatDateTimeWithDisplayPreferences(
                  pendingSessionRevoke.createdAt,
                  practiceTimezone,
                  displayPreferences,
                )}
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
        <h2 className="text-item-title text-text-primary">{title}</h2>
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
  locked = false,
  trailing,
}: {
  value: string
  muted?: boolean
  // `locked`: render a non-editable identity fact (no input chrome, a lock
  // glyph) so it can't be mistaken for a text field. Without it the box
  // reads exactly like an <input> — the deception the re-critique flagged.
  locked?: boolean
  trailing?: ReactNode
}) {
  if (locked) {
    return (
      <div className="flex items-center justify-between gap-2 py-1.5">
        <span
          className={cn(
            'truncate text-base font-medium',
            muted ? 'text-text-secondary' : 'text-text-primary',
          )}
        >
          {value}
        </span>
        {trailing ?? (
          <LockIcon className="size-3.5 shrink-0 text-text-tertiary" aria-label="Read-only" />
        )}
      </div>
    )
  }
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

function LanguageSelect({
  value,
  onValueChange,
}: {
  value: Locale
  onValueChange: (next: Locale) => void
}) {
  // 2026-06-16 (audit): was a hand-rolled DropdownMenu styled to imitate a
  // select field — replaced with the canonical Select primitive (keyboard nav,
  // checkmark, focus ring for free).
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as Locale)}>
      <SelectTrigger className="w-full">
        <SelectValue>{LOCALE_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {SUPPORTED_LOCALES.map((code) => (
          <SelectItem key={code} value={code}>
            {LOCALE_LABELS[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function DateFormatSelect({
  value,
  onValueChange,
}: {
  value: DateFormatPreference
  onValueChange: (next: DateFormatPreference) => void
}) {
  // 2026-06-16 (audit): hand-rolled DropdownMenu → canonical Select primitive.
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as DateFormatPreference)}>
      <SelectTrigger className="w-full">
        <SelectValue>{DATE_FORMAT_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {DATE_FORMAT_OPTIONS.map((format) => (
          <SelectItem key={format} value={format}>
            {DATE_FORMAT_LABELS[format]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function DeviceIcon({ userAgent }: { userAgent: string | null }) {
  const ua = (userAgent ?? '').toLowerCase()
  if (/iphone|android|mobile/.test(ua)) return <SmartphoneIcon className="size-4" aria-hidden />
  if (/macintosh|mac os|windows|linux/.test(ua))
    return <LaptopIcon className="size-4" aria-hidden />
  return <MonitorIcon className="size-4" aria-hidden />
}
