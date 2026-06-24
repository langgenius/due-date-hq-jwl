import { Link } from 'react-router'
import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CircleAlertIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
  LinkIcon,
  Loader2Icon,
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
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@duedatehq/ui/components/ui/alert-dialog'
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
import { DestructiveChangePreview } from '@/components/patterns/destructive-change-preview'
import { PageHeader } from '@/components/patterns/page-header'
import { appleCalendarSubscriptionUrl } from '@/features/calendar/calendar-model'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import {
  PermissionObscuredContent,
  useFirmPermission,
} from '@/features/permissions/permission-gate'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatDateTimePretty } from '@/lib/utils'

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
  const permission = useFirmPermission()
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
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
    {
      // Practice-wide feed — every deadline across the firm. The card
      // component routes `locked` config through PermissionObscuredContent;
      // members without `firm.calendar.manage` (e.g. preparers) see the
      // redacted state, owners/managers/partners get the real feed.
      scope: 'firm',
      title: t`Practice deadlines`,
      description: t`A shared feed of every deadline across the practice.`,
      locked: !permission.can('firm.calendar.manage'),
    },
  ]

  // Regenerate URL and Disable feed are both hard-to-undo — the old URL is
  // silently invalidated, breaking any Google/Apple/Outlook subscription that
  // was already pointing at it. Stage these actions through an AlertDialog +
  // DestructiveChangePreview so the user understands the blast radius before
  // the mutation fires. Enable / privacy-swap stay direct: they're additive,
  // easy to reverse.
  const [pendingRegenerate, setPendingRegenerate] = useState<{
    id: string
    title: string
  } | null>(null)
  const [pendingDisable, setPendingDisable] = useState<{
    id: string
    title: string
  } | null>(null)

  // 2026-06-16 (audit): added mx-auto + max-w-page-wide cap — this page ran
  // full-bleed edge-to-edge while every other route is centered + capped.
  return (
    <section className="mx-auto grid w-full max-w-page-wide gap-6 px-4 pt-8 pb-12 md:px-6">
      <PageHeader
        title={<Trans>Calendar sync</Trans>}
        description={
          <Trans>
            Subscribe from Google Calendar, Apple Calendar, or Outlook. Edits in your calendar don't
            change DueDateHQ.
          </Trans>
        }
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link to="/deadlines" />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            <Trans>Back to Deadlines</Trans>
          </Button>
        }
      />

      {subscriptionsQuery.isError ? (
        // Error state (2026-06-11 state-completeness audit — calendar was
        // the one surface with no error branch: a failed query rendered
        // the cards as silently "not connected", which misreads as the
        // user having no subscriptions). Same Alert + Retry pattern as
        // the alerts/clients lists.
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>
            <Trans>Couldn't load calendar subscriptions</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(subscriptionsQuery.error) ??
              t`Try again in a moment. If it keeps failing, contact support.`}{' '}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 align-baseline"
              onClick={() => void subscriptionsQuery.refetch()}
            >
              <Trans>Retry</Trans>
            </Button>
          </AlertDescription>
        </Alert>
      ) : subscriptionsQuery.isLoading || firmsQuery.isLoading ? (
        // Card-shaped placeholders in the SAME grid the loaded view uses, one
        // per card config, so the layout doesn't reflow on paint.
        <div className="grid gap-4" aria-hidden>
          {cards.map((card) => (
            <Skeleton key={card.scope} className="h-72 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {cards.map((card) => (
            <CalendarSubscriptionCard
              key={card.scope}
              config={card}
              subscription={subscriptionForScope(subscriptionsQuery.data, card.scope)}
              onEnable={(privacyMode) => upsertMutation.mutate({ scope: card.scope, privacyMode })}
              onRegenerate={(id) => setPendingRegenerate({ id, title: card.title })}
              onDisable={(id) => setPendingDisable({ id, title: card.title })}
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

      <AlertDialog
        open={pendingRegenerate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRegenerate(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Regenerate calendar URL?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRegenerate
                ? t`All devices subscribed to the current ${pendingRegenerate.title} feed will disconnect — the old URL stops working. Share the new URL with everyone who had it.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingRegenerate ? (
            <DestructiveChangePreview
              title={<Trans>Regenerating commits these changes</Trans>}
              lines={[
                {
                  tone: 'remove',
                  label: <Trans>Invalidates</Trans>,
                  detail: <Trans>The current URL on every subscribed device</Trans>,
                },
                {
                  tone: 'add',
                  label: <Trans>Issues</Trans>,
                  detail: <Trans>A fresh URL — same scope, same privacy mode</Trans>,
                },
                {
                  tone: 'keep',
                  label: <Trans>Keeps</Trans>,
                  detail: <Trans>The events themselves — nothing scheduled is removed</Trans>,
                },
              ]}
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              disabled={regenerateMutation.isPending || !pendingRegenerate}
              onClick={() => {
                if (pendingRegenerate) {
                  regenerateMutation.mutate(
                    { id: pendingRegenerate.id },
                    {
                      onSettled: () => setPendingRegenerate(null),
                    },
                  )
                }
              }}
            >
              {/* Loader2Icon spinner on the pending Regenerate action so the user
                  has a visible signal. */}
              {regenerateMutation.isPending ? (
                <>
                  <Loader2Icon data-icon="inline-start" className="animate-spin" />
                  <Trans>Regenerating…</Trans>
                </>
              ) : (
                <Trans>Regenerate URL</Trans>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDisable !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDisable(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Disable calendar feed?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDisable
                ? t`The ${pendingDisable.title} feed will stop syncing on every subscribed device. You can re-enable later, but the URL will be a fresh one — old subscriptions won't reconnect automatically.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingDisable ? (
            <DestructiveChangePreview
              title={<Trans>Disabling commits these changes</Trans>}
              lines={[
                {
                  tone: 'remove',
                  label: <Trans>Stops</Trans>,
                  detail: <Trans>Calendar sync on every subscribed device</Trans>,
                },
                {
                  tone: 'add',
                  label: <Trans>Adds</Trans>,
                  detail: <Trans>Nothing — re-enabling later issues a brand-new URL</Trans>,
                },
                {
                  tone: 'keep',
                  label: <Trans>Keeps</Trans>,
                  detail: <Trans>Your deadlines and assignments inside DueDateHQ</Trans>,
                },
              ]}
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              disabled={disableMutation.isPending || !pendingDisable}
              onClick={() => {
                if (pendingDisable) {
                  disableMutation.mutate(
                    { id: pendingDisable.id },
                    {
                      onSettled: () => setPendingDisable(null),
                    },
                  )
                }
              }}
            >
              {/* Loader2Icon spinner on the pending Disable action. */}
              {disableMutation.isPending ? (
                <>
                  <Loader2Icon data-icon="inline-start" className="animate-spin" />
                  <Trans>Disabling…</Trans>
                </>
              ) : (
                <Trans>Disable feed</Trans>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>How to subscribe</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              Copy the HTTPS URL above, then follow the steps for your calendar app. Changes made in
              your calendar will not affect DueDateHQ.
            </Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <IntegrationNote
            icon="google"
            title={t`Google Calendar`}
            steps={[t`Open Google Calendar on the web`, t`Other calendars → From URL`, t`Paste the copied HTTPS URL`]}
          />
          <IntegrationNote
            icon="apple"
            title={t`Apple Calendar`}
            steps={[t`Click the Apple Calendar link above`, t`Apple Calendar opens automatically`, t`Click Subscribe to confirm`]}
          />
          <IntegrationNote
            icon="outlook"
            title={t`Outlook`}
            steps={[t`Open Outlook Calendar on the web`, t`Add calendar → Subscribe from web`, t`Paste the copied URL`]}
          />
        </CardContent>
      </Card>
    </section>
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
            className="grid size-8 place-items-center rounded-lg border border-state-accent-active bg-state-accent-hover-alt text-text-accent"
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
          {feedUrl ? (
            <Badge variant="success">
              <CheckCircle2Icon data-icon="inline-start" />
              <Trans>Connected</Trans>
            </Badge>
          ) : (
            <Badge variant="outline">
              <Trans>Not enabled</Trans>
            </Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {config.locked ? (
          // No hard-coded `notice` override: PermissionObscuredContent derives
          // the required-role text from `requiredRolesForFirmPermission`,
          // which keeps the surface in sync with the enum (a hard-coded "Only
          // owners and managers…" string would drop partner, even though
          // `firm.calendar.manage` includes partner).
          <PermissionObscuredContent
            locked
            permission="firm.calendar.manage"
            currentRole={currentRole}
            fallback={<CalendarSubscriptionRedactedContent />}
          >
            <CalendarSubscriptionRedactedContent />
          </PermissionObscuredContent>
        ) : (
          <div className="grid gap-4">
            {/* Show the privacy-mode dropdown only when a subscription is
                already active (where it's the swap-mode control).
                Pre-subscription the "Enable redacted / Enable full" buttons
                are the sole choice — rendering the dropdown too would give
                three ways to pick the same value. */}
            {activeSubscription ? (
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
                    {/* Explicit label — a bare SelectValue falls back to the
                        raw enum value ("redacted"). */}
                    <SelectValue>
                      {privacyMode === 'full' ? (
                        <Trans>Full client names</Trans>
                      ) : (
                        <Trans>Redacted client names</Trans>
                      )}
                    </SelectValue>
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
            ) : null}

            {/* The privacy row only renders when a subscription is on file —
                showing "Privacy mode: Redacted client names" with no
                subscription implies a privacy mode was set on a feed that
                doesn't exist. Created / Last accessed stay always-visible —
                "Not enabled" / "Never" carry the right signal for them. */}
            <div className="grid gap-1 rounded-lg border border-divider-regular bg-background-subtle p-3">
              {subscription ? (
                <IntegrationKeyValueRow
                  label={t`Privacy mode`}
                  value={privacyMode === 'full' ? t`Full client names` : t`Redacted client names`}
                />
              ) : null}
              <IntegrationKeyValueRow
                label={t`Created`}
                value={
                  subscription
                    ? formatDateTimePretty(subscription.createdAt, practiceTimezone)
                    : t`Not enabled`
                }
              />
              <IntegrationKeyValueRow
                label={t`Last accessed`}
                value={
                  subscription?.lastAccessedAt
                    ? formatDateTimePretty(subscription.lastAccessedAt, practiceTimezone)
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
                    onClick={() => {
                      // Copy-feed-URL is the Google / Outlook subscribe path
                      // (both subscribe "From URL"); stamp the primary provider.
                      track(ANALYTICS_EVENTS.calendarFeedSubscribed, { provider: 'google' })
                      void copyUrl(feedUrl, t`Calendar URL copied`, t`Couldn't copy calendar URL`)
                    }}
                  >
                    <CopyIcon data-icon="inline-start" />
                    <Trans>Copy URL</Trans>
                  </Button>
                  {appleCalendarUrl ? (
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<a href={appleCalendarUrl} />}
                      onClick={() =>
                        // Apple Calendar opens the webcal/ical feed directly.
                        track(ANALYTICS_EVENTS.calendarFeedSubscribed, { provider: 'ical' })
                      }
                    >
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
                    <Trans>Disable feed</Trans>
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
      <div className="grid gap-2 rounded-lg border border-divider-regular bg-background-subtle p-3">
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

function IntegrationKeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-text-tertiary">{label}</span>
      <span className="truncate text-right text-text-secondary">{value}</span>
    </div>
  )
}

// Provider glyph marks — distinct, recognisable treatments per provider using
// only canonical bg/text tokens. No raw hex. Google = colour-quadrant dots,
// Apple = monochrome apple-shape initial mark, Outlook = angular O mark.
function ProviderMark({ icon }: { icon: 'google' | 'apple' | 'outlook' }) {
  if (icon === 'google') {
    // Four-quadrant coloured dots — evokes Google's brand colour palette
    // without lifting an SVG asset.
    return (
      <span
        aria-hidden
        className="grid size-8 grid-cols-2 place-items-center gap-0.5 rounded-lg border border-divider-subtle bg-background-subtle p-1.5"
      >
        <span className="size-2 rounded-full bg-[color-mix(in_oklab,var(--color-blue-500)_90%,transparent)]" />
        <span className="size-2 rounded-full bg-[color-mix(in_oklab,var(--color-warning-500)_90%,transparent)]" />
        <span className="size-2 rounded-full bg-[color-mix(in_oklab,var(--color-green-500)_90%,transparent)]" />
        <span className="size-2 rounded-full bg-[color-mix(in_oklab,var(--color-red-500)_90%,transparent)]" />
      </span>
    )
  }
  if (icon === 'apple') {
    return (
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-lg border border-divider-subtle bg-background-subtle"
      >
        {/* Apple-flavour: solid circle with a bitten corner clip via clip-path */}
        <span className="size-4 rounded-full bg-text-secondary [clip-path:polygon(0_0,100%_0,100%_75%,75%_100%,0_100%)]" />
      </span>
    )
  }
  // Outlook: angular O lettermark in brand-accent colour
  return (
    <span
      aria-hidden
      className="grid size-8 place-items-center rounded-lg border border-divider-subtle bg-background-subtle"
    >
      <span className="text-sm font-semibold leading-none text-text-accent">O</span>
    </span>
  )
}

function IntegrationNote({
  icon,
  title,
  steps,
}: {
  icon: 'google' | 'apple' | 'outlook'
  title: string
  steps: string[]
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-divider-subtle p-3">
      <div className="flex items-center gap-2">
        <ProviderMark icon={icon} />
        <span className="font-medium text-text-primary">{title}</span>
      </div>
      <Separator />
      <ol className="grid gap-1.5">
        {steps.map((step, i) => (
          // Step list: numbered counter, calm tertiary text
          <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
            <span className="mt-px shrink-0 tabular-nums text-text-tertiary">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
