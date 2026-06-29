import { CircleAlertIcon, RotateCwIcon, UserIcon, UsersIcon } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { parseAsArrayOf, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'

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
import { SetupProgressCard } from '@/features/dashboard/SetupProgressCard'
import { CreateChoiceCards } from '@/features/dashboard/create-choice-cards'
import { DailyBriefCard } from '@/features/dashboard/daily-brief-card'
import { DashboardAddMenu } from '@/features/dashboard/add-menu'
import { MergedBriefCard } from '@/features/dashboard/merged-brief-card'
import { FirstRunTour } from '@/features/onboarding/first-run-tour'
// Import retained but commented out alongside the section mount.
// Restore both when ChangesSinceLastSection is brought back.
// import { ChangesSinceLastSection } from '@/features/dashboard/changes-since-last-section'
import { NeedsAttentionSection } from '@/features/dashboard/needs-attention-section'
// PinnedSection shelved 2026-06-23 — see the render-site note below. Kept as a
// commented import so restoring is a one-line uncomment.
// import { PinnedSection } from '@/features/dashboard/pinned-section'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'
import type { ObligationStatus } from '@/features/obligations/status-control'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { useCurrentUserName } from '@/lib/use-current-user-name'

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
// (The old `ddhq:dashboard:brief-dismissed` key is retired — the brief's
// collapse-to-tab pref lives inside DailyBriefCard now.)

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
  // The header "+" (add client / import data) and its permission gating now
  // live in DashboardAddMenu — the route no longer owns the wizard handle.
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
    track(ANALYTICS_EVENTS.dashboardScopeToggled, { scope: next })
    void setDashboardParams({ scope: next })
  }
  // Masthead greeting inputs — the member's first name + the local clock.
  const currentUserName = useCurrentUserName()
  const firstName = currentUserName?.trim().split(/\s+/)[0] ?? null
  const hourOfDay = new Date().getHours()
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
  // First-run: a fresh practice with no clients yet. Once the probe resolves
  // and returns zero rows, /today leads with the get-started hero instead of
  // three silent sections (onboarding gap #1). Gated on `!isLoading` so the hero
  // never flashes before the count lands.
  const clientsResolved = !clientsProbeQuery.isLoading
  const hasClients = (clientsProbeQuery.data?.length ?? 0) > 0
  const showFirstRun = clientsResolved && !hasClients
  // Second first-run state (onboarding gap #2): clients are in, but no rules
  // were activated, so no deadlines generate and the queue reads a misleading
  // "all clear." `rules.coverage` is the precise signal (shares the sidebar's
  // cache, no extra fetch) — summing activeRuleCount distinguishes "never set up
  // rules" from a genuinely-done firm (which HAS rules), so no dismiss is needed
  // and the nudge self-resolves the moment rules generate the first deadline.
  const coverageQuery = useQuery(orpc.rules.coverage.queryOptions({ input: undefined }))
  const activeRuleTotal = (coverageQuery.data ?? []).reduce(
    (sum, row) => sum + (row.activeRuleCount ?? 0),
    0,
  )
  const needsRules =
    clientsResolved && hasClients && !coverageQuery.isLoading && activeRuleTotal === 0
  // Firm identity for analytics — reuses the layout's `firms.listMine` cache
  // key (no extra fetch). Used only to scope the once-per-firm activation
  // milestone; null until the cache warms.
  const firmsQuery = useQuery(orpc.firms.listMine.queryOptions({ input: undefined }))
  const firmId =
    (firmsQuery.data?.find((item) => item.isCurrent) ?? firmsQuery.data?.[0])?.id ?? null
  const data = dashboardQuery.data

  const syncedAtIso =
    dashboardQuery.dataUpdatedAt > 0 ? new Date(dashboardQuery.dataUpdatedAt).toISOString() : null
  const syncedLabel = syncedAtIso ? formatRelativeTime(syncedAtIso) : null

  const facets = data?.facets

  // Page-view analytics — fire `dashboardViewed` exactly once per mount, the
  // first time the dashboard load resolves (data ready), with the scope +
  // headline counts. The ref guard keeps it to one event even though `data`
  // changes on every poll/refetch. Activation is a best-effort once-per-firm
  // milestone fired in the same data-ready moment.
  const viewTrackedRef = useRef(false)
  useEffect(() => {
    if (viewTrackedRef.current || !data) return
    viewTrackedRef.current = true
    const openObligationCount = data.summary?.openObligationCount ?? 0
    const overdueCount = facets?.dueBuckets.find((b) => b.value === 'overdue')?.count ?? 0
    track(ANALYTICS_EVENTS.dashboardViewed, {
      scope,
      open_obligation_count: openObligationCount,
      overdue_count: overdueCount,
      is_empty: openObligationCount === 0,
    })
    // Activation milestone — first dashboard load with open work, once per
    // firm (localStorage-guarded). Skipped without a firm id.
    if (firmId && openObligationCount > 0) {
      const activationKey = `ddhq.activated.${firmId}`
      try {
        if (window.localStorage.getItem(activationKey) === null) {
          window.localStorage.setItem(activationKey, '1')
          track(ANALYTICS_EVENTS.activationReached, { obligation_count: openObligationCount })
        }
      } catch {
        // Private mode / disabled storage — skip the milestone silently.
      }
    }
  }, [data, facets, scope, firmId])

  return (
    // Page chrome aligned to Pencil VmcdD: inter-section gap-8 (32px)
    // between PageHeader / Alerts / Actions gives a clear "three distinct
    // sections" hierarchy; `max-w-page-expanded` (1440) caps the content
    // area so /today matches the workbench family (/clients, /deadlines,
    // /rules/library, /alerts); generous pb-12 keeps the last action row
    // from feeling cramped against the viewport edge when the page is
    // short enough not to scroll.
    // pt-8 (Yuqi /alerts #9, applied app-wide): the page title centers on the
    // sidebar's firm avatar across every top-level page.
    // Desktop (xl+) = a bounded-height frame: the column fills <main>'s height
    // and the Priorities region (the one unbounded, row-driven section) absorbs
    // the remainder and scrolls INTERNALLY, so the dashboard itself never scrolls
    // — a glanceable single screen (Yuqi: "this is the dashboard, should not be
    // scrollable"). Header / Alerts / Daily Brief hold their natural height (no
    // min-h-0 → flex won't shrink them below content). Below xl we drop the frame
    // so narrow/short viewports scroll the page normally.
    <div className="mx-auto flex w-full max-w-page-expanded flex-col gap-8 px-4 pt-8 pb-12 md:px-8 md:pt-8 md:pb-12 xl:h-full xl:min-h-0">
      {/* /today routes through the same `<PageHeader>` primitive as
          /clients, /deadlines, /alerts, and /rules/library — date sits
          in the canonical pill chip slot so it matches the family's
          "title + count chip" shape, and the action cluster sits in the
          `actions` prop. Future polish to the PageHeader primitive
          propagates here automatically. */}
      <PageHeader
        eyebrow={
          // The masthead dateline (Yuqi: "bring more FUN" — /today may bend
          // the layout). A time-of-day greeting in the eyebrow's tracked-caps
          // register reads like a newspaper dateline over the TODAY masthead
          // — pairing with the Daily Brief's morning-paper tab. Real data
          // only: the firm member's name + the actual clock.
          firstName ? (
            hourOfDay < 12 ? (
              <Trans>Good morning, {firstName}</Trans>
            ) : hourOfDay < 17 ? (
              <Trans>Good afternoon, {firstName}</Trans>
            ) : (
              <Trans>Good evening, {firstName}</Trans>
            )
          ) : undefined
        }
        title={
          // The title→date gap is tight (`gap-2`, 8px) and the date is
          // `font-normal` so "Today June 4" reads as a single headline
          // phrase, with the date sitting lighter than the bold "Today"
          // anchor.
          <span className="inline-flex items-baseline gap-2">
            <Trans>Today</Trans>
            {dashboardQuery.isLoading ? (
              <span className="text-2xl font-normal text-text-muted">
                <Trans>Loading…</Trans>
              </span>
            ) : data?.asOfDate ? (
              // Date weight font-medium, color the lighter text-text-muted
              // so it sits clearly behind the bold "Today" anchor.
              <span className="text-2xl font-normal tabular-nums text-text-muted">
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
                      {...props}
                      type="button"
                      onClick={(event) => {
                        props.onClick?.(event)
                        if (!event.defaultPrevented) void dashboardQuery.refetch()
                      }}
                      disabled={dashboardQuery.isFetching}
                      aria-label={
                        syncedLabel === 'just now' ? t`Synced just now` : t`Synced ${syncedLabel}`
                      }
                      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-text-tertiary outline-none transition-colors hover:bg-background-section hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCwIcon
                        className={cn(
                          'size-3.5',
                          dashboardQuery.isFetching && 'animate-spin motion-reduce:animate-none',
                        )}
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
                precisely because it governs more than the brief. The choice
                is remembered per browser. Tooltip spells out the difference
                (Yuqi feedback #2: "what is the difference between My work
                and Everyone work?") — the labels alone don't say that
                "My work" includes unassigned deadlines. */}
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                  <span className="inline-flex" {...props}>
                    <Segmented
                      value={scope}
                      onValueChange={setScope}
                      ariaLabel={t`View scope`}
                      // This is the PAGE-level scope switch (it drives the brief,
                      // the priorities, every count) — so it earns a more deliberate
                      // treatment than the plain text Segmenteds elsewhere and than
                      // the local "This week/month/Overdue" bucket toggle below:
                      // person iconography (one ↔ many) marks it as the "whose work"
                      // control at a glance. Icons via the primitive's `icon` prop —
                      // no hand-rolling (§4.11).
                      options={[
                        { value: 'me', label: t`My work`, icon: UserIcon },
                        { value: 'firm', label: t`Everyone`, icon: UsersIcon },
                      ]}
                    />
                  </span>
                )}
              />
              <TooltipContent>
                <div className="flex max-w-[280px] flex-col gap-1 text-left">
                  <span>
                    <Trans>
                      <span className="font-semibold">My work</span> — deadlines assigned to you,
                      plus unassigned ones (so nothing unclaimed disappears).
                    </Trans>
                  </span>
                  <span>
                    <Trans>
                      <span className="font-semibold">Everyone</span> — every deadline across the
                      firm.
                    </Trans>
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
            {/* The "+" — a menu, not a single action (Yuqi 2026-06-14: "the add
                icon should show add client or import data"). Opens a dropdown
                with both ways to grow the workspace; each item is
                permission-gated. Encapsulated in DashboardAddMenu (owns the
                create-client mutation + dialog + the import wizard handoff). */}
            <DashboardAddMenu />
          </>
        }
      />

      {dashboardQuery.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>
            <Trans>Couldn't load Today</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(dashboardQuery.error) ??
              t`Try again in a moment. If it keeps failing, contact support.`}{' '}
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

      {showFirstRun ? (
        // Onboarding gap #1 (2026-06-18, revisited 2026-06-21): a fresh practice
        // with zero clients lands here with nothing to act on. Rather than a
        // single-CTA hero, lead with the three real "ways to add" as choice
        // cards (Yuqi create-choice-card refs) — Import clients / Add a client /
        // Add a deadline — so the get-started moment is a richer chooser, every
        // card wired to its real action. Gated to the same showFirstRun signal.
        // Heading + cards share ONE capped column (max-w-5xl) so they align to
        // the same edge and read as a single grounded block — instead of a
        // narrow heading with full-bleed cards sprawling across the wide page
        // (which floated free of their own title). The cap also holds the three
        // cards at a comfortable ~330px each, not stretched-thin rectangles.
        <div className="flex w-full max-w-5xl flex-1 flex-col gap-6 pt-2">
          <div className="flex flex-col gap-1.5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-divider-regular bg-background-default px-3 py-1 text-column-label font-semibold tracking-wide text-text-secondary">
              <span className="size-1.5 rounded-full bg-accent-default" aria-hidden />
              <Trans>Get started</Trans>
            </span>
            <h2 className="text-display-large font-semibold tracking-tight text-text-primary">
              <Trans>Add your first work</Trans>
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-text-secondary">
              <Trans>
                Pick how you want to begin. Import your whole book, add a single client, or drop in
                one deadline — DueDateHQ tracks every due date from there.
              </Trans>
            </p>
          </div>
          <CreateChoiceCards />
        </div>
      ) : needsRules ? (
        // Onboarding gap #2 (2026-06-18): clients are in but no rules are active,
        // so no deadlines generate and the sections below would read a misleading
        // "all clear." Replace them with the setup-progress card (Yuqi aesthetic
        // refs) — it reinforces the done step (clients ✓), shows how close they
        // are, and CTAs straight to rules. Self-resolves once the first rule
        // generates a deadline (activeRuleTotal > 0), at which point the card's
        // own all-done guard hides it and the real dashboard takes over.
        <div className="flex flex-1 items-start justify-center pt-8">
          <SetupProgressCard
            className="w-full max-w-md"
            title={<Trans>You're almost set up</Trans>}
            description={
              <Trans>
                Activate rules for your clients' jurisdictions and DueDateHQ generates every
                deadline automatically — no manual entry.
              </Trans>
            }
            steps={[
              {
                key: 'clients',
                label: <Trans>Add your clients</Trans>,
                done: hasClients,
                href: '/clients',
              },
              {
                key: 'rules',
                label: <Trans>Activate filing rules</Trans>,
                done: activeRuleTotal > 0,
                href: '/rules/library',
              },
            ]}
          />
        </div>
      ) : (
        <>
          {/* Alerts on top (Yuqi): client-affecting regulatory changes lead the day
          because they can MOVE the deadlines below — read what changed, then act
          on the brief. The section self-filters to client-affecting alerts. */}
          <NeedsAttentionSection />

          {/* Pinned deadlines — SHELVED 2026-06-23 (Yuqi: "save pinned for the
          future, remove from today for now"). The feature is intact and
          resurrectable — `PinnedSection` (features/dashboard/pinned-section.tsx)
          + `PinButton` + the `obligations.setPinned` mutation all remain; only
          the two render sites (here + the deadline-detail footer toggle) are
          pulled. Re-mount this block (and the footer PinButton) to bring it back. */}

          {/* Daily brief — the server-generated Yesterday/Today digest. Collapse
          (the page-tab pattern, Yuqi feedback #4) lives INSIDE the card now:
          ✕ folds the band into a small "Daily Brief" tab in the same slot,
          persisted per generation, reopenable with one click. The route just
          mounts it. */}
          {(() => {
            const brief =
              data?.brief ??
              (scope === 'me' && data
                ? ({
                    status: 'pending',
                    generatedAt: null,
                    expiresAt: null,
                    text: null,
                    citations: null,
                    aiOutputId: null,
                    errorCode: null,
                  } as const)
                : null)
            return (
              <DailyBriefCard
                scope={scope}
                brief={brief}
                concentration={data?.summary?.overdueConcentration ?? null}
                todayCounts={{
                  overdueCount: facets?.dueBuckets.find((b) => b.value === 'overdue')?.count ?? 0,
                  waitingOnClientCount:
                    facets?.statuses.find((s) => s.value === 'waiting_on_client')?.count ?? 0,
                  dueThisWeekCount: data?.summary?.dueThisWeekCount ?? 0,
                }}
                onOpenObligation={(obligationId) => openObligationDrawer(obligationId)}
              />
            )
          })()}

          {/* Today's brief — the deadline queue itself (by time), opened by a
          one-line deterministic summary, with the count chips as the view
          selector and the priority-action rows nested as flat sections. One
          surface: replaces the old AI brief AND the Priority Actions table. */}
          <MergedBriefCard
            // At xl the Priorities section absorbs the frame's leftover height and
            // scrolls its table internally (see the container note above).
            className="xl:min-h-0 xl:flex-1"
            counts={{
              // This week = today + the next-7-day bin; this month = the next-30-day
              // bin; overdue as-is. (Yuqi: CPA buckets, drop "ending today".)
              thisWeek:
                (facets?.dueBuckets.find((b) => b.value === 'today')?.count ?? 0) +
                (facets?.dueBuckets.find((b) => b.value === 'next_7_days')?.count ?? 0),
              thisMonth: facets?.dueBuckets.find((b) => b.value === 'next_30_days')?.count ?? 0,
              overdue: facets?.dueBuckets.find((b) => b.value === 'overdue')?.count ?? 0,
            }}
            rows={data?.topRows ?? []}
            asOfDate={data?.asOfDate ?? null}
            // While the dashboard query loads, the card renders a column-aligned
            // skeleton instead of masquerading as "Nothing here. You're clear."
            isLoading={dashboardQuery.isLoading}
            // On a failed load `rows` collapses to [] → without this the card
            // would render the all-clear/coffee state on a page that couldn't
            // load. `isError` routes to a quiet inline error + Retry instead
            // (the page-top destructive Alert above also fires; this keeps the
            // section itself honest rather than falsely celebrating).
            isError={dashboardQuery.isError}
            onRetry={() => void dashboardQuery.refetch()}
            onOpenObligation={(obligationId) => openObligationDrawer(obligationId)}
          />
        </>
      )}
      <FirstRunTour />
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
