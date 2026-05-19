import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  FileSearchIcon,
} from 'lucide-react'
import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type SortingFn,
  type SortingState,
} from '@tanstack/react-table'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { parseAsArrayOf, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import type {
  DashboardDueBucket,
  DashboardEvidenceFilter,
  DashboardFacetsOutput,
  DashboardLoadInput,
  DashboardSeverity,
  DashboardSummary,
  DashboardTopRow,
  DashboardTriageTab,
  DashboardTriageTabKey,
} from '@duedatehq/contracts'
import { DASHBOARD_FILTER_MAX_SELECTIONS } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Card, CardContent, CardFooter } from '@duedatehq/ui/components/ui/card'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@duedatehq/ui/components/ui/tabs'
import { cn } from '@duedatehq/ui/lib/utils'
import {
  TableHeaderMultiFilter,
  type TableFilterOption,
} from '@/components/patterns/table-header-filter'
import { ConceptLabel } from '@/features/concepts/concept-help'
import { useEvidenceDrawer } from '@/features/evidence/EvidenceDrawerContext'
import { useMigrationWizard } from '@/features/migration/WizardProvider'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { DashboardActionsList } from '@/features/dashboard/actions-list'
import { ExposureStrip } from '@/features/dashboard/exposure-strip'
import { formatTaxCode } from '@/lib/tax-codes'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'
import { NeedsAttentionSection } from '@/features/dashboard/needs-attention-section'
import { useDashboardV2 } from '@/features/dashboard/use-dashboard-v2'
import { PulseAlertsBanner } from '@/features/pulse/PulseAlertsBanner'
import { SmartPriorityBadge } from '@/features/priority/SmartPriorityBadge'
import {
  ObligationQueueStatusControl,
  useStatusLabels,
  type ObligationStatus,
} from '@/features/obligations/status-control'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatCents } from '@/lib/utils'

type DashboardExposureStatus = DashboardTopRow['exposureStatus']
type DashboardStatusFilter = 'pending' | 'in_progress' | 'waiting_on_client' | 'review'
type DashboardFilterState = {
  client: string[]
  taxType: string[]
  due: DashboardDueBucket[]
  status: DashboardStatusFilter[]
  severity: DashboardSeverity[]
  exposure: DashboardExposureStatus[]
  evidence: DashboardEvidenceFilter[]
}
type DashboardFilterOptions = {
  clients: TableFilterOption[]
  taxTypes: TableFilterOption[]
  due: TableFilterOption[]
  status: TableFilterOption[]
  severity: TableFilterOption[]
  exposure: TableFilterOption[]
  evidence: TableFilterOption[]
}
type DashboardQueryPatch = Partial<{
  client: string[] | null
  taxType: string[] | null
  due: DashboardDueBucket[] | null
  status: DashboardStatusFilter[] | null
  severity: DashboardSeverity[] | null
  exposure: DashboardExposureStatus[] | null
  evidence: DashboardEvidenceFilter[] | null
}>
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
const DASHBOARD_ROW_CONTROL_SELECTOR =
  'button,a[href],input,label,select,textarea,[role="button"],[role="checkbox"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="option"],[role="radio"],[role="tab"],[data-slot="checkbox"]'
const REPLACE_HISTORY_OPTIONS = { history: 'replace' } as const

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

function isTriageTabKey(value: string): value is DashboardTriageTabKey {
  return (TRIAGE_TAB_KEYS as readonly string[]).includes(value)
}

function isDashboardDueBucket(value: string): value is DashboardDueBucket {
  return (DASHBOARD_DUE_BUCKETS as readonly string[]).includes(value)
}

function isDashboardStatus(value: string): value is (typeof DASHBOARD_STATUS_FILTERS)[number] {
  return (DASHBOARD_STATUS_FILTERS as readonly string[]).includes(value)
}

function isDashboardExposureStatus(value: string): value is DashboardTopRow['exposureStatus'] {
  return (DASHBOARD_EXPOSURE_STATUSES as readonly string[]).includes(value)
}

function isDashboardEvidenceFilter(value: string): value is DashboardEvidenceFilter {
  return (DASHBOARD_EVIDENCE_FILTERS as readonly string[]).includes(value)
}

const dashboardDateSortingFn: SortingFn<DashboardTopRow> = (rowA, rowB, columnId) =>
  rowA.getValue<string>(columnId).localeCompare(rowB.getValue<string>(columnId))

const dashboardExposureSortingFn: SortingFn<DashboardTopRow> = (rowA, rowB) =>
  exposureSortValue(rowA.original) - exposureSortValue(rowB.original)

const dashboardPrioritySortingFn: SortingFn<DashboardTopRow> = (rowA, rowB) =>
  rowA.original.smartPriority.score - rowB.original.smartPriority.score

function exposureSortValue(row: DashboardTopRow): number {
  if (row.exposureStatus === 'ready' && row.estimatedExposureCents !== null) {
    return row.estimatedExposureCents
  }
  return -1
}

function useSeverityLabels(): Record<DashboardSeverity, string> {
  const { t } = useLingui()
  return {
    critical: t`critical`,
    high: t`high`,
    medium: t`medium`,
    neutral: t`neutral`,
  }
}

function useTriageTabLabels(): Record<DashboardTriageTabKey, string> {
  const { t } = useLingui()
  return {
    this_week: t`This Week`,
    this_month: t`This Month`,
    long_term: t`Long-term`,
  }
}

function useDueBucketLabels(): Record<DashboardDueBucket, string> {
  const { t } = useLingui()
  return useMemo(
    () => ({
      overdue: t`Overdue`,
      today: t`Today`,
      next_7_days: t`Next 7 days`,
      next_30_days: t`Next 30 days`,
      long_term: t`Long-term`,
    }),
    [t],
  )
}

function useExposureStatusLabels(): Record<DashboardTopRow['exposureStatus'], string> {
  const { t } = useLingui()
  return useMemo(
    () => ({
      ready: t`Ready`,
      needs_input: t`Needs input`,
      unsupported: t`Unsupported`,
    }),
    [t],
  )
}

function useEvidenceFilterLabels(): Record<DashboardEvidenceFilter, string> {
  const { t } = useLingui()
  return useMemo(
    () => ({
      needs: t`Needs evidence`,
      linked: t`Evidence linked`,
    }),
    [t],
  )
}

function ExposureBadge({ row, canSeeDollars }: { row: DashboardTopRow; canSeeDollars: boolean }) {
  if (!canSeeDollars) {
    return (
      <Badge variant="outline">
        <Trans>Hidden by role</Trans>
      </Badge>
    )
  }
  if (row.exposureStatus === 'ready' && row.estimatedExposureCents !== null) {
    return (
      <Badge variant="warning" className="tabular-nums">
        {formatCents(row.estimatedExposureCents)}
      </Badge>
    )
  }
  if (row.exposureStatus === 'needs_input') {
    return (
      <Badge variant="info">
        <Trans>needs input</Trans>
      </Badge>
    )
  }
  return (
    <Badge variant="outline">
      <Trans>unsupported</Trans>
    </Badge>
  )
}

function DashboardCellButton({ children, label }: { children: ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </button>
  )
}

function DashboardSortableFilterHeader({
  children,
  column,
  sortLabel,
}: {
  children: ReactNode
  column: Column<DashboardTopRow>
  sortLabel: string
}) {
  const sortDirection = column.getIsSorted()
  const SortIcon =
    sortDirection === 'asc'
      ? ArrowUpIcon
      : sortDirection === 'desc'
        ? ArrowDownIcon
        : ArrowUpDownIcon

  return (
    <div className="flex min-w-0 items-center gap-1">
      {children}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={sortLabel}
        aria-pressed={sortDirection !== false}
        data-active={sortDirection !== false ? true : undefined}
        className="size-7 text-text-tertiary hover:text-text-primary data-[active=true]:text-text-accent"
        onClick={column.getToggleSortingHandler()}
      >
        <SortIcon className="size-3.5" aria-hidden />
      </Button>
    </div>
  )
}

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

function enumOptionsFromFacets<T extends string>(
  values: readonly T[],
  facets: DashboardFacetsOutput | undefined,
  facetKey: 'dueBuckets' | 'statuses' | 'severities' | 'exposureStatuses' | 'evidence',
  labels: Record<T, string>,
): TableFilterOption[] {
  const counts = new Map<string, number>(
    (facets?.[facetKey] ?? []).map((option) => [option.value, option.count]),
  )
  return values.map((value) => ({ value, label: labels[value], count: counts.get(value) ?? 0 }))
}

export function DashboardRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { openWizard } = useMigrationWizard()
  const permission = useFirmPermission()
  const canRunMigration = permission.can('migration.run')
  const canSeeDollars = permission.can('dollars.read')
  const { openEvidence } = useEvidenceDrawer()
  // Dashboard v2 (?dashboard=v2): the new NEEDS ATTENTION surface
  // promotes Pulse alerts from a thin banner to first-class cards.
  // See apps/app/src/features/dashboard/needs-attention-section.tsx.
  const dashboardV2 = useDashboardV2()
  const severityLabels = useSeverityLabels()
  const triageTabLabels = useTriageTabLabels()
  const dueBucketLabels = useDueBucketLabels()
  const exposureStatusLabels = useExposureStatusLabels()
  const evidenceFilterLabels = useEvidenceFilterLabels()
  const statusLabels = useStatusLabels()
  const [
    { asOfDate, triage, client, taxType, due, status: statusFilter, severity, exposure, evidence },
    setDashboardQuery,
  ] = useQueryStates(dashboardSearchParamsParsers)
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
  const updateStatusMutation = useMutation(
    orpc.obligations.updateStatus.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        toast.success(t`Status updated`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't update status`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const data = dashboardQuery.data

  const triageTabs = data?.triageTabs ?? []
  const selectedTriageTab = triageTabs.find((tab) => tab.key === triage) ?? triageTabs[0] ?? null
  const facets = data?.facets
  const clientOptions = useMemo<TableFilterOption[]>(
    () =>
      facets?.clients.map((option) => ({
        value: option.value,
        label: option.label,
        count: option.count,
      })) ?? [],
    [facets?.clients],
  )
  const taxTypeOptions = useMemo<TableFilterOption[]>(
    () =>
      facets?.taxTypes.map((option) => ({
        value: option.value,
        label: formatTaxCode(option.value),
        count: option.count,
      })) ?? [],
    [facets?.taxTypes],
  )
  const dueOptions = useMemo(
    () => enumOptionsFromFacets(DASHBOARD_DUE_BUCKETS, facets, 'dueBuckets', dueBucketLabels),
    [dueBucketLabels, facets],
  )
  const statusOptions = useMemo(
    () => enumOptionsFromFacets(DASHBOARD_STATUS_FILTERS, facets, 'statuses', statusLabels),
    [facets, statusLabels],
  )
  const severityOptions = useMemo(
    () =>
      enumOptionsFromFacets(
        ['critical', 'high', 'medium', 'neutral'] as const,
        facets,
        'severities',
        severityLabels,
      ),
    [facets, severityLabels],
  )
  const exposureOptions = useMemo(
    () =>
      enumOptionsFromFacets(
        DASHBOARD_EXPOSURE_STATUSES,
        facets,
        'exposureStatuses',
        exposureStatusLabels,
      ),
    [exposureStatusLabels, facets],
  )
  const evidenceOptions = useMemo(
    () =>
      enumOptionsFromFacets(DASHBOARD_EVIDENCE_FILTERS, facets, 'evidence', evidenceFilterLabels),
    [evidenceFilterLabels, facets],
  )
  const filtersDisabled = dashboardQuery.isLoading && !data

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        {dashboardV2 ? (
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
            <Trans>Today</Trans>{' '}
            <span className="font-medium text-text-tertiary">
              {dashboardQuery.isLoading || !data?.asOfDate
                ? null
                : formatTodayHeader(data.asOfDate)}
            </span>
          </h1>
        ) : (
          <h1 className="flex items-baseline gap-2 text-2xl font-semibold tracking-tight text-text-primary">
            <span>
              <Trans>Today</Trans>
            </span>
            {data?.asOfDate ? (
              <span className="font-normal tabular-nums text-text-tertiary">
                {formatTodayHeader(data.asOfDate)}
              </span>
            ) : null}
          </h1>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={openWizard} disabled={!canRunMigration}>
            <FileSearchIcon data-icon="inline-start" />
            <Trans>Import clients</Trans>
          </Button>
          {dashboardV2 ? null : (
            <Button size="sm" onClick={() => void navigate('/obligations')}>
              <Trans>See all obligations</Trans>
              <ArrowUpRightIcon data-icon="inline-end" />
            </Button>
          )}
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

      {dashboardV2 ? (
        <NeedsAttentionSection />
      ) : (
        <div id="pulse" className="flex flex-col gap-2">
          <PulseAlertsBanner />
          <NeedsReviewBanner
            isLoading={dashboardQuery.isLoading}
            needsReviewCount={data?.summary?.needsReviewCount ?? 0}
            evidenceGapCount={data?.summary?.evidenceGapCount ?? 0}
            onResolve={() => void navigate('/obligations?status=review')}
            onResolveEvidence={() => void navigate('/obligations?evidence=missing_source')}
          />
        </div>
      )}

      {dashboardV2 ? (
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
      ) : null}

      <section>
        {dashboardV2 ? (
          <DashboardActionsList
            isLoading={dashboardQuery.isLoading}
            asOfDate={data?.asOfDate ?? null}
            // v2 scope is implicit "this week" per design brief — no time-bucket tabs.
            rows={triageTabs.find((tab) => tab.key === 'this_week')?.rows ?? []}
            totalThisWeek={triageTabs.find((tab) => tab.key === 'this_week')?.count ?? 0}
            canRunMigration={canRunMigration}
            onOpenWizard={openWizard}
            onOpenObligation={(row) => void navigate(obligationQueueHrefForObligationFilter(row))}
            onOpenAllObligations={() => void navigate('/obligations')}
          />
        ) : (
          <DashboardTriagePanel
            isLoading={dashboardQuery.isLoading}
            asOfDate={data?.asOfDate ?? null}
            tabs={triageTabs}
            selectedKey={selectedTriageTab?.key ?? triage}
            tabLabels={triageTabLabels}
            filtersDisabled={filtersDisabled}
            summary={data?.summary ?? null}
            filterOptions={{
              clients: clientOptions,
              taxTypes: taxTypeOptions,
              due: dueOptions,
              status: statusOptions,
              severity: severityOptions,
              exposure: exposureOptions,
              evidence: evidenceOptions,
            }}
            filterState={{
              client: clientQuery,
              taxType: taxTypeQuery,
              due,
              status: statusFilter,
              severity,
              exposure,
              evidence,
            }}
            statusLabels={statusLabels}
            statusDisabled={updateStatusMutation.isPending}
            canRunMigration={canRunMigration}
            canSeeDollars={canSeeDollars}
            dashboardV2={dashboardV2}
            onSelect={(key) => void setDashboardQuery({ triage: key })}
            onFilterChange={(patch) => void setDashboardQuery(patch)}
            onOpenWizard={openWizard}
            onOpenObligationQueue={(key) => void navigate(obligationQueueHrefForTriage(key))}
            onOpenObligation={(row) => void navigate(obligationQueueHrefForObligationFilter(row))}
            onOpenEvidence={(row) =>
              openEvidence({
                obligationId: row.obligationId,
                label: `${row.clientName} - ${formatTaxCode(row.taxType)}`,
                focusEvidenceId: row.primaryEvidence?.id ?? null,
              })
            }
            onChangeStatus={(row, nextStatus) =>
              updateStatusMutation.mutate({ id: row.obligationId, status: nextStatus })
            }
          />
        )}
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

function NeedsReviewBanner({
  isLoading,
  needsReviewCount,
  evidenceGapCount,
  onResolve,
  onResolveEvidence,
}: {
  isLoading: boolean
  needsReviewCount: number
  evidenceGapCount: number
  onResolve: () => void
  onResolveEvidence: () => void
}) {
  if (isLoading) {
    return <Skeleton className="h-9 w-full rounded-md" />
  }
  if (needsReviewCount === 0 && evidenceGapCount === 0) return null
  const hasReady = needsReviewCount > 0
  const hasEvidence = evidenceGapCount > 0
  return (
    <div
      className={cn(
        'group flex min-h-9 items-center gap-3 rounded-md border px-3 py-1.5 text-xs',
        hasReady
          ? 'border-state-warning-border bg-state-warning-bg text-text-primary'
          : 'border-border-default bg-bg-panel text-text-secondary',
      )}
    >
      <BadgeStatusDot tone={hasReady ? 'warning' : 'normal'} />
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium text-text-primary">
          <Trans>Needs review</Trans>
        </span>
        {hasReady ? (
          <span className="tabular-nums text-text-primary">
            <Plural value={needsReviewCount} one="# row ready" other="# rows ready" />
          </span>
        ) : null}
        {hasEvidence ? (
          <span className="tabular-nums text-text-tertiary">
            <Plural
              value={evidenceGapCount}
              one="# needs evidence first"
              other="# need evidence first"
            />
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {hasReady ? (
          <Button type="button" size="xs" variant="ghost" onClick={onResolve}>
            <Trans>Resolve</Trans>
            <ArrowRightIcon data-icon="inline-end" className="size-3" aria-hidden />
          </Button>
        ) : null}
        {hasEvidence ? (
          <Button type="button" size="xs" variant="ghost" onClick={onResolveEvidence}>
            <Trans>Attach evidence</Trans>
            <ArrowRightIcon data-icon="inline-end" className="size-3" aria-hidden />
          </Button>
        ) : null}
      </span>
    </div>
  )
}

function ProjectedRiskInline({
  summary,
  canSeeDollars,
}: {
  summary: DashboardSummary | null
  canSeeDollars: boolean
}) {
  if (!summary) return null
  if (!canSeeDollars) {
    return (
      <span className="pb-2 text-xs text-text-tertiary">
        <Trans>Risk dollars hidden by role</Trans>
      </span>
    )
  }
  const exposure = summary.totalExposureCents
  const accrued = summary.totalAccruedPenaltyCents
  if (exposure === 0 && accrued === 0) return null
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pb-2 text-xs">
      {exposure !== 0 ? (
        <span className="flex items-baseline gap-1.5">
          <span className="text-text-tertiary uppercase tracking-wider">
            <Trans>90-day projected risk</Trans>
          </span>
          <span className="tabular-nums text-text-primary">{formatCents(exposure)}</span>
        </span>
      ) : null}
      {accrued !== 0 ? (
        <span className="flex items-baseline gap-1.5">
          <span className="text-text-tertiary uppercase tracking-wider">
            <Trans>Accrued penalty</Trans>
          </span>
          <span className="tabular-nums text-severity-critical">{formatCents(accrued)}</span>
        </span>
      ) : null}
    </div>
  )
}

function obligationQueueHrefForTriage(key: DashboardTriageTabKey): string {
  if (key === 'this_week') return '/obligations?daysMax=7'
  if (key === 'this_month') return '/obligations?daysMin=8&daysMax=30'
  return '/obligations?daysMin=31&daysMax=180'
}

function obligationQueueHrefForObligationFilter(row: DashboardTopRow): string {
  const params = new URLSearchParams({
    obligation: row.obligationId,
  })
  return `/obligations?${params.toString()}`
}

function clientProfileHref(clientId: string): string {
  const params = new URLSearchParams({ clients: clientId, client: clientId })
  return `/clients?${params.toString()}`
}

function isDashboardRowControlClick(target: EventTarget | null, rowElement: HTMLElement): boolean {
  if (!(target instanceof HTMLElement)) return false
  const control = target.closest(DASHBOARD_ROW_CONTROL_SELECTOR)
  return control !== null && control !== rowElement
}

function handleDashboardTriageRowKeyDown(
  event: KeyboardEvent<HTMLTableRowElement>,
  row: DashboardTopRow,
  onOpenObligation: (row: DashboardTopRow) => void,
) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  if (isDashboardRowControlClick(event.target, event.currentTarget)) return
  event.preventDefault()
  onOpenObligation(row)
}

function daysUntilDueFromAsOf(dueDate: string, asOfDate: string | null): number {
  const asOf = new Date(`${asOfDate ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
  const due = new Date(`${dueDate}T00:00:00.000Z`)
  return Math.floor((due.getTime() - asOf.getTime()) / (24 * 60 * 60 * 1000))
}

function DashboardCountdownBadge({ days }: { days: number }) {
  const variant = days <= 2 ? 'destructive' : days <= 7 ? 'warning' : 'outline'
  return (
    <Badge variant={variant} className="min-w-18 justify-start text-xs tabular-nums">
      {days === 0 ? (
        <Trans>Today</Trans>
      ) : days < 0 ? (
        <Plural value={Math.abs(days)} one="# day late" other="# days late" />
      ) : (
        <Plural value={days} one="# day" other="# days" />
      )}
    </Badge>
  )
}

function DashboardClientCell({ row, compact }: { row: DashboardTopRow; compact?: boolean }) {
  const { t } = useLingui()

  return (
    <div className={cn('grid gap-1', compact ? 'min-w-40' : 'min-w-56')}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Link
          to={clientProfileHref(row.clientId)}
          aria-label={t`Open fact profile for ${row.clientName}`}
          className="min-w-0 max-w-64 truncate font-medium text-text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          {row.clientName}
        </Link>
      </div>
      {/* Email line is dropped in compact mode — it's a facet detail
          that belongs on the Obligations queue or the client profile.
          The dashboard is "what to do today", not a contact list. */}
      {compact ? null : (
        <span className="truncate text-xs leading-5 text-text-tertiary">
          {row.clientEmail ?? t`No email`}
        </span>
      )}
    </div>
  )
}

function DashboardNextCheck({ row, asOfDate }: { row: DashboardTopRow; asOfDate: string | null }) {
  const days = daysUntilDueFromAsOf(row.currentDueDate, asOfDate)
  const tone =
    row.status === 'waiting_on_client' || row.exposureStatus === 'needs_input'
      ? 'text-severity-high'
      : row.evidenceCount === 0 || row.status === 'review' || days <= 2
        ? 'text-severity-critical'
        : 'text-text-secondary'

  return (
    <div className={cn('max-w-72 whitespace-normal text-sm leading-5', tone)}>
      {row.status === 'waiting_on_client' ? (
        <Trans>Follow up for client materials.</Trans>
      ) : row.evidenceCount === 0 ? (
        <Trans>Attach a source before review.</Trans>
      ) : row.exposureStatus === 'needs_input' ? (
        <Trans>Add penalty inputs before ranking by projected risk.</Trans>
      ) : row.status === 'review' ? (
        <Trans>Complete CPA review and close the row.</Trans>
      ) : days <= 0 ? (
        <Trans>Confirm filing or payment status today.</Trans>
      ) : days <= 2 ? (
        <Trans>Verify owner, source, and filing cutoff.</Trans>
      ) : (
        <Trans>Open evidence and confirm the source still matches.</Trans>
      )}
    </div>
  )
}

function DashboardTriagePanel({
  isLoading,
  asOfDate,
  tabs,
  selectedKey,
  tabLabels,
  filtersDisabled,
  summary,
  filterOptions,
  filterState,
  statusLabels,
  statusDisabled,
  canRunMigration,
  canSeeDollars,
  dashboardV2,
  onSelect,
  onFilterChange,
  onOpenWizard,
  onOpenObligationQueue,
  onOpenObligation,
  onOpenEvidence,
  onChangeStatus,
}: {
  isLoading: boolean
  asOfDate: string | null
  tabs: DashboardTriageTab[]
  selectedKey: DashboardTriageTabKey
  tabLabels: Record<DashboardTriageTabKey, string>
  filtersDisabled: boolean
  summary: DashboardSummary | null
  filterOptions: DashboardFilterOptions
  filterState: DashboardFilterState
  statusLabels: Record<ObligationStatus, string>
  statusDisabled: boolean
  canRunMigration: boolean
  canSeeDollars: boolean
  dashboardV2: boolean
  onSelect: (key: DashboardTriageTabKey) => void
  onFilterChange: (patch: DashboardQueryPatch) => void
  onOpenWizard: () => void
  onOpenObligationQueue: (key: DashboardTriageTabKey) => void
  onOpenObligation: (row: DashboardTopRow) => void
  onOpenEvidence: (row: DashboardTopRow) => void
  onChangeStatus: (row: DashboardTopRow, status: ObligationStatus) => void
}) {
  const selectedTab = tabs.find((tab) => tab.key === selectedKey) ?? tabs[0] ?? null

  return (
    <Card className="min-w-0">
      <CardContent className="grid gap-4 pt-4">
        {isLoading ? (
          <div className="grid gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : tabs.length === 0 || !selectedTab ? (
          <EmptyDashboard onOpenWizard={onOpenWizard} canRunMigration={canRunMigration} />
        ) : (
          <Tabs
            value={selectedTab.key}
            onValueChange={(value) => {
              if (isTriageTabKey(value)) onSelect(value)
            }}
            className="gap-4"
          >
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-divider-regular">
              <TabsList variant="line" className="-mb-px border-0">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.key} value={tab.key} className="gap-2">
                    <span>{tabLabels[tab.key]}</span>
                    <Badge variant="secondary" className="tabular-nums">
                      {tab.count}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
              <ProjectedRiskInline summary={summary} canSeeDollars={canSeeDollars} />
            </div>
            {tabs.map((tab) => (
              <TabsContent key={tab.key} value={tab.key}>
                <DashboardTriageTable
                  rows={tab.rows}
                  asOfDate={asOfDate}
                  filtersDisabled={filtersDisabled}
                  filterOptions={filterOptions}
                  filterState={filterState}
                  statusLabels={statusLabels}
                  statusDisabled={statusDisabled}
                  canSeeDollars={canSeeDollars}
                  dashboardV2={dashboardV2}
                  onFilterChange={onFilterChange}
                  onOpenObligation={onOpenObligation}
                  onOpenEvidence={onOpenEvidence}
                  onChangeStatus={onChangeStatus}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t border-divider-regular">
        <Button
          variant="primary"
          size="sm"
          disabled={!selectedTab}
          onClick={() => selectedTab && onOpenObligationQueue(selectedTab.key)}
        >
          <Trans>Open full Obligations</Trans>
          <ArrowUpRightIcon data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  )
}

function DashboardTriageTable({
  rows,
  asOfDate,
  filtersDisabled,
  filterOptions,
  filterState,
  statusLabels,
  statusDisabled,
  canSeeDollars,
  dashboardV2,
  onFilterChange,
  onOpenObligation,
  onOpenEvidence,
  onChangeStatus,
}: {
  rows: DashboardTopRow[]
  asOfDate: string | null
  filtersDisabled: boolean
  filterOptions: DashboardFilterOptions
  filterState: DashboardFilterState
  statusLabels: Record<ObligationStatus, string>
  statusDisabled: boolean
  canSeeDollars: boolean
  dashboardV2: boolean
  onFilterChange: (patch: DashboardQueryPatch) => void
  onOpenObligation: (row: DashboardTopRow) => void
  onOpenEvidence: (row: DashboardTopRow) => void
  onChangeStatus: (row: DashboardTopRow, status: ObligationStatus) => void
}) {
  const { t } = useLingui()
  const [openHeaderFilter, setOpenHeaderFilter] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])

  function setHeaderFilterOpen(filterId: string, nextOpen: boolean) {
    setOpenHeaderFilter((current) => (nextOpen ? filterId : current === filterId ? null : current))
  }

  const columns = useMemo<ColumnDef<DashboardTopRow>[]>(
    () => [
      {
        id: 'smartPriority',
        enableSorting: true,
        sortingFn: dashboardPrioritySortingFn,
        sortDescFirst: true,
        header: ({ column }) => {
          const label = t`Priority`
          return (
            <DashboardSortableFilterHeader column={column} sortLabel={`${t`Sort`} ${label}`}>
              <ConceptLabel concept="smartPriority">{label}</ConceptLabel>
            </DashboardSortableFilterHeader>
          )
        },
        cell: ({ row }) => <SmartPriorityBadge smartPriority={row.original.smartPriority} />,
      },
      {
        accessorKey: 'clientName',
        enableSorting: false,
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`Client`}
            open={openHeaderFilter === 'client'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('client', nextOpen)}
            options={filterOptions.clients}
            selected={filterState.client}
            disabled={filtersDisabled}
            emptyLabel={t`No clients`}
            searchable
            searchPlaceholder={t`Search clients`}
            onSelectedChange={(nextClient) =>
              onFilterChange({ client: nextClient.length > 0 ? nextClient : null })
            }
          />
        ),
        cell: ({ row }) => <DashboardClientCell row={row.original} compact={dashboardV2} />,
      },
      {
        id: 'nextCheck',
        enableSorting: false,
        header: () => <Trans>Next check</Trans>,
        cell: ({ row }) => <DashboardNextCheck row={row.original} asOfDate={asOfDate} />,
      },
      {
        accessorKey: 'taxType',
        enableSorting: false,
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`Tax type`}
            open={openHeaderFilter === 'taxType'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('taxType', nextOpen)}
            options={filterOptions.taxTypes}
            selected={filterState.taxType}
            disabled={filtersDisabled}
            emptyLabel={t`No forms`}
            onSelectedChange={(nextTaxType) =>
              onFilterChange({ taxType: nextTaxType.length > 0 ? nextTaxType : null })
            }
          />
        ),
        cell: (info) => {
          const raw = info.getValue<string>()
          // v2 surfaces human-readable form names + a tooltip exposing
          // the raw code; legacy mode keeps the raw matrix code for
          // backwards-compat with anything that screen-reads the cell.
          return dashboardV2 ? <TaxCodeLabel code={raw} /> : raw
        },
      },
      {
        accessorKey: 'currentDueDate',
        enableSorting: true,
        sortingFn: dashboardDateSortingFn,
        sortDescFirst: false,
        header: ({ column }) => {
          const label = t`Deadline`
          return (
            <DashboardSortableFilterHeader column={column} sortLabel={`${t`Sort`} ${label}`}>
              <TableHeaderMultiFilter
                trigger="header"
                label={label}
                open={openHeaderFilter === 'due'}
                onOpenChange={(nextOpen) => setHeaderFilterOpen('due', nextOpen)}
                options={filterOptions.due}
                selected={filterState.due}
                disabled={filtersDisabled}
                emptyLabel={t`No deadline windows`}
                onSelectedChange={(nextDue) => {
                  const typedDue = nextDue.filter(isDashboardDueBucket)
                  onFilterChange({ due: typedDue.length > 0 ? typedDue : null })
                }}
              />
            </DashboardSortableFilterHeader>
          )
        },
        cell: ({ row }) => (
          <div className="flex items-center gap-2 tabular-nums">
            <DashboardCountdownBadge
              days={daysUntilDueFromAsOf(row.original.currentDueDate, asOfDate)}
            />
          </div>
        ),
      },
      {
        accessorKey: 'status',
        enableSorting: false,
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`Status`}
            open={openHeaderFilter === 'status'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('status', nextOpen)}
            options={filterOptions.status}
            selected={filterState.status}
            disabled={filtersDisabled}
            emptyLabel={t`No statuses`}
            onSelectedChange={(nextStatus) => {
              const typedStatus = nextStatus.filter(isDashboardStatus)
              onFilterChange({ status: typedStatus.length > 0 ? typedStatus : null })
            }}
          />
        ),
        cell: ({ row }) => (
          <ObligationQueueStatusControl
            row={{
              id: row.original.obligationId,
              clientName: row.original.clientName,
              status: row.original.status,
            }}
            labels={statusLabels}
            disabled={statusDisabled}
            onChange={(_, status) => onChangeStatus(row.original, status)}
          />
        ),
      },
      {
        accessorKey: 'estimatedExposureCents',
        enableSorting: true,
        sortingFn: dashboardExposureSortingFn,
        sortDescFirst: true,
        header: ({ column }) => {
          const label = t`Projected risk`
          return (
            <DashboardSortableFilterHeader column={column} sortLabel={`${t`Sort`} ${label}`}>
              <TableHeaderMultiFilter
                trigger="header"
                label={label}
                open={openHeaderFilter === 'exposure'}
                onOpenChange={(nextOpen) => setHeaderFilterOpen('exposure', nextOpen)}
                options={filterOptions.exposure}
                selected={filterState.exposure}
                disabled={filtersDisabled}
                emptyLabel={t`No exposure states`}
                onSelectedChange={(nextExposure) => {
                  const typedExposure = nextExposure.filter(isDashboardExposureStatus)
                  onFilterChange({ exposure: typedExposure.length > 0 ? typedExposure : null })
                }}
              />
            </DashboardSortableFilterHeader>
          )
        },
        cell: ({ row }) => (
          <DashboardCellButton label={t`Projected risk`}>
            <ExposureBadge row={row.original} canSeeDollars={canSeeDollars} />
          </DashboardCellButton>
        ),
      },
      {
        accessorKey: 'evidenceCount',
        enableSorting: false,
        header: () => (
          <TableHeaderMultiFilter
            trigger="header"
            label={t`Evidence`}
            open={openHeaderFilter === 'evidence'}
            onOpenChange={(nextOpen) => setHeaderFilterOpen('evidence', nextOpen)}
            options={filterOptions.evidence}
            selected={filterState.evidence}
            disabled={filtersDisabled}
            emptyLabel={t`No evidence states`}
            onSelectedChange={(nextEvidence) => {
              const typedEvidence = nextEvidence.filter(isDashboardEvidenceFilter)
              onFilterChange({ evidence: typedEvidence.length > 0 ? typedEvidence : null })
            }}
          />
        ),
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            aria-label={t`Open evidence for ${row.original.clientName}`}
            onClick={() => onOpenEvidence(row.original)}
          >
            <FileSearchIcon data-icon="inline-start" />
            {row.original.evidenceCount > 0 ? (
              <Plural value={row.original.evidenceCount} one="# source" other="# sources" />
            ) : (
              t`Needs evidence`
            )}
          </Button>
        ),
      },
    ],
    [
      asOfDate,
      canSeeDollars,
      dashboardV2,
      filterOptions,
      filterState,
      filtersDisabled,
      onChangeStatus,
      onFilterChange,
      onOpenEvidence,
      openHeaderFilter,
      statusDisabled,
      statusLabels,
      t,
    ],
  )
  // Dashboard v2 column projection:
  //  - drop the Evidence column (facet belongs on Obligations queue,
  //    not the curated dashboard view)
  //  - reorder so Status sits adjacent to Next check (decision pair)
  // Concrete final order: Priority · Client · Next check · Status ·
  // Deadline · Tax type · Projected risk.
  const projectedColumns = useMemo<ColumnDef<DashboardTopRow>[]>(() => {
    if (!dashboardV2) return columns
    const byId = new Map<string, ColumnDef<DashboardTopRow>>()
    for (const col of columns) {
      const key =
        'id' in col && col.id ? col.id : 'accessorKey' in col ? String(col.accessorKey) : null
      if (key) byId.set(key, col)
    }
    const order = [
      'smartPriority',
      'clientName',
      'nextCheck',
      'status',
      'currentDueDate',
      'taxType',
      'estimatedExposureCents',
    ]
    return order
      .map((key) => byId.get(key))
      .filter((c): c is ColumnDef<DashboardTopRow> => c !== undefined)
  }, [columns, dashboardV2])

  const table = useReactTable({
    data: rows,
    columns: projectedColumns,
    state: {
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.obligationId,
    manualFiltering: true,
    onSortingChange: setSorting,
  })
  const tableRows = table.getRowModel().rows
  const visibleColumnCount = table.getVisibleLeafColumns().length

  return (
    <div className="overflow-x-auto">
      {/*
        Legacy 7-column layout keeps a min-width so the filter facets
        stay readable. v2 (Evidence dropped, Status pulled in next to
        Next check) sizes to the container — no horizontal clip.
      */}
      <Table className={cn(dashboardV2 ? 'w-full' : 'min-w-[1040px]')}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  className={
                    header.column.id === 'nextCheck'
                      ? 'w-72'
                      : header.column.id === 'taxType'
                        ? 'w-36'
                        : undefined
                  }
                  aria-sort={
                    header.column.getIsSorted() === 'asc'
                      ? 'ascending'
                      : header.column.getIsSorted() === 'desc'
                        ? 'descending'
                        : header.column.getCanSort()
                          ? 'none'
                          : undefined
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="[&_tr]:border-b-0 [&_td]:py-3">
          {tableRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumnCount} className="py-8 text-xs text-text-secondary">
                <Trans>No obligations in this window.</Trans>
              </TableCell>
            </TableRow>
          ) : (
            tableRows.map((tableRow) => (
              <TableRow
                key={tableRow.id}
                role="button"
                tabIndex={0}
                aria-label={`${t`Open obligations`}: ${tableRow.original.clientName} ${formatTaxCode(tableRow.original.taxType)}`}
                className="cursor-pointer rounded-md outline-none hover:bg-state-base-hover focus-visible:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset"
                onClick={(event) => {
                  if (isDashboardRowControlClick(event.target, event.currentTarget)) return
                  onOpenObligation(tableRow.original)
                }}
                onKeyDown={(event) =>
                  handleDashboardTriageRowKeyDown(event, tableRow.original, onOpenObligation)
                }
              >
                {tableRow.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={
                      cell.column.id === 'clientName'
                        ? 'font-medium'
                        : cell.column.id === 'nextCheck'
                          ? 'w-72 max-w-72 whitespace-normal'
                          : cell.column.id === 'taxType'
                            ? 'w-36 text-text-secondary'
                            : undefined
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function EmptyDashboard({
  onOpenWizard,
  canRunMigration,
}: {
  onOpenWizard: () => void
  canRunMigration: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-divider-regular px-6 py-10 text-center">
      <span className="text-md font-semibold text-text-primary">
        <Trans>No generated obligations yet.</Trans>
      </span>
      <p className="max-w-105 text-sm text-text-secondary">
        <Trans>Run Migration Copilot to import clients and generate real deadlines.</Trans>
      </p>
      <Button size="sm" onClick={onOpenWizard} disabled={!canRunMigration}>
        <FileSearchIcon data-icon="inline-start" />
        <Trans>Run migration</Trans>
      </Button>
    </div>
  )
}
