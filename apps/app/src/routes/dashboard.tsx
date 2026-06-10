import { AlertCircleIcon, PlusIcon, RotateCwIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { parseAsArrayOf, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { toast } from 'sonner'

import { formatRelativeTime } from '@/lib/utils'

import type {
  DashboardBriefScope,
  DashboardDueBucket,
  DashboardEvidenceFilter,
  DashboardLoadInput,
} from '@duedatehq/contracts'
import { DASHBOARD_FILTER_MAX_SELECTIONS } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'
import { PageHeader } from '@/components/patterns/page-header'
import { ShortcutHintChip } from '@/components/patterns/kbd'
import { useMigrationWizard } from '@/features/migration/WizardProvider'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { MergedBriefCard } from '@/features/dashboard/merged-brief-card'
// Import retained but commented out alongside the section mount.
// Restore both when ChangesSinceLastSection is brought back.
// import { ChangesSinceLastSection } from '@/features/dashboard/changes-since-last-section'
import { NeedsAttentionSection } from '@/features/dashboard/needs-attention-section'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'
import type { ObligationStatus } from '@/features/obligations/status-control'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { requiredRolesLabel } from '@/lib/required-roles-label'

const TRIAGE_TAB_KEYS = ['this_week', 'this_month', 'long_term'] as const
const DASHBOARD_DUE_BUCKETS = [
  'overdue',
  'today',
  'next_7_days',
  'next_30_days',
  'long_term',
] as const satisfies readonly DashboardDueBucket[]
const DASHBOARD_STATUS_FILTERS = [
  'pending',
  'in_progress',
  'waiting_on_client',
  'review',
] as const satisfies readonly ObligationStatus[]
const DASHBOARD_EVIDENCE_FILTERS = [
  'needs',
  'linked',
] as const satisfies readonly DashboardEvidenceFilter[]
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REPLACE_HISTORY_OPTIONS = { history: 'replace' } as const

// Page-scope persistence. Declared ABOVE the parsers const: its
// initializer calls storedDashboardScope() during module evaluation, and
// while function declarations hoist, a `const` key defined below would
// still be in the temporal dead zone at that moment ("Cannot access
// 'SCOPE_STORAGE_KEY' before initialization").
const SCOPE_STORAGE_KEY = 'ddhq:dashboard:scope'

function storedDashboardScope(): DashboardBriefScope {
  if (typeof window === 'undefined') return 'me'
  return window.localStorage.getItem(SCOPE_STORAGE_KEY) === 'firm' ? 'firm' : 'me'
}

function rememberDashboardScope(scope: DashboardBriefScope): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SCOPE_STORAGE_KEY, scope)
}

// URL params are retained for deep-link compatibility — they feed
// dashboardTableInput below so server-side filters still apply even
// though the v2 UI no longer exposes filter controls.
const dashboardSearchParamsParsers = {
  asOfDate: parseAsString.withDefault('').withOptions(REPLACE_HISTORY_OPTIONS),
  triage: parseAsStringLiteral(TRIAGE_TAB_KEYS)
    .withDefault('this_week')
    .withOptions(REPLACE_HISTORY_OPTIONS),
  client: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  taxType: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  due: parseAsArrayOf(parseAsStringLiteral(DASHBOARD_DUE_BUCKETS))
    .withDefault([])
    .withOptions(REPLACE_HISTORY_OPTIONS),
  status: parseAsArrayOf(parseAsStringLiteral(DASHBOARD_STATUS_FILTERS))
    .withDefault([])
    .withOptions(REPLACE_HISTORY_OPTIONS),
  severity: parseAsArrayOf(parseAsStringLiteral(['critical', 'high', 'medium', 'neutral']))
    .withDefault([])
    .withOptions(REPLACE_HISTORY_OPTIONS),
  evidence: parseAsArrayOf(parseAsStringLiteral(DASHBOARD_EVIDENCE_FILTERS))
    .withDefault([])
    .withOptions(REPLACE_HISTORY_OPTIONS),
  // Unified page scope ("My work / Everyone"). ONE toggle
  // drives the daily brief AND Priority Actions (rows, ranks, counts,
  // facets). `me` = effective assignee is the viewer, plus unassigned
  // rows — an unclaimed deadline never disappears from anyone's Today.
  // Default is "My work": for a firm with no assignments mine∪unassigned
  // equals everything, so the default is a no-op until the practice
  // starts assigning. URL param survives refresh and is shareable; the
  // last choice is also remembered per browser via localStorage (read
  // once at module init as the parser default).
  scope: parseAsStringLiteral(['firm', 'me'] as const satisfies readonly DashboardBriefScope[])
    .withDefault(storedDashboardScope())
    .withOptions(REPLACE_HISTORY_OPTIONS),
} as const

function cleanStringFilters(values: readonly string[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value.length <= 120),
    ),
  ].slice(0, DASHBOARD_FILTER_MAX_SELECTIONS)
}

function cleanEntityIdFilters(values: readonly string[]): string[] {
  return cleanStringFilters(values).filter((value) => UUID_RE.test(value))
}


export function DashboardRoute() {
  const { t } = useLingui()
  const { openWizard } = useMigrationWizard()
  const permission = useFirmPermission()
  const canRunMigration = permission.can('migration.run')
  // Dashboard is a picker, not a workspace. Clicking an action
  // calls openDrawer(id) which — because dashboard is NOT in the
  // provider's routeOwnsPanel set — navigates to
  // `/deadlines/<short-ref>`. The queue is the
  // canonical workspace; dashboard's job is to send you there with
  // the right obligation already selected.
  const { openDrawer: openObligationDrawer } = useObligationDrawer()
  const [
    { asOfDate, client, taxType, due, status: statusFilter, severity, evidence, scope },
    setDashboardParams,
  ] = useQueryStates(dashboardSearchParamsParsers)
  // One switch for the whole page: brief + actions + every count.
  const setScope = (next: DashboardBriefScope) => {
    rememberDashboardScope(next)
    void setDashboardParams({ scope: next })
  }
  const queryClient = useQueryClient()
  const dashboardAsOfDate = ISO_DATE_RE.test(asOfDate) ? asOfDate : null
  const clientQuery = useMemo(() => cleanEntityIdFilters(client), [client])
  const taxTypeQuery = useMemo(() => cleanStringFilters(taxType), [taxType])
  const dashboardTableInput = useMemo<DashboardLoadInput>(
    () => ({
      topLimit: 20,
      ...(dashboardAsOfDate ? { asOfDate: dashboardAsOfDate } : {}),
      ...(clientQuery.length > 0 ? { clientIds: clientQuery } : {}),
      ...(taxTypeQuery.length > 0 ? { taxTypes: taxTypeQuery } : {}),
      ...(due.length > 0 ? { dueBuckets: due } : {}),
      ...(statusFilter.length > 0 ? { status: statusFilter } : {}),
      ...(severity.length > 0 ? { severity } : {}),
      ...(evidence.length > 0 ? { evidence } : {}),
      scope,
    }),
    [scope, clientQuery, dashboardAsOfDate, due, evidence, severity, statusFilter, taxTypeQuery],
  )
  const dashboardQuery = useQuery({
    ...orpc.dashboard.load.queryOptions({ input: dashboardTableInput }),
    placeholderData: keepPreviousData,
    // Poll while the AI brief is still generating so the card flips from
    // "Generating…" to the narrative without a manual refresh. A missing
    // brief at scope='me' also polls: personal briefs have no cron — the
    // server self-heals by enqueueing one on view, and the pending row
    // appears moments later.
    refetchInterval: (query) =>
      query.state.data?.brief?.status === 'pending' ||
      (scope === 'me' && query.state.data && query.state.data.brief === null)
        ? 4000
        : false,
  })
  const requestBriefRefresh = useMutation(
    orpc.dashboard.requestBriefRefresh.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
      },
      onError: (error) => {
        toast.error(rpcErrorMessage(error) ?? t`Couldn't regenerate the brief. Try again.`)
      },
    }),
  )
  // A `totalOpen === 0` page distinguishes "no clients yet" from "has
  // clients but no generated deadlines" — the "import clients" CTA is
  // right for a fresh practice but wrong for one that already imported.
  // We split with a cheap probe — `limit: 1` so the server returns at
  // most one row, and we only look at .length to decide. The query
  // result is shared across the page, so dropdowns / pickers that need a
  // client list share the same cache key.
  const clientsProbeQuery = useQuery({
    ...orpc.clients.listByFirm.queryOptions({ input: { limit: 1 } }),
    placeholderData: keepPreviousData,
  })
  const hasClients = (clientsProbeQuery.data?.length ?? 0) > 0
  const data = dashboardQuery.data

  const syncedAtIso =
    dashboardQuery.dataUpdatedAt > 0 ? new Date(dashboardQuery.dataUpdatedAt).toISOString() : null
  const syncedLabel = syncedAtIso ? formatRelativeTime(syncedAtIso) : null

  const facets = data?.facets

  return (
    // Page chrome aligned to Pencil VmcdD: inter-section gap-8 (32px)
    // between PageHeader / Alerts / Actions gives a clear "three distinct
    // sections" hierarchy; `max-w-page-expanded` (1440) caps the content
    // area so /today matches the workbench family (/clients, /deadlines,
    // /rules/library, /alerts); generous pb-12 keeps the last action row
    // from feeling cramped against the viewport edge when the page is
    // short enough not to scroll.
    <div className="mx-auto flex w-full max-w-page-expanded flex-col gap-8 px-4 pt-6 pb-12 md:px-8 md:pt-6 md:pb-12">
      {/* /today routes through the same `<PageHeader>` primitive as
          /clients, /deadlines, /alerts, and /rules/library — date sits
          in the canonical pill chip slot so it matches the family's
          "title + count chip" shape, and the action cluster sits in the
          `actions` prop. Future polish to the PageHeader primitive
          propagates here automatically. */}
      <PageHeader
        eyebrow={
          // No eyebrow row — the sync indicator moved into the actions
          // cluster as an icon + tooltip, reclaiming a row of vertical
          // space.
          undefined
        }
        title={
          // The title→date gap is tight (`gap-2`, 8px) and the date is
          // `font-normal` so "Today June 4" reads as a single headline
          // phrase, with the date sitting lighter than the bold "Today"
          // anchor.
          <span className="inline-flex items-baseline gap-2">
            <Trans>Today</Trans>
            {dashboardQuery.isLoading ? (
              <span className="text-2xl font-medium text-text-muted italic">
                <Trans>loading…</Trans>
              </span>
            ) : data?.asOfDate ? (
              // Date weight font-medium, color the lighter text-text-muted
              // so it sits clearly behind the bold "Today" anchor.
              <span className="text-2xl font-medium tabular-nums text-text-muted">
                {formatTodayHeader(data.asOfDate)}
              </span>
            ) : null}
          </span>
        }
        actions={
          <>
            {/* The sync freshness indicator lives here as an icon-only
                affordance beside the scope toggle — hover reveals
                "Synced …", click refetches. */}
            {syncedLabel ? (
              <Tooltip>
                <TooltipTrigger
                  render={(props) => (
                    <button
                      type="button"
                      onClick={() => void dashboardQuery.refetch()}
                      disabled={dashboardQuery.isFetching}
                      aria-label={
                        syncedLabel === 'just now' ? t`Synced just now` : t`Synced ${syncedLabel}`
                      }
                      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-text-tertiary outline-none transition-colors hover:bg-background-section hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50"
                      {...props}
                    >
                      <RotateCwIcon
                        className={cn('size-3.5', dashboardQuery.isFetching && 'animate-spin')}
                        aria-hidden
                      />
                    </button>
                  )}
                />
                <TooltipContent>
                  {syncedLabel === 'just now' ? (
                    <Trans>Synced just now</Trans>
                  ) : (
                    <Trans>Synced {syncedLabel}</Trans>
                  )}
                </TooltipContent>
              </Tooltip>
            ) : null}
            {/* Keyboard-shortcut hint sits right beside the refresh icon (Yuqi). */}
            <ShortcutHintChip compact className="hidden md:inline-flex" />
            {/* ONE scope toggle for the whole page — daily brief, Priority
                Actions rows/ranks, and every count switch together. Lives
                in the header action cluster (not on the brief card)
                precisely because it governs more than the brief. "My work"
                = assigned to me + unassigned; the choice is remembered per
                browser. */}
            <Segmented
              value={scope}
              onValueChange={setScope}
              ariaLabel={t`Dashboard scope`}
              options={[
                { value: 'me', label: t`My work` },
                { value: 'firm', label: t`Everyone` },
              ]}
            />
            {/* "Import clients" — always-labeled so it reads as a real button
                (Yuqi: 更明显的 button) instead of a circle that expands on hover.
                text-sm to match every other button (was text-base). Neutral
                bordered: import is a setup task, not a daily CTA. Permission
                guard + aria-label tooltip preserved. */}
            <button
              type="button"
              className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-divider-regular bg-background-default px-3.5 text-sm font-medium text-text-secondary transition-colors hover:border-divider-deep hover:bg-background-section hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-2 focus-visible:ring-offset-background-default focus-visible:outline-none"
              onClick={() => {
                if (!canRunMigration) {
                  toast.error(
                    t`Importing clients requires ${requiredRolesLabel('migration.run')} access.`,
                  )
                  return
                }
                openWizard()
              }}
              aria-label={
                canRunMigration
                  ? t`Import clients`
                  : t`Import clients (requires ${requiredRolesLabel('migration.run')} access)`
              }
            >
              <PlusIcon className="size-3.5 shrink-0" />
              <span className="whitespace-nowrap">
                <Trans>Import clients</Trans>
              </span>
            </button>
          </>
        }
      />

      {dashboardQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Couldn't load dashboard</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(dashboardQuery.error) ??
              t`Check your network and try again. If this keeps happening, contact support.`}{' '}
            {/* Retry uses the canonical `<Button variant="link">` instead
                of an ad-hoc `<button className="underline">` — keeps the
                button pattern consistent across the app and inherits the
                link variant's focus-visible ring + hover state. */}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 align-baseline"
              onClick={() => void dashboardQuery.refetch()}
            >
              <Trans>Retry</Trans>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* "Changes since last visit" surface — a read-back ("here's what
          shifted while you were away"), not live work, so it sits between
          PageHeader and Alerts. MVP uses localStorage for last-seen
          tracking; upgrade path is a server-side `lastDashboardVisitAt`
          on the user model. The section ships its own collapse affordance
          so power users who don't want it can hide it. */}
      {/* Section mount commented out for now. Component file kept
          (changes-since-last-section.tsx) for future revisit. Restore by
          uncommenting the line below. */}
      {/* <ChangesSinceLastSection /> */}

      {/* Alerts on top (Yuqi): client-affecting regulatory changes lead the day
          because they can MOVE the deadlines below — read what changed, then act
          on the brief. The section self-filters to client-affecting alerts. */}
      <NeedsAttentionSection />

      {/* Today's brief — the deadline queue itself (by time), opened by a
          one-line deterministic summary, with the count chips as the view
          selector and the priority-action rows nested as flat sections. One
          surface: replaces the old AI brief AND the Priority Actions table. */}
      <MergedBriefCard
        counts={{
          overdue: facets?.dueBuckets.find((b) => b.value === 'overdue')?.count ?? 0,
          endingToday: facets?.dueBuckets.find((b) => b.value === 'today')?.count ?? 0,
          thisWeek: facets?.dueBuckets.find((b) => b.value === 'next_7_days')?.count ?? 0,
        }}
        rows={data?.topRows ?? []}
        asOfDate={data?.asOfDate ?? null}
        onOpenObligation={(obligationId) => openObligationDrawer(obligationId)}
      />
    </div>
  )
}

function formatTodayHeader(asOfDate: string): string {
  const date = new Date(`${asOfDate.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return asOfDate
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
  }).format(date)
}
