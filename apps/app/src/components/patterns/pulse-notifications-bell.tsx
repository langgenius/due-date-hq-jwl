import { useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRightIcon,
  BellIcon,
  CalendarClockIcon,
  CheckCheckIcon,
  CircleAlertIcon,
  Maximize2Icon,
  MegaphoneIcon,
  MessageSquareTextIcon,
  SettingsIcon,
  type LucideIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import type { InAppNotificationPublic, NotificationType } from '@duedatehq/contracts'
import { Popover, PopoverContent, PopoverTrigger } from '@duedatehq/ui/components/ui/popover'
import { cn } from '@duedatehq/ui/lib/utils'

import { orpc } from '@/lib/rpc'
import { formatDatePretty } from '@/lib/utils'

// PulseNotificationsBell — top-right utility bell that opens a popover
// listing recent in-app notifications. The popover IS the Inbox at a
// glance; the expand icon in the header promotes the same content to
// the full-page Inbox at /notifications. The sidebar no longer has an
// Inbox entry as of 2026-05-21 — the bell is the canonical surface.
//
// Three surfaces, three roles:
//   - Bell + popover = the Inbox (compact form)
//   - /notifications (via the expand icon) = the Inbox (full-page form)
//   - Dashboard "Pulse alerts" section = daily Pulse scan
//   - ⌘K palette "What's new" = power-user shortcut to the same place
//
// Originally translated from the BellDropdown pattern in
// `/Users/yuqi/Documents/_GitHub/DueDateHQ` (prior project).

type FilterKind = 'unread' | 'all'

const FILTER_LABELS: Record<FilterKind, string> = {
  unread: 'Unread',
  all: 'All',
}

const TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  pulse_alert: MegaphoneIcon,
  deadline_reminder: CalendarClockIcon,
  overdue: CircleAlertIcon,
  client_reminder: BellIcon,
  audit_package_ready: CheckCheckIcon,
  internal_request: MessageSquareTextIcon,
  system: SettingsIcon,
}

function isUnread(notification: InAppNotificationPublic): boolean {
  return notification.readAt === null
}

function PulseNotificationsBell() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<FilterKind>('unread')
  const query = useQuery(orpc.notifications.list.queryOptions({ input: { limit: 20 } }))
  const notifications = useMemo<InAppNotificationPublic[]>(
    () => query.data?.notifications ?? [],
    [query.data],
  )
  const unreadCount = useMemo(() => notifications.filter(isUnread).length, [notifications])
  const filtered = useMemo(
    () => (filter === 'unread' ? notifications.filter(isUnread) : notifications),
    [notifications, filter],
  )

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: orpc.notifications.list.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.notifications.unreadCount.key() })
  }

  const markReadMutation = useMutation(
    orpc.notifications.markRead.mutationOptions({
      onSuccess: invalidate,
    }),
  )
  const markAllReadMutation = useMutation(
    orpc.notifications.markAllRead.mutationOptions({
      onSuccess: invalidate,
    }),
  )

  function handleItemClick(notification: InAppNotificationPublic) {
    if (isUnread(notification)) {
      markReadMutation.mutate({ id: notification.id })
    }
    if (notification.href) {
      void navigate(notification.href)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={unreadCount > 0 ? t`Inbox, ${unreadCount} unread` : t`Inbox`}
            // 2026-05-25 (Yuqi rail alignment fix): bumped size-7
            // (28px) → size-8 (32px) so the bell sits at the
            // same hit-box size as the firm-switcher trigger and
            // sidebar collapse toggle.
            // 2026-05-26 (Yuqi sidebar reorg — bell moves out):
            // bell now floats at the top-right corner of
            // `SidebarInset`, never inside the sidebar. The
            // collapsed-mode style overrides
            // (`group-data-[collapsed=true]/sidebar:` selectors)
            // are dropped — they were a layout hack for when
            // the bell stacked into the 56px rail and looked
            // alien there. As a free-floating top-right widget
            // it just renders as the canonical outlined icon
            // button in all states.
            className={cn(
              'relative inline-flex size-8 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-md border border-divider-regular bg-background-default text-text-secondary outline-none transition-[background-color,border-color,color] duration-150 ease',
              'hover:bg-background-default-hover hover:text-text-primary',
              'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
            )}
          >
            <BellIcon className="size-4" aria-hidden />
            {unreadCount > 0 ? (
              <span
                aria-hidden
                className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-state-destructive-solid px-1 text-xs font-medium tabular-nums text-text-inverted"
              >
                {unreadCount}
              </span>
            ) : null}
          </button>
        }
      />
      <PopoverContent
        side="top"
        align="start"
        sideOffset={12}
        className="flex w-96 flex-col gap-0 p-0"
      >
        <header className="flex items-center justify-between gap-2 border-b border-divider-subtle px-4 py-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-base font-semibold text-text-primary">
              <Trans>Inbox</Trans>
            </h3>
            {unreadCount > 0 ? (
              <span className="text-sm tabular-nums text-text-tertiary">
                <Trans>{unreadCount} unread</Trans>
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate(undefined)}
                disabled={markAllReadMutation.isPending}
                className="rounded-sm text-sm text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:opacity-50"
              >
                <Trans>Mark all read</Trans>
              </button>
            ) : null}
            {/* Expand icon — promotes the popover to the full-page Inbox
              at /notifications. Now that the sidebar no longer has an
              Inbox entry, this is the canonical way users reach the
              full view. Sits in the header so it's always visible
              regardless of how long the notification list scrolls. */}
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              aria-label={t`Open full Inbox`}
              title={t`Open full Inbox`}
              className="inline-flex size-7 items-center justify-center rounded text-text-tertiary outline-none hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <Maximize2Icon className="size-3.5" aria-hidden />
            </Link>
          </div>
        </header>

        <div className="flex gap-1 border-b border-divider-subtle px-3 py-2">
          {(['unread', 'all'] as FilterKind[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full px-3 py-1 text-sm transition-colors',
                filter === f
                  ? 'bg-state-accent-hover text-text-accent'
                  : 'bg-transparent text-text-secondary hover:bg-background-subtle hover:text-text-primary',
              )}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        <ul className="max-h-96 overflow-y-auto">
          {query.isLoading ? (
            <li className="px-4 py-6 text-center text-base text-text-tertiary">
              <Trans>Loading…</Trans>
            </li>
          ) : filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-base text-text-tertiary">
              <Trans>Nothing here.</Trans>
            </li>
          ) : (
            filtered.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleItemClick(notification)}
              />
            ))
          )}
        </ul>

        <footer className="border-t border-divider-subtle px-4 py-2.5">
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1 rounded-sm text-base text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Trans>View all in Inbox</Trans>
            <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </Link>
        </footer>
      </PopoverContent>
    </Popover>
  )
}

function NotificationItem({
  notification,
  onClick,
}: {
  notification: InAppNotificationPublic
  onClick: () => void
}) {
  const unread = isUnread(notification)
  const Icon = TYPE_ICONS[notification.type]
  // 2026-05-27 (Yuqi polish — "why is all the inbox notification in
  // blue?"): the unread state used to paint the whole row in
  // `bg-state-accent-hover-alt/40` — a heavy lavender tint that
  // dominated the popover and shouted "everything is urgent." Now
  // the unread signal is carried by:
  //   1. The dot on the LEFT (moved from right → left, the canonical
  //      iOS / Linear / Slack position so the eye scans the dot
  //      column to triage what's new).
  //   2. The title typography (`font-medium text-text-primary` for
  //      unread, `text-text-secondary` for read).
  //   3. The icon tone (`text-text-primary` for unread, tertiary
  //      for read — gives a subtle weight bump without color).
  // Background stays neutral so hover (`bg-background-default-hover`)
  // remains the only color event in the row, reading honestly as
  // "I'm hovering this." Read items lose all accent treatment and
  // sit calmly as past context.
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-start gap-3 border-b border-divider-subtle px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-background-default-hover focus-visible:bg-background-default-hover focus-visible:outline-none"
      >
        <span
          aria-label={unread ? 'unread' : undefined}
          aria-hidden={!unread}
          className={cn(
            'mt-1.5 size-2 shrink-0 rounded-full transition-colors',
            unread ? 'bg-state-accent-solid' : 'bg-transparent',
          )}
        />
        <span
          className={cn(
            'grid size-6 shrink-0 place-items-center pt-0.5',
            unread ? 'text-text-primary' : 'text-text-tertiary',
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              'truncate text-base',
              unread ? 'font-medium text-text-primary' : 'text-text-secondary',
            )}
          >
            {notification.title}
          </div>
          <div className="line-clamp-2 text-sm text-text-tertiary">{notification.body}</div>
          <div className="mt-0.5 text-xs text-text-tertiary tabular-nums">
            {formatRelativeTime(notification.createdAt)}
          </div>
        </div>
      </button>
    </li>
  )
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDatePretty(iso)
}

export { PulseNotificationsBell }
