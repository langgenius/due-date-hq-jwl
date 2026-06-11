import { type ReactNode, useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FilterIcon,
  Loader2,
  ScrollTextIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type { AuditEventPublic, AuditListInput, FirmPublic } from '@duedatehq/contracts'
import { AUDIT_FILTER_MAX_LENGTH, DEFAULT_AUDIT_RANGE } from '@duedatehq/contracts'
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
import { requiredRolesLabel } from '@/lib/required-roles-label'
import { ConceptLabel } from '@/features/concepts/concept-help'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { PermissionGate, PermissionInlineNotice } from '@/features/permissions/permission-gate'

import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
import { SearchInput } from '@/components/primitives/search-input'

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
import { getAuditTimelineType, type AuditTimelineType } from './audit-timeline-model'

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

const auditLogSearchParamsParsers = {
  q: parseAsString.withDefault('').withOptions(REPLACE_HISTORY_OPTIONS),
  category: parseAsStringLiteral(AUDIT_CATEGORY_OPTIONS)
    .withDefault('all')
    .withOptions(REPLACE_HISTORY_OPTIONS),
  range: parseAsStringLiteral(AUDIT_RANGE_OPTIONS)
    .withDefault(DEFAULT_AUDIT_RANGE)
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
    obligation: t`Deadline`,
    migration: t`Migration`,
    rules: t`Rules`,
    auth: t`Auth`,
    team: t`Team`,
    pulse: t`Alerts`,
    export: t`Export`,
    calendar: t`Calendar`,
    reminder: t`Reminders`,
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
              <span className="ml-auto pr-2 text-xs tabular-nums text-text-tertiary">
                {option.count}
              </span>
            ) : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// KPI strip (Pencil RqOJw): a single bordered card split into columns by
// vertical rules. Each column is a mono uppercase label, a large value,
// and a small caption. TODO(data): the contract has no firm-wide
// category aggregate — `audit.list` only returns the paginated event
// window — so these counts describe the *loaded* events, not the whole
// ledger. A dedicated `audit.stats` procedure would let this strip show
// true totals across the selected range.
function AuditKpiStrip({
  totalLoaded,
  countsByType,
}: {
  totalLoaded: number
  countsByType: Record<AuditTimelineType, number>
}) {
  const columns: Array<{ key: string; label: ReactNode; value: number; caption: ReactNode }> = [
    {
      key: 'total',
      label: <Trans>Total loaded</Trans>,
      value: totalLoaded,
      caption: <Trans>in this view</Trans>,
    },
    {
      key: 'filing',
      label: <Trans>Filings</Trans>,
      value: countsByType.filing,
      caption: <Trans>filed or e-filed</Trans>,
    },
    {
      key: 'amendment',
      label: <Trans>Amendments</Trans>,
      value: countsByType.amendment,
      caption: <Trans>amended with reason</Trans>,
    },
    {
      key: 'access',
      label: <Trans>Access</Trans>,
      value: countsByType.access,
      caption: <Trans>logins and exports</Trans>,
    },
    {
      key: 'system',
      label: <Trans>System</Trans>,
      value: countsByType.system + countsByType.decision,
      caption: <Trans>auto-recorded and manual decisions</Trans>,
    },
  ]
  return (
    <div className="flex flex-col divide-y divide-divider-subtle rounded-xl border border-divider-subtle bg-background-default px-2 py-4 sm:flex-row sm:divide-x sm:divide-y-0">
      {columns.map((column) => (
        <div key={column.key} className="grid flex-1 gap-1 px-5 py-1">
          <span className="font-mono text-caption-xs font-bold tracking-wide text-text-tertiary uppercase">
            {column.label}
          </span>
          <span className="text-2xl font-semibold tracking-tight text-text-primary tabular-nums">
            {column.value.toLocaleString()}
          </span>
          <span className="font-mono text-caption-xs text-text-tertiary">{column.caption}</span>
        </div>
      ))}
    </div>
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
        // Use the app's `toast.error` so the failure message lands in the same
        // surface the rest of the app uses, not a system-styled blocking
        // dialog.
        toast.error(t`Couldn't request export`, {
          description:
            rpcErrorMessage(error) ??
            t`Try again in a moment. If it keeps failing, contact support.`,
        })
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
            {/* No info-icon — the DialogDescription below already explains the
                evidence bundle, so a popover trigger would be a third copy on
                the same surface. */}
            <DialogTitle>
              <Trans>Audit evidence package</Trans>
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
            {/* Download / request buttons announce aria-busy + show a Loader2
                spinner while pending. */}
            <Button variant="ghost" onClick={() => setOpen(false)}>
              <Trans>Close</Trans>
            </Button>
            {latest?.status === 'ready' ? (
              <Button
                onClick={() => createDownloadUrl.mutate({ id: latest.id })}
                disabled={createDownloadUrl.isPending}
                aria-busy={createDownloadUrl.isPending}
              >
                {createDownloadUrl.isPending ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <DownloadIcon data-icon="inline-start" />
                )}
                <Trans>Download latest</Trans>
              </Button>
            ) : (
              <Button
                onClick={() => requestPackage.mutate({ scope: 'firm' })}
                disabled={requestPackage.isPending}
                aria-busy={requestPackage.isPending}
              >
                {requestPackage.isPending ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : null}
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

  // B17: forward the search term to the server so it matches across ALL
  // rows, not just the page already loaded (it was client-side only).
  const searchTerm = query.q.trim()
  const queryInputWithoutCursor = useMemo<Omit<AuditListInput, 'cursor'>>(
    () => ({
      limit: AUDIT_QUERY_PAGE_SIZE,
      range: query.range,
      ...(query.category !== 'all' ? { category: categoryToInput(query.category) } : {}),
      ...(actionFilter ? { action: actionFilter } : {}),
      ...(actorFilter ? { actorId: actorFilter } : {}),
      ...(entityTypeFilter ? { entityType: entityTypeFilter } : {}),
      ...(searchTerm ? { search: searchTerm } : {}),
    }),
    [actionFilter, actorFilter, entityTypeFilter, query.category, query.range, searchTerm],
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
  // Audit log is text-heavy (event description, entity name, actor email, IP)
  // and the most common investigator question is "did anyone touch client X?"
  // — exactly what free-text search answers. Until the backend supports a `q`
  // field on `audit.list`, we filter client-side over the already-loaded
  // events (description + actor label + entity id), so the input works on the
  // visible window without a backend contract change. The URL param is still
  // single-source-of-truth for share-link fidelity.
  const trimmedSearch = query.q.trim().toLowerCase()
  const filteredEvents = useMemo(() => {
    if (trimmedSearch.length === 0) return events
    return events.filter((event) => {
      const haystack = [
        event.actorLabel ?? '',
        event.actorId ?? '',
        event.entityId,
        event.action,
        event.entityType,
        event.reason ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(trimmedSearch)
    })
  }, [events, trimmedSearch])
  // Category counts for the KPI strip, derived from the filtered set so
  // the strip moves in lockstep with the active filters. (See
  // AuditKpiStrip's TODO(data) note — these are loaded-window counts,
  // not firm-wide totals.)
  const countsByType = useMemo(() => {
    const counts: Record<AuditTimelineType, number> = {
      filing: 0,
      amendment: 0,
      decision: 0,
      access: 0,
      system: 0,
    }
    for (const event of filteredEvents) counts[getAuditTimelineType(event)] += 1
    return counts
  }, [filteredEvents])
  const loadedPageCount = Math.max(1, Math.ceil(filteredEvents.length / TABLE_PAGE_SIZE))
  const currentPageIndex = Math.min(pageIndex, loadedPageCount - 1)
  const currentPageStart = currentPageIndex * TABLE_PAGE_SIZE
  const currentPageEvents = filteredEvents.slice(
    currentPageStart,
    currentPageStart + TABLE_PAGE_SIZE,
  )
  const firstItemNumber = currentPageEvents.length > 0 ? currentPageStart + 1 : 0
  const lastItemNumber = currentPageStart + currentPageEvents.length
  const hasLoadedNextPage = (currentPageIndex + 1) * TABLE_PAGE_SIZE < filteredEvents.length
  const hasPreviousPage = currentPageIndex > 0
  const hasNextPage = hasLoadedNextPage || auditQuery.hasNextPage
  const selectedEvent = events.find((event) => event.id === query.event) ?? null
  const filtersActive =
    query.q !== '' ||
    query.category !== 'all' ||
    query.range !== DEFAULT_AUDIT_RANGE ||
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
    // Paginate over the *filtered* event window, since client-side `q`
    // narrowing is active. Advancing through every loaded event regardless of
    // search would let the next-page button skip past filtered-out rows and
    // land on a page that ignores the search input. When the user has narrowed
    // and we still have raw events to load (auditQuery.hasNextPage), fetch them
    // so the client-side filter can scan the new batch.
    if (nextPageIndex * TABLE_PAGE_SIZE < filteredEvents.length) {
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
      <div className="mx-auto flex w-full max-w-page-wide flex-col gap-6 px-4 pt-8 pb-4 md:px-6 md:pb-6">
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
          // ROH-D5 (ρ) → ROH-D11 (ψ): ρ hardcoded partners back into the
          // list; ψ then replaced with the canonical helper so the
          // description reflects FIRM_PERMISSION_ROLES['audit.read']
          // (owner/partner/manager/preparer) automatically.
          <Trans>
            Only {requiredRolesLabel('audit.read')} can see practice-wide audit events. Ask the
            practice owner for access.
          </Trans>
        }
        secondaryAction={{ label: <Trans>Open deadlines</Trans>, to: '/deadlines' }}
      >
        <div />
      </PermissionGate>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-page-wide flex-col gap-6 px-4 pt-8 pb-4 md:px-6 md:pb-6">
      <PageHeader
        // No "Settings" breadcrumb. Audit log is a top-level sidebar
        // destination; a crumb would claim a parent that the route doesn't
        // have. The Settings landing page still links to /audit under
        // Compliance, so users can navigate inbound from there — but that's a
        // link, not a breadcrumb relationship.
        title={
          <ConceptLabel concept="auditTrail">
            <Trans>Audit log</Trans>
          </ConceptLabel>
        }
        actions={
          <div className="flex flex-col items-start gap-2 md:items-end">
            <AuditExportButton firm={currentFirm} />
            {currentFirm?.role !== 'owner' ? (
              <PermissionInlineNotice permission="audit.export" currentRole={currentFirm?.role}>
                <Trans>Only the practice owner can export audit evidence packages.</Trans>
              </PermissionInlineNotice>
            ) : null}
          </div>
        }
      />

      <AuditKpiStrip totalLoaded={filteredEvents.length} countsByType={countsByType} />

      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Audit filters</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              Search by actor, entity, action, or reason — or narrow by time range, action category,
              actor, or entity type.
            </Trans>
          </CardDescription>
          <CardAction>
            <Badge variant="outline" className="tabular-nums">
              {filteredEvents.length}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-3">
          {/* Audit log is text-heavy and "did anyone touch client X?" is the
              most common investigator query — free-text search is the right
              lead control. Sits above the structural-filter grid so it reads
              as the primary affordance, mirroring /deadlines + /rules/library. */}
          <SearchInput
            value={query.q}
            onChange={(next) => {
              setPageIndex(0)
              void setQuery({ q: next.length > 0 ? next : null, event: null })
            }}
            placeholder={t`Search by person, item, action, or reason`}
            ariaLabel={t`Search audit events`}
            hotkey="/"
            hotkeyMeta={{
              id: 'audit.focus-search',
              name: 'Filter audit events',
              description: 'Focus the Audit log filter input.',
              category: 'practice',
              scope: 'route',
            }}
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] xl:items-center">
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
                void setQuery({ range: value === DEFAULT_AUDIT_RANGE ? null : value, event: null })
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
              {/* "Clear filters" (not "Reset") so the verb is identical to
                /deadlines, /alerts, /clients, and /rules/library. Cross-surface
                muscle memory: one label means one thing across the workbench. */}
              <Trans>Clear filters</Trans>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          {/* No info-icon — the PageHeader already carries the auditTrail
              popover, so the card heading doesn't need a third copy on the
              same page. */}
          <CardTitle>
            <Trans>Events</Trans>
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
                {rpcErrorMessage(auditQuery.error) ??
                  t`Try again in a moment. If it keeps failing, contact support.`}
              </AlertDescription>
            </Alert>
          ) : null}

          {!auditQuery.isLoading && !auditQuery.isError && filteredEvents.length === 0 ? (
            /* Shared EmptyState component so the chrome matches the rest of
               the app's empty surfaces. Filtered state gets a Clear filters
               CTA — same affordance the toolbar carries above so the user has
               an inline way to recover without scrolling back up. */
            <EmptyState
              icon={ScrollTextIcon}
              title={
                filtersActive ? (
                  <Trans>No audit events match these filters.</Trans>
                ) : (
                  <Trans>No audit events yet.</Trans>
                )
              }
              description={
                filtersActive ? (
                  <Trans>Clear filters to return to the latest practice-wide events.</Trans>
                ) : (
                  <Trans>
                    Deadline status updates and client imports will appear here when they write
                    audit rows.
                  </Trans>
                )
              }
              cta={
                filtersActive ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    <FilterIcon data-icon="inline-start" />
                    <Trans>Clear filters</Trans>
                  </Button>
                ) : undefined
              }
            />
          ) : null}

          {filteredEvents.length > 0 ? (
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
                loadedCount={filteredEvents.length}
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
