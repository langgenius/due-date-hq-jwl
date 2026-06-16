import { useMemo } from 'react'
import { Link } from 'react-router'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowRightIcon,
  CheckCheckIcon,
  CheckIcon,
  InboxIcon,
  Loader2,
  SlidersHorizontalIcon,
} from 'lucide-react'
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
import { cn } from '@duedatehq/ui/lib/utils'
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
  if (type === 'catalog_release') return <Trans>New rule catalog</Trans>
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
  'catalog_release',
  'internal_request',
  'system',
] as const
const NOTIFICATIONS_PAGE_SIZE = 50

export function NotificationsPage() {
  const { t } = useLingui()
  const practiceTimezone = usePracticeTimezone()
  const queryClient = useQueryClient()
  // Notifications inbox is text-heavy (title + body free-text), capped at 50
  // rows. SearchInput is wired to a `q` URL param so a shared
  // `/notifications?q=Section%20199A` deep-link lands the recipient on the
  // same filtered subset.
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
            t`Try again in a moment. If it keeps failing, contact support.`,
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
  // Explicit notifications-have-unread check instead of `every(item =>
  // item.readAt)`, which returns true for [] (silently disabling the button on
  // an empty list with no explanation).
  const hasUnread = notifications.some((item) => !item.readAt)
  // Client-side filter over title + body. Trimmed lower-case haystack lets a
  // CPA narrow to a specific deadline / client / topic without the server
  // roundtrip. Empty query is the identity (full list).
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
  // 2026-06-16 (audit): the type filter is server-side, so a type that returns
  // zero used to hit the "No notifications yet" (truly-empty) branch — telling
  // the CPA their inbox is empty when it's just filtered. Track BOTH controls
  // and offer one Clear that resets them together.
  const hasActiveFilter = isFiltering || typeFilter !== 'all'
  const clearFilters = () => {
    void setSearchQuery('')
    void setTypeFilter('all')
  }

  return (
    // 2026-06-16 (audit): mx-auto + max-w-page-wide cap (was full-bleed).
    <div className="mx-auto flex w-full max-w-page-wide flex-col gap-6 p-4 md:p-6">
      {/* "Notifications" matches the route title, breadcrumb, nav, and the
          sibling "Notification preferences" — the H1 was the lone "Inbox". */}
      <PageHeader
        title={<Trans>Notifications</Trans>}
        description={
          <Trans>
            Mentions, deadline reminders, and assignment changes — everything that needs you, in one
            place.
          </Trans>
        }
        actions={
          // 2026-06-16 (audit): added the Preferences link — /notifications/
          // preferences was an orphan (reachable only by typing the URL; no nav,
          // command-palette, or settings entry). The inbox is its natural parent.
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link to="/notifications/preferences" />}
            >
              <SlidersHorizontalIcon data-icon="inline-start" />
              <Trans>Preferences</Trans>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => markAllRead.mutate(undefined)}
              disabled={markAllRead.isPending || !hasUnread}
            >
              <CheckCheckIcon data-icon="inline-start" />
              <Trans>Mark all read</Trans>
            </Button>
          </div>
        }
      />

      {/* Inbox-level search input. Capped at the loaded 50; URL-synced so a
          shared `/notifications?q=...` link lands the recipient on the
          filtered subset. `/` hotkey wires through the canonical primitive so
          the help dialog lists it. */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={searchQuery}
          onChange={(next) => void setSearchQuery(next.length > 0 ? next : null)}
          placeholder={t`Filter notifications`}
          ariaLabel={t`Filter notifications`}
          className="md:max-w-sm"
          hotkey="/"
          hotkeyMeta={{
            id: 'notifications.focus-search',
            name: 'Filter notifications',
            description: 'Focus the notifications filter input.',
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
            {/* Explicit label — a bare <SelectValue/> renders the raw enum
                ("all" lowercase); show the formatted option text instead. */}
            <SelectValue>
              {typeFilter === 'all' ? <Trans>All types</Trans> : notificationTypeLabel(typeFilter)}
            </SelectValue>
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
        {/* No duplicate "Inbox" CardTitle — the PageHeader above already names
            the page, so repeating it inside the only Card on the page tells
            the user the same word twice. */}
        <CardContent className="grid gap-3 pt-6">
          {notificationsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>
                <Trans>Couldn't load notifications</Trans>
              </AlertTitle>
              <AlertDescription>
                {rpcErrorMessage(notificationsQuery.error) ??
                  t`Try again in a moment. If it keeps failing, contact support.`}
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Skeleton rows match the rest of the app's list-loading rhythm. */}
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

          {!notificationsQuery.isLoading && filteredNotifications.length === 0 && !hasActiveFilter ? (
            /* A one-liner description so the empty state teaches the surface —
               matching every other shared EmptyState in the app. */
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

          {/* Filtered-but-empty branch — distinct copy + a Clear so the CPA
              knows the inbox isn't empty, just narrowed to zero. Acknowledges
              BOTH the search and the type filter (either or both can cause it)
              and offers one button to reset them. */}
          {!notificationsQuery.isLoading &&
          filteredNotifications.length === 0 &&
          hasActiveFilter ? (
            <EmptyState
              icon={InboxIcon}
              title={<Trans>No notifications match these filters.</Trans>}
              description={
                <Trans>Clear the filters to see your full inbox.</Trans>
              }
              cta={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <Trans>Clear filters</Trans>
                </Button>
              }
            />
          ) : null}

          {filteredNotifications.map((item) => (
            // Unread is signaled by the leading dot inside CardContent (not
            // a card left-rail). role="article" preserves the document
            // landmark for SR users (Card renders a <div> only).
            <Card
              key={item.id}
              role="article"
              size="sm"
              radius="md"
              aria-label={item.readAt ? t`Read: ${item.title}` : t`Unread: ${item.title}`}
            >
              <CardContent className="grid gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    {/* Leading unread dot — the at-a-glance "not read yet"
                        marker that replaced the banned accent left-stripe.
                        The column is reserved (transparent when read) so
                        titles align across read + unread rows. */}
                    <span
                      className={cn(
                        'mt-[5px] size-2 shrink-0 rounded-full',
                        // Unseen marker → bright highlight tier (--color-brand-highlight).
                        item.readAt ? 'bg-transparent' : 'bg-brand-highlight',
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-text-primary">
                        {item.title}
                      </h2>
                      <p className="text-sm text-text-secondary">{item.body}</p>
                    </div>
                  </div>
                  {/* Scannable relative time ("2d ago") so the CPA can sweep
                      the list without parsing ISO. The absolute timestamp
                      lives on the tooltip. */}
                  <RelativeTime
                    value={item.createdAt}
                    timeZone={practiceTimezone}
                    className="shrink-0 text-xs text-text-tertiary"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  {/* Notification type label ("Deadline reminder", "Overdue",
                      "Audit package") is readable English copy, not a code
                      token — no `font-mono`. */}
                  <span className="text-xs text-text-tertiary">
                    {notificationTypeLabel(item.type)}
                  </span>
                  <span className="flex items-center gap-1">
                    {item.href ? (
                      <Button
                        nativeButton={false}
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
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  <Trans>Loading…</Trans>
                </>
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
