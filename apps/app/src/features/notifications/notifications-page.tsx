import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, CheckCheckIcon, CheckIcon, InboxIcon } from 'lucide-react'
import { toast } from 'sonner'

import type { NotificationType } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Card, CardContent } from '@duedatehq/ui/components/ui/card'
import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
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

export function NotificationsPage() {
  const { t } = useLingui()
  const practiceTimezone = usePracticeTimezone()
  const queryClient = useQueryClient()
  const notificationsQuery = useQuery(
    orpc.notifications.list.queryOptions({ input: { status: 'all', limit: 50 } }),
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

  const notifications = notificationsQuery.data?.notifications ?? []

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title={<Trans>Inbox</Trans>}
        description={
          <Trans>
            Everything that wants your attention — Pulse alerts, deadline reminders, system updates.
          </Trans>
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => markAllRead.mutate(undefined)}
            disabled={markAllRead.isPending || notifications.every((item) => item.readAt)}
          >
            <CheckCheckIcon data-icon="inline-start" />
            <Trans>Mark all read</Trans>
          </Button>
        }
      />

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
                {rpcErrorMessage(notificationsQuery.error) ?? t`Please try again.`}
              </AlertDescription>
            </Alert>
          ) : null}

          {!notificationsQuery.isLoading && notifications.length === 0 ? (
            <EmptyState icon={InboxIcon} title={<Trans>No notifications yet.</Trans>} />
          ) : null}

          {notifications.map((item) => (
            <article
              key={item.id}
              className="grid gap-2 rounded-lg border border-divider-subtle bg-background-default p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-text-primary">{item.title}</h2>
                  <p className="text-sm text-text-secondary">{item.body}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-text-tertiary">
                  {formatDateTimeWithTimezone(item.createdAt, practiceTimezone)}
                </span>
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
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
