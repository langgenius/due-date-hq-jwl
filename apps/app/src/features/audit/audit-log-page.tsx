import { useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, FilterIcon } from 'lucide-react'

import type { AuditEventPublic, AuditListInput, FirmPublic } from '@duedatehq/contracts'
import { AUDIT_FILTER_MAX_LENGTH } from '@duedatehq/contracts'
import { hasFirmPermission } from '@duedatehq/core/permissions'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { ConceptLabel } from '@/features/concepts/concept-help'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { PermissionGate, PermissionInlineNotice } from '@/features/permissions/permission-gate'

import { AuditEventDrawer } from './audit-event-drawer'
import { useAuditActionLabels, useAuditEntityTypeLabels } from './audit-log-labels'
import { AuditLogTable } from './audit-log-table'
import {
  AUDIT_CATEGORY_OPTIONS,
  AUDIT_RANGE_OPTIONS,
  categoryToInput,
  formatAuditActionLabel,
  formatAuditEntityTypeLabel,
  getAuditExportUnavailableReason,
  isAuditCategoryOption,
  isAuditRange,
  shortenAuditId,
  type AuditCategoryOption,
} from './audit-log-model'

const EMPTY_EVENTS: AuditEventPublic[] = []
const INITIAL_CURSOR: string | null = null
const AUDIT_QUERY_PAGE_SIZE = 50
const TABLE_PAGE_SIZE = 10
const ALL_FILTER_VALUE = '__all__'
const REPLACE_HISTORY_OPTIONS = { history: 'replace' } as const

interface AuditFilterOption {
  value: string
  label: string
  count: number
}

export const auditLogSearchParamsParsers = {
  q: parseAsString.withDefault('').withOptions(REPLACE_HISTORY_OPTIONS),
  category: parseAsStringLiteral(AUDIT_CATEGORY_OPTIONS)
    .withDefault('all')
    .withOptions(REPLACE_HISTORY_OPTIONS),
  range: parseAsStringLiteral(AUDIT_RANGE_OPTIONS)
    .withDefault('24h')
    .withOptions(REPLACE_HISTORY_OPTIONS),
  action: parseAsString.withDefault('').withOptions(REPLACE_HISTORY_OPTIONS),
  actor: parseAsString.withDefault('').withOptions(REPLACE_HISTORY_OPTIONS),
  entityType: parseAsString.withDefault('').withOptions(REPLACE_HISTORY_OPTIONS),
  entity: parseAsString.withDefault('').withOptions(REPLACE_HISTORY_OPTIONS),
  event: parseAsString.withOptions(REPLACE_HISTORY_OPTIONS),
} as const

function useAuditCategoryLabels(): Record<AuditCategoryOption, string> {
  const { t } = useLingui()
  return {
    all: t`All categories`,
    client: t`Client`,
    obligation: t`Obligation`,
    migration: t`Migration`,
    rules: t`Rules`,
    auth: t`Auth`,
    team: t`Team`,
    pulse: t`Pulse`,
    export: t`Export`,
    ai: t`AI`,
    system: t`System`,
  }
}

function useAuditRangeLabels(): Record<(typeof AUDIT_RANGE_OPTIONS)[number], string> {
  const { t } = useLingui()
  return {
    '24h': t`Last 24h`,
    '7d': t`Last 7d`,
    '30d': t`Last 30d`,
    all: t`All time`,
  }
}

function sanitizeAuditFilter(value: string): string {
  return value.trim().slice(0, AUDIT_FILTER_MAX_LENGTH)
}

function makeAuditFilterOptions(
  events: readonly AuditEventPublic[],
  readOption: (event: AuditEventPublic) => { value: string | null | undefined; label: string },
) {
  const options = new Map<string, AuditFilterOption>()

  for (const event of events) {
    const option = readOption(event)
    const value = option.value?.trim()
    if (!value) continue

    const existing = options.get(value)
    if (existing) {
      existing.count += 1
      continue
    }

    options.set(value, {
      value,
      label: option.label.trim() || value,
      count: 1,
    })
  }

  return [...options.values()].toSorted((left, right) =>
    left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }),
  )
}

function useAuditEvents(queryInputWithoutCursor: Omit<AuditListInput, 'cursor'>, enabled = true) {
  return useInfiniteQuery(
    orpc.audit.list.infiniteOptions({
      initialPageParam: INITIAL_CURSOR,
      input: (cursor) => ({
        ...queryInputWithoutCursor,
        cursor,
      }),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled,
    }),
  )
}

function AuditFilterSelect({
  label,
  value,
  allLabel,
  fallbackLabel,
  options,
  onValueChange,
}: {
  label: string
  value: string
  allLabel: string
  fallbackLabel: string
  options: readonly AuditFilterOption[]
  onValueChange: (value: string) => void
}) {
  const selectedOption = value ? options.find((option) => option.value === value) : undefined
  const visibleOptions =
    value && !selectedOption ? [{ value, label: fallbackLabel, count: 0 }, ...options] : options
  const selectedLabel = value ? (selectedOption?.label ?? fallbackLabel) : allLabel

  return (
    <Select
      value={value || ALL_FILTER_VALUE}
      onValueChange={(nextValue) => {
        if (typeof nextValue !== 'string') return
        onValueChange(nextValue === ALL_FILTER_VALUE ? '' : nextValue)
      }}
    >
      <SelectTrigger className="w-full" aria-label={label}>
        <SelectValue>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80 overflow-y-auto" align="start">
        <SelectItem value={ALL_FILTER_VALUE} indicatorPosition="start">
          {allLabel}
        </SelectItem>
        {visibleOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            indicatorPosition="start"
            data-audit-filter-value={option.value}
          >
            <span className="truncate">{option.label}</span>
            {option.count > 0 ? (
              <span className="ml-auto pr-2 font-mono text-xs tabular-nums text-text-tertiary">
                {option.count}
              </span>
            ) : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function AuditSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}

function AuditLogPagination({
  pageIndex,
  firstItemNumber,
  lastItemNumber,
  loadedCount,
  hasPreviousPage,
  hasNextPage,
  isFetchingNextPage,
  onPreviousPage,
  onNextPage,
}: {
  pageIndex: number
  firstItemNumber: number
  lastItemNumber: number
  loadedCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
}) {
  const { t } = useLingui()
  const pageNumber = pageIndex + 1

  return (
    <div className="flex flex-col gap-3 border-t border-divider-subtle pt-3 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium text-text-primary">
          <Trans>Page {pageNumber}</Trans>
        </span>
        <span>
          <Trans>
            Showing {firstItemNumber}-{lastItemNumber} of {loadedCount} loaded events
          </Trans>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={!hasPreviousPage}
          aria-label={t`Previous page`}
        >
          <ChevronLeftIcon data-icon="inline-start" />
          <Trans>Previous</Trans>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!hasNextPage || isFetchingNextPage}
          aria-label={t`Next page`}
        >
          {isFetchingNextPage ? (
            <Trans>Loading…</Trans>
          ) : (
            <>
              <Trans>Next</Trans>
              <ChevronRightIcon data-icon="inline-end" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function AuditExportButton({ firm }: { firm: FirmPublic | null | undefined }) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const exportUnavailableReason = getAuditExportUnavailableReason(firm)
  const canExport = exportUnavailableReason === null
  const disabledReason =
    exportUnavailableReason === 'plan'
      ? t`Audit exports require the Team or Enterprise plan.`
      : exportUnavailableReason === 'permission'
        ? t`Only the practice owner can export audit evidence packages.`
        : null
  const packagesQuery = useQuery({
    ...orpc.audit.listEvidencePackages.queryOptions({ input: { limit: 5 } }),
    enabled: open && canExport,
  })
  const requestPackage = useMutation(
    orpc.audit.requestEvidencePackage.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
      },
      onError: (error) => {
        window.alert(rpcErrorMessage(error) ?? t`Couldn't request export`)
      },
    }),
  )
  const createDownloadUrl = useMutation(
    orpc.audit.createDownloadUrl.mutationOptions({
      onSuccess: (result) => {
        window.location.assign(result.url)
      },
    }),
  )
  const latest = packagesQuery.data?.packages[0] ?? null
  const trigger = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setOpen(true)}
      disabled={!canExport}
      aria-describedby={disabledReason ? 'audit-export-disabled-note' : undefined}
    >
      <DownloadIcon data-icon="inline-start" />
      <Trans>Export</Trans>
    </Button>
  )

  return (
    <>
      {disabledReason ? (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex">{trigger}</span>} />
          <TooltipContent
            side="bottom"
            align="end"
            className="block max-w-[260px] whitespace-normal text-left leading-5"
          >
            {disabledReason}
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      {disabledReason ? (
        <span id="audit-export-disabled-note" className="sr-only">
          {disabledReason}
        </span>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <ConceptLabel concept="auditTrail">
                <Trans>Audit evidence package</Trans>
              </ConceptLabel>
            </DialogTitle>
            <DialogDescription>
              <Trans>
                Create a ZIP with a PDF report, audit events, evidence links, and manifest.
              </Trans>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 rounded-lg border border-divider-subtle p-3 text-sm">
            {latest ? (
              <>
                <div className="flex justify-between gap-3">
                  <span className="text-text-secondary">
                    <Trans>Latest status</Trans>
                  </span>
                  <Badge variant="outline">{latest.status}</Badge>
                </div>
                {latest.failureReason ? (
                  <p className="text-text-destructive">{latest.failureReason}</p>
                ) : null}
              </>
            ) : (
              <p className="text-text-secondary">
                <Trans>No export packages yet.</Trans>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              <Trans>Close</Trans>
            </Button>
            {latest?.status === 'ready' ? (
              <Button
                onClick={() => createDownloadUrl.mutate({ id: latest.id })}
                disabled={createDownloadUrl.isPending}
              >
                <DownloadIcon data-icon="inline-start" />
                <Trans>Download latest</Trans>
              </Button>
            ) : (
              <Button
                onClick={() => requestPackage.mutate({ scope: 'firm' })}
                disabled={requestPackage.isPending}
              >
                <Trans>Request export</Trans>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function AuditLogPage() {
  const { t } = useLingui()
  const categoryLabels = useAuditCategoryLabels()
  const rangeLabels = useAuditRangeLabels()
  const actionLabels = useAuditActionLabels()
  const entityTypeLabels = useAuditEntityTypeLabels()
  const [query, setQuery] = useQueryStates(auditLogSearchParamsParsers)
  const [pageIndex, setPageIndex] = useState(0)
  const actionFilter = sanitizeAuditFilter(query.action)
  const actorFilter = sanitizeAuditFilter(query.actor)
  const entityTypeFilter = sanitizeAuditFilter(query.entityType)
  const firmsQuery = useQuery(orpc.firms.listMine.queryOptions({ input: undefined }))
  const currentFirm = firmsQuery.data?.find((firm) => firm.isCurrent) ?? firmsQuery.data?.[0]
  const firmTimezone = resolveUSFirmTimezone(currentFirm?.timezone)
  const canReadAudit = hasFirmPermission({
    role: currentFirm?.role,
    permission: 'audit.read',
    coordinatorCanSeeDollars: currentFirm?.coordinatorCanSeeDollars,
  })

  const queryInputWithoutCursor = useMemo<Omit<AuditListInput, 'cursor'>>(
    () => ({
      limit: AUDIT_QUERY_PAGE_SIZE,
      range: query.range,
      ...(query.category !== 'all' ? { category: categoryToInput(query.category) } : {}),
      ...(actionFilter ? { action: actionFilter } : {}),
      ...(actorFilter ? { actorId: actorFilter } : {}),
      ...(entityTypeFilter ? { entityType: entityTypeFilter } : {}),
    }),
    [actionFilter, actorFilter, entityTypeFilter, query.category, query.range],
  )

  const auditQuery = useAuditEvents(queryInputWithoutCursor, canReadAudit)
  const events = useMemo(
    () => auditQuery.data?.pages.flatMap((page) => page.events) ?? EMPTY_EVENTS,
    [auditQuery.data?.pages],
  )
  const actionOptions = useMemo(
    () =>
      makeAuditFilterOptions(events, (event) => ({
        value: event.action,
        label: formatAuditActionLabel(event.action, actionLabels),
      })),
    [actionLabels, events],
  )
  const actorOptions = useMemo(
    () =>
      makeAuditFilterOptions(events, (event) => ({
        value: event.actorId,
        label: event.actorId
          ? event.actorLabel
            ? `${event.actorLabel} (${shortenAuditId(event.actorId)})`
            : shortenAuditId(event.actorId)
          : '',
      })),
    [events],
  )
  const entityTypeOptions = useMemo(
    () =>
      makeAuditFilterOptions(events, (event) => ({
        value: event.entityType,
        label: formatAuditEntityTypeLabel(event.entityType, entityTypeLabels),
      })),
    [entityTypeLabels, events],
  )
  const loadedPageCount = Math.max(1, Math.ceil(events.length / TABLE_PAGE_SIZE))
  const currentPageIndex = Math.min(pageIndex, loadedPageCount - 1)
  const currentPageStart = currentPageIndex * TABLE_PAGE_SIZE
  const currentPageEvents = events.slice(currentPageStart, currentPageStart + TABLE_PAGE_SIZE)
  const firstItemNumber = currentPageEvents.length > 0 ? currentPageStart + 1 : 0
  const lastItemNumber = currentPageStart + currentPageEvents.length
  const hasLoadedNextPage = (currentPageIndex + 1) * TABLE_PAGE_SIZE < events.length
  const hasPreviousPage = currentPageIndex > 0
  const hasNextPage = hasLoadedNextPage || auditQuery.hasNextPage
  const selectedEvent = events.find((event) => event.id === query.event) ?? null
  const filtersActive =
    query.q !== '' ||
    query.category !== 'all' ||
    query.range !== '24h' ||
    actionFilter !== '' ||
    actorFilter !== '' ||
    entityTypeFilter !== ''

  function resetFilters() {
    setPageIndex(0)
    void setQuery({
      q: null,
      category: null,
      range: null,
      action: null,
      actor: null,
      entityType: null,
      entity: null,
      event: null,
    })
  }

  function openEvent(id: string) {
    void setQuery({ event: id })
  }

  function closeEvent(open: boolean) {
    if (!open) void setQuery({ event: null })
  }

  function goToPreviousPage() {
    setPageIndex(Math.max(0, currentPageIndex - 1))
  }

  function goToNextPage() {
    const nextPageIndex = currentPageIndex + 1
    if (nextPageIndex * TABLE_PAGE_SIZE < events.length) {
      setPageIndex(nextPageIndex)
      return
    }
    if (!auditQuery.hasNextPage || auditQuery.isFetchingNextPage) return

    void auditQuery.fetchNextPage().then((result) => {
      if (!result.isError) setPageIndex(nextPageIndex)
    })
  }

  if (firmsQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-60 w-full rounded-lg" />
      </div>
    )
  }

  if (!canReadAudit) {
    return (
      <PermissionGate
        permission="audit.read"
        firm={currentFirm}
        description={
          <Trans>
            Practice-wide audit events are available to owners, managers, and preparers. Contact the
            practice owner if you need audit access.
          </Trans>
        }
        secondaryAction={{ label: <Trans>Open Obligations</Trans>, to: '/obligations' }}
      >
        <div />
      </PermissionGate>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl leading-tight font-semibold text-text-primary">
              <ConceptLabel concept="auditTrail">
                <Trans>Audit log</Trans>
              </ConceptLabel>
            </h1>
            <p className="max-w-180 text-md text-text-secondary">
              <Trans>Review practice-wide write events, what changed, and actor metadata.</Trans>
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <AuditExportButton firm={currentFirm} />
            {currentFirm?.role !== 'owner' ? (
              <PermissionInlineNotice permission="audit.export" currentRole={currentFirm?.role}>
                <Trans>Only the practice owner can export audit evidence packages.</Trans>
              </PermissionInlineNotice>
            ) : null}
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Audit filters</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>Filter by time range, action category, action, actor, or entity type.</Trans>
          </CardDescription>
          <CardAction>
            <Badge variant="outline" className="font-mono tabular-nums">
              {events.length}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] xl:items-center">
          <Select
            value={query.category}
            onValueChange={(value) => {
              if (typeof value !== 'string' || !isAuditCategoryOption(value)) return
              setPageIndex(0)
              void setQuery({ category: value === 'all' ? null : value, event: null })
            }}
          >
            <SelectTrigger className="w-full" aria-label={t`Action category`}>
              <SelectValue>{categoryLabels[query.category]}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              {AUDIT_CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option} indicatorPosition="start">
                  {categoryLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={query.range}
            onValueChange={(value) => {
              if (typeof value !== 'string' || !isAuditRange(value)) return
              setPageIndex(0)
              void setQuery({ range: value === '24h' ? null : value, event: null })
            }}
          >
            <SelectTrigger className="w-full" aria-label={t`Time range`}>
              <SelectValue>{rangeLabels[query.range]}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              {AUDIT_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option} indicatorPosition="start">
                  {rangeLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AuditFilterSelect
            label={t`Action`}
            value={actionFilter}
            allLabel={t`All actions`}
            fallbackLabel={actionFilter ? formatAuditActionLabel(actionFilter, actionLabels) : ''}
            options={actionOptions}
            onValueChange={(value) => {
              setPageIndex(0)
              void setQuery({ action: value || null, event: null })
            }}
          />

          <AuditFilterSelect
            label={t`Actor`}
            value={actorFilter}
            allLabel={t`All actors`}
            fallbackLabel={actorFilter ? shortenAuditId(actorFilter) : ''}
            options={actorOptions}
            onValueChange={(value) => {
              setPageIndex(0)
              void setQuery({ actor: value || null, event: null })
            }}
          />

          <AuditFilterSelect
            label={t`Entity type`}
            value={entityTypeFilter}
            allLabel={t`All entity types`}
            fallbackLabel={entityTypeFilter}
            options={entityTypeOptions}
            onValueChange={(value) => {
              setPageIndex(0)
              void setQuery({ entityType: value || null, event: null })
            }}
          />

          <Button variant="outline" size="sm" onClick={resetFilters} disabled={!filtersActive}>
            <FilterIcon data-icon="inline-start" />
            <Trans>Reset</Trans>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <ConceptLabel concept="auditTrail">
              <Trans>Event stream</Trans>
            </ConceptLabel>
          </CardTitle>
          <CardDescription>
            <Trans>Newest practice-scoped audit events appear first.</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {auditQuery.isLoading ? <AuditSkeleton /> : null}

          {auditQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>
                <Trans>Couldn't load audit events</Trans>
              </AlertTitle>
              <AlertDescription>
                {rpcErrorMessage(auditQuery.error) ?? t`Please try again.`}
              </AlertDescription>
            </Alert>
          ) : null}

          {!auditQuery.isLoading && !auditQuery.isError && events.length === 0 ? (
            <div className="grid gap-2 rounded-lg border border-divider-subtle p-6 text-center">
              <h2 className="text-lg font-semibold text-text-primary">
                {filtersActive ? (
                  <Trans>No audit events match these filters.</Trans>
                ) : (
                  <Trans>No audit events yet.</Trans>
                )}
              </h2>
              <p className="text-sm text-text-secondary">
                {filtersActive ? (
                  <Trans>Reset filters to return to the latest practice-wide events.</Trans>
                ) : (
                  <Trans>
                    Obligation status updates and client imports will appear here when they write
                    audit rows.
                  </Trans>
                )}
              </p>
            </div>
          ) : null}

          {events.length > 0 ? (
            <>
              <AuditLogTable
                events={currentPageEvents}
                firmTimezone={firmTimezone}
                onOpenEvent={openEvent}
              />
              <AuditLogPagination
                pageIndex={currentPageIndex}
                firstItemNumber={firstItemNumber}
                lastItemNumber={lastItemNumber}
                loadedCount={events.length}
                hasPreviousPage={hasPreviousPage}
                hasNextPage={hasNextPage}
                isFetchingNextPage={auditQuery.isFetchingNextPage}
                onPreviousPage={goToPreviousPage}
                onNextPage={goToNextPage}
              />
            </>
          ) : null}
        </CardContent>
      </Card>

      <AuditEventDrawer
        event={selectedEvent}
        firmTimezone={firmTimezone}
        open={Boolean(selectedEvent)}
        onOpenChange={closeEvent}
      />
    </div>
  )
}
