import { AlertCircleIcon, PlusIcon, RotateCwIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { parseAsArrayOf, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useNavigate } from 'react-router'
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
import { PageHeader } from '@/components/patterns/page-header'
import { ShortcutHintChip } from '@/components/patterns/kbd'
import { useMigrationWizard } from '@/features/migration/WizardProvider'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { DashboardActionsList } from '@/features/dashboard/actions-list'
import { DailyBriefCard } from '@/features/dashboard/daily-brief-card'
// 2026-05-27 (Yuqi feedback round 1): import retained but commented out
// alongside the section mount. Restore both when ChangesSinceLastSection
// is brought back.
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
  // Unified page scope (2026-06-10 "My work / Everyone"). ONE toggle
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

const BRIEF_DISMISSED_STORAGE_KEY = 'ddhq:dashboard:brief-dismissed'

export function DashboardRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()
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
  // 2026-06-08 (Yuqi /today #8 "able to close it"): the Daily Brief is
  // dismissable. We persist the dismissal keyed to the brief's generation
  // stamp so closing it hides THIS brief but a freshly regenerated brief
  // (new stamp) returns on its own. localStorage so the choice survives a
  // reload within the day.
  const [dismissedBriefKey, setDismissedBriefKey] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(BRIEF_DISMISSED_STORAGE_KEY)
  })
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
  // 2026-05-29 (Yuqi /today follow-up — "empty state: no clients vs no
  // deadlines"): a `totalOpen === 0` page used to render a single
  // "No deadlines yet, import clients" CTA. That copy was right for
  // a fresh practice but wrong for a practice that already imported
  // and just doesn't have generated deadlines yet. We split with a
  // cheap probe — `limit: 1` so the server returns at most one row,
  // and we only look at .length to decide. The query result is
  // shared across the page, so dropdowns / pickers that need a
  // client list share the same cache key.
  const clientsProbeQuery = useQuery({
    ...orpc.clients.listByFirm.queryOptions({ input: { limit: 1 } }),
    placeholderData: keepPreviousData,
  })
  const hasClients = (clientsProbeQuery.data?.length ?? 0) > 0
  const data = dashboardQuery.data

  // 2026-06-03 (audit follow-up): greeting machinery removed
  // entirely after the eyebrow simplification (Pencil VmcdD)
  // dropped the personalized prefix. The `void` cheats that kept
  // unused helpers alive went with them.
  const syncedAtIso =
    dashboardQuery.dataUpdatedAt > 0 ? new Date(dashboardQuery.dataUpdatedAt).toISOString() : null
  const syncedLabel = syncedAtIso ? formatRelativeTime(syncedAtIso) : null

  const facets = data?.facets

  return (
    // 2026-05-25 (GitHub-density direction): page rhythm tightened
    // gap-8 → gap-6 (header → sections), header h1 trimmed from
    // text-2xl to text-xl. Yuqi's reference is GitHub's "useful,
    // precise, tight" density — section anchors stay legible at
    // scan distance without claiming a whole top-row of vertical
    // real estate.
    // 2026-05-25 (Yuqi page-title pass): outer container padding
    // bumped top to pt-6 md:pt-8 (was uniform p-4 md:p-6) so the
    // h1 has more breathing room from the top edge of the work
    // surface. Other sides unchanged. Same standard now applied
    // to /clients, /deadlines, /audit (see route files); the
    // narrower pages /settings, /practice, /billing already use
    // py-6 which reads correctly at their tighter width.
    // 2026-05-27 (audit-drain X1 D18): tightened above-the-fold
    // density. Outer gap-6 → gap-4 trims 24px of vertical between
    // each of the four sections (header → changes-since →
    // alerts → actions) — at 1440×900 this pulls the first
    // overdue row up into the third visible band instead of
    // landing below the fold once the new "Changes since" row is
    // added. Top/bottom padding also stepped down one tier
    // (pt-6/8 → pt-4/6, pb-4/6 → pb-3/5) so the H1 doesn't claim
    // an outsize share of the work surface.
    // 2026-05-27 (Yuqi feedback "bigger gap between Today title, Alerts
    // section, and Actions this week"): gap-4 (16px) → gap-8 (32px) so
    // the three top-level sections breathe. The number prefix in each
    // heading + the gray date pattern works better with this rhythm.
    // 2026-05-28 (Yuqi feedback — /today felt empty at wide
    // viewports): bumped from max-w-page-wide (1100) to
    // max-w-page-expanded (1440) so the page matches the rest
    // of the workbench family (/clients, /clients/[id],
    // /deadlines, /rules/library, /alerts, /alerts). At
    // 1920px the alerts + actions sections now use 1440px of
    // canvas instead of 1100px, removing ~340px of dead margin.
    // 2026-05-29 (Yuqi /today follow-up — "gap smaller, apply to
    // everywhere"): outer page gap stepped gap-8 → gap-6. The earlier
    // gap-8 was added for a "bigger gap between Today title, Alerts,
    // and Actions" round, but with section-internal gaps now at
    // gap-3 (Alerts + Actions) the outer 32px read disproportionately
    // loud against the 12px inside each section. gap-6 (24px) keeps
    // the three top-level sections distinct while pulling the first
    // content row up into the user's eye line.
    /* 2026-06-03 (Pencil VmcdD Main frame): page chrome aligned
       to Pencil exactly:
         - outer padding [32, 64] at md+ via `px-16 py-8`; scales
           down to `px-4 py-6` on mobile so the content breathes
         - inter-section gap-8 (32px) matches Pencil's 32px between
           PageHeader / Alerts / Actions — was gap-6 (24px)
         - `max-w-page-expanded` (1440) caps the content area;
           Pencil's 1920 mock is the canvas reference, not a
           fixed-width target */
    // 2026-06-04 round 4 (Yuqi feedback "Today's page should not
    // be more than a screen long"): page gap-8 (32px) → gap-6
    // (24px) and outer py-8 → py-6 so the eyebrow + Alerts +
    // Actions header all live in the first viewport (~1080px) on
    // a 1920×992 display. The table below scrolls but the
    // navigational structure stays above the fold.
    // 2026-06-04 round 14 (Yuqi page-feedback "bottom padding can
    // be twice double bigger"): bottom padding pb-6 → pb-12 on both
    // mobile and md+. Top stays at pt-6 so the H1 still hangs from
    // the same top inset. The extra bottom breathing room keeps
    // the last action row from feeling cramped against the
    // viewport edge when the page is short enough not to scroll.
    /* 2026-06-04 round 39 (Yuqi /today page feedback — "bigger gap
       between Today title, Alerts, Actions this week"): outer section
       gap bumped back to `gap-8` (32px) — the Pencil VmcdD spec.
       Round 4 had tightened to gap-6 (24px) to fit everything above
       the fold, but Yuqi found the three sections reading too close
       together. 32px gives a clearer "three distinct sections"
       hierarchy without losing too much vertical real estate. */
    <div className="mx-auto flex w-full max-w-page-expanded flex-col gap-8 px-4 pt-6 pb-12 md:px-8 md:pt-6 md:pb-12">
      {/* 2026-05-26 (Yuqi seventy-fourth pass — Today joins the
          page-header family): the hand-rolled <header> is gone.
          /today now routes through the same `<PageHeader>`
          primitive as /clients, /deadlines, /alerts, and
          /rules/library — date moves into the canonical pill
          chip slot so it matches the family's "title + count
          chip" shape, and the action cluster sits in the
          `actions` prop. Future polish to the PageHeader
          primitive propagates here automatically. */}
      <PageHeader
        // 2026-05-31 (Yuqi Pencil TV9xe — eyebrow row): personalized
        // greeting + sync indicator above the H1. The eyebrow slot's
        // default chrome is `uppercase tracking-eyebrow text-text-tertiary`
        // (for breadcrumb-style eyebrows on other pages); on Today we
        // override to a normal-case, body-weight sentence with the
        // sync state painted in `text-text-success`. Tokens used
        // throughout — `text-text-secondary`, `text-text-tertiary`,
        // `text-text-success` — so a token tweak in
        // `semantic-light.css` propagates here automatically.
        // 2026-06-03 (Yuqi Pencil VmcdD — header simplification):
        // greeting prefix dropped — the eyebrow now carries ONLY the
        // sync state. Rationale: the personalised greeting was a
        // social affordance, but the load on the eye is "is this
        // data fresh?" The single success-toned chip answers that
        // directly. Saves one row of vertical real estate, lets the
        // big "Today" title read as the page's anchor.
        eyebrow={
          syncedLabel ? (
            // 2026-06-04 round 6: dropped CheckCircle2Icon — green
            // tone alone carries freshness.
            // 2026-06-04 round 8: refresh icon goes inline as
            // success-toned size-3 in a size-4 button.
            // 2026-06-04 round 14 (Yuqi page-feedback "click this
            // button to actually sync again"): wrapped the entire
            // "Synced just now" text + refresh icon in a single
            // button so the CPA can click the LABEL itself to
            // trigger refresh — previously only the tiny size-4
            // icon was the click target, easy to miss. The label
            // now reads as the affordance ("click to re-sync");
            // the icon stays as a visual confirmation. Whole
            // chip pulses spin while fetching so the action
            // feedback covers both visual elements.
            // 2026-06-04 round 18 (Yuqi page-feedback "remove all
            // of the background and padding, hover = changes
            // colour to dark green"): stripped `px-1.5 py-0.5
            // rounded hover:bg-state-base-hover` — the eyebrow
            // is now a flat color-toggle button, no chrome at
            // rest, no bg shift on hover. Hover deepens the
            // text tone (text-text-success → state-success-solid)
            // so the interactive cue is purely tonal. Reads as
            // a quiet inline affordance, not a ghost button.
            <button
              type="button"
              onClick={() => void dashboardQuery.refetch()}
              disabled={dashboardQuery.isFetching}
              aria-label={t`Refresh dashboard`}
              title={t`Click to refresh`}
              // 2026-06-04 round 80 (Yuqi #4 "gray colour"):
              // sync status changed from `text-text-success` (green)
              // to `text-text-tertiary` (gray). The freshness
              // indicator was over-claiming with the green tone —
              // it's an informational stamp, not a success state.
              // Hover steps to `text-text-secondary` (one tier
              // darker) so the interactive cue is still tonal but
              // stays in the gray family.
              className="inline-flex items-center gap-1 text-xs font-medium tracking-normal text-text-tertiary outline-none normal-case transition-colors cursor-pointer hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>
                {syncedLabel === 'just now' ? (
                  <Trans>Synced just now</Trans>
                ) : (
                  <Trans>Synced {syncedLabel}</Trans>
                )}
              </span>
              <RotateCwIcon
                className={`size-3 ${dashboardQuery.isFetching ? 'animate-spin' : ''}`}
                aria-hidden
              />
            </button>
          ) : null
        }
        title={
          // 2026-06-04 round 3 (Yuqi feedback #6 "semibold, light
          // font"): date weight `font-normal` → `font-semibold`
          // and color steps DOWN to `text-text-tertiary`.
          // 2026-06-04 round 18 (Yuqi page-feedback #2 "lighter" +
          // #3 "closer"): date weight stepped back DOWN
          // `font-semibold` → `font-normal` so it reads lighter
          // against "Today" (the bold anchor). Title→date gap
          // tightened `gap-3` (12px) → `gap-2` (8px) so the two
          // sit as one tight word-pair, not as two separate
          // pieces. "Today June 4" now reads as a single
          // headline phrase.
          <span className="inline-flex items-baseline gap-2">
            <Trans>Today</Trans>
            {dashboardQuery.isLoading ? (
              <span className="text-2xl font-medium text-text-muted italic">
                <Trans>loading…</Trans>
              </span>
            ) : data?.asOfDate ? (
              // 2026-06-08 (Yuqi #4 "medium 更浅的颜色"): date weight
              // font-medium, color stepped to the lighter text-text-muted
              // so it sits clearly behind the bold "Today" anchor.
              <span className="text-2xl font-medium tabular-nums text-text-muted">
                {formatTodayHeader(data.asOfDate)}
              </span>
            ) : null}
          </span>
        }
        actions={
          <>
            {/* 2026-06-10 (My work / Everyone): ONE scope toggle for the
                whole page — daily brief, Priority Actions rows/ranks, and
                every count switch together. Lives in the header action
                cluster (not on the brief card) precisely because it
                governs more than the brief. "My work" = assigned to me +
                unassigned; the choice is remembered per browser. */}
            <Segmented
              value={scope}
              onValueChange={setScope}
              ariaLabel={t`Dashboard scope`}
              options={[
                { value: 'me', label: t`My work` },
                { value: 'firm', label: t`Everyone` },
              ]}
            />
            {/* 2026-05-27 (Step 6 UX flows audit H2.6): the
                keyboard shortcut help dialog opens on `?` but
                that key was undiscoverable from the dashboard.
                Tiny chip aligned with the action cluster gives
                first-time keyboardists a path in; mouse users
                can also click. Mirrors the bottom-of-queue
                pattern in /deadlines. */}
            <ShortcutHintChip className="hidden md:inline-flex" />
            {/* 2026-06-08 (Yuqi /today ErW76): the PageHeader action
                cluster was trimmed to a single control. "Add deadline"
                was removed entirely (creation lives in the deadlines
                surface, not the daily triage header). "Import clients"
                collapsed from a labelled outline button to a compact
                dark icon-only "+" — Pencil's header carries one filled
                square affordance, not a row of outline buttons. The
                permission guard + tooltip-via-aria-label are preserved,
                so clicks still always produce feedback. */}
            {/* 2026-06-08 (Yuqi /today): the lone "+" affordance becomes an
                expand-on-hover pill — at rest a 28px filled circle showing only
                the "+", on hover its WIDTH grows to reveal the "Import clients"
                label while the height stays fixed (h-7 / 28px), so the header
                cluster never jumps. Hand-rolled (not <Button/>) so the label can
                animate from max-w-0; the filled primary colors mirror the
                `variant="primary"` tokens. */}
            <button
              type="button"
              className="group/import inline-flex h-8 items-center rounded-full border border-components-button-primary-border bg-components-button-primary-bg px-2 text-components-button-primary-text transition-all cursor-pointer [corner-shape:round] hover:border-components-button-primary-border-hover hover:bg-components-button-primary-bg-hover hover:px-3.5 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-2 focus-visible:ring-offset-background-default focus-visible:outline-none"
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
              <span className="max-w-0 overflow-hidden text-[13px] font-medium whitespace-nowrap opacity-0 transition-all group-hover/import:ml-1.5 group-hover/import:max-w-[120px] group-hover/import:opacity-100">
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
            {/* 2026-05-26 (Step 6 UX audit #30): retry uses the
                canonical `<Button variant="link">` instead of an
                ad-hoc `<button className="underline">`. Keeps
                button-pattern consistent across the app and inherits
                the link variant's focus-visible ring + hover state. */}
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

      {/* 2026-05-27 (audit-drain X1 D17): "Changes since last visit"
          surface — addresses φ's J5 journey ("returned from
          vacation"). Sits between PageHeader and Alerts because
          it's a read-back ("here's what shifted while you were
          away"), not live work. MVP uses localStorage for
          last-seen tracking; upgrade path is a server-side
          `lastDashboardVisitAt` on the user model (ω-territory
          contract change). The section ships its own collapse
          affordance so power users who don't want it can hide. */}
      {/* 2026-05-27 (Yuqi feedback round 1): "hide changes since last
          visit for now" — section mount commented out. Component
          file kept (changes-since-last-section.tsx) for future
          revisit. Restore by uncommenting the line below. */}
      {/* <ChangesSinceLastSection /> */}

      {/* Daily brief — server-generated AI narrative of the day with
          citations that deep-link each claim back to its obligation.
          `dashboard.load` already returns `brief`; the card renders
          null when none exists (feature-off firms). */}
      {(() => {
        // 2026-06-10 (My work / Everyone): at scope='me' a missing brief
        // means "the server just enqueued your personal brief" (no cron
        // generates those) — render the card in its generating state
        // instead of nothing, so the scope switch visibly answers. Firm
        // scope keeps the old behavior: no brief row → no card.
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
        // Key the dismissal to the brief's generation stamp so a NEW brief
        // (different stamp) reappears even after a prior one was closed.
        const briefKey = brief?.generatedAt ?? brief?.status ?? null
        if (brief && briefKey && dismissedBriefKey === briefKey) return null
        return (
          <DailyBriefCard
            brief={brief}
            onRefresh={() => requestBriefRefresh.mutate({ scope })}
            refreshing={requestBriefRefresh.isPending}
            onOpenObligation={(obligationId) => openObligationDrawer(obligationId)}
            onClose={
              briefKey
                ? () => {
                    setDismissedBriefKey(briefKey)
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem(BRIEF_DISMISSED_STORAGE_KEY, briefKey)
                    }
                  }
                : undefined
            }
          />
        )
      })()}

      {/* 2026-06-08 (Yuqi /today #2): the standalone "AT A GLANCE"
          tile row (Pencil bAULB) was removed — Pencil VJbaH folds the
          day's headline numbers into the Daily Brief bar (qYrr3) above,
          so a separate four-tile strip duplicated that signal with extra
          chrome. The brief now carries the at-a-glance role. */}
      <NeedsAttentionSection />

      {/* 2026-05-25 (Yuqi #5): the standalone <ExposureStrip>
          section was merged into <DashboardActionsList> as its
          summary header. Both rendered "this week" scope, so two
          sections one after the other split the same concept
          across redundant chrome. Counts now pass through as props. */}
      <section>
        <DashboardActionsList
          isLoading={dashboardQuery.isLoading}
          asOfDate={data?.asOfDate ?? null}
          // 2026-06-10 (Yuqi /today CPA workflow): Today should surface
          // the next best work across open deadlines, not wait until items
          // enter the 7-day bucket. `topRows` is already the server-ranked
          // Smart Priority shortlist; the component keeps status grouping.
          rows={data?.topRows ?? []}
          totalOpen={data?.summary?.openObligationCount ?? 0}
          scope={scope}
          firmTotalOpen={data?.summary?.firmOpenObligationCount ?? 0}
          onSwitchToEveryone={() => setScope('firm')}
          needDecisionCount={data?.summary?.needsReviewCount ?? 0}
          blockedCount={facets?.statuses.find((s) => s.value === 'blocked')?.count ?? 0}
          waitingOnClientCount={
            facets?.statuses.find((s) => s.value === 'waiting_on_client')?.count ?? 0
          }
          canRunMigration={canRunMigration}
          hasClients={hasClients}
          onOpenWizard={openWizard}
          // Clicking an action navigates to the obligations queue with
          // the right panel pre-opened for that obligation. The
          // provider's openDrawer routes off-route callers to
          // `/deadlines/<short-ref>` — dashboard is a
          // picker, the queue is the workspace.
          onOpenObligation={(row) => openObligationDrawer(row.obligationId)}
          onOpenAllObligations={() => void navigate('/deadlines')}
        />
      </section>
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

// 2026-06-03 (audit follow-up): `formatTodayHeaderWithWeekday`,
// `todayGreetingPrefix`, and `firstNameFromDisplay` removed. They
// served the personalized greeting path the Pencil VmcdD pass
// retired. Restore from git history if the greeting is ever
// re-introduced.
