import type { ComponentType, ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  AppWindowIcon,
  AtSignIcon,
  BellRingIcon,
  CalendarClockIcon,
  CheckIcon,
  ClipboardListIcon,
  MailIcon,
  MessageSquareIcon,
  SendIcon,
  ServerIcon,
  TimerIcon,
  TriangleAlertIcon,
  UserPlusIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  MorningDigestDay,
  NotificationDigestRunPublic,
  NotificationDigestRunStatus,
  NotificationPreferencePublic,
} from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Switch } from '@duedatehq/ui/components/ui/switch'
import { cn } from '@duedatehq/ui/lib/utils'

import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
import { ToggleChip } from '@/components/primitives/toggle-chip'
import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { useSession } from '@/lib/auth'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'

// Map each boolean preference flag to the analytics dimension it represents:
// delivery `channel` toggles vs. per-topic toggles. Non-boolean preferences
// (digest hour/days) aren't simple on/off switches, so they're omitted here.
const PREFERENCE_CHANNEL_KEYS: Record<string, string> = {
  emailEnabled: 'email',
  inAppEnabled: 'in_app',
}
const PREFERENCE_TOPIC_KEYS: Record<string, string> = {
  remindersEnabled: 'reminders',
  pulseEnabled: 'alerts',
  unassignedRemindersEnabled: 'assignments',
  morningDigestEnabled: 'morning_digest',
}

// Emit one `Notification Preferences Changed` per boolean toggle in a patch,
// tagged with the channel/topic and the new on/off value. Only enums/booleans
// leave the call — no free text.
function trackPreferencePatch(patch: Partial<NotificationPreferencePublic>) {
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value !== 'boolean') continue
    track(ANALYTICS_EVENTS.notificationPreferencesChanged, {
      channel: PREFERENCE_CHANNEL_KEYS[key],
      topic: PREFERENCE_TOPIC_KEYS[key],
      value,
    })
  }
}

const DIGEST_DAYS: Array<{ key: MorningDigestDay; label: string }> = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
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
  const preferencesQueryOptions = orpc.notifications.getPreferences.queryOptions({
    input: undefined,
  })
  const preferencesQuery = useQuery(preferencesQueryOptions)
  const digestRunsQuery = useQuery(
    orpc.notifications.listMorningDigestRuns.queryOptions({ input: undefined }),
  )
  // Reuse the query's own key (not a fresh `.queryKey(...)` call) so the
  // optimistic cache write below targets exactly the entry `useQuery` reads.
  const preferencesQueryKey = preferencesQueryOptions.queryKey
  const updatePreferences = useMutation(
    orpc.notifications.updatePreferences.mutationOptions({
      // Optimistic write: the Switch/matrix bind to the cached preference, so
      // without this the thumb wouldn't move until the round-trip lands. Patch
      // the cache immediately (cancel in-flight refetches first so they can't
      // clobber our optimistic value), and snapshot the previous data so a
      // failed write can roll back precisely.
      onMutate: async (patch) => {
        await queryClient.cancelQueries({ queryKey: preferencesQueryKey })
        const previous = queryClient.getQueryData<NotificationPreferencePublic>(preferencesQueryKey)
        if (previous) {
          // Drop any `undefined` patch values so the merge never widens a
          // required field to `undefined` (a `Partial` spread would). The
          // functional updater keeps the cache typed as the full object; the
          // merged result is asserted back since we've removed the holes.
          const definedPatch = Object.fromEntries(
            Object.entries(patch).filter(([, value]) => value !== undefined),
          )
          queryClient.setQueryData<NotificationPreferencePublic>(preferencesQueryKey, (current) =>
            current ? ({ ...current, ...definedPatch } as NotificationPreferencePublic) : current,
          )
        }
        return { previous }
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.notifications.key() })
      },
      onError: (error, _patch, context) => {
        // Roll the optimistic value back to the pre-mutation snapshot, then
        // surface the rejection and resync to server truth so a failed write
        // doesn't silently diverge.
        if (context?.previous) {
          queryClient.setQueryData(preferencesQueryKey, context.previous)
        }
        toast.error(t`Couldn't save your preference`, {
          description: rpcErrorMessage(error) ?? t`Try again in a moment.`,
        })
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
            t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )

  const preferences = preferencesQuery.data
  const onUpdate = (patch: Partial<NotificationPreferencePublic>) => {
    trackPreferencePatch(patch)
    updatePreferences.mutate(patch)
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        breadcrumbs={[
          { label: t`Notifications`, to: '/notifications' },
          { label: t`Notification preferences` },
        ]}
        title={<Trans>Notification preferences</Trans>}
        description={
          <Trans>Choose how you hear from us. You can override per-deadline from any drawer.</Trans>
        }
        // 2026-06-16 (audit): removed the "Save preferences" button — every
        // toggle persists optimistically, so an explicit Save re-fired
        // already-saved state and falsely implied unsaved changes. Changes
        // save automatically; the per-control optimistic write is the feedback.
      />

      {preferencesQuery.isError ? (
        <EmptyState
          icon={TriangleAlertIcon}
          title={<Trans>Couldn't load your preferences</Trans>}
          description={<Trans>Something went wrong fetching your notification settings.</Trans>}
          cta={
            <Button variant="outline" onClick={() => void preferencesQuery.refetch()}>
              <Trans>Try again</Trans>
            </Button>
          }
        />
      ) : preferencesQuery.isLoading || !preferences ? (
        <div className="grid gap-5" aria-busy="true">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-5">
          <ChannelsCard preferences={preferences} onUpdate={onUpdate} />
          <TypesMatrixCard preferences={preferences} onUpdate={onUpdate} />
          <QuietHoursCard />
          <MorningDigestCard
            preferences={preferences}
            runs={digestRunsQuery.data?.runs ?? []}
            loadingRuns={digestRunsQuery.isLoading}
            saving={updatePreferences.isPending}
            onUpdate={onUpdate}
            previewing={previewDigest.isPending}
            onPreview={() => previewDigest.mutate(undefined)}
          />
        </div>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------------- */
/* Channels card                                                            */
/* ----------------------------------------------------------------------- */

function ChannelsCard({
  preferences,
  onUpdate,
}: {
  preferences: NotificationPreferencePublic
  onUpdate: (patch: Partial<NotificationPreferencePublic>) => void
}) {
  const { t } = useLingui()
  // The delivery address is the signed-in user's account email — the
  // notification-preference contract carries no separate address.
  const session = useSession()
  const sessionUser = session.data?.user
  return (
    <Card>
      <CardHead
        title={<Trans>Channels</Trans>}
        subtitle={
          <Trans>How you get notified. Per-type rules below override these channels.</Trans>
        }
      />
      <div className="overflow-hidden rounded-xl border border-divider-regular">
        <ChannelRow
          icon={MailIcon}
          label={t`Email`}
          name={<Trans>Email</Trans>}
          sub={
            sessionUser ? (
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-text-secondary">
                  <Trans>Email ·</Trans>
                </span>
                <span className="font-mono text-xs text-text-secondary">{sessionUser.email}</span>
                {sessionUser.emailVerified ? (
                  <Badge variant="info" className="text-caption-xs font-semibold">
                    <Trans>Verified</Trans>
                  </Badge>
                ) : null}
              </span>
            ) : (
              <Trans>Sent to your account email</Trans>
            )
          }
          checked={preferences.emailEnabled}
          onCheckedChange={(checked) => onUpdate({ emailEnabled: checked })}
        />
        <ChannelRow
          icon={AppWindowIcon}
          label={t`In-app`}
          name={<Trans>In-app</Trans>}
          sub={<Trans>Inbox bell badge + notification center</Trans>}
          checked={preferences.inAppEnabled}
          onCheckedChange={(checked) => onUpdate({ inAppEnabled: checked })}
          last
        />
      </div>
      <p className="text-xs text-text-tertiary">
        <Trans>Push and Slack channels are planned — email and in-app are live today.</Trans>
      </p>
    </Card>
  )
}

function ChannelRow({
  icon: Icon,
  label,
  name,
  sub,
  checked,
  onCheckedChange,
  last,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  // Plain-string accessible name for the channel toggle.
  label: string
  name: ReactNode
  sub: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  last?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3.5 px-5 py-[18px]',
        last ? null : 'border-b border-divider-regular',
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-state-accent-hover text-text-accent">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-text-primary">{name}</span>
        <span className="text-xs text-text-secondary">{sub}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'text-xs font-semibold tracking-wide uppercase',
            checked ? 'text-text-success' : 'text-text-tertiary',
          )}
        >
          {checked ? <Trans>Enabled</Trans> : <Trans>Off</Trans>}
        </span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------- */
/* Per-type matrix                                                          */
/* ----------------------------------------------------------------------- */

// Boolean-valued preference keys — the only ones a matrix cell can toggle.
type BooleanPrefKey =
  | 'emailEnabled'
  | 'inAppEnabled'
  | 'remindersEnabled'
  | 'pulseEnabled'
  | 'unassignedRemindersEnabled'
  | 'morningDigestEnabled'

type MatrixRow = {
  id: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  name: ReactNode
  detail: ReactNode
  // Real preference flag backing this row, when one exists.
  flag?: BooleanPrefKey
  cadence: ReactNode
}

function TypesMatrixCard({
  preferences,
  onUpdate,
}: {
  preferences: NotificationPreferencePublic
  onUpdate: (patch: Partial<NotificationPreferencePublic>) => void
}) {
  // Each canvas row maps onto the closest real flag. Mentions / client message
  // / system have no backing flag, so their cells are read-only indicators.
  // TODO(data): the contract has no per-type × per-channel matrix; columns are
  // derived from channel + type flags rather than stored per cell.
  const rows: MatrixRow[] = [
    {
      id: 'mentions',
      icon: AtSignIcon,
      name: <Trans>@Mentions</Trans>,
      detail: <Trans>You're tagged in a comment or task</Trans>,
      cadence: <Trans>Instant</Trans>,
    },
    {
      id: 'assignments',
      icon: UserPlusIcon,
      name: <Trans>Assignments</Trans>,
      detail: <Trans>Work assigned to or unassigned from you</Trans>,
      flag: 'unassignedRemindersEnabled',
      cadence: <Trans>Instant</Trans>,
    },
    {
      id: 'deadline-24h',
      icon: CalendarClockIcon,
      name: <Trans>Deadline due in 24h</Trans>,
      detail: <Trans>Final countdown before a filing is due</Trans>,
      flag: 'remindersEnabled',
      cadence: <Trans>Instant</Trans>,
    },
    {
      id: 'deadline-7d',
      icon: CalendarClockIcon,
      name: <Trans>Deadline due in 7d</Trans>,
      detail: <Trans>Early countdown before a filing is due</Trans>,
      flag: 'remindersEnabled',
      cadence: <Trans>Daily digest</Trans>,
    },
    {
      id: 'alerts-high',
      icon: TriangleAlertIcon,
      name: <Trans>New alerts · high impact</Trans>,
      detail: <Trans>A new high-impact alert needs attention</Trans>,
      flag: 'pulseEnabled',
      cadence: <Trans>Instant</Trans>,
    },
    {
      id: 'alerts-normal',
      icon: BellRingIcon,
      name: <Trans>New alerts · normal</Trans>,
      detail: <Trans>A new normal-priority alert was raised</Trans>,
      flag: 'pulseEnabled',
      cadence: <Trans>Daily digest</Trans>,
    },
    {
      id: 'client-message',
      icon: MessageSquareIcon,
      name: <Trans>Client message received</Trans>,
      detail: <Trans>A client replied in the portal</Trans>,
      cadence: <Trans>Instant</Trans>,
    },
    {
      id: 'system',
      icon: ServerIcon,
      name: <Trans>System updates</Trans>,
      detail: <Trans>Product and maintenance notices</Trans>,
      cadence: <Trans>Weekly digest</Trans>,
    },
  ]

  return (
    <Card>
      <CardHead
        title={<Trans>Notification types</Trans>}
        subtitle={<Trans>Fine-tune which events reach you and how.</Trans>}
      />
      <div className="overflow-x-auto">
        <div className="min-w-[640px] overflow-hidden rounded-xl border border-divider-regular">
          {/* Header */}
          <div className="flex items-center gap-3.5 border-b border-divider-regular bg-background-section px-5 py-3">
            <CapsFieldLabel as="span" variant="group" className="flex-1 text-text-secondary">
              <Trans>Type</Trans>
            </CapsFieldLabel>
            <MatrixColHead id="notif-col-email">
              <Trans>Email</Trans>
            </MatrixColHead>
            <MatrixColHead id="notif-col-inapp">
              <Trans>In-app</Trans>
            </MatrixColHead>
            <CapsFieldLabel as="span" variant="group" className="w-[150px] text-text-secondary">
              <Trans>Cadence</Trans>
            </CapsFieldLabel>
          </div>

          {rows.map((row, index) => {
            const flag = row.flag
            const typeOn = flag ? preferences[flag] : true
            const toggle = flag ? () => onUpdate({ [flag]: !typeOn }) : undefined
            return (
              <div
                key={row.id}
                className={cn(
                  'flex items-center gap-3.5 bg-background-default px-5 py-3.5',
                  index === rows.length - 1 ? null : 'border-b border-divider-regular',
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background-subtle text-text-secondary">
                    <row.icon className="size-3.5" aria-hidden />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span
                      id={`notif-type-${row.id}`}
                      className="text-base font-semibold text-text-primary"
                    >
                      {row.name}
                    </span>
                    <span className="truncate text-xs text-text-secondary">{row.detail}</span>
                  </div>
                </div>
                {/* Email + In-app cells reflect the row's type flag AND the
                    global channel toggle; toggling here updates the type flag
                    when one is wired, otherwise it's a read-only indicator. */}
                <MatrixCell
                  on={typeOn && preferences.emailEnabled}
                  interactive={Boolean(flag)}
                  onToggle={toggle}
                  labelledBy={`notif-col-email notif-type-${row.id}`}
                />
                <MatrixCell
                  on={typeOn && preferences.inAppEnabled}
                  interactive={Boolean(flag)}
                  onToggle={toggle}
                  labelledBy={`notif-col-inapp notif-type-${row.id}`}
                />
                <span className="w-[150px]">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-divider-regular bg-background-default px-2.5 py-1 text-xs font-medium text-text-secondary">
                    <TimerIcon className="size-2.5 text-text-tertiary" aria-hidden />
                    {row.cadence}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function MatrixColHead({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <CapsFieldLabel
      as="span"
      id={id}
      variant="group"
      className="w-[60px] text-center text-text-secondary"
    >
      {children}
    </CapsFieldLabel>
  )
}

function MatrixCell({
  on,
  interactive,
  onToggle,
  labelledBy,
}: {
  on: boolean
  interactive?: boolean
  onToggle?: (() => void) | undefined
  labelledBy?: string
}) {
  const content = (
    <span
      className={cn(
        'inline-flex h-6 w-8 items-center justify-center rounded-lg',
        on ? 'bg-state-accent-hover text-text-accent' : 'bg-background-section text-text-tertiary',
      )}
    >
      {on ? <CheckIcon className="size-3" aria-hidden /> : null}
    </span>
  )
  return (
    <span className="flex w-[60px] justify-center">
      {interactive && onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={on}
          aria-labelledby={labelledBy}
          className="cursor-pointer"
        >
          {content}
        </button>
      ) : (
        content
      )}
    </span>
  )
}

/* ----------------------------------------------------------------------- */
/* Quiet hours (presentational — not modeled on the contract)               */
/* ----------------------------------------------------------------------- */

function QuietHoursCard() {
  // Quiet hours are not on NotificationPreferencePublic — the schedule is
  // fixed platform behavior, not a per-user setting. Say so in plain text
  // instead of rendering editable-looking controls that don't save.
  return (
    <Card>
      <CardHead
        title={<Trans>Quiet hours</Trans>}
        subtitle={
          <Trans>
            During quiet hours, non-urgent notifications wait until your next active period.
          </Trans>
        }
      />
      <p className="text-sm text-text-primary">
        <Trans>
          Non-urgent notifications hold from 7:00 PM to 7:30 AM (America/New_York), Monday through
          Friday. High-impact alerts and same-day deadlines always come through.
        </Trans>
      </p>
      <p className="text-xs text-text-tertiary">
        <Trans>
          This schedule is fixed for now — per-user quiet hours aren't configurable yet.
        </Trans>
      </p>
    </Card>
  )
}

/* ----------------------------------------------------------------------- */
/* Morning digest                                                           */
/* ----------------------------------------------------------------------- */

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
      <div className="flex items-start gap-3.5">
        <div className="flex flex-1 flex-col gap-1">
          <span className="inline-flex items-center gap-2 text-item-title text-text-primary">
            <CalendarClockIcon className="size-4 text-text-tertiary" aria-hidden />
            <Trans>Morning digest</Trans>
          </span>
          <span className="text-xs text-text-secondary">
            <Trans>
              Only sends when deadlines, regulatory alerts, or delivery failures need attention.
            </Trans>
          </span>
        </div>
        <Switch
          checked={preferences.morningDigestEnabled}
          onCheckedChange={(checked) => onUpdate({ morningDigestEnabled: checked })}
          aria-label="Send a morning digest"
        />
      </div>

      {preferences.morningDigestEnabled ? (
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-2.5">
            <CapsFieldLabel as="span" variant="group" className="text-text-secondary">
              <Trans>Send hour</Trans>
            </CapsFieldLabel>
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

          <div className="flex flex-col gap-2.5">
            <CapsFieldLabel as="span" variant="group" className="text-text-secondary">
              <Trans>Days</Trans>
            </CapsFieldLabel>
            <div className="flex flex-wrap gap-2">
              {DIGEST_DAYS.map((day) => (
                <ToggleChip
                  key={day.key}
                  selected={preferences.morningDigestDays.includes(day.key)}
                  onClick={() => toggleDay(day.key)}
                  aria-label={day.label}
                  disabled={saving && !preferences.morningDigestDays.includes(day.key)}
                  size="md"
                  className="w-[54px] justify-center"
                >
                  {day.label}
                </ToggleChip>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <Button type="button" variant="secondary" size="sm" disabled={previewing} onClick={onPreview}>
        <SendIcon data-icon="inline-start" />
        <Trans>Send preview now</Trans>
      </Button>

      <div className="flex flex-col gap-2 border-t border-divider-regular pt-4">
        <CapsFieldLabel
          as="span"
          variant="group"
          className="flex items-center gap-2 text-text-secondary"
        >
          <ClipboardListIcon className="size-3 text-text-tertiary" aria-hidden />
          <Trans>Recent digest runs</Trans>
        </CapsFieldLabel>
        {loadingRuns ? (
          <div className="grid gap-2" aria-busy="true">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : runs.length === 0 ? (
          <EmptyState title={<Trans>No morning digests have run yet.</Trans>} />
        ) : (
          <ul className="grid gap-2">
            {runs.slice(0, 7).map((run) => (
              <li
                key={run.id}
                className="grid gap-1 rounded-lg border border-divider-regular px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs tabular-nums text-text-secondary">{run.localDate}</span>
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
    </Card>
  )
}

/* ----------------------------------------------------------------------- */
/* Shared card chrome                                                        */
/* ----------------------------------------------------------------------- */

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-divider-regular bg-background-default p-[22px_26px]">
      {children}
    </section>
  )
}

function CardHead({ title, subtitle }: { title: ReactNode; subtitle: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-item-title text-text-primary">{title}</span>
      <span className="text-xs text-text-secondary">{subtitle}</span>
    </div>
  )
}
