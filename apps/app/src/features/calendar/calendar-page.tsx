import { Link } from 'react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CopyIcon,
  ExternalLinkIcon,
  LinkIcon,
  RefreshCwIcon,
  ShieldIcon,
  UnlinkIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  CalendarPrivacyMode,
  CalendarSubscriptionPublic,
  CalendarSubscriptionScope,
  FirmRole,
} from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@duedatehq/ui/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
import { Separator } from '@duedatehq/ui/components/ui/separator'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { appleCalendarSubscriptionUrl } from '@/features/calendar/calendar-model'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { PermissionObscuredContent } from '@/features/permissions/permission-gate'
import { PageHeader, PageShell } from '@/components/patterns/page'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatDateTimeWithTimezone } from '@/lib/utils'

type CalendarCardConfig = {
  scope: CalendarSubscriptionScope
  title: string
  description: string
  locked?: boolean
}

function subscriptionForScope(
  subscriptions: CalendarSubscriptionPublic[] | undefined,
  scope: CalendarSubscriptionScope,
): CalendarSubscriptionPublic | null {
  return subscriptions?.find((subscription) => subscription.scope === scope) ?? null
}

function isCalendarPrivacyMode(value: unknown): value is CalendarPrivacyMode {
  return value === 'redacted' || value === 'full'
}

async function copyUrl(value: string, success: string, failure: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(success)
  } catch {
    toast.error(failure)
  }
}

export function CalendarPage() {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const { firmsQuery, currentFirm } = useCurrentFirm()
  const subscriptionsQuery = useQuery(
    orpc.calendar.listSubscriptions.queryOptions({ input: undefined }),
  )
  const calendarKey = orpc.calendar.key()

  const upsertMutation = useMutation(
    orpc.calendar.upsertSubscription.mutationOptions({
      onSuccess: () => {
        toast.success(t`Calendar subscription updated`)
        void queryClient.invalidateQueries({ queryKey: calendarKey })
      },
      onError: (err) => {
        toast.error(t`Couldn't update calendar subscription`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const regenerateMutation = useMutation(
    orpc.calendar.regenerateSubscription.mutationOptions({
      onSuccess: () => {
        toast.success(t`Calendar URL regenerated`)
        void queryClient.invalidateQueries({ queryKey: calendarKey })
      },
      onError: (err) => {
        toast.error(t`Couldn't regenerate calendar URL`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const disableMutation = useMutation(
    orpc.calendar.disableSubscription.mutationOptions({
      onSuccess: () => {
        toast.success(t`Calendar subscription disabled`)
        void queryClient.invalidateQueries({ queryKey: calendarKey })
      },
      onError: (err) => {
        toast.error(t`Couldn't disable calendar subscription`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )

  const cards: CalendarCardConfig[] = [
    {
      scope: 'my',
      title: t`My deadlines`,
      description: t`A personal feed for deadlines assigned to you.`,
    },
  ]

  return (
    <PageShell>
      <PageHeader
        title={<Trans>Calendar sync</Trans>}
        subtitle={
          <>
            <Trans>
              Subscribe from Google Calendar, Apple Calendar, or Outlook. DueDateHQ remains the
              source of truth for deadline changes.
            </Trans>
            <span className="mt-1 block font-mono text-xs text-text-muted">
              <Trans>ICS is one-way: external calendar edits never update DueDateHQ.</Trans>
            </span>
          </>
        }
        actions={
          <Button variant="secondary" size="sm" render={<Link to="/obligations" />}>
            <ArrowLeftIcon data-icon="inline-start" />
            <Trans>Back to Obligations</Trans>
          </Button>
        }
      />

      {subscriptionsQuery.isLoading || firmsQuery.isLoading ? (
        <Skeleton className="h-72 max-w-2xl rounded-lg" />
      ) : (
        <div className="grid gap-4">
          {cards.map((card) => (
            <CalendarSubscriptionCard
              key={card.scope}
              config={card}
              subscription={subscriptionForScope(subscriptionsQuery.data, card.scope)}
              onEnable={(privacyMode) => upsertMutation.mutate({ scope: card.scope, privacyMode })}
              onRegenerate={(id) => regenerateMutation.mutate({ id })}
              onDisable={(id) => disableMutation.mutate({ id })}
              pending={
                upsertMutation.isPending ||
                regenerateMutation.isPending ||
                disableMutation.isPending
              }
              currentRole={currentFirm?.role}
            />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Subscription notes</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              Google Calendar uses the copied HTTPS URL from its web app. Apple Calendar can open
              the webcal link directly.
            </Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-text-secondary md:grid-cols-3">
          <IntegrationNote title={t`Google Calendar`} body={t`Other calendars -> From URL`} />
          <IntegrationNote title={t`Apple Calendar`} body={t`Open the Apple Calendar link`} />
          <IntegrationNote title={t`Outlook`} body={t`Subscribe from web calendar URL`} />
        </CardContent>
      </Card>
    </PageShell>
  )
}

function CalendarSubscriptionCard({
  config,
  subscription,
  pending,
  currentRole,
  onEnable,
  onRegenerate,
  onDisable,
}: {
  config: CalendarCardConfig
  subscription: CalendarSubscriptionPublic | null
  pending: boolean
  currentRole: FirmRole | null | undefined
  onEnable: (privacyMode: CalendarPrivacyMode) => void
  onRegenerate: (id: string) => void
  onDisable: (id: string) => void
}) {
  const { t } = useLingui()
  const practiceTimezone = usePracticeTimezone()
  const activeSubscription =
    !config.locked && subscription?.status === 'active' && subscription.feedUrl
      ? subscription
      : null
  const feedUrl = activeSubscription?.feedUrl ?? null
  const privacyMode = config.locked ? 'redacted' : (subscription?.privacyMode ?? 'redacted')
  const appleCalendarUrl = feedUrl ? appleCalendarSubscriptionUrl(feedUrl) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-md border border-state-accent-active bg-state-accent-hover-alt text-text-accent"
          >
            {config.scope === 'firm' ? (
              <ShieldIcon className="size-4" />
            ) : (
              <CalendarDaysIcon className="size-4" />
            )}
          </span>
          {config.title}
        </CardTitle>
        <CardDescription>{config.description}</CardDescription>
        <CardAction>
          <Badge variant={feedUrl ? 'default' : 'outline'}>
            {feedUrl ? <Trans>Active</Trans> : <Trans>Not enabled</Trans>}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {config.locked ? (
          <PermissionObscuredContent
            locked
            permission="firm.calendar.manage"
            currentRole={currentRole}
            fallback={<CalendarSubscriptionRedactedContent />}
            notice={
              <Trans>Only owners and managers can enable the practice-wide calendar feed.</Trans>
            }
          >
            <CalendarSubscriptionRedactedContent />
          </PermissionObscuredContent>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium text-text-primary">
                <Trans>Privacy</Trans>
              </span>
              <Select
                value={privacyMode}
                onValueChange={(value) => {
                  if (isCalendarPrivacyMode(value)) onEnable(value)
                }}
                disabled={pending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="redacted">
                    <Trans>Redacted client names</Trans>
                  </SelectItem>
                  <SelectItem value="full">
                    <Trans>Full client names</Trans>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1 rounded-md border border-divider-regular bg-background-subtle p-3">
              <MetadataRow
                label={t`Privacy mode`}
                value={privacyMode === 'full' ? t`Full client names` : t`Redacted client names`}
              />
              <MetadataRow
                label={t`Created`}
                value={
                  subscription
                    ? formatDateTimeWithTimezone(subscription.createdAt, practiceTimezone)
                    : t`Not enabled`
                }
              />
              <MetadataRow
                label={t`Last accessed`}
                value={
                  subscription?.lastAccessedAt
                    ? formatDateTimeWithTimezone(subscription.lastAccessedAt, practiceTimezone)
                    : t`Never`
                }
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {activeSubscription && feedUrl ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyUrl(feedUrl, t`Calendar URL copied`, t`Couldn't copy calendar URL`)
                    }
                  >
                    <CopyIcon data-icon="inline-start" />
                    <Trans>Copy URL</Trans>
                  </Button>
                  {appleCalendarUrl ? (
                    <Button variant="outline" size="sm" render={<a href={appleCalendarUrl} />}>
                      <ExternalLinkIcon data-icon="inline-start" />
                      <Trans>Apple Calendar</Trans>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toast.error(t`Apple Calendar requires HTTPS`, {
                          description: t`Use a deployed app URL or a trusted local HTTPS tunnel for direct Apple Calendar subscriptions.`,
                        })
                      }
                    >
                      <ExternalLinkIcon data-icon="inline-start" />
                      <Trans>Apple Calendar</Trans>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRegenerate(activeSubscription.id)}
                    disabled={pending}
                  >
                    <RefreshCwIcon data-icon="inline-start" />
                    <Trans>Regenerate URL</Trans>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDisable(activeSubscription.id)}
                    disabled={pending}
                  >
                    <UnlinkIcon data-icon="inline-start" />
                    <Trans>Disable</Trans>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" onClick={() => onEnable('redacted')} disabled={pending}>
                    <LinkIcon data-icon="inline-start" />
                    <Trans>Enable redacted feed</Trans>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEnable('full')}
                    disabled={pending}
                  >
                    <LinkIcon data-icon="inline-start" />
                    <Trans>Enable full feed</Trans>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CalendarSubscriptionRedactedContent() {
  return (
    <div className="grid gap-4 p-4">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="grid gap-2 rounded-md border border-divider-regular bg-background-subtle p-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
  )
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-text-tertiary">{label}</span>
      <span className="truncate text-right font-mono text-xs text-text-secondary">{value}</span>
    </div>
  )
}

function IntegrationNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 font-medium text-text-primary">
        <CalendarDaysIcon className="size-4 text-text-tertiary" aria-hidden />
        {title}
      </div>
      <Separator />
      <p>{body}</p>
    </div>
  )
}
