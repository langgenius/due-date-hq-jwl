import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowRightIcon,
  CalendarClockIcon,
  CheckCheckIcon,
  CheckIcon,
  InboxIcon,
  SendIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  MorningDigestDay,
  NotificationDigestRunPublic,
  NotificationDigestRunStatus,
  NotificationPreferencePublic,
  NotificationType,
} from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@duedatehq/ui/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
import { Switch } from '@duedatehq/ui/components/ui/switch'
import { SettingsBackLink } from '@/components/patterns/settings-back-link'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatDateTimeWithTimezone } from '@/lib/utils'

function notificationTypeLabel(type: NotificationType): React.ReactNode {
  if (type === 'deadline_reminder') return <Trans>Deadline reminder</Trans>
  if (type === 'overdue') return <Trans>Overdue</Trans>
  if (type === 'client_reminder') return <Trans>Client reminder</Trans>
  if (type === 'pulse_alert') return <Trans>Pulse alert</Trans>
  if (type === 'audit_package_ready') return <Trans>Audit package</Trans>
  return <Trans>System notification</Trans>
}

const DIGEST_DAYS: Array<{ key: MorningDigestDay; label: string }> = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' },
]

function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM'
  if (hour < 12) return `${hour}:00 AM`
  if (hour === 12) return '12:00 PM'
  return `${hour - 12}:00 PM`
}

function digestStatusBadge(status: NotificationDigestRunStatus) {
  if (status === 'sent')
    return (
      <Badge variant="success">
        <Trans>Sent</Trans>
      </Badge>
    )
  if (status === 'failed')
    return (
      <Badge variant="destructive">
        <Trans>Failed</Trans>
      </Badge>
    )
  if (status === 'queued')
    return (
      <Badge variant="info">
        <Trans>Queued</Trans>
      </Badge>
    )
  return (
    <Badge variant="secondary">
      <Trans>Skipped quiet day</Trans>
    </Badge>
  )
}

export function NotificationsPage() {
  const { t } = useLingui()
  const practiceTimezone = usePracticeTimezone()
  const queryClient = useQueryClient()
  const notificationsQuery = useQuery(
    orpc.notifications.list.queryOptions({ input: { status: 'all', limit: 50 } }),
  )
  const preferencesQuery = useQuery(
    orpc.notifications.getPreferences.queryOptions({ input: undefined }),
  )
  const digestRunsQuery = useQuery(
    orpc.notifications.listMorningDigestRuns.queryOptions({ input: undefined }),
  )
  const markRead = useMutation(
    orpc.notifications.markRead.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.notifications.key() })
      },
      onError: (error) => {
        toast.error(t`Couldn't mark notification read`, {
          description: rpcErrorMessage(error) ?? t`Please try again.`,
        })
      },
    }),
  )
  const markAllRead = useMutation(
    orpc.notifications.markAllRead.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.notifications.key() })
      },
    }),
  )
  const updatePreferences = useMutation(
    orpc.notifications.updatePreferences.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.notifications.key() })
      },
    }),
  )
  const previewDigest = useMutation(
    orpc.notifications.previewMorningDigest.mutationOptions({
      onSuccess: () => {
        toast.success(t`Morning digest preview queued`)
      },
      onError: (error) => {
        toast.error(t`Couldn't queue morning digest preview`, {
          description: rpcErrorMessage(error) ?? t`Please try again.`,
        })
      },
    }),
  )

  const notifications = notificationsQuery.data?.notifications ?? []
  const preferences = preferencesQuery.data

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <SettingsBackLink />
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-1">
          <h1 className="text-2xl leading-tight font-semibold text-text-primary">
            <Trans>Notification center</Trans>
          </h1>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => markAllRead.mutate(undefined)}
          disabled={markAllRead.isPending || notifications.every((item) => item.readAt)}
        >
          <CheckCheckIcon data-icon="inline-start" />
          <Trans>Mark all read</Trans>
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans>Inbox</Trans>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {notificationsQuery.isError ? (
              <Alert variant="destructive">
                <AlertTitle>
                  <Trans>Couldn't load notifications</Trans>
                </AlertTitle>
                <AlertDescription>
                  {rpcErrorMessage(notificationsQuery.error) ?? t`Please try again.`}
                </AlertDescription>
              </Alert>
            ) : null}

            {!notificationsQuery.isLoading && notifications.length === 0 ? (
              <div className="grid place-items-center gap-2 rounded-lg border border-divider-subtle p-8 text-center">
                <InboxIcon className="size-5 text-text-tertiary" aria-hidden />
                <p className="text-sm text-text-secondary">
                  <Trans>No notifications yet.</Trans>
                </p>
              </div>
            ) : null}

            {notifications.map((item) => (
              <article
                key={item.id}
                className="grid gap-2 rounded-lg border border-divider-subtle bg-background-default p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-text-primary">
                      {item.title}
                    </h2>
                    <p className="text-sm text-text-secondary">{item.body}</p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-text-tertiary">
                    {formatDateTimeWithTimezone(item.createdAt, practiceTimezone)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-text-tertiary">
                    {notificationTypeLabel(item.type)}
                  </span>
                  <span className="flex items-center gap-1">
                    {item.href ? (
                      <Button
                        render={
                          <Link
                            to={item.href}
                            onClick={() => {
                              if (!item.readAt) markRead.mutate({ id: item.id })
                            }}
                          />
                        }
                        variant="ghost"
                        size="sm"
                      >
                        <Trans>Open</Trans>
                        <ArrowRightIcon data-icon="inline-end" />
                      </Button>
                    ) : null}
                    {!item.readAt ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markRead.mutate({ id: item.id })}
                        disabled={markRead.isPending}
                      >
                        <CheckIcon data-icon="inline-start" />
                        <Trans>Mark read</Trans>
                      </Button>
                    ) : null}
                  </span>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {preferences ? (
            <MorningDigestCard
              preferences={preferences}
              runs={digestRunsQuery.data?.runs ?? []}
              loadingRuns={digestRunsQuery.isLoading}
              saving={updatePreferences.isPending}
              onUpdate={(patch) => updatePreferences.mutate(patch)}
              previewing={previewDigest.isPending}
              onPreview={() => previewDigest.mutate(undefined)}
            />
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>
                <Trans>Preferences</Trans>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {preferences
                ? (
                    [
                      ['emailEnabled', t`Email`],
                      ['inAppEnabled', t`In-app`],
                      ['remindersEnabled', t`Deadline reminders`],
                      ['pulseEnabled', t`Pulse updates`],
                      ['unassignedRemindersEnabled', t`Unassigned work`],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between gap-3 text-sm">
                      <span>{label}</span>
                      <Switch
                        checked={preferences[key]}
                        onCheckedChange={(checked) => updatePreferences.mutate({ [key]: checked })}
                      />
                    </label>
                  ))
                : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function MorningDigestCard({
  preferences,
  runs,
  loadingRuns,
  saving,
  previewing,
  onUpdate,
  onPreview,
}: {
  preferences: NotificationPreferencePublic
  runs: NotificationDigestRunPublic[]
  loadingRuns: boolean
  saving: boolean
  previewing: boolean
  onUpdate: (patch: Partial<NotificationPreferencePublic>) => void
  onPreview: () => void
}) {
  const toggleDay = (day: MorningDigestDay) => {
    const nextDays = preferences.morningDigestDays.includes(day)
      ? preferences.morningDigestDays.filter((item) => item !== day)
      : [...preferences.morningDigestDays, day]
    if (nextDays.length === 0) return
    onUpdate({ morningDigestDays: nextDays })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <CalendarClockIcon className="size-4 text-text-tertiary" aria-hidden />
            <Trans>Morning digest</Trans>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="grid gap-1">
            <span className="font-medium text-text-primary">
              <Trans>Send a morning digest</Trans>
            </span>
            <span className="text-xs text-text-tertiary">
              <Trans>
                Only sends when deadlines, Pulse changes, or delivery failures need attention.
              </Trans>
            </span>
          </span>
          <Switch
            checked={preferences.morningDigestEnabled}
            onCheckedChange={(checked) => onUpdate({ morningDigestEnabled: checked })}
          />
        </label>

        {preferences.morningDigestEnabled ? (
          <div className="grid gap-4">
            <div className="grid gap-2 text-sm">
              <span className="text-xs font-medium tracking-wider text-text-tertiary uppercase">
                <Trans>Send hour</Trans>
              </span>
              <Select
                value={String(preferences.morningDigestHour)}
                onValueChange={(value) => {
                  if (typeof value !== 'string') return
                  onUpdate({ morningDigestHour: Number(value) })
                }}
              >
                <SelectTrigger className="min-w-34">
                  <SelectValue>{formatHour(preferences.morningDigestHour)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, hour) => (
                    <SelectItem key={hour} value={String(hour)}>
                      {formatHour(hour)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 text-sm">
              <span className="text-xs font-medium tracking-wider text-text-tertiary uppercase">
                <Trans>Days</Trans>
              </span>
              <div className="flex gap-1">
                {DIGEST_DAYS.map((day) => {
                  const active = preferences.morningDigestDays.includes(day.key)
                  return (
                    <Button
                      key={day.key}
                      type="button"
                      variant={active ? 'primary' : 'outline'}
                      size="icon-sm"
                      aria-pressed={active}
                      aria-label={day.key}
                      disabled={saving && !active}
                      onClick={() => toggleDay(day.key)}
                    >
                      {day.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}

        <Button type="button" variant="outline" size="sm" disabled={previewing} onClick={onPreview}>
          <SendIcon data-icon="inline-start" />
          <Trans>Send preview now</Trans>
        </Button>

        <div className="grid gap-2 border-t border-divider-subtle pt-4">
          <span className="text-xs font-medium tracking-wider text-text-tertiary uppercase">
            <Trans>Recent digest runs</Trans>
          </span>
          {loadingRuns ? (
            <p className="text-sm text-text-secondary">
              <Trans>Loading recent digest runs…</Trans>
            </p>
          ) : runs.length === 0 ? (
            <p className="rounded-md border border-divider-subtle p-3 text-sm text-text-secondary">
              <Trans>No morning digests have run yet.</Trans>
            </p>
          ) : (
            <ul className="grid gap-2">
              {runs.slice(0, 7).map((run) => (
                <li key={run.id} className="grid gap-1 rounded-md border border-divider-subtle p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs tabular-nums text-text-secondary">
                      {run.localDate}
                    </span>
                    {digestStatusBadge(run.status)}
                  </div>
                  <p className="text-xs text-text-tertiary">
                    <Trans>
                      {run.urgentCount} urgent · {run.pulseCount} Pulse · {run.failedReminderCount}{' '}
                      failed reminders · {run.unassignedCount} unassigned
                    </Trans>
                  </p>
                  {run.failureReason ? (
                    <p className="truncate text-xs text-text-destructive">{run.failureReason}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
