import { Link } from 'react-router'
import { useState } from 'react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
import { StatTile } from '@/components/patterns/stat-tile'
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
    // 2026-05-26 (audit P0 #2 — page-padding canon): snapped to
    // Pattern A (scroll page) per DESIGN.md §5.5. /opportunities is
    // a header-heavy scroll page (PageHeader → stat tiles → list →
    // dismissed-disclosure) with no sticky footer, so it follows
    // the same rhythm as dashboard / /rules/pulse / /rules/library:
    //   `gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6`
    // Previously: `gap-4 ... md:pb-5` — `gap-4` came from a 2026-05-25
    // pass that treated this page as a dense-table surface (it isn't
    // — no sticky pagination footer), and `md:pb-5` was the singleton
    // off-canon value the audit's P0 #2 called out. Both fixed.
    <div className="mx-auto flex w-full max-w-page-wide flex-col gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6">
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

      {/* 2026-05-26 (audit cross-surface P0 #1): migrated from the local
          `OpportunitiesStatTile` to the shared `StatTile` primitive at
          `apps/app/src/components/patterns/stat-tile.tsx`. Same shape,
          one source of truth. Value scale snapped to the DESIGN.md
          canonical (text-xl semibold) — was text-2xl semibold locally,
          which had drifted off-spec ("felt thin" reaction during the
          2026-05-25 pass over-corrected). */}
      <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatTile
          label={<Trans>Advisory conversations</Trans>}
          value={summary?.advisoryConversationCount}
        />
        <StatTile label={<Trans>Scope reviews</Trans>} value={summary?.scopeReviewCount} />
        <StatTile
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

// 2026-05-26 (audit cross-surface P0 #1): `OpportunitiesStatTile`
// was extracted to the shared `StatTile` primitive (see
// `@/components/patterns/stat-tile.tsx`). Git history preserves the
// pre-extract local variant. The "felt thin → text-2xl" reaction from
// the 2026-05-25 polish pass was an over-correction relative to the
// DESIGN.md canonical text-xl; the shared primitive snaps to spec.

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
// 2026-05-27 (Step 6 UX flows audit F3.2): the single Snooze button
// is now a dropdown that offers 7 / 14 (default) / 30 / 90 day
// options. The previous "always 14 days" behavior worked for the
// modal case but power users wanted to silence a noisy opportunity
// for a full quarter, or check back in a week — both common patterns
// the prior single-button UI couldn't express without round-tripping
// through Dismiss + manual recreation.
const DEFAULT_SNOOZE_DAYS = 14
const SNOOZE_DURATION_DAYS = [7, 14, 30, 90] as const
type SnoozeDurationDays = (typeof SNOOZE_DURATION_DAYS)[number]
const MS_PER_DAY = 24 * 60 * 60 * 1000

function OpportunityRow({ opportunity }: { opportunity: OpportunityPublic }) {
  const Icon = opportunityIcon(opportunity.kind)
  const { t, i18n } = useLingui()
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: orpc.opportunities.list.key() })
  }
  // 2026-05-27 (step-6 ux-flow audit F3.1): Sonner toast supports an
  // `action` slot — used here so the user can undo a dismiss without
  // hunting the "Recently dismissed" disclosure at the bottom of the
  // page. Mirrors the Pulse/Migration/Obligations undo patterns
  // already in the codebase.
  const restoreFromToast = useMutation(
    orpc.opportunities.restore.mutationOptions({
      onSuccess: () => {
        invalidate()
        void queryClient.invalidateQueries({ queryKey: orpc.opportunities.listDismissed.key() })
        toast.success(t`Opportunity restored`)
      },
      onError: (error) => {
        toast.error(t`Couldn't restore this opportunity`, {
          description:
            rpcErrorMessage(error) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const dismissMutation = useMutation(
    orpc.opportunities.dismiss.mutationOptions({
      onSuccess: () => {
        invalidate()
        void queryClient.invalidateQueries({ queryKey: orpc.opportunities.listDismissed.key() })
        toast.success(t`Opportunity dismissed`, {
          action: {
            label: t`Undo`,
            onClick: () => restoreFromToast.mutate({ opportunityKey: opportunity.id }),
          },
        })
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
  // 2026-05-27 (F3.2): track which duration was picked so the
  // success toast reads back the actual snooze window, not a hard-
  // coded 14. Reset when mutation reaches a terminal state — keeps
  // the UI honest if the user opens the dropdown twice in a row.
  const [pickedSnoozeDays, setPickedSnoozeDays] = useState<SnoozeDurationDays>(DEFAULT_SNOOZE_DAYS)
  const snoozeMutation = useMutation(
    orpc.opportunities.snooze.mutationOptions({
      onSuccess: () => {
        invalidate()
        void queryClient.invalidateQueries({ queryKey: orpc.opportunities.listDismissed.key() })
        // 2026-05-27 (ε F3.1 + υ F3.2 merge): dynamic plural copy
        // reads back the actual picked snooze window (no hardcoded
        // 14), with the same Undo action that ε wired for dismiss.
        // Both wave-1 ε and wave-5 υ landed here independently;
        // resolution preserves both improvements.
        toast.success(
          i18n._(
            plural(pickedSnoozeDays, {
              one: 'Snoozed for # day',
              other: 'Snoozed for # days',
            }),
          ),
          {
            action: {
              label: t`Undo`,
              onClick: () => restoreFromToast.mutate({ opportunityKey: opportunity.id }),
            },
          },
        )
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
  const snoozeFor = (days: SnoozeDurationDays) => {
    setPickedSnoozeDays(days)
    snoozeMutation.mutate({
      opportunityKey: opportunity.id,
      until: new Date(Date.now() + days * MS_PER_DAY).toISOString(),
    })
  }
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
        {/* 2026-05-27 (Step 6 UX audit F3.2): single Snooze button
            → dropdown with 7 / 14 (default) / 30 / 90 day choices.
            The trigger button has the same visual weight as before
            (ghost, sm, ClockIcon + "Snooze") but now opens a menu;
            picking 14 reproduces the previous default behavior. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                aria-label={t`Snooze ${opportunity.title}`}
              >
                <ClockIcon data-icon="inline-start" />
                <Trans>Snooze</Trans>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <DropdownMenuItem onClick={() => snoozeFor(7)}>
              <Trans>Snooze 7 days</Trans>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => snoozeFor(14)}>
              <Trans>Snooze 14 days (default)</Trans>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => snoozeFor(30)}>
              <Trans>Snooze 30 days</Trans>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => snoozeFor(90)}>
              <Trans>Snooze 90 days</Trans>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
