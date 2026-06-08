import { useMemo } from 'react'
import { Link } from 'react-router'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, CheckCheckIcon, CheckIcon, InboxIcon } from 'lucide-react'
import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs'
import { toast } from 'sonner'

import type { NotificationType } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Card, CardContent } from '@duedatehq/ui/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
import { SearchInput } from '@/components/primitives/search-input'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { RelativeTime } from '@/components/primitives/relative-time'

function notificationTypeLabel(type: NotificationType): React.ReactNode {
  if (type === 'deadline_reminder') return <Trans>Deadline reminder</Trans>
  if (type === 'overdue') return <Trans>Overdue</Trans>
  if (type === 'client_reminder') return <Trans>Client reminder</Trans>
  if (type === 'pulse_alert') return <Trans>Alert</Trans>
  if (type === 'audit_package_ready') return <Trans>Audit package</Trans>
  if (type === 'internal_request') return <Trans>Internal request</Trans>
  return <Trans>System notification</Trans>
}

// Server-side `type` filter options for the inbox. 'all' clears the filter.
const NOTIFICATION_TYPE_FILTERS = [
  'all',
  'deadline_reminder',
  'overdue',
  'client_reminder',
  'pulse_alert',
  'audit_package_ready',
  'internal_request',
  'system',
] as const
const NOTIFICATIONS_PAGE_SIZE = 50

export function NotificationsPage() {
  const { t } = useLingui()
  const practiceTimezone = usePracticeTimezone()
  const queryClient = useQueryClient()
  // 2026-05-27 (Yuqi step-8 data-finding audit — F-X14): notifications
  // inbox is text-heavy (title + body free-text), capped at 50 rows,
  // and previously had zero find affordance. SearchInput is wired to
  // a `q` URL param so a shared `/notifications?q=Section%20199A`
  // deep-link lands the recipient on the same filtered subset.
  // Filtering is client-side over the loaded list — same shape as
  // /audit (q parser + client-side scan); backend support can come
  // later without churning the surface.
  const [searchQuery, setSearchQuery] = useQueryState(
    'q',
    parseAsString.withDefault('').withOptions({ history: 'replace' }),
  )
  const [typeFilter, setTypeFilter] = useQueryState(
    'type',
    parseAsStringLiteral(NOTIFICATION_TYPE_FILTERS)
      .withDefault('all')
      .withOptions({ history: 'replace' }),
  )
  const notificationsQuery = useInfiniteQuery(
    orpc.notifications.list.infiniteOptions({
      initialPageParam: null as string | null,
      input: (cursor) => ({
        status: 'all' as const,
        ...(typeFilter === 'all' ? {} : { type: typeFilter }),
        limit: NOTIFICATIONS_PAGE_SIZE,
        cursor,
      }),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
  )
  const markRead = useMutation(
    orpc.notifications.markRead.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.notifications.key() })
      },
      onError: (error) => {
        toast.error(t`Couldn't mark notification read`, {
          description:
            rpcErrorMessage(error) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
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

  // Flatten the cursor pages into one list. Client-side search (below)
  // scans whatever has been loaded so far; "Load more" pulls the next page.
  const pages = notificationsQuery.data?.pages
  const notifications = useMemo(() => pages?.flatMap((page) => page.notifications) ?? [], [pages])
  // 2026-05-26 (step-6 ux-flow audit F1.4): explicit
  // notifications-have-unread check instead of `every(item =>
  // item.readAt)` which returns true for [] (silently disabling
  // the button on an empty list with no explanation).
  const hasUnread = notifications.some((item) => !item.readAt)
  // 2026-05-27 (Yuqi step-8 data-finding audit — F-X14): client-side
  // filter over title + body. Trimmed lower-case haystack lets a CPA
  // narrow to a specific deadline / client / topic without the
  // server roundtrip. Empty query is the identity (full list).
  const filteredNotifications = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase()
    if (!needle) return notifications
    return notifications.filter((item) => {
      if (item.title.toLowerCase().includes(needle)) return true
      if (item.body.toLowerCase().includes(needle)) return true
      return false
    })
  }, [notifications, searchQuery])
  const isFiltering = searchQuery.trim().length > 0

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title={<Trans>Inbox</Trans>}
        description={
          <Trans>
            Everything that wants your attention — Alerts, deadline reminders, system updates.
          </Trans>
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => markAllRead.mutate(undefined)}
            disabled={markAllRead.isPending || !hasUnread}
          >
            <CheckCheckIcon data-icon="inline-start" />
            <Trans>Mark all read</Trans>
          </Button>
        }
      />

      {/* 2026-05-27 (Yuqi step-8 data-finding audit — F-X14):
          inbox-level search input. Capped at the loaded 50; URL-
          synced so a shared `/notifications?q=...` link lands the
          recipient on the filtered subset. `/` hotkey wires through
          the canonical primitive so the help dialog lists it. */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={searchQuery}
          onChange={(next) => void setSearchQuery(next.length > 0 ? next : null)}
          placeholder={t`Filter inbox`}
          ariaLabel={t`Filter notifications`}
          className="md:max-w-sm"
          hotkey="/"
          hotkeyMeta={{
            id: 'notifications.focus-search',
            name: 'Filter inbox',
            description: 'Focus the inbox filter input.',
            category: 'practice',
            scope: 'route',
          }}
        />
        {/* Server-side type filter — narrows the inbox by notification kind
            (deadline reminder, overdue, alert, …) before the client search. */}
        <Select
          value={typeFilter}
          onValueChange={(value) => {
            const next = NOTIFICATION_TYPE_FILTERS.find((filter) => filter === value)
            if (next) void setTypeFilter(next)
          }}
        >
          <SelectTrigger className="w-full md:w-52" aria-label={t`Filter by type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTIFICATION_TYPE_FILTERS.map((filterValue) => (
              <SelectItem key={filterValue} value={filterValue}>
                {filterValue === 'all' ? (
                  <Trans>All types</Trans>
                ) : (
                  notificationTypeLabel(filterValue)
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        {/* 2026-05-24 (critique P2 — clarify): dropped the duplicate
            "Inbox" CardTitle. The PageHeader above already names the
            page; repeating it inside the only Card on the page just
            tells the user the same word twice. */}
        <CardContent className="grid gap-3 pt-6">
          {notificationsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>
                <Trans>Couldn't load notifications</Trans>
              </AlertTitle>
              <AlertDescription>
                {rpcErrorMessage(notificationsQuery.error) ??
                  t`Check your network and try again. If this keeps happening, contact support.`}
              </AlertDescription>
            </Alert>
          ) : null}

          {/* 2026-05-26 (step-6 ux-flow audit F1.3): loading state
              was a silent blank Card. Skeleton rows match the rest
              of the app's list-loading rhythm. */}
          {notificationsQuery.isLoading ? (
            <div
              className="grid gap-3"
              role="status"
              aria-live="polite"
              aria-label={t`Loading inbox`}
            >
              {['r1', 'r2', 'r3', 'r4'].map((key) => (
                <Skeleton key={key} className="h-20 w-full" />
              ))}
            </div>
          ) : null}

          {!notificationsQuery.isLoading && notifications.length === 0 ? (
            /* 2026-05-26 (Step 7 onboarding audit F9-05): empty
               state was title-only — no description telling
               the user what would appear here. Compared to
               every other shared EmptyState in the app, this
               surface was the lone "title without context"
               instance. Added a one-liner so the empty state
               teaches the surface. */
            <EmptyState
              icon={InboxIcon}
              title={<Trans>No notifications yet.</Trans>}
              description={
                <Trans>
                  Mentions, assignment changes, and important deadline alerts will show up here.
                </Trans>
              }
            />
          ) : null}

          {/* 2026-05-27 (Yuqi step-8 data-finding audit — F-X14):
              filtered-but-empty branch — distinct copy so the CPA
              knows the inbox isn't empty, just narrowed to zero by
              the active query. Matches the
              `isEmpty / isFilteredEmpty` shape used on /alerts +
              /deadlines. */}
          {!notificationsQuery.isLoading &&
          notifications.length > 0 &&
          filteredNotifications.length === 0 &&
          isFiltering ? (
            <EmptyState
              icon={InboxIcon}
              title={<Trans>No notifications match your search.</Trans>}
              description={
                <Trans>Clear the search or try a different term to see the full inbox.</Trans>
              }
            />
          ) : null}

          {filteredNotifications.map((item) => (
            // 2026-06-01 (DS migration): hand-rolled `<article>` with
            // conditional left-accent border → Card size="sm"
            // radius="md" emphasis. The Card primitive ships the
            // unread left-rail via data-emphasis so this row stops
            // hand-rolling border recipes. role="article" preserves
            // the document landmark for SR users (Card renders a
            // <div> only).
            <Card
              key={item.id}
              role="article"
              size="sm"
              radius="md"
              emphasis={item.readAt ? 'default' : 'unread'}
              aria-label={item.readAt ? t`Read: ${item.title}` : t`Unread: ${item.title}`}
            >
              <CardContent className="grid gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-text-primary">
                      {item.title}
                    </h2>
                    <p className="text-sm text-text-secondary">{item.body}</p>
                  </div>
                  {/* 2026-05-24 (critique P2 — clarify): scannable
                      relative time ("2d ago") so the CPA can sweep the
                      list without parsing ISO. Absolute timestamp
                      `2026-05-01 02:50:00 PDT` lives on the tooltip. */}
                  <RelativeTime
                    value={item.createdAt}
                    timeZone={practiceTimezone}
                    className="shrink-0 text-xs text-text-tertiary"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  {/* 2026-05-24 (critique P2 — typeset): notification
                      type label ("Deadline reminder", "Overdue",
                      "Audit package") is readable English copy, not a
                      code token. Drop `font-mono`. */}
                  <span className="text-xs text-text-tertiary">
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
              </CardContent>
            </Card>
          ))}

          {/* Cursor pagination — older notifications past the first page were
              previously unreachable (hardcoded limit 50). "Load more" pulls
              the next keyset page; hidden while a client search is active
              (search only scans already-loaded rows). */}
          {!isFiltering && notificationsQuery.hasNextPage ? (
            <Button
              variant="outline"
              size="sm"
              className="justify-self-center"
              onClick={() => void notificationsQuery.fetchNextPage()}
              disabled={notificationsQuery.isFetchingNextPage}
              aria-busy={notificationsQuery.isFetchingNextPage}
            >
              {notificationsQuery.isFetchingNextPage ? (
                <Trans>Loading…</Trans>
              ) : (
                <Trans>Load more</Trans>
              )}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
