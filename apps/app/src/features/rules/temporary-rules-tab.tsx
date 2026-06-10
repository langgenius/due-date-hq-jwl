import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ExternalLinkIcon, RotateCcwIcon } from 'lucide-react'

import type { TemporaryRule } from '@duedatehq/contracts'
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'

import { useAlertDrawer } from '@/features/alerts/DrawerProvider'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { orpc } from '@/lib/rpc'
import { formatDateTimeWithTimezone } from '@/lib/utils'
import { requiredRolesLabel } from '@/lib/required-roles-label'

import {
  FilterChips,
  JurisdictionCode,
  QueryPanelState,
  SectionFrame,
} from './rules-console-primitives'

type TemporaryRuleFilter = 'all' | TemporaryRule['status']

const EMPTY_RULES: readonly TemporaryRule[] = []

export function TemporaryRulesTab() {
  const { t } = useLingui()
  const { openDrawer } = useAlertDrawer()
  const practiceTimezone = usePracticeTimezone()
  const [filter, setFilter] = useState<TemporaryRuleFilter>('all')
  const rulesQuery = useQuery(orpc.rules.listTemporaryRules.queryOptions({ input: undefined }))
  const rules = rulesQuery.data ?? EMPTY_RULES
  const counts = useMemo(() => countByStatus(rules), [rules])
  const filteredRules = useMemo(
    () => (filter === 'all' ? rules : rules.filter((rule) => rule.status === filter)),
    [filter, rules],
  )
  const filterOptions = useMemo(
    () => [
      { value: 'all' as const, label: t`All`, count: counts.all },
      { value: 'active' as const, label: t`Active`, count: counts.active },
      { value: 'reverted' as const, label: t`Reverted`, count: counts.reverted },
      { value: 'retracted' as const, label: t`Retracted`, count: counts.retracted },
      { value: 'expired' as const, label: t`Expired`, count: counts.expired },
    ],
    [counts, t],
  )

  if (rulesQuery.isLoading) {
    return <QueryPanelState state="loading" message={t`Loading temporary rules…`} />
  }

  if (rulesQuery.isError) {
    return <QueryPanelState state="error" message={t`Couldn't load temporary rules`} />
  }

  if (rules.length === 0) {
    return (
      <SectionFrame className="flex min-h-[180px] flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm font-medium text-text-primary">
          <Trans>No temporary rules yet</Trans>
        </p>
        <p className="max-w-[520px] text-sm text-text-secondary">
          {/* ROH-D11 — was "owner or manager"; pulse.apply is
              owner/partner/manager. Helper-driven plural noun keeps the
              gate label honest as roles change. */}
          <Trans>
            Temporary rules appear here after {requiredRolesLabel('pulse.apply')} apply an alert to
            matched deadlines.
          </Trans>
        </p>
      </SectionFrame>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <FilterChips options={filterOptions} value={filter} onValueChange={setFilter} />
        <span className="text-xs tabular-nums text-text-tertiary">
          <Trans>
            {filteredRules.length} shown · {rules.length} total
          </Trans>
        </span>
      </div>
      <SectionFrame>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>TEMPORARY RULE</TableHead>
              <TableHead className="w-[74px]">JUR</TableHead>
              <TableHead className="w-[118px]">OVERRIDE</TableHead>
              <TableHead className="w-[106px]">OBLIGATIONS</TableHead>
              <TableHead className="w-[96px]">STATUS</TableHead>
              <TableHead className="w-[112px]">UPDATED</TableHead>
              <TableHead className="w-[96px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRules.map((rule) => (
              <TemporaryRuleRow
                key={rule.id}
                rule={rule}
                practiceTimezone={practiceTimezone}
                onOpenAlert={openDrawer}
              />
            ))}
          </TableBody>
        </Table>
      </SectionFrame>
    </div>
  )
}

function TemporaryRuleRow({
  rule,
  practiceTimezone,
  onOpenAlert,
}: {
  rule: TemporaryRule
  practiceTimezone: string
  onOpenAlert: (alertId: string) => void
}) {
  const { t } = useLingui()
  return (
    <TableRow className="h-12 hover:bg-state-base-hover">
      <TableCell className="px-4 py-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-xs font-medium text-text-primary">{rule.title}</span>
          <span className="truncate font-mono text-xs text-text-tertiary">{formatScope(rule)}</span>
        </div>
      </TableCell>
      <TableCell className="px-0 py-2">
        <JurisdictionCode code={rule.jurisdiction} />
      </TableCell>
      <TableCell className="px-0 py-2 text-xs text-text-secondary">
        {rule.overrideDueDate ? (
          <span>
            <Trans>Due {rule.overrideDueDate}</Trans>
          </span>
        ) : rule.overrideType === 'extend_due_date' ? (
          <Trans>Due-date extension</Trans>
        ) : (
          <Trans>Penalty waiver</Trans>
        )}
      </TableCell>
      <TableCell className="px-0 py-2">
        <span className="text-xs tabular-nums text-text-secondary">
          {rule.activeObligationCount}/{rule.appliedObligationCount}
        </span>
      </TableCell>
      <TableCell className="px-0 py-2">
        <TemporaryRuleStatusBadge status={rule.status} />
      </TableCell>
      <TableCell className="px-0 py-2 text-xs tabular-nums text-text-tertiary">
        {formatDateTimeWithTimezone(rule.lastActivityAt, practiceTimezone)}
      </TableCell>
      <TableCell className="px-0 py-2">
        <div className="flex items-center justify-end gap-1 pr-2">
          {rule.sourceUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t`Open official source`}
              render={<a href={rule.sourceUrl} target="_blank" rel="noopener noreferrer" />}
            >
              <ExternalLinkIcon className="size-4" aria-hidden />
            </Button>
          ) : null}
          {rule.alertId ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t`Open alert detail`}
              onClick={() => onOpenAlert(rule.alertId!)}
            >
              <RotateCcwIcon className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  )
}

function TemporaryRuleStatusBadge({ status }: { status: TemporaryRule['status'] }) {
  const { t } = useLingui()
  const label = {
    active: t`Active`,
    reverted: t`Reverted`,
    retracted: t`Retracted`,
    expired: t`Expired`,
  }[status]
  const tone =
    status === 'active'
      ? 'success'
      : status === 'expired'
        ? 'warning'
        : status === 'reverted'
          ? 'disabled'
          : 'error'
  return (
    <Badge variant="outline" className="h-[22px] rounded-full px-2 text-xs">
      <BadgeStatusDot tone={tone} className="size-1.5" />
      {label}
    </Badge>
  )
}

function countByStatus(rules: readonly TemporaryRule[]): Record<TemporaryRuleFilter, number> {
  return {
    all: rules.length,
    active: rules.filter((rule) => rule.status === 'active').length,
    reverted: rules.filter((rule) => rule.status === 'reverted').length,
    retracted: rules.filter((rule) => rule.status === 'retracted').length,
    expired: rules.filter((rule) => rule.status === 'expired').length,
  }
}

function formatScope(rule: TemporaryRule): string {
  const counties = rule.counties.length > 0 ? rule.counties.join(', ') : 'all counties'
  const forms = rule.affectedForms.length > 0 ? rule.affectedForms.join(', ') : 'all forms'
  return `${counties} · ${forms}`
}
