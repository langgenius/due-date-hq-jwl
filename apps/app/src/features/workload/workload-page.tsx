import { Link } from 'react-router'
import { useState, type ReactNode } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { ArrowRightIcon, ClipboardListIcon, LockKeyholeIcon, RefreshCwIcon } from 'lucide-react'

import type { WorkloadManagerInsights, WorkloadOwnerRow } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
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
import { Progress } from '@duedatehq/ui/components/ui/progress'
import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
import { paidPlanActive } from '@/features/billing/model'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatDatePretty } from '@/lib/utils'
import { workloadRowDueSoonHref, workloadRowHref, workloadRowOverdueHref } from './workload-links'

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10)
}

export function WorkloadPage() {
  const { t } = useLingui()
  const { firmsQuery, currentFirm } = useCurrentFirm()
  const paid = paidPlanActive(currentFirm)
  const asOfDate = todayDateOnly()
  // WorkloadLoadInput.windowDays accepts 1–30; expose the three useful
  // horizons (was hardcoded to 7).
  const [windowDays, setWindowDays] = useState<number>(7)
  const workloadQuery = useQuery({
    ...orpc.workload.load.queryOptions({ input: { asOfDate, windowDays } }),
    enabled: paid,
  })

  if (firmsQuery.isLoading) {
    // Skeletons so the loading rhythm matches the rest of the app.
    return (
      <section
        className="grid gap-6 p-6"
        role="status"
        aria-live="polite"
        aria-label={t`Loading team workload`}
      >
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-60 w-full" />
      </section>
    )
  }

  if (!paid) {
    return <WorkloadUpgradePanel />
  }

  const data = workloadQuery.data

  return (
    <section className="mx-auto grid w-full max-w-page-wide gap-6 px-4 pt-8 pb-6 md:px-6">
      <PageHeader
        title={<Trans>Team workload</Trans>}
        description={
          <>
            <Trans>Shared deadline operations for Pro, Team, and Enterprise plans.</Trans>
            {/* Pretty-printed date, no `font-mono`, so the "As of … · next N
                days" line reads as prose under the description sentence rather
                than machine output. */}
            <span className="mt-1 block text-caption text-text-muted">
              <Trans>
                As of {formatDatePretty(asOfDate)} · next {windowDays} days
              </Trans>
            </span>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* Window picker — 7 / 14 / 30 day horizon for the load query. */}
            <Segmented
              ariaLabel={t`Workload window`}
              value={String(windowDays)}
              onValueChange={(value) => setWindowDays(Number(value))}
              options={[
                { value: '7', label: '7d' },
                { value: '14', label: '14d' },
                { value: '30', label: '30d' },
              ]}
            />
            {/* Refresh button announces aria-busy + spins the icon while
                refetching so the user has a visible signal. */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void workloadQuery.refetch()}
              disabled={workloadQuery.isFetching}
              aria-busy={workloadQuery.isFetching}
            >
              <RefreshCwIcon
                data-icon="inline-start"
                className={workloadQuery.isFetching ? 'animate-spin' : undefined}
              />
              <Trans>Refresh</Trans>
            </Button>
          </div>
        }
      />

      {workloadQuery.isError ? (
        // Alert variant=destructive for parity with /notifications +
        // /opportunities.
        <Alert variant="destructive">
          <AlertTitle>
            <Trans>Couldn't load team workload</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(workloadQuery.error) ??
              t`Try again in a moment. If it keeps failing, contact support.`}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label={t`Open`} value={data?.summary.open} />
        <MetricCard label={t`Due soon`} value={data?.summary.dueSoon} />
        <MetricCard label={t`Overdue`} value={data?.summary.overdue} intent="critical" />
        <MetricCard label={t`Waiting`} value={data?.summary.waiting} />
        <MetricCard label={t`Review`} value={data?.summary.review} />
        <MetricCard label={t`Unassigned`} value={data?.summary.unassigned} intent="warning" />
      </div>

      {data?.managerInsights ? <ManagerInsights insights={data.managerInsights} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Owner workload</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              Aggregated from open deadlines and client owner labels. Open any row in Deadlines to
              triage the underlying deadlines.
            </Trans>
          </CardDescription>
          <CardAction>
            <Button
              nativeButton={false}
              variant="outline"
              size="sm"
              render={<Link to="/deadlines" />}
            >
              <Trans>Open deadlines</Trans>
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {/* Skeleton rows for parity with the rest of the app's list-loading
              rhythm. */}
          {workloadQuery.isLoading ? (
            <div
              className="grid gap-2"
              role="status"
              aria-live="polite"
              aria-label={t`Loading workload metrics`}
            >
              {['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map((key) => (
                <Skeleton key={key} className="h-12 w-full" />
              ))}
            </div>
          ) : data && data.rows.length > 0 ? (
            <WorkloadTable rows={data.rows} asOfDate={data.asOfDate} windowDays={data.windowDays} />
          ) : (
            // Empty state gets icon + description so it reads as a polished
            // surface, not a bare title.
            <EmptyState
              icon={ClipboardListIcon}
              title={<Trans>No deadlines due in the selected window.</Trans>}
              description={
                <Trans>
                  Workload updates as deadlines approach. Add clients, or widen the window above.
                </Trans>
              }
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function WorkloadUpgradePanel() {
  return (
    <section className="grid gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-lg border border-state-accent-active bg-state-accent-hover-alt text-text-accent"
            >
              <LockKeyholeIcon className="size-4" />
            </span>
            <Trans>Team workload is available on Pro and above</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              Solo is the personal deadline workbench. Pro, Team, and Enterprise add shared deadline
              operations: owner-level workload, unassigned risk, waiting and review pressure, and
              Deadlines jump links for weekly triage.
            </Trans>
          </CardDescription>
          <CardAction>
            <Badge variant="outline">
              <Trans>Paid feature</Trans>
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link to="/billing" />}>
            <Trans>Upgrade plan</Trans>
          </Button>
          <Button nativeButton={false} variant="outline" render={<Link to="/deadlines" />}>
            <Trans>Open deadlines</Trans>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

function ManagerInsights({ insights }: { insights: WorkloadManagerInsights }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Manager operations</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>
            Team and Enterprise plans add capacity pressure, unassigned risk, and review pressure
            signals for weekly workload triage.
          </Trans>
        </CardDescription>
        <CardAction>
          <Badge variant="info">
            <Trans>Team+</Trans>
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-4">
        <ManagerInsightMetric
          label={<Trans>Capacity pressure</Trans>}
          value={
            insights.capacityOwnerLabel ? (
              // Surface the 0–100 load score alongside the busiest owner.
              `${insights.capacityOwnerLabel} · ${insights.capacityOpen} · ${insights.capacityLoadScore}% load`
            ) : (
              <Trans>No assigned work</Trans>
            )
          }
        />
        <ManagerInsightMetric
          label={<Trans>Unassigned risk</Trans>}
          value={String(insights.unassignedOpen)}
        />
        <ManagerInsightMetric label={<Trans>Waiting</Trans>} value={String(insights.waitingOpen)} />
        <ManagerInsightMetric label={<Trans>Review</Trans>} value={String(insights.reviewOpen)} />
      </CardContent>
    </Card>
  )
}

function ManagerInsightMetric({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-divider-regular bg-background-subtle p-4">
      <p className="text-xs font-medium uppercase text-text-tertiary">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-text-primary">{value}</p>
    </div>
  )
}

function MetricCard({
  label,
  value,
  intent = 'neutral',
}: {
  label: string
  value: number | undefined
  intent?: 'neutral' | 'critical' | 'warning'
}) {
  return (
    <Card size="sm" className="min-h-[104px]">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-text-secondary">{label}</CardTitle>
        {/* Skeleton placeholder during loading; real number once resolved. A
            "—" during loading would read as data, not as loading. */}
        {value === undefined ? (
          <Skeleton className="mt-1 h-7 w-12" />
        ) : (
          <CardDescription
            className={cn(
              'text-2xl font-semibold tabular-nums text-text-primary',
              intent === 'critical' && 'text-text-destructive',
              intent === 'warning' && 'text-text-warning',
            )}
          >
            {value}
          </CardDescription>
        )}
      </CardHeader>
    </Card>
  )
}

function WorkloadTable({
  rows,
  asOfDate,
  windowDays,
}: {
  rows: WorkloadOwnerRow[]
  asOfDate: string
  windowDays: number
}) {
  const { t } = useLingui()
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Trans>Owner</Trans>
          </TableHead>
          <TableHead className="text-right">
            <Trans>Open</Trans>
          </TableHead>
          <TableHead className="text-right">
            <Trans>Due soon</Trans>
          </TableHead>
          <TableHead className="text-right">
            <Trans>Overdue</Trans>
          </TableHead>
          <TableHead className="text-right">
            <Trans>Waiting</Trans>
          </TableHead>
          <TableHead className="text-right">
            <Trans>Review</Trans>
          </TableHead>
          <TableHead className="w-[180px]">
            <Trans>Load</Trans>
          </TableHead>
          <TableHead className="w-[128px] text-right">
            <Trans>Action</Trans>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="[&_tr]:border-b-0 [&_td]:py-3">
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <div className="flex min-w-0 items-center gap-2">
                <ClipboardListIcon className="size-4 shrink-0 text-text-tertiary" aria-hidden />
                <span className="truncate font-medium text-text-primary">{row.ownerLabel}</span>
                {row.kind === 'unassigned' ? (
                  <Badge variant="outline">
                    <Trans>Unassigned</Trans>
                  </Badge>
                ) : null}
              </div>
            </TableCell>
            <NumericCell value={row.open} href={workloadRowHref(row)} />
            <NumericCell
              value={row.dueSoon}
              href={workloadRowDueSoonHref(row, asOfDate, windowDays)}
            />
            <NumericCell value={row.overdue} href={workloadRowOverdueHref(row, asOfDate)} danger />
            <NumericCell
              value={row.waiting}
              href={`${workloadRowHref(row)}&status=waiting_on_client`}
            />
            <NumericCell value={row.review} href={`${workloadRowHref(row)}&status=review`} />
            <TableCell>
              {/* Progress primitive (shared with members SeatStat / rules coverage). */}
              <div className="flex items-center gap-2">
                <Progress value={row.loadScore} className="flex-1" />
                <span className="w-10 text-right text-xs tabular-nums text-text-secondary">
                  {row.kind === 'unassigned' ? t`Risk` : `${row.loadScore}%`}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Button
                nativeButton={false}
                variant="outline"
                size="sm"
                className="text-xs"
                render={<Link to={workloadRowHref(row)} />}
              >
                <Trans>Open</Trans>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function NumericCell({
  value,
  href,
  danger = false,
}: {
  value: number
  href: string
  danger?: boolean
}) {
  return (
    <TableCell className="text-right">
      {/* Danger cells pass `text-text-destructive` className — single legit site, no destructive variant needed. */}
      <TextLink
        variant="muted"
        size="sm"
        render={<Link to={href} />}
        className={cn('tabular-nums', danger && value > 0 && 'text-text-destructive')}
      >
        {value}
      </TextLink>
    </TableCell>
  )
}
