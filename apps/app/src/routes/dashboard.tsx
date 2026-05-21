import { AlertCircleIcon, FileSearchIcon } from 'lucide-react'
import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { parseAsArrayOf, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useNavigate } from 'react-router'

import type {
  DashboardDueBucket,
  DashboardEvidenceFilter,
  DashboardLoadInput,
  DashboardTopRow,
} from '@duedatehq/contracts'
import { DASHBOARD_FILTER_MAX_SELECTIONS } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { useMigrationWizard } from '@/features/migration/WizardProvider'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { DashboardActionsList } from '@/features/dashboard/actions-list'
import { ExposureStrip } from '@/features/dashboard/exposure-strip'
import { NeedsAttentionSection } from '@/features/dashboard/needs-attention-section'
import { CreateObligationDialog } from '@/features/obligations/CreateObligationDialog'
import type { ObligationStatus } from '@/features/obligations/status-control'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

type DashboardExposureStatus = DashboardTopRow['exposureStatus']
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
const DASHBOARD_EXPOSURE_STATUSES = [
  'ready',
  'needs_input',
  'unsupported',
] as const satisfies readonly DashboardExposureStatus[]
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
  exposure: parseAsArrayOf(parseAsStringLiteral(DASHBOARD_EXPOSURE_STATUSES))
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
  const canSeeDollars = permission.can('dollars.read')
  const [{ asOfDate, client, taxType, due, status: statusFilter, severity, exposure, evidence }] =
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
      ...(exposure.length > 0 ? { exposureStatus: exposure } : {}),
      ...(evidence.length > 0 ? { evidence } : {}),
    }),
    [clientQuery, dashboardAsOfDate, due, evidence, exposure, severity, statusFilter, taxTypeQuery],
  )
  const dashboardQuery = useQuery({
    ...orpc.dashboard.load.queryOptions({ input: dashboardTableInput }),
    placeholderData: keepPreviousData,
  })
  const data = dashboardQuery.data

  const triageTabs = data?.triageTabs ?? []
  const facets = data?.facets

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 p-4 md:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="text-2xl font-semibold leading-tight tracking-[-0.01em] text-text-primary">
          <Trans>Today</Trans>{' '}
          <span className="font-medium text-text-tertiary">
            {dashboardQuery.isLoading || !data?.asOfDate ? null : formatTodayHeader(data.asOfDate)}
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <CreateObligationDialog />
          <Button variant="outline" size="sm" onClick={openWizard} disabled={!canRunMigration}>
            <FileSearchIcon data-icon="inline-start" />
            <Trans>Import clients</Trans>
          </Button>
        </div>
      </header>

      {dashboardQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Couldn't load dashboard</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(dashboardQuery.error) ?? t`Please try again.`}{' '}
            <button
              type="button"
              className="underline"
              onClick={() => void dashboardQuery.refetch()}
            >
              <Trans>Retry</Trans>
            </button>
          </AlertDescription>
        </Alert>
      ) : null}

      <NeedsAttentionSection />

      <ExposureStrip
        isLoading={dashboardQuery.isLoading}
        needDecisionCount={data?.summary?.needsReviewCount ?? 0}
        totalExposureCents={data?.summary?.totalExposureCents ?? 0}
        blockedCount={facets?.statuses.find((s) => s.value === 'blocked')?.count ?? 0}
        waitingOnClientCount={
          facets?.statuses.find((s) => s.value === 'waiting_on_client')?.count ?? 0
        }
        canSeeDollars={canSeeDollars}
      />

      <section>
        <DashboardActionsList
          isLoading={dashboardQuery.isLoading}
          asOfDate={data?.asOfDate ?? null}
          // v2 scope is implicit "this week" per design brief — no time-bucket tabs.
          rows={triageTabs.find((tab) => tab.key === 'this_week')?.rows ?? []}
          totalThisWeek={triageTabs.find((tab) => tab.key === 'this_week')?.count ?? 0}
          totalOpen={data?.summary?.openObligationCount ?? 0}
          canRunMigration={canRunMigration}
          onOpenWizard={openWizard}
          onOpenObligation={(row) => void navigate(obligationQueueHrefForObligationFilter(row))}
          onOpenAllObligations={() => void navigate('/obligations')}
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

function obligationQueueHrefForObligationFilter(row: DashboardTopRow): string {
  const params = new URLSearchParams({
    obligation: row.obligationId,
  })
  return `/obligations?${params.toString()}`
}
