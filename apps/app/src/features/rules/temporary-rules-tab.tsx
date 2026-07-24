import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { CalendarClockIcon, ExternalLinkIcon } from 'lucide-react'

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

import { EmptyState } from '@/components/patterns/empty-state'
import { useAlertDrawer } from '@/features/alerts/DrawerProvider'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { orpc } from '@/lib/rpc'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { formatDateWithTimezone } from '@/lib/utils'
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
      // 2026-06-16 (audit A1): was a hand-rolled SectionFrame empty state with
      // no icon — converged onto the shared EmptyState primitive so it matches
      // the empty states across the rest of the app (icon + title + description).
      <SectionFrame>
        <EmptyState
          density="compact"
          icon={CalendarClockIcon}
          title={<Trans>No temporary rules yet</Trans>}
          description={
            // ROH-D11 — was "owner or manager"; pulse.apply is
            // owner/partner/manager. Helper-driven plural noun keeps the
            // gate label honest as roles change.
            <Trans>
              Temporary rules appear here after {requiredRolesLabel('pulse.apply')} apply an alert
              to matched deadlines.
            </Trans>
          }
        />
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
        {/* Scroll the fixed-width columns instead of clipping the trailing
            Status column inside the overflow-hidden frame on phones (audit P3). */}
        <div className="overflow-x-auto">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans>Temporary rule</Trans>
                </TableHead>
                <TableHead className="w-[74px] text-center">
                  <Trans>Jur</Trans>
                </TableHead>
                <TableHead className="w-[118px] text-center">
                  <Trans>Override</Trans>
                </TableHead>
                <TableHead className="w-[106px] text-center">
                  <Trans>Deadlines</Trans>
                </TableHead>
                <TableHead className="w-[96px] text-center">
                  <Trans>Status</Trans>
                </TableHead>
                <TableHead className="w-[112px] text-center">
                  <Trans>Updated</Trans>
                </TableHead>
                <TableHead className="w-[96px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.length === 0 ? (
                // 2026-06-16 (audit): the all-rules-empty case is handled by the
                // EmptyState above; this covers filter-excludes-everything, which
                // previously rendered a blank table body with no explanation.
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-text-tertiary">
                    <Trans>No temporary rules match this filter.</Trans>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRules.map((rule) => (
                  <TemporaryRuleRow
                    key={rule.id}
                    rule={rule}
                    practiceTimezone={practiceTimezone}
                    onOpenAlert={openDrawer}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
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
      <TableCell className="px-0 py-2 text-center">
        <div className="flex justify-center">
          <JurisdictionCode code={rule.jurisdiction} />
        </div>
      </TableCell>
      <TableCell className="px-0 py-2 text-center text-xs text-text-secondary">
        {rule.overrideDueDate ? (
          <span>
            <Trans>Due {rule.overrideDueDate}</Trans>
          </span>
        ) : rule.overrideType === 'extend_due_date' ? (
          <Trans>Extension</Trans>
        ) : (
          <Trans>Penalty waiver</Trans>
        )}
      </TableCell>
      <TableCell className="px-0 py-2 text-center">
        <span className="text-xs tabular-nums text-text-secondary">
          {rule.activeObligationCount}/{rule.appliedObligationCount}
        </span>
      </TableCell>
      <TableCell className="px-0 py-2 text-center">
        <div className="flex justify-center">
          <TemporaryRuleStatusBadge status={rule.status} />
        </div>
      </TableCell>
      <TableCell className="px-0 py-2 text-center text-xs tabular-nums text-text-tertiary">
        {formatDateWithTimezone(rule.lastActivityAt, practiceTimezone)}
      </TableCell>
      <TableCell className="px-0 py-2">
        <div className="flex items-center justify-end gap-1 pr-2">
          {rule.sourceUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t`Open official source`}
              nativeButton={false}
              onClick={() => track(ANALYTICS_EVENTS.sourceLinkOpened, {})}
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
              {/* 2026-06-16 (audit): was RotateCcwIcon (the universal revert/undo
                  glyph) — misleading on a page of reverted/retracted overrides
                  where it read as "undo this override." This opens the source
                  alert, so use the external/open-detail glyph. */}
              <ExternalLinkIcon className="size-4" aria-hidden />
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
    // Stock Badge chrome — same outline-chip-plus-dot family (and the same
    // default h-5 pill) as the members + sources status pills.
    <Badge variant="outline">
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
