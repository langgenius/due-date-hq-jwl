import { AlertCircleIcon, UploadIcon } from 'lucide-react'
import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { parseAsArrayOf, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useNavigate } from 'react-router'

import type {
  DashboardDueBucket,
  DashboardEvidenceFilter,
  DashboardLoadInput,
} from '@duedatehq/contracts'
import { DASHBOARD_FILTER_MAX_SELECTIONS } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { PageHeader } from '@/components/patterns/page-header'
import { useMigrationWizard } from '@/features/migration/WizardProvider'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { DashboardActionsList } from '@/features/dashboard/actions-list'
import { NeedsAttentionSection } from '@/features/dashboard/needs-attention-section'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'
import { CreateObligationDialog } from '@/features/obligations/CreateObligationDialog'
import type { ObligationStatus } from '@/features/obligations/status-control'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

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
  const [{ asOfDate, client, taxType, due, status: statusFilter, severity, evidence }] =
    useQueryStates(dashboardSearchParamsParsers)
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
    }),
    [clientQuery, dashboardAsOfDate, due, evidence, severity, statusFilter, taxTypeQuery],
  )
  const dashboardQuery = useQuery({
    ...orpc.dashboard.load.queryOptions({ input: dashboardTableInput }),
    placeholderData: keepPreviousData,
  })
  const data = dashboardQuery.data

  const triageTabs = data?.triageTabs ?? []
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
    <div className="mx-auto flex w-full max-w-page-wide flex-col gap-6 px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6">
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
        title={
          <span className="inline-flex items-center gap-2">
            <Trans>Today</Trans>
            {!dashboardQuery.isLoading && data?.asOfDate ? (
              <span className="rounded-full bg-state-base-hover px-2 py-0.5 text-xs font-medium tabular-nums text-text-secondary">
                {formatTodayHeader(data.asOfDate)}
              </span>
            ) : null}
          </span>
        }
        actions={
          <>
            <CreateObligationDialog />
            {/* 2026-05-25 (Yuqi Today #6): FileSearchIcon → UploadIcon.
                The button's job is "upload my client list", not
                "browse for files" — the upload metaphor matches the
                CTA verb.
                2026-05-26 (Step 6 UX audit #32): a coordinator-role
                user lands on Today, sees a greyed-out "Import
                clients" button, and has no clue why. The `title`
                attribute surfaces the permission requirement on
                hover so they don't dead-end. aria-label keeps the
                button identifiable to screen readers even when
                disabled. */}
            <Button
              variant="outline"
              size="sm"
              onClick={openWizard}
              disabled={!canRunMigration}
              title={canRunMigration ? undefined : t`Owner or manager access required.`}
              aria-label={
                canRunMigration ? undefined : t`Import clients (owner or manager access required)`
              }
            >
              <UploadIcon data-icon="inline-start" />
              <Trans>Import clients</Trans>
            </Button>
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
          // v2 scope is implicit "this week" per design brief — no time-bucket tabs.
          rows={triageTabs.find((tab) => tab.key === 'this_week')?.rows ?? []}
          totalThisWeek={triageTabs.find((tab) => tab.key === 'this_week')?.count ?? 0}
          totalOpen={data?.summary?.openObligationCount ?? 0}
          needDecisionCount={data?.summary?.needsReviewCount ?? 0}
          blockedCount={facets?.statuses.find((s) => s.value === 'blocked')?.count ?? 0}
          waitingOnClientCount={
            facets?.statuses.find((s) => s.value === 'waiting_on_client')?.count ?? 0
          }
          canRunMigration={canRunMigration}
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
