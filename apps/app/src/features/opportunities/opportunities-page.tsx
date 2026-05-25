import { Link } from 'react-router'
import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  RotateCcwIcon,
  SparklesIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type { OpportunityDismissalRow, OpportunityPublic } from '@duedatehq/contracts'
import { formatDatePretty } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@duedatehq/ui/components/ui/card'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { cn } from '@duedatehq/ui/lib/utils'
import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import {
  OpportunityKindBadge,
  OpportunitySeverityBadge,
  OpportunityTimingBadge,
  opportunityIcon,
} from './opportunity-ui'

const EMPTY_OPPORTUNITIES: OpportunityPublic[] = []

export function OpportunitiesPage() {
  const opportunitiesQuery = useQuery(
    orpc.opportunities.list.queryOptions({ input: { limit: 24 } }),
  )
  const opportunities = opportunitiesQuery.data?.opportunities ?? EMPTY_OPPORTUNITIES
  const summary = opportunitiesQuery.data?.summary

  return (
    // 2026-05-25 (Yuqi /opportunities #1): page padding + outer gap
    // aligned with /clients and /rules/library — was `gap-6 p-4 md:p-6`,
    // now `gap-4 p-3 md:p-5` for the GitHub-density rhythm Yuqi
    // requested across table-bearing routes. Layout structure follows
    // the same pattern as /clients: PageHeader → optional Alert →
    // stat-tile row → flat list (no Card wrapper).
    <div className="mx-auto flex w-full max-w-page-wide flex-col gap-4 p-3 md:p-5">
      <PageHeader title={<Trans>Opportunities</Trans>} />

      {opportunitiesQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>
            <Trans>Couldn't load opportunities</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(opportunitiesQuery.error) ?? <Trans>Please try again.</Trans>}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* 2026-05-25 (Yuqi /opportunities #1): summary tiles migrated
          from the heavy `Card` shape to the same `StatTile`
          rectangle used on /rules/library + /clients. Identical
          tone, identical caption-tier label scale — the three
          summary surfaces across the app now read the same way. */}
      <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <OpportunitiesStatTile
          label={<Trans>Advisory conversations</Trans>}
          value={summary?.advisoryConversationCount}
        />
        <OpportunitiesStatTile
          label={<Trans>Scope reviews</Trans>}
          value={summary?.scopeReviewCount}
        />
        <OpportunitiesStatTile
          label={<Trans>Retention check-ins</Trans>}
          value={summary?.retentionCheckInCount}
        />
      </section>

      {/* 2026-05-25 (Yuqi /opportunities #1): list section drops the
          Card chrome (Card / CardHeader / CardContent) so it sits
          flat on the page background — same rhythm as /clients,
          /rules/library, /deadlines. The "Business guidance queue"
          h2 + description anchor the section without a bordered
          frame; rows still get hairline separators via
          divide-y. */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight text-text-primary">
            <Trans>Business guidance queue</Trans>
          </h2>
          <p className="text-sm text-text-tertiary">
            <Trans>Open the client to review facts before deciding whether to follow up.</Trans>
          </p>
        </div>
        {opportunitiesQuery.isLoading ? (
          <div className="grid gap-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : opportunities.length === 0 ? (
          <EmptyState
            icon={SparklesIcon}
            title={<Trans>No opportunity cues yet</Trans>}
            description={
              <Trans>
                Add client facts, filing profiles, and due-date work before the guidance queue has
                enough signal.
              </Trans>
            }
          />
        ) : (
          <div className="divide-y divide-divider-subtle">
            {opportunities.map((opportunity) => (
              <OpportunityRow key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        )}
      </section>

      <DismissedOpportunitiesSection />
    </div>
  )
}

// 2026-05-25 (Yuqi /opportunities — copy the other page style):
// retired the rule-library StatTile shape (uppercase caption-tier
// label on top, number below) — at full page width the long
// labels ("Advisory conversations") wrapped to two lines and the
// tile felt thin. Adopted the dashboard's ActionsSummaryTile
// rhythm instead: large number on TOP, sentence-case label
// below, generous padding (`px-4 py-3`), wider min-width. Same
// shape the user has seen on Today across "Need decision /
// Blocked / Waiting" — consistency with the surface they spend
// the most time on. Skeleton placeholder retained while the
// value loads.
function OpportunitiesStatTile({ label, value }: { label: ReactNode; value: number | undefined }) {
  return (
    <div
      className={cn(
        'flex min-w-[160px] flex-col gap-1 rounded-md border border-divider-subtle bg-background-default px-4 py-3',
      )}
    >
      {value === undefined ? (
        <Skeleton className="h-7 w-12" />
      ) : (
        <span className="text-2xl font-semibold leading-tight tabular-nums tracking-tight text-text-primary">
          {value}
        </span>
      )}
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  )
}

// 2026-05-24 (critique /polish — un-dismiss): bottom-of-page
// disclosure listing the user's active dismissals + snoozes with
// per-row Restore buttons. Collapsed by default so it doesn't
// compete with the live queue above. Hidden entirely when there
// are no dismissals.
function DismissedOpportunitiesSection() {
  const { t } = useLingui()
  const [expanded, setExpanded] = useState(false)
  const queryClient = useQueryClient()
  const dismissedQuery = useQuery(
    orpc.opportunities.listDismissed.queryOptions({ input: undefined }),
  )
  const dismissals = dismissedQuery.data?.dismissals ?? []
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: orpc.opportunities.list.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.opportunities.listDismissed.key() })
  }
  const restoreMutation = useMutation(
    orpc.opportunities.restore.mutationOptions({
      onSuccess: (output) => {
        invalidate()
        if (output.restored) {
          toast.success(t`Opportunity restored`)
        } else {
          toast.message(t`Already restored`)
        }
      },
      onError: (error) => {
        // 2026-05-24 (style consistency): error title stays human;
        // raw RPC error goes in the description slot, matching every
        // other page's toast.error shape.
        toast.error(t`Couldn't restore this opportunity`, {
          description:
            rpcErrorMessage(error) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )

  if (dismissedQuery.isLoading || dismissals.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center justify-between gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDownIcon className="size-4 text-text-tertiary" aria-hidden />
            ) : (
              <ChevronRightIcon className="size-4 text-text-tertiary" aria-hidden />
            )}
            <CardTitle className="text-base">
              <Trans>Recently dismissed</Trans>{' '}
              <span className="text-sm font-normal text-text-tertiary">({dismissals.length})</span>
            </CardTitle>
          </div>
          <span className="text-xs text-text-tertiary">
            <Trans>Restore brings the row back to the queue</Trans>
          </span>
        </button>
      </CardHeader>
      {expanded ? (
        <CardContent className="grid gap-2 pt-0">
          {dismissals.map((dismissal) => (
            <DismissedRow
              key={dismissal.opportunityKey}
              dismissal={dismissal}
              onRestore={() => restoreMutation.mutate({ opportunityKey: dismissal.opportunityKey })}
              pending={restoreMutation.isPending}
            />
          ))}
        </CardContent>
      ) : null}
    </Card>
  )
}

function DismissedRow({
  dismissal,
  onRestore,
  pending,
}: {
  dismissal: OpportunityDismissalRow
  onRestore: () => void
  pending: boolean
}) {
  const { t } = useLingui()
  const kindLabel = humanizeOpportunityKey(dismissal.opportunityKey)
  // D1: the top line now reads "Retention check-in · Lakeview
  // Manufacturing" when the server resolved a client. Falls back to
  // just the kind label for keys without a client (defensive — no
  // such opportunity kinds today, but future-safe).
  const label = dismissal.clientName ? `${kindLabel} · ${dismissal.clientName}` : kindLabel
  const snoozeNote =
    dismissal.kind === 'snoozed' && dismissal.snoozeUntil
      ? t`Snoozed until ${formatDismissalDate(dismissal.snoozeUntil)}`
      : t`Dismissed`
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-divider-subtle px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-text-primary">{label}</p>
        <p className="truncate text-xs text-text-tertiary">
          {snoozeNote}
          {dismissal.createdByName ? <> · {dismissal.createdByName}</> : null}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={onRestore}
        disabled={pending}
        aria-label={t`Restore ${label}`}
      >
        <RotateCcwIcon data-icon="inline-start" />
        <Trans>Restore</Trans>
      </Button>
    </div>
  )
}

// `retention_check_in:client:10000000-...` → "Retention check-in"
// for the small dismissed-list row label. The client name lives in
// the audit row + the future un-restored opportunity itself; this
// just needs to read as "what was the kind of cue I dismissed".
//
// 2026-05-24 (re-critique): the previous shape title-cased every
// underscore-segment ("Retention Check In") which read as a
// product name, not as the editorial label the comment specifies.
// Now: capitalize the FIRST segment only, and join the remainder
// with hyphens — matching "check-in" as the canonical English form.
function humanizeOpportunityKey(key: string): string {
  const [head] = key.split(':')
  if (!head) return key
  const segments = head.split('_').filter((part) => part.length > 0)
  if (segments.length === 0) return head
  const [first, ...rest] = segments
  const lead = first![0]!.toUpperCase() + first!.slice(1)
  return rest.length === 0 ? lead : `${lead} ${rest.join('-')}`
}

// 2026-05-24 (re-critique): the previous shape rendered a sterile
// `2026-06-07` ISO date, which read out of place next to the rest
// of the app's pretty-printed dates. `formatDatePretty` already
// scopes by the user's locale and drops the year when it matches
// the current one — "Jun 7" / "Jun 7, 2027" reads faster than
// the raw ISO did.
function formatDismissalDate(iso: string): string {
  return formatDatePretty(iso)
}

// 2026-05-24 (critique P2): default snooze window when the user
// picks the Snooze action. 14 days is the canonical "talk to me
// next bi-weekly cycle" interval — long enough for client circumstances
// to actually shift, short enough to keep the queue alive. Server
// clamps to a 90-day ceiling regardless.
const DEFAULT_SNOOZE_DAYS = 14
const MS_PER_DAY = 24 * 60 * 60 * 1000

function OpportunityRow({ opportunity }: { opportunity: OpportunityPublic }) {
  const Icon = opportunityIcon(opportunity.kind)
  const { t, i18n } = useLingui()
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: orpc.opportunities.list.key() })
  }
  const dismissMutation = useMutation(
    orpc.opportunities.dismiss.mutationOptions({
      onSuccess: () => {
        invalidate()
        toast.success(t`Opportunity dismissed`)
      },
      onError: (error) => {
        toast.error(t`Couldn't dismiss this opportunity`, {
          description:
            rpcErrorMessage(error) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const snoozeMutation = useMutation(
    orpc.opportunities.snooze.mutationOptions({
      onSuccess: () => {
        invalidate()
        toast.success(t`Snoozed for ${DEFAULT_SNOOZE_DAYS} days`)
      },
      onError: (error) => {
        toast.error(t`Couldn't snooze this opportunity`, {
          description:
            rpcErrorMessage(error) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const pending = dismissMutation.isPending || snoozeMutation.isPending
  // 2026-05-25 (Yuqi /opportunities fifth pass #2, #4):
  // restructured to match the PulseAlertCard layout — content on
  // the left, vertical action column on the right. Previous
  // shape grid'd the two halves separately and put the client
  // name on the RIGHT side next to the action buttons (#4: "move
  // the CLient name to the left top"). Now client name leads the
  // header row at the TOP LEFT of the content column, the eye
  // finds "whose opportunity is this?" immediately.
  //
  // Header row: icon + client-name link + Kind / Severity /
  // Timing chips. Title + summary follow below; evidence chips
  // wrap at the bottom of the content column.
  return (
    <article className="flex items-start gap-6 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <header className="flex flex-wrap items-center gap-2">
          <div
            className="grid size-7 shrink-0 place-items-center rounded-md bg-background-subtle text-text-secondary"
            aria-hidden
          >
            <Icon className="size-4" />
          </div>
          <Link
            to={opportunity.primaryAction.href}
            className="rounded-sm text-sm font-semibold text-text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            {opportunity.client.name}
          </Link>
          <OpportunityKindBadge kind={opportunity.kind} />
          <OpportunitySeverityBadge severity={opportunity.severity} />
          <OpportunityTimingBadge timing={opportunity.timing} />
        </header>
        <h2 className="text-sm font-medium text-text-primary">{opportunity.title}</h2>
        <p className="text-sm text-text-secondary">{opportunity.summary}</p>
        {opportunity.evidence.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {opportunity.evidence.map((item) => (
              <Badge key={`${opportunity.id}:${item.label}`} variant="outline">
                {item.label}: {item.value}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      {/* Action column — primary CTA (Open client) on TOP so the
          eye finds it at the same vertical anchor across every
          row, matching the PulseAlertCard treatment. Snooze +
          Dismiss are softer ghost siblings below. */}
      <div className="flex shrink-0 flex-col items-stretch gap-1">
        <Button
          nativeButton={false}
          size="sm"
          variant="outline"
          render={<Link to={opportunity.primaryAction.href} />}
        >
          <ArrowUpRightIcon data-icon="inline-start" />
          <Trans>Open client</Trans>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            snoozeMutation.mutate({
              opportunityKey: opportunity.id,
              until: new Date(Date.now() + DEFAULT_SNOOZE_DAYS * MS_PER_DAY).toISOString(),
            })
          }
          aria-label={i18n._(
            plural(DEFAULT_SNOOZE_DAYS, {
              one: `Snooze ${opportunity.title} for # day`,
              other: `Snooze ${opportunity.title} for # days`,
            }),
          )}
        >
          <ClockIcon data-icon="inline-start" />
          <Trans>Snooze</Trans>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => dismissMutation.mutate({ opportunityKey: opportunity.id })}
          aria-label={t`Dismiss ${opportunity.title}`}
        >
          <XIcon data-icon="inline-start" />
          <Trans>Dismiss</Trans>
        </Button>
      </div>
    </article>
  )
}
