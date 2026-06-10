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
  PlugIcon,
  SendIcon,
  ServerIcon,
  ShieldIcon,
  SmartphoneIcon,
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
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

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
  const onUpdate = (patch: Partial<NotificationPreferencePublic>) => updatePreferences.mutate(patch)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        breadcrumbs={[
          { label: t`Settings`, to: '/settings' },
          { label: t`Notification preferences` },
        ]}
        title={<Trans>Notification preferences</Trans>}
        description={
          <Trans>Choose how you hear from us. You can override per-deadline from any drawer.</Trans>
        }
        actions={
          // Preferences persist optimistically on each toggle, so an explicit
          // Save is informational. It re-fires nothing destructive; disabled
          // while a write is in flight.
          <Button
            variant="primary"
            size="sm"
            disabled={updatePreferences.isPending}
            onClick={() => preferences && onUpdate(preferences)}
          >
            <CheckIcon data-icon="inline-start" />
            <Trans>Save preferences</Trans>
          </Button>
        }
      />

      {preferencesQuery.isLoading || !preferences ? (
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
  return (
    <Card>
      <CardHead
        title={<Trans>Channels</Trans>}
        subtitle={
          <Trans>Where DueDateHQ can reach you. Per-type rules below override these.</Trans>
        }
      />
      <div className="overflow-hidden rounded-xl border border-divider-regular">
        <ChannelRow
          icon={MailIcon}
          label={t`Email`}
          name={<Trans>Email</Trans>}
          sub={
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-text-secondary">
                <Trans>Email ·</Trans>
              </span>
              {/* TODO(data): the verified delivery address is not on the
                  notification-preference contract. */}
              <span className="font-mono text-xs text-text-secondary">jules@brightline.com</span>
              <span className="inline-flex items-center rounded-full bg-state-accent-hover px-2 py-0.5 text-caption-xs font-semibold text-text-accent">
                <Trans>Verified</Trans>
              </span>
            </span>
          }
          checked={preferences.emailEnabled}
          onCheckedChange={(checked) => onUpdate({ emailEnabled: checked })}
        />
        <ChannelRow
          icon={SmartphoneIcon}
          label={t`Push`}
          name={<Trans>Push</Trans>}
          // TODO(data): push channel + registered devices not modeled.
          sub={<Trans>DueDateHQ for iOS · 2 devices registered</Trans>}
          disabled
        />
        <ChannelRow
          icon={AppWindowIcon}
          label={t`In-app`}
          name={<Trans>In-app</Trans>}
          sub={<Trans>Inbox bell badge + notification center</Trans>}
          checked={preferences.inAppEnabled}
          onCheckedChange={(checked) => onUpdate({ inAppEnabled: checked })}
        />
        <ChannelRow
          icon={MessageSquareIcon}
          iconMuted
          label={t`Slack`}
          name={<Trans>Slack</Trans>}
          sub={<Trans>Connect your Slack workspace to receive @mentions and digests there.</Trans>}
          // TODO(data): Slack integration not modeled on the contract.
          action={
            <Button variant="secondary" size="sm" disabled>
              <PlugIcon data-icon="inline-start" />
              <Trans>Connect Slack</Trans>
            </Button>
          }
          disabled
          last
        />
      </div>
    </Card>
  )
}

function ChannelRow({
  icon: Icon,
  iconMuted,
  label,
  name,
  sub,
  checked,
  onCheckedChange,
  action,
  disabled,
  last,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  iconMuted?: boolean
  // Plain-string accessible name for the channel toggle.
  label: string
  name: ReactNode
  sub: ReactNode
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  action?: ReactNode
  disabled?: boolean
  last?: boolean
}) {
  const isOn = checked ?? false
  return (
    <div
      className={cn(
        'flex items-center gap-3.5 px-5 py-[18px]',
        last ? null : 'border-b border-divider-regular',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          iconMuted
            ? 'bg-background-subtle text-text-tertiary'
            : 'bg-state-accent-hover text-text-accent',
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-text-primary">{name}</span>
        <span className="text-xs text-text-secondary">{sub}</span>
      </div>
      {action}
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'text-xs font-semibold tracking-wide uppercase',
            disabled ? 'text-text-tertiary' : isOn ? 'text-text-success' : 'text-text-tertiary',
          )}
        >
          {disabled ? <Trans>Disabled</Trans> : isOn ? <Trans>Enabled</Trans> : <Trans>Off</Trans>}
        </span>
        <Switch
          checked={isOn}
          onCheckedChange={onCheckedChange}
          disabled={disabled || !onCheckedChange}
          aria-label={label}
        />
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
        <div className="min-w-[760px] overflow-hidden rounded-xl border border-divider-regular">
          {/* Header */}
          <div className="flex items-center gap-3.5 border-b border-divider-regular bg-background-section px-5 py-3">
            <span className="flex-1 text-caption-xs font-bold tracking-wide text-text-secondary uppercase">
              <Trans>Type</Trans>
            </span>
            <MatrixColHead>
              <Trans>Email</Trans>
            </MatrixColHead>
            <MatrixColHead>
              <Trans>In-app</Trans>
            </MatrixColHead>
            <MatrixColHead muted>
              <Trans>Push</Trans>
            </MatrixColHead>
            <MatrixColHead muted>
              <Trans>Slack</Trans>
            </MatrixColHead>
            <span className="w-[150px] text-caption-xs font-bold tracking-wide text-text-secondary uppercase">
              <Trans>Cadence</Trans>
            </span>
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
                    <span className="text-base font-semibold text-text-primary">{row.name}</span>
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
                />
                <MatrixCell
                  on={typeOn && preferences.inAppEnabled}
                  interactive={Boolean(flag)}
                  onToggle={toggle}
                />
                <MatrixCell on={false} muted />
                <MatrixCell on={false} muted />
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

function MatrixColHead({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <span
      className={cn(
        'w-[60px] text-center text-caption-xs font-bold tracking-wide uppercase',
        muted ? 'text-text-tertiary' : 'text-text-secondary',
      )}
    >
      {children}
    </span>
  )
}

function MatrixCell({
  on,
  muted,
  interactive,
  onToggle,
}: {
  on: boolean
  muted?: boolean
  interactive?: boolean
  onToggle?: (() => void) | undefined
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
      {interactive && onToggle && !muted ? (
        <button type="button" onClick={onToggle} aria-pressed={on} className="cursor-pointer">
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
  // TODO(data): quiet-hours (active days + time range + timezone + enabled)
  // is not on NotificationPreferencePublic. Rendered as a static, disabled
  // surface matching the canvas until the contract carries it.
  const activeDays = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  return (
    <Card>
      <div className="flex items-start gap-3.5">
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span className="text-[16px] font-semibold text-text-primary">
              <Trans>Quiet hours</Trans>
            </span>
            <span className="inline-flex items-center rounded-full bg-state-accent-hover px-2 py-0.5 text-caption-xs font-semibold text-text-accent">
              <Trans>Active</Trans>
            </span>
          </div>
          <span className="text-xs text-text-secondary">
            <Trans>
              During quiet hours we hold non-urgent items until your next active period.
            </Trans>
          </span>
        </div>
        <Switch checked disabled aria-label="Quiet hours" />
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col gap-2.5">
          <span className="text-caption-xs font-bold tracking-wide text-text-secondary uppercase">
            <Trans>Active days</Trans>
          </span>
          <div className="flex flex-wrap gap-2">
            {DIGEST_DAYS.map((day) => {
              const on = activeDays.has(day.label)
              return (
                <span
                  key={day.key}
                  className={cn(
                    'flex h-10 w-[54px] items-center justify-center rounded-lg text-xs font-semibold',
                    on
                      ? 'bg-state-accent-solid text-text-inverted'
                      : 'border border-divider-regular bg-background-default text-text-secondary',
                  )}
                >
                  {day.label}
                </span>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="text-caption-xs font-bold tracking-wide text-text-secondary uppercase">
            <Trans>Time range</Trans>
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center rounded-lg border border-divider-regular bg-background-default px-4 py-2.5 font-mono text-base text-text-primary">
              19:00
            </span>
            <span className="text-text-tertiary">→</span>
            <span className="inline-flex items-center rounded-lg border border-divider-regular bg-background-default px-4 py-2.5 font-mono text-base text-text-primary">
              07:30
            </span>
            <span className="inline-flex items-center rounded-lg bg-background-subtle px-2.5 py-1.5 font-mono text-xs text-text-secondary">
              America/New_York
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg bg-background-section px-4 py-3">
        <ShieldIcon className="mt-0.5 size-3.5 shrink-0 text-text-secondary" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-text-secondary">
            <Trans>Urgent overrides still come through</Trans>
          </span>
          <span className="text-xs text-text-secondary">
            <Trans>
              High-impact alerts and same-day deadlines bypass quiet hours so nothing critical waits
              until morning.
            </Trans>
          </span>
        </div>
      </div>
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
          <span className="inline-flex items-center gap-2 text-[16px] font-semibold text-text-primary">
            <CalendarClockIcon className="size-4 text-text-tertiary" aria-hidden />
            <Trans>Morning digest</Trans>
          </span>
          <span className="text-xs text-text-secondary">
            <Trans>
              Only sends when deadlines, Pulse alerts, or delivery failures need attention.
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
            <span className="text-caption-xs font-bold tracking-wide text-text-secondary uppercase">
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

          <div className="flex flex-col gap-2.5">
            <span className="text-caption-xs font-bold tracking-wide text-text-secondary uppercase">
              <Trans>Days</Trans>
            </span>
            <div className="flex flex-wrap gap-2">
              {DIGEST_DAYS.map((day) => {
                const active = preferences.morningDigestDays.includes(day.key)
                return (
                  <button
                    key={day.key}
                    type="button"
                    aria-pressed={active}
                    aria-label={day.key}
                    disabled={saving && !active}
                    onClick={() => toggleDay(day.key)}
                    className={cn(
                      'flex h-10 w-[54px] cursor-pointer items-center justify-center rounded-lg text-xs font-semibold transition-colors disabled:cursor-not-allowed',
                      active
                        ? 'bg-state-accent-solid text-text-inverted'
                        : 'border border-divider-regular bg-background-default text-text-secondary hover:bg-background-section',
                    )}
                  >
                    {day.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      <Button type="button" variant="secondary" size="sm" disabled={previewing} onClick={onPreview}>
        <SendIcon data-icon="inline-start" />
        <Trans>Send preview now</Trans>
      </Button>

      <div className="flex flex-col gap-2 border-t border-divider-regular pt-4">
        <span className="flex items-center gap-2 text-caption-xs font-bold tracking-wide text-text-secondary uppercase">
          <ClipboardListIcon className="size-3 text-text-tertiary" aria-hidden />
          <Trans>Recent digest runs</Trans>
        </span>
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
      <span className="text-[16px] font-semibold text-text-primary">{title}</span>
      <span className="text-xs text-text-secondary">{subtitle}</span>
    </div>
  )
}
