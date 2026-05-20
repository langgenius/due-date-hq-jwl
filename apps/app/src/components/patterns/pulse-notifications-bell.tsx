import { useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRightIcon, BellIcon, MegaphoneIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { Popover, PopoverContent, PopoverTrigger } from '@duedatehq/ui/components/ui/popover'
import { cn } from '@duedatehq/ui/lib/utils'

import { usePulseListAlertsQueryOptions } from '@/features/pulse/api'
import { usePulseDrawer } from '@/features/pulse/DrawerProvider'

// PulseNotificationsBell — top-right utility bell that opens a popover
// listing the most recent Pulse alerts. Translated from the
// `BellDropdown.tsx` pattern in `/Users/yuqi/Documents/_GitHub/DueDateHQ`
// (the prior project) and adapted to this codebase's primitives.
//
// Three surfaces, three roles (per 2026-05-20 designer call):
//   - Bell = ambient ping, glance + click-to-review
//   - Dashboard top "Pulse alerts" section = daily scan
//   - Sidebar `Notification` entry = canonical destination

type FilterKind = 'unread' | 'all'

const FILTER_LABELS: Record<FilterKind, string> = {
  unread: 'Unread',
  all: 'All',
}

function isUnread(alert: PulseAlertPublic): boolean {
  // "Matched" is the freshly-arrived state — no action taken yet.
  // Applied / partially_applied / dismissed / snoozed / reverted all
  // count as "read" (the CPA already touched them).
  return alert.status === 'matched'
}

function PulseNotificationsBell() {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<FilterKind>('unread')
  const query = useQuery(usePulseListAlertsQueryOptions(10))
  const alerts = useMemo<PulseAlertPublic[]>(() => query.data?.alerts ?? [], [query.data])
  const unreadCount = useMemo(() => alerts.filter(isUnread).length, [alerts])
  const filtered = useMemo(
    () => (filter === 'unread' ? alerts.filter(isUnread) : alerts),
    [alerts, filter],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={
              unreadCount > 0 ? t`Notifications, ${unreadCount} unread` : t`Notifications`
            }
            className={cn(
              'relative inline-flex size-7 cursor-pointer touch-manipulation items-center justify-center rounded-md border border-divider-regular bg-background-default text-text-secondary outline-none transition-colors',
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
            <h3 className="text-md font-semibold text-text-primary">
              <Trans>Notifications</Trans>
            </h3>
            {unreadCount > 0 ? (
              <span className="text-sm tabular-nums text-text-tertiary">
                <Trans>{unreadCount} unread</Trans>
              </span>
            ) : null}
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
            filtered.map((alert) => (
              <NotificationItem key={alert.id} alert={alert} onClose={() => setOpen(false)} />
            ))
          )}
        </ul>

        <footer className="border-t border-divider-subtle px-4 py-2.5">
          <Link
            to="/rules/pulse"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1 text-base text-text-secondary hover:text-text-primary"
          >
            <Trans>View all in Notifications</Trans>
            <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </Link>
        </footer>
      </PopoverContent>
    </Popover>
  )
}

function NotificationItem({ alert, onClose }: { alert: PulseAlertPublic; onClose: () => void }) {
  const unread = isUnread(alert)
  const { openDrawer } = usePulseDrawer()
  const impacted = alert.matchedCount + alert.needsReviewCount
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          openDrawer(alert.id)
          onClose()
        }}
        className={cn(
          'flex w-full items-start gap-3 border-b border-divider-subtle px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-background-default-hover focus-visible:bg-background-default-hover focus-visible:outline-none',
          unread && 'bg-state-accent-hover-alt/40',
        )}
      >
        <span className="grid size-6 shrink-0 place-items-center pt-0.5 text-text-secondary">
          <MegaphoneIcon className="size-4" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              'truncate text-base',
              unread ? 'font-medium text-text-primary' : 'text-text-secondary',
            )}
          >
            {alert.title}
          </div>
          <div className="truncate text-sm text-text-tertiary">
            {impacted > 0 ? (
              <Trans>
                {impacted} clients · {alert.source}
              </Trans>
            ) : (
              <Trans>{alert.source}</Trans>
            )}
          </div>
          <div className="mt-0.5 text-xs text-text-tertiary tabular-nums">
            {formatRelativeTime(alert.publishedAt)}
          </div>
        </div>
        {unread ? (
          <span
            aria-label="unread"
            className="mt-2 size-2 shrink-0 rounded-full bg-state-accent-solid"
          />
        ) : null}
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
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export { PulseNotificationsBell }
