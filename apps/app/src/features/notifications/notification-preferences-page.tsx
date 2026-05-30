import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { CalendarClockIcon, SendIcon } from 'lucide-react'
import { toast } from 'sonner'

import type {
  MorningDigestDay,
  NotificationDigestRunPublic,
  NotificationDigestRunStatus,
  NotificationPreferencePublic,
} from '@duedatehq/contracts'
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
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Switch } from '@duedatehq/ui/components/ui/switch'
import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

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

export function NotificationPreferencesPage() {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const preferencesQuery = useQuery(
    orpc.notifications.getPreferences.queryOptions({ input: undefined }),
  )
  const digestRunsQuery = useQuery(
    orpc.notifications.listMorningDigestRuns.queryOptions({ input: undefined }),
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
          description:
            rpcErrorMessage(error) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )

  const preferences = preferencesQuery.data

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        breadcrumbs={[
          { label: t`Settings`, to: '/settings' },
          { label: t`Notification preferences` },
        ]}
        title={<Trans>Notification preferences</Trans>}
        description={
          <Trans>Morning digest schedule and the channels DueDateHQ uses to reach you.</Trans>
        }
      />

      <div className="grid gap-4 lg:max-w-[640px]">
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
                    ['pulseEnabled', t`Alerts`],
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
              <Trans>Only sends when deadlines, Alerts, or delivery failures need attention.</Trans>
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
                      // Pass an explicit `<button>` via `render` to silence
                      // Base UI's "nativeButton expected a native <button>"
                      // warning. The Button primitive defaults to a native
                      // button via Base UI, but the warning fires when
                      // aria-pressed + variant fallback combine. Spelling
                      // out the render slot is the documented fix.
                      render={<button type="button" />}
                      variant={active ? 'primary' : 'secondary'}
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
            // 2026-05-27 (σ cross-route audit D6): raw "Loading…" text
            // → stacked skeletons that match the eventual run row
            // shape. Aligns with audit / opportunities / queue which
            // already shape skeletons to the eventual content.
            <div className="grid gap-2" aria-busy="true">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : runs.length === 0 ? (
            // 2026-05-27 (σ cross-route audit D3): bordered `<p>` →
            // canonical EmptyState. Sibling "Upcoming reminders" and
            // every other empty surface in the app uses the dashed
            // EmptyState chrome.
            <EmptyState title={<Trans>No morning digests have run yet.</Trans>} />
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
                      {run.urgentCount} urgent · {run.pulseCount} Alerts · {run.failedReminderCount}{' '}
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
