import { useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRightIcon,
  BellIcon,
  CalendarClockIcon,
  CheckCheckIcon,
  CircleAlertIcon,
  LayersIcon,
  Maximize2Icon,
  MegaphoneIcon,
  MessageSquareTextIcon,
  SettingsIcon,
  type LucideIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import type { InAppNotificationPublic, NotificationType } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@duedatehq/ui/components/ui/popover'
import { SidebarMenuBadge, SidebarMenuButton } from '@duedatehq/ui/components/ui/sidebar'
import { Tabs, TabsList, TabsTrigger } from '@duedatehq/ui/components/ui/tabs'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

import { orpc } from '@/lib/rpc'
import { formatDatePretty } from '@/lib/utils'

// AlertsNotificationsBell — top-right utility bell that opens a popover
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
  catalog_release: LayersIcon,
  internal_request: MessageSquareTextIcon,
  system: SettingsIcon,
}

function isUnread(notification: InAppNotificationPublic): boolean {
  return notification.readAt === null
}

function AlertsNotificationsBell() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<FilterKind>('unread')
  const query = useQuery(orpc.notifications.list.queryOptions({ input: { limit: 20 } }))
  // Badge count comes from the server, not the loaded 20-item page — the
  // client-side `.filter(isUnread).length` silently undercounts once unread
  // exceeds the fetched page. Falls back to the local count while the
  // count query is in flight. (`invalidate()` already busts this key.)
  const unreadCountQuery = useQuery(
    orpc.notifications.unreadCount.queryOptions({ input: undefined }),
  )
  const notifications = useMemo<InAppNotificationPublic[]>(
    () => query.data?.notifications ?? [],
    [query.data],
  )
  const localUnread = useMemo(() => notifications.filter(isUnread).length, [notifications])
  const unreadCount = unreadCountQuery.data?.count ?? localUnread
  const unreadBadgeLabel = unreadCount > 99 ? '99+' : String(unreadCount)
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
      {/* 2026-06-01: hand-rolled bell trigger collapsed onto
          SidebarMenuButton — same chrome/hover/focus/collapsed-tile
          behavior as the other footer destinations (Audit log,
          Settings). Unread count routes through SidebarMenuBadge
          tone='urgent' which already handles the expanded-pill ↔
          collapsed-dot variant per sidebar mode. */}
      <PopoverTrigger
        render={
          <SidebarMenuButton
            render={
              <button
                type="button"
                aria-label={unreadCount > 0 ? t`Inbox, ${unreadCount} unread` : t`Inbox`}
              />
            }
            data-has-badge={unreadCount > 0 ? 'true' : 'false'}
            data-badge-tone={unreadCount > 0 ? 'urgent' : undefined}
          >
            <BellIcon aria-hidden />
            <span data-slot="sidebar-menu-label">
              <Trans>Inbox</Trans>
            </span>
            {unreadCount > 0 ? (
              <SidebarMenuBadge aria-hidden="true" tone="urgent">
                {unreadBadgeLabel}
              </SidebarMenuBadge>
            ) : null}
          </SidebarMenuButton>
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
            {/* 2026-06-01: Mark-all-read uses TextLink variant='secondary'
                size='sm' — same secondary-tone hover-to-primary tonality
                as the previous hand-rolled <button>, now from the
                primitive. Disabled-opacity routes through the primitive's
                rounded focus ring as before. */}
            {unreadCount > 0 ? (
              <TextLink
                variant="secondary"
                size="sm"
                onClick={() => markAllReadMutation.mutate(undefined)}
                disabled={markAllReadMutation.isPending}
                className="disabled:opacity-50"
              >
                <Trans>Mark all read</Trans>
              </TextLink>
            ) : null}
            {/* Expand icon — promotes the popover to the full-page Inbox
              at /notifications. Now that the sidebar no longer has an
              Inbox entry, this is the canonical way users reach the
              full view. Sits in the header so it's always visible
              regardless of how long the notification list scrolls.
              2026-06-01: hand-rolled icon link replaced by Button
              variant='ghost' size='icon-xs' (28px), which already
              owns the size-7 + rounded-lg + hover/focus chrome. */}
            <Button
              variant="ghost"
              size="icon-xs"
              render={
                <Link
                  to="/notifications"
                  onClick={() => setOpen(false)}
                  aria-label={t`Open full Inbox`}
                  title={t`Open full Inbox`}
                />
              }
            >
              <Maximize2Icon aria-hidden />
            </Button>
          </div>
        </header>

        {/* 2026-06-01: hand-rolled filter pills collapsed onto the
            segmented Tabs primitive. Two triggers (Unread / All)
            share the same value/onValueChange contract; selected
            state comes from the primitive's `data-active` chrome. */}
        <div className="border-b border-divider-subtle px-3 py-2">
          <Tabs
            value={filter}
            onValueChange={(next) => {
              if (next === 'unread' || next === 'all') setFilter(next)
            }}
          >
            <TabsList>
              {(['unread', 'all'] as FilterKind[]).map((f) => (
                <TabsTrigger key={f} value={f}>
                  {FILTER_LABELS[f]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
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
          {/* 2026-06-01: footer link routed through TextLink
              variant='secondary' size='sm' — the primitive owns the
              secondary-tone hover-to-primary chrome + focus ring +
              gap-1 layout. Trailing icon stays as a child. */}
          <TextLink
            variant="secondary"
            size="sm"
            render={<Link to="/notifications" onClick={() => setOpen(false)} />}
          >
            <Trans>View all in Inbox</Trans>
            <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </TextLink>
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
        className="flex w-full cursor-pointer items-start gap-3 border-b border-divider-subtle px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-background-default-hover focus-visible:bg-background-default-hover focus-visible:outline-none"
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

export { AlertsNotificationsBell }
